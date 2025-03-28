# Terraform para las Lambdas Optimizadas

Este directorio contiene la configuración de Terraform para desplegar las lambdas optimizadas de Marbh en AWS o en un entorno local usando LocalStack.

## Requisitos previos

- [Terraform](https://www.terraform.io/downloads.html) 0.14+
- [AWS CLI](https://aws.amazon.com/cli/) configurado con credenciales
- [LocalStack](https://github.com/localstack/localstack) (opcional, para pruebas locales)
- Lambdas compiladas y empaquetadas (`npm run build && npm run zip` en el directorio raíz)

## Estructura de archivos

- `main.tf` - Configuración principal y provider
- `variables.tf` - Definición de variables
- `s3.tf` - Recursos de Amazon S3 (buckets)
- `sqs.tf` - Recursos de Amazon SQS (colas)
- `lambda.tf` - Recursos de AWS Lambda (funciones)
- `outputs.tf` - Valores de salida
- `localstack.tfvars` - Variables para entorno LocalStack
- `prod.tfvars` - Variables para entorno de producción

## Pasos para el despliegue

### 1. Compilar y empaquetar las lambdas

Desde el directorio raíz de `bare-app`, ejecuta:

```bash
npm install
npm run build
npm run zip
```

### 2. Desplegar en LocalStack (desarrollo local)

Inicia LocalStack:

```bash
docker run --rm -it -p 4566:4566 -p 4571:4571 localstack/localstack:latest
```

Inicializa Terraform:

```bash
cd terraform
terraform init
```

Aplica la configuración:

```bash
terraform apply -var-file=localstack.tfvars
```

### 3. Desplegar en AWS (producción)

Actualiza las URLs de webhook en `prod.tfvars` si es necesario. Luego:

```bash
terraform init
terraform apply -var-file=prod.tfvars
```

## Cómo probar las lambdas

### Subir un archivo al bucket temporal

Con LocalStack:

```bash
aws --endpoint-url=http://localhost:4566 s3 cp test-file.txt s3://marbh-temp-bucket-local/test-file-{12345}.txt
```

Con AWS real:

```bash
aws s3 cp test-file.txt s3://marbh-temp-bucket-prod/test-file-{12345}.txt
```

### Verificar los resultados

Puedes verificar que la lambda se activó y ver los mensajes en las colas SQS:

Con LocalStack:

```bash
aws --endpoint-url=http://localhost:4566 logs describe-log-streams --log-group-name /aws/lambda/marbh-bucket-file-id-extractor
aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url $(terraform output -raw file_id_extraction_queue_url)
```

## Eliminar recursos

```bash
terraform destroy -var-file=localstack.tfvars  # Para LocalStack
terraform destroy -var-file=prod.tfvars        # Para AWS real
```

## Personalización

Puedes personalizar las variables en `*.tfvars` para adaptarlas a tus necesidades especificas. Esto incluye:

- Nombres de buckets
- URLs de webhooks
- Claves API
- Configuración CORS 