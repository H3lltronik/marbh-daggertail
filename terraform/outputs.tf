output "s3_temp_bucket_name" {
  description = "Name of the temporary S3 bucket"
  value       = aws_s3_bucket.temp_bucket.id
}

output "s3_temp_bucket_arn" {
  description = "ARN of the temporary S3 bucket"
  value       = aws_s3_bucket.temp_bucket.arn
}

output "s3_perm_bucket_name" {
  description = "Name of the permanent S3 bucket"
  value       = aws_s3_bucket.perm_bucket.id
}

output "s3_perm_bucket_arn" {
  description = "ARN of the permanent S3 bucket"
  value       = aws_s3_bucket.perm_bucket.arn
}

output "main_queue_url" {
  description = "URL of the main SQS queue"
  value       = aws_sqs_queue.main_queue.url
}

output "file_id_extraction_queue_url" {
  description = "URL of the file ID extraction SQS queue"
  value       = aws_sqs_queue.file_id_extraction_queue.url
}

output "validation_task_queue_url" {
  description = "URL of the validation task SQS queue"
  value       = aws_sqs_queue.validation_task_queue.url
}

output "validation_result_queue_url" {
  description = "URL of the validation result SQS queue"
  value       = aws_sqs_queue.validation_result_queue.url
}

output "validation_dlq_url" {
  description = "URL of the validation dead letter queue"
  value       = aws_sqs_queue.validation_dlq.url
}

output "lambda_dlq_url" {
  description = "URL of the Lambda dead letter queue"
  value       = aws_sqs_queue.lambda_dlq.url
}

output "bucket_file_id_extractor_lambda_arn" {
  description = "ARN of the bucket-file-id-extractor Lambda function"
  value       = aws_lambda_function.bucket_file_id_extractor.arn
}

output "new_object_validation_gatherer_lambda_arn" {
  description = "ARN of the new-object-validation-gatherer Lambda function"
  value       = aws_lambda_function.new_object_validation_gatherer.arn
}

output "object_validation_processor_lambda_arn" {
  description = "ARN of the object-validation-processor Lambda function"
  value       = aws_lambda_function.object_validation_processor.arn
}

output "validation_result_handler_lambda_arn" {
  description = "ARN of the validation-result-handler Lambda function"
  value       = aws_lambda_function.validation_result_handler.arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution_role.arn
} 