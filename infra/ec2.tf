data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

resource "aws_instance" "app_test" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.small"

  subnet_id                   = aws_subnet.app_a.id
  associate_public_ip_address = false
  vpc_security_group_ids      = [aws_security_group.app.id]

  user_data                   = file("${path.module}/app-startup.sh")
  user_data_replace_on_change = true

  depends_on = [
    aws_route.app_a_internet,
    aws_route_table_association.app_a,
    aws_route.public_internet,
    aws_route_table_association.public_a,
    aws_vpc_security_group_egress_rule.app_to_internet_https,
  ]

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  credit_specification {
    cpu_credits = "standard"
  }

  tags = {
    Name      = "factory-app-test"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}