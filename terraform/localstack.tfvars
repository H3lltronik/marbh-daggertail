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
checklist_api_key = "pk_784ede4d17e21a6162c3cd3dcf09d4924ad9ea490fcd722a"

# Orígenes CORS permitidos para el bucket temporal
temp_bucket_cors_allowed_origins = ["http://localhost:5173"] 