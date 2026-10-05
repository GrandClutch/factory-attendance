resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.factory.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-2a"

  map_public_ip_on_launch = false

  tags = {
    Name      = "factory-public-a"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.factory.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = false

  tags = {
    Name      = "factory-public-b"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "app_a" {
  vpc_id                  = aws_vpc.factory.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = false

  tags = {
    Name      = "factory-app-a"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "app_b" {
  vpc_id                  = aws_vpc.factory.id
  cidr_block              = "10.0.12.0/24"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = false

  tags = {
    Name      = "factory-app-b"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "db_a" {
  vpc_id                  = aws_vpc.factory.id
  cidr_block              = "10.0.21.0/24"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = false

  tags = {
    Name      = "factory-db-a"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "db_b" {
  vpc_id                  = aws_vpc.factory.id
  cidr_block              = "10.0.22.0/24"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = false

  tags = {
    Name      = "factory-db-b"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}