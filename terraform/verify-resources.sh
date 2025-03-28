#!/bin/bash

# Script para verificar recursos AWS (en localstack o en entorno real)

# Determinar si usamos localstack
if [ "$1" == "--local" ] || [ "$1" == "-l" ]; then
  ENDPOINT="--endpoint-url=http://localhost:4566"
  PROFILE=""
  echo "🔍 Verificando recursos en LocalStack..."
else
  ENDPOINT=""
  PROFILE="--profile default"
  echo "🔍 Verificando recursos en AWS..."
fi

# Obtener nombres de buckets desde Terraform
TEMP_BUCKET=$(terraform output -raw s3_temp_bucket_name)
PERM_BUCKET=$(terraform output -raw s3_perm_bucket_name)

# Verificar buckets S3
echo -e "\n📦 Verificando buckets S3..."
aws $ENDPOINT $PROFILE s3api list-buckets
aws $ENDPOINT $PROFILE s3api head-bucket --bucket $TEMP_BUCKET && echo "✅ Bucket temporal encontrado: $TEMP_BUCKET" || echo "❌ Bucket temporal no encontrado: $TEMP_BUCKET"
aws $ENDPOINT $PROFILE s3api head-bucket --bucket $PERM_BUCKET && echo "✅ Bucket permanente encontrado: $PERM_BUCKET" || echo "❌ Bucket permanente no encontrado: $PERM_BUCKET"

# Verificar colas SQS
echo -e "\n📬 Verificando colas SQS..."
aws $ENDPOINT $PROFILE sqs list-queues

# Verificar funciones Lambda
echo -e "\n⚡ Verificando funciones Lambda..."
aws $ENDPOINT $PROFILE lambda list-functions

echo -e "\n✨ Verificación completada" 