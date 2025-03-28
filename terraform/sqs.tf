resource "aws_sqs_queue" "main_queue" {
  name                      = "marbh-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30

  tags = {
    Environment = "dev"
  }
}

# Cola de Dead Letter Queue para la cola de validación
resource "aws_sqs_queue" "validation_dlq" {
  name                      = "marbh-object-validation-dlq"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30

  tags = {
    Environment = "dev"
  }
}

# Cola de Dead Letter Queue para las Lambdas
resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "marbh-lambda-dlq"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30

  tags = {
    Environment = "dev"
  }
}

# Cola para extracción de ID de archivo (usada por bucket-file-id-extractor para enviar a new-object-validation-gatherer)
resource "aws_sqs_queue" "file_id_extraction_queue" {
  name                      = "marbh-file-id-extraction-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.validation_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = "dev"
  }
}

# Cola para tareas de validación (usada por new-object-validation-gatherer para enviar a object-validator)
resource "aws_sqs_queue" "validation_task_queue" {
  name                      = "marbh-object-validation-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.validation_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = "dev"
  }
}

# Cola para resultados de validación (usada por object-validator para enviar a validation-result-processor)
resource "aws_sqs_queue" "validation_result_queue" {
  name                      = "marbh-validation-result-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.validation_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = "dev"
  }
}

# Cola de Dead Letter Queue para procesar mensajes fallidos
resource "aws_sqs_queue" "dlq_processor_dlq" {
  name                      = "marbh-dlq-processor-dlq"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 30

  tags = {
    Environment = "dev"
  }
} 