variable "project_prefix" {
  description = "Prefijo para los nombres de recursos (cliente/proyecto)"
  type        = string
}

variable "queues" {
  description = "Configuración de colas SQS"
  type = map(object({
    fifo                  = bool
    visibility_timeout    = number
    message_retention     = number
    max_receive_count     = number
    create_dlq            = bool
  }))
}

# Crear colas SQS
resource "aws_sqs_queue" "queues" {
  for_each = var.queues

  name                       = each.value.fifo ? "${var.project_prefix}-${each.key}.fifo" : "${var.project_prefix}-${each.key}"
  fifo_queue                 = each.value.fifo
  content_based_deduplication = each.value.fifo
  visibility_timeout_seconds = each.value.visibility_timeout
  message_retention_seconds  = each.value.message_retention
  
  # Solo para colas con DLQ
  redrive_policy = each.value.create_dlq ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter_queues[each.key].arn
    maxReceiveCount     = each.value.max_receive_count
  }) : null
}

# Crear colas de mensajes fallidos (DLQ)
resource "aws_sqs_queue" "dead_letter_queues" {
  for_each = {
    for name, config in var.queues : name => config if config.create_dlq
  }

  name                       = each.value.fifo ? "${var.project_prefix}-${each.key}-dlq.fifo" : "${var.project_prefix}-${each.key}-dlq"
  fifo_queue                 = each.value.fifo
  content_based_deduplication = each.value.fifo
  message_retention_seconds  = 1209600  # 14 días
}

# Crear una DLQ específica para las Lambdas
resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "${var.project_prefix}-lambda-dlq"
  message_retention_seconds = 1209600  # 14 días
}

output "queue_urls" {
  description = "URLs de las colas SQS creadas"
  value = {
    for name, queue in aws_sqs_queue.queues : name => queue.url
  }
}

output "queue_arns" {
  description = "ARNs de las colas SQS creadas"
  value = {
    for name, queue in aws_sqs_queue.queues : name => queue.arn
  }
}

output "dlq_urls" {
  description = "URLs de las colas DLQ creadas"
  value = {
    for name, queue in aws_sqs_queue.dead_letter_queues : name => queue.url
  }
}

output "dlq_arns" {
  description = "ARNs de las colas DLQ creadas"
  value = {
    for name, queue in aws_sqs_queue.dead_letter_queues : name => queue.arn
  }
}

output "lambda_dlq_arn" {
  description = "ARN de la cola DLQ para Lambdas"
  value = aws_sqs_queue.lambda_dlq.arn
}

output "lambda_dlq_url" {
  description = "URL de la cola DLQ para Lambdas"
  value = aws_sqs_queue.lambda_dlq.url
} 