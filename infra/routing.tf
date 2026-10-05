resource "aws_internet_gateway" "factory" {
  vpc_id = aws_vpc.factory.id

  tags = {
    Name      = "factory-igw"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.factory.id

  tags = {
    Name      = "factory-public-routes"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.factory.id
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.factory.id

  tags = {
    Name      = "factory-database-routes"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

resource "aws_route_table_association" "db_a" {
  subnet_id      = aws_subnet.db_a.id
  route_table_id = aws_route_table.database.id
}

resource "aws_route_table_association" "db_b" {
  subnet_id      = aws_subnet.db_b.id
  route_table_id = aws_route_table.database.id
}