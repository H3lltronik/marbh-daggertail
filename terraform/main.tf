terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ===== Provider Configuration Variables =====

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

# ===== Business Variables =====

variable "customer" {
  description = "Nombre del cliente"
  type        = string
  default     = "guerrero-santana"
}

variable "product" {
  description = "Nombre del producto"
  type        = string
  default     = "checklist-system"
}

variable "default_cognito_user_email" {
  description = "Email del usuario por defecto en Cognito"
  type        = string
  default     = "admin@example.com"
}

variable "default_cognito_user_password" {
  description = "Contraseña del usuario por defecto en Cognito"
  type        = string
  default     = "ChangeMe123!"
  sensitive   = true
}

# ===== Local Variables =====

# Resource naming based on customer and environment
locals {
  # If we're in the default workspace, use the customer variable
  # Otherwise, use the workspace name as the customer name
  customer_name = terraform.workspace == "default" ? var.customer : terraform.workspace
  
  # Environment indicator (dev/prod or empty for production)
  env_suffix = var.use_localstack ? "-dev" : ""
  
  # Resource naming
  bucket_temp_name = "marbh-temp-bucket${local.env_suffix}-${local.customer_name}"
  bucket_perm_name = "marbh-perm-bucket${local.env_suffix}-${local.customer_name}"
  user_name = "user-checklist-${local.customer_name}"
  policy_name = "policy-checklist-${local.customer_name}"
  userpool_name = "userpool-checklist-${local.customer_name}"
  client_name = "client-checklist-${local.customer_name}"
}

# ===== AWS Provider Configuration =====

# Main AWS Provider - Can use LocalStack or real AWS
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