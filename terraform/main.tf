terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Variables para configuración del provider
variable "use_localstack" {
  description = "Set to true to use LocalStack instead of AWS"
  type        = bool
  default     = false
}

variable "aws_profile" {
  description = "AWS profile to use (ignored when use_localstack is true)"
  type        = string
  default     = "default"
}

# AWS Provider Configuration
provider "aws" {
  region                      = "us-east-1"
  profile                     = var.use_localstack ? null : var.aws_profile
  
  # LocalStack specific settings - only applied when use_localstack is true
  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      s3         = "http://localhost:4566"
      lambda     = "http://localhost:4566"
      sqs        = "http://localhost:4566"
      iam        = "http://localhost:4566"
      apigateway = "http://localhost:4566"
      sts        = "http://localhost:4566"
    }
  }
  
  # Skip credential validation and account ID retrieval for LocalStack
  skip_credentials_validation = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  
  # LocalStack simulates the AWS environment with this fake account ID
  s3_use_path_style           = var.use_localstack
  
  # When using LocalStack, override real AWS credentials with fake ones
  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
} 