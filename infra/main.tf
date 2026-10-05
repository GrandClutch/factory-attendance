terraform {
  required_version = ">=1.7, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
provider "aws" {
  region  = "us-east-2"
  profile = "factory-terraform"
}

resource "aws_vpc" "factory" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name      = "factory-vpc"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}