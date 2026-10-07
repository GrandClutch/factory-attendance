resource "aws_db_subnet_group" "factory_db_subnets" {
  name        = "factory-db-subnets"
  description = "Subnet group for factory database"
  subnet_ids  = [aws_subnet.db_a.id, aws_subnet.db_b.id]

  tags = {
    Name      = "factory-db-subnets"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "factory_db" {
  identifier        = "factory-db"
  engine            = "postgres"
  engine_version    = "17.2"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp3"
  max_allocated_storage = 100

  db_name  = "factory_attendance"
  username = "postgres"
  password = random_password.db_password.result

  multi_az               = false
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.factory_db_subnets.name
  vpc_security_group_ids = [aws_security_group.database.id]

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = {
    Name      = "factory-db"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

output "database_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.factory_db.endpoint
}
