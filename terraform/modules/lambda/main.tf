variable "project_prefix" {
  description = "Prefijo para los nombres de recursos (cliente/proyecto)"
  type        = string
}

variable "lambdas_config" {
  description = "Configuración para las funciones Lambda"
  type = map(object({
    filename         = string
    handler          = string
    runtime          = string
    timeout          = number
    memory_size      = number
    environment      = map(string)
    dlq_enabled      = bool
  }))
}

variable "role_arn" {
  description = "ARN del rol de ejecución para las Lambdas"
  type        = string
}

variable "lambda_dlq_arn" {
  description = "ARN de la cola de mensajes fallidos para las Lambdas"
  type        = string
  default     = ""
}

# Crear las funciones Lambda
resource "aws_lambda_function" "lambda_functions" {
  for_each         = var.lambdas_config
  
  function_name    = "${var.project_prefix}-${each.key}"
  role             = var.role_arn
  handler          = each.value.handler
  runtime          = each.value.runtime
  filename         = each.value.filename
  source_code_hash = filebase64sha256(each.value.filename)
  timeout          = each.value.timeout
  memory_size      = each.value.memory_size

  environment {
    variables = each.value.environment
  }

  dynamic "dead_letter_config" {
    for_each = each.value.dlq_enabled && var.lambda_dlq_arn != "" ? [1] : []
    content {
      target_arn = var.lambda_dlq_arn
    }
  }
}

output "lambda_arns" {
  description = "ARNs de las funciones Lambda creadas"
  value = {
    for name, lambda in aws_lambda_function.lambda_functions : name => lambda.arn
  }
}

output "function_names" {
  description = "Nombres de las funciones Lambda creadas"
  value = {
    for name, lambda in aws_lambda_function.lambda_functions : name => lambda.function_name
  }
} 