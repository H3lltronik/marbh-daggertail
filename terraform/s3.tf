# ===== Temporary Bucket (from new system) =====
resource "aws_s3_bucket" "temp_bucket" {
  bucket        = var.temp_bucket_name
  force_destroy = var.s3_force_destroy

  tags = {
    Name      = var.temp_bucket_name
    Customer  = var.customer
    Product   = var.product
    Workspace = terraform.workspace
    Type      = "Temporary"
  }
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
    allowed_headers = var.s3_cors_allowed_headers
    allowed_methods = var.s3_cors_allowed_methods
    allowed_origins = var.temp_bucket_cors_allowed_origins
    expose_headers  = var.s3_cors_expose_headers
    max_age_seconds = var.s3_cors_max_age_seconds
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "temp_bucket_encryption" {
  bucket = aws_s3_bucket.temp_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "temp_bucket_access" {
  bucket = aws_s3_bucket.temp_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===== Permanent Bucket (combining the perm_bucket from new system and app_bucket from old system) =====
resource "aws_s3_bucket" "perm_bucket" {
  bucket        = var.perm_bucket_name
  force_destroy = var.s3_force_destroy

  tags = {
    Name      = var.perm_bucket_name
    Customer  = var.customer
    Product   = var.product
    Workspace = terraform.workspace
    Type      = "Permanent"
  }
}

resource "aws_s3_bucket_ownership_controls" "perm_bucket_ownership" {
  bucket = aws_s3_bucket.perm_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "perm_bucket_acl" {
  depends_on = [
    aws_s3_bucket_ownership_controls.perm_bucket_ownership,
    aws_s3_bucket_public_access_block.perm_bucket_access
  ]
  bucket = aws_s3_bucket.perm_bucket.id
  acl    = "private"
}

# Configuración de acceso público al bucket permanente
resource "aws_s3_bucket_public_access_block" "perm_bucket_access" {
  bucket = aws_s3_bucket.perm_bucket.id

  # Configuración basada en variables para permitir diferentes políticas en dev/prod
  block_public_acls       = var.s3_block_public_acls
  block_public_policy     = var.s3_block_public_policy
  ignore_public_acls      = var.s3_ignore_public_acls
  restrict_public_buckets = var.s3_restrict_public_buckets
}

# Configuración de CORS para el bucket permanente
resource "aws_s3_bucket_cors_configuration" "perm_bucket_cors" {
  bucket = aws_s3_bucket.perm_bucket.id

  cors_rule {
    allowed_headers = var.s3_cors_allowed_headers
    allowed_methods = var.s3_cors_allowed_methods
    allowed_origins = var.s3_cors_allowed_origins
    expose_headers  = var.s3_cors_expose_headers
    max_age_seconds = var.s3_cors_max_age_seconds
  }
}

# Configuración de cifrado del bucket permanente
resource "aws_s3_bucket_server_side_encryption_configuration" "perm_bucket_encryption" {
  bucket = aws_s3_bucket.perm_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Crear carpetas public y private en el bucket permanente
resource "aws_s3_object" "public_folder" {
  bucket  = aws_s3_bucket.perm_bucket.id
  key     = "public/"
  content = ""
}

resource "aws_s3_object" "private_folder" {
  bucket  = aws_s3_bucket.perm_bucket.id
  key     = "private/"
  content = ""
}

# Política para permitir acceso público a la carpeta public del bucket permanente
# Solo se aplica si no estamos bloqueando políticas públicas
resource "aws_s3_bucket_policy" "allow_public_access" {
  count  = var.s3_block_public_policy ? 0 : 1
  bucket = aws_s3_bucket.perm_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadForGetBucketObjects"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.perm_bucket.arn}/public/*"
      }
    ]
  })

  # Aseguramos que la política se aplique después de que se haya configurado el bloque de acceso público
  depends_on = [aws_s3_bucket_public_access_block.perm_bucket_access]
} 