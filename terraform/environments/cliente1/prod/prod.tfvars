# Variables para entorno de producción con redirección a localhost vía ngrok

# Disable LocalStack mode for AWS deployment
use_localstack = false

# Specify AWS profile to use (change as needed)
aws_profile = "default"

# Nombres de los buckets en AWS real
temp_bucket_name     = "marbh-temp-bucket-prod"
perm_bucket_name     = "marbh-perm-bucket-prod"

# URLs de webhooks a través de ngrok
# Estos valores deben actualizarse con tu URL de ngrok actual
# Ejemplo: ejecuta ngrok en tu localhost y reemplaza estas URLs
webhook_validate_phase    = "https://0c4b-201-151-220-189.ngrok-free.app/api/webhooks/files/complete-processing"
webhook_checklist_data    = "https://0c4b-201-151-220-189.ngrok-free.app/api/webhooks/assignation-uploaded-files"
webhook_validation_success = "https://0c4b-201-151-220-189.ngrok-free.app/api/webhooks/files/complete-processing"
webhook_validation_error  = "https://0c4b-201-151-220-189.ngrok-free.app/api/webhooks/files/validation-error"

# Clave API para el checklist (actualizar con tu clave para producción)
checklist_api_key = "pk_8556260aa34606f6de07784cbcff846e053f4c23c21323d6"

# Orígenes CORS permitidos para el bucket temporal
temp_bucket_cors_allowed_origins = ["*"] 