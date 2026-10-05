resource "aws_acm_certificate" "app" {
  domain_name       = "factory-attendance.chhinlong.asia"
  validation_method = "DNS"

  tags = {
    Name      = "factory-app-certificate"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

output "certificate_dns_validation" {
  description = "DNS records to add in Cloudflare to verify domain ownership"

  value = [
    for record in aws_acm_certificate.app.domain_validation_options : {
      name  = record.resource_record_name
      type  = record.resource_record_type
      value = record.resource_record_value
    }
  ]
}