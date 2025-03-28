output "temp_bucket_name" {
  description = "Nombre del bucket temporal"
  value       = module.s3_buckets.temp_bucket.id
}

output "perm_bucket_name" {
  description = "Nombre del bucket permanente"
  value       = module.s3_buckets.perm_bucket.id
}

output "lambda_functions" {
  description = "Nombres de las funciones Lambda desplegadas"
  value       = module.lambda_functions.function_names
}

output "sqs_queues" {
  description = "URLs de las colas SQS"
  value       = module.sqs_queues.queue_urls
}

output "dlq_queues" {
  description = "URLs de las colas DLQ"
  value       = module.sqs_queues.dlq_urls
}

output "lambda_dlq" {
  description = "URL de la cola DLQ para Lambdas"
  value       = module.sqs_queues.lambda_dlq_url
} 