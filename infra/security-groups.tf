resource "aws_security_group" "load_balancer" {
  name        = "factory-load-balancer"
  description = "Allows HTTPS traffic to the load balancer"
  vpc_id      = aws_vpc.factory.id

  tags = {
    Name      = "factory-load-balancer"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_security_group" "app" {
  name        = "factory-app"
  description = "Allows app traffic only from the load balancer"
  vpc_id      = aws_vpc.factory.id

  tags = {
    Name      = "factory-app"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_security_group" "database" {
  name        = "factory-database"
  description = "Allows PostgreSQL traffic only from the app"
  vpc_id      = aws_vpc.factory.id

  tags = {
    Name      = "factory-database"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_vpc_security_group_ingress_rule" "https_to_load_balancer" {
  security_group_id = aws_security_group.load_balancer.id
  description       = "HTTPS from workers and gate terminals"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "load_balancer_to_app" {
  security_group_id            = aws_security_group.load_balancer.id
  description                  = "Forward requests to the app"
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
  referenced_security_group_id = aws_security_group.app.id
}

resource "aws_vpc_security_group_ingress_rule" "load_balancer_to_app" {
  security_group_id            = aws_security_group.app.id
  description                  = "App requests from the load balancer"
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
  referenced_security_group_id = aws_security_group.load_balancer.id
}

resource "aws_vpc_security_group_egress_rule" "app_to_database" {
  security_group_id            = aws_security_group.app.id
  description                  = "PostgreSQL requests to the database"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.database.id
}

resource "aws_vpc_security_group_ingress_rule" "app_to_database" {
  security_group_id            = aws_security_group.database.id
  description                  = "PostgreSQL requests from the app"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.app.id
}
resource "aws_vpc_security_group_egress_rule" "app_to_internet_https" {
  security_group_id = aws_security_group.app.id
  description       = "Allow the app to fetch resources over HTTPS"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}