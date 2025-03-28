# Configuration for LocalStack deployments

# Enable LocalStack mode
use_localstack = true

# Nombres de los buckets para LocalStack
temp_bucket_name     = "marbh-temp-bucket-local"
perm_bucket_name     = "marbh-perm-bucket-local"

# URLs de webhooks para entorno local
webhook_validate_phase    = "http://host.docker.internal:5555/api/webhooks/files/complete-processing"
webhook_checklist_data    = "http://host.docker.internal:5555/api/webhooks/assignation-uploaded-files"
webhook_validation_success = "http://host.docker.internal:5555/api/webhooks/files/complete-processing"
webhook_validation_error  = "http://host.docker.internal:5555/api/webhooks/files/validation-error"

# Clave API para el checklist (entorno de desarrollo)
checklist_api_key = "pk_8556260aa34606f6de07784cbcff846e053f4c23c21323d6"

# Configuración de S3
s3_force_destroy = true

# Configuración CORS para los buckets
s3_cors_allowed_headers = ["*"]
s3_cors_allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
s3_cors_allowed_origins = ["*"]
s3_cors_expose_headers = ["ETag"]
s3_cors_max_age_seconds = 3000

# Orígenes CORS específicos para el bucket temporal
temp_bucket_cors_allowed_origins = ["http://localhost:5173"]

# Configuración de acceso público para S3
s3_block_public_acls = false
s3_block_public_policy = false
s3_ignore_public_acls = false
s3_restrict_public_buckets = false 