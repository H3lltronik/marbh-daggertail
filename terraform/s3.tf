resource "aws_s3_bucket" "temp_bucket" {
  bucket        = var.temp_bucket_name
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

resource "aws_s3_bucket" "perm_bucket" {
  bucket        = var.perm_bucket_name
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