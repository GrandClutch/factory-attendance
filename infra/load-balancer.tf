resource "aws_lb" "app" {
  name               = "factory-app-alb"
  internal           = false
  load_balancer_type = "application"

  security_groups = [aws_security_group.load_balancer.id]
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
  ]

  depends_on = [
    aws_route.public_internet,
    aws_route_table_association.public_a,
    aws_route_table_association.public_b,
  ]

  tags = {
    Name      = "factory-app-alb"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "factory-app-targets"
  port        = 8000
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = aws_vpc.factory.id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    port                = "traffic-port"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name      = "factory-app-targets"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_lb_target_group_attachment" "app_test" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app_test.id
  port             = 8000
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

output "load_balancer_dns" {
  description = "Cloudflare app CNAME target"
  value       = aws_lb.app.dns_name
}

output "app_target_group_arn" {
  description = "Target group for checking application health"
  value       = aws_lb_target_group.app.arn
}