variable "aws_region" {
  description = "Región de AWS a utilizar"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Perfil de AWS CLI a utilizar"
  type        = string
  default     = "default"
}

variable "temp_bucket_name" {
  description = "Nombre del bucket temporal"
  type        = string
  default     = "temp-bucket"
}

variable "perm_bucket_name" {
  description = "Nombre del bucket permanente"
  type        = string
  default     = "perm-bucket"
}

variable "temp_bucket_cors_allowed_origins" {
  description = "Orígenes permitidos para CORS en el bucket temporal"
  type        = list(string)
  default     = ["*"]
}

variable "webhook_checklist_data" {
  description = "URL del webhook para obtener datos del checklist"
  type        = string
}

variable "checklist_api_key" {
  description = "Clave API para el checklist"
  type        = string
  sensitive   = true
}

variable "webhook_validation_success" {
  description = "URL del webhook para notificar validaciones exitosas"
  type        = string
}

variable "webhook_validation_error" {
  description = "URL del webhook para notificar errores de validación"
  type        = string
} 