variable "project_prefix" {
  description = "Prefijo para los nombres de recursos (cliente/proyecto)"
  type        = string
}

variable "temp_bucket_name" {
  description = "Nombre del bucket temporal"
  type        = string
}

variable "perm_bucket_name" {
  description = "Nombre del bucket permanente"
  type        = string
}

variable "temp_bucket_cors_allowed_origins" {
  description = "Orígenes permitidos para CORS en el bucket temporal"
  type        = list(string)
  default     = ["*"]
}

# Bucket temporal
resource "aws_s3_bucket" "temp_bucket" {
  bucket        = "${var.project_prefix}-${var.temp_bucket_name}"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "temp_bucket_ownership" {
  bucket = aws_s3_bucket.temp_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "temp_bucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.temp_bucket_ownership]
  bucket     = aws_s3_bucket.temp_bucket.id
  acl        = "private"
}

resource "aws_s3_bucket_cors_configuration" "temp_bucket_cors" {
  bucket = aws_s3_bucket.temp_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.temp_bucket_cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Bucket permanente
resource "aws_s3_bucket" "perm_bucket" {
  bucket        = "${var.project_prefix}-${var.perm_bucket_name}"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "perm_bucket_ownership" {
  bucket = aws_s3_bucket.perm_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "perm_bucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.perm_bucket_ownership]
  bucket     = aws_s3_bucket.perm_bucket.id
  acl        = "private"
}

output "temp_bucket" {
  description = "Información del bucket temporal"
  value = {
    id  = aws_s3_bucket.temp_bucket.id
    arn = aws_s3_bucket.temp_bucket.arn
  }
}

output "perm_bucket" {
  description = "Información del bucket permanente"
  value = {
    id  = aws_s3_bucket.perm_bucket.id
    arn = aws_s3_bucket.perm_bucket.arn
  }
} 