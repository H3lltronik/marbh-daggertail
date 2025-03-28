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
  default     = "http://host.docker.internal:5555/api/webhooks/files/update-status"
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
  default     = "http://host.docker.internal:5555/api/webhooks/files/update-status"
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