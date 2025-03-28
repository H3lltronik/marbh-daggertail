variable "temp_bucket_name" {
  description = "Name for the temporary bucket"
  type        = string
  default     = "marbh-temp-bucket"
}

variable "perm_bucket_name" {
  description = "Name for the permanent bucket"
  type        = string
  default     = "marbh-perm-bucket"
}

variable "webhook_validate_phase" {
  description = "URL for the validation phase webhook"
  type        = string
  default     = "http://host.docker.internal:5555/api/webhooks/files/complete-processing"
}

variable "webhook_checklist_data" {
  description = "Base URL for the checklist data API"
  type        = string
  default     = "http://host.docker.internal:5555/api/webhooks/assignation-uploaded-files"
}

variable "checklist_api_key" {
  description = "API Key for the checklist data API"
  type        = string
  default     = "pk_8556260aa34606f6de07784cbcff846e053f4c23c21323d6"
}

variable "webhook_validation_success" {
  description = "URL for the webhook endpoint to notify successful validations"
  type        = string
  default     = "http://host.docker.internal:5555/api/webhooks/files/complete-processing"
}

variable "webhook_validation_error" {
  description = "URL for the webhook endpoint to notify validation errors"
  type        = string
  default     = "http://host.docker.internal:5555/api/webhooks/files/validation-error"
}

variable "temp_bucket_cors_allowed_origins" {
  description = "List of allowed origins for CORS in the temporary bucket"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "s3_force_destroy" {
  description = "Boolean that indicates all objects should be deleted from the bucket when the bucket is destroyed"
  type        = bool
  default     = true
}

# S3 CORS configuration variables
variable "s3_cors_allowed_headers" {
  description = "List of allowed headers for CORS configuration"
  type        = list(string)
  default     = ["*"]
}

variable "s3_cors_allowed_methods" {
  description = "List of allowed methods for CORS configuration"
  type        = list(string)
  default     = ["GET", "PUT", "POST", "DELETE", "HEAD"]
}

variable "s3_cors_allowed_origins" {
  description = "List of allowed origins for CORS configuration"
  type        = list(string)
  default     = ["*"]
}

variable "s3_cors_expose_headers" {
  description = "List of exposed headers in CORS configuration"
  type        = list(string)
  default     = ["ETag"]
}

variable "s3_cors_max_age_seconds" {
  description = "Maximum age in seconds for CORS configuration"
  type        = number
  default     = 3000
}

# S3 public access block configuration
variable "s3_block_public_acls" {
  description = "Whether to block public ACLs for S3 buckets"
  type        = bool
  default     = false
}

variable "s3_block_public_policy" {
  description = "Whether to block public policies for S3 buckets"
  type        = bool
  default     = false
}

variable "s3_ignore_public_acls" {
  description = "Whether to ignore public ACLs for S3 buckets"
  type        = bool
  default     = false
}

variable "s3_restrict_public_buckets" {
  description = "Whether to restrict public bucket policies for S3 buckets"
  type        = bool
  default     = false
} 