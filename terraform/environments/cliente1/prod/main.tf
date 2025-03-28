terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Configuración para Terraform Cloud
  cloud {
    organization = "Luve"
    
    workspaces {
      name = "cliente1-prod"
    }
  }
}

provider "aws" {
  region = var.aws_region
  profile = var.aws_profile
}

locals {
  project_prefix = "cliente1"
  lambda_dist_path = "${path.module}/../../../../dist/zips"
}

# IAM role para las Lambdas
resource "aws_iam_role" "lambda_execution_role" {
  name = "${local.project_prefix}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy para acceso a servicios AWS
resource "aws_iam_policy" "lambda_policy" {
  name        = "${local.project_prefix}-lambda-policy"
  description = "Policy for Lambda to access S3 and SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Effect   = "Allow"
        Resource = [
          "${module.s3_buckets.temp_bucket.arn}",
          "${module.s3_buckets.temp_bucket.arn}/*",
          "${module.s3_buckets.perm_bucket.arn}",
          "${module.s3_buckets.perm_bucket.arn}/*"
        ]
      },
      {
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Effect   = "Allow"
        Resource = values(module.sqs_queues.queue_arns)
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Asignar política al rol
resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# Módulo de buckets S3
module "s3_buckets" {
  source                      = "../../../modules/s3"
  project_prefix              = local.project_prefix
  temp_bucket_name            = var.temp_bucket_name
  perm_bucket_name            = var.perm_bucket_name
  temp_bucket_cors_allowed_origins = var.temp_bucket_cors_allowed_origins
}

# Módulo de colas SQS
module "sqs_queues" {
  source         = "../../../modules/sqs"
  project_prefix = local.project_prefix
  
  queues = {
    "file-id-extraction-queue" = {
      fifo               = false
      visibility_timeout = 60
      message_retention  = 345600
      max_receive_count  = 3
      create_dlq         = true
    },
    "validation-task-queue" = {
      fifo               = false
      visibility_timeout = 60
      message_retention  = 345600
      max_receive_count  = 3
      create_dlq         = true
    },
    "validation-result-queue" = {
      fifo               = false
      visibility_timeout = 60
      message_retention  = 345600
      max_receive_count  = 3
      create_dlq         = true
    }
  }
}

# Configuración de las funciones Lambda
module "lambda_functions" {
  source         = "../../../modules/lambda"
  project_prefix = local.project_prefix
  role_arn       = aws_iam_role.lambda_execution_role.arn
  lambda_dlq_arn = module.sqs_queues.lambda_dlq_arn
  
  lambdas_config = {
    "bucket-file-id-extractor" = {
      filename     = "${local.lambda_dist_path}/bucket-file-id-extractor.zip"
      handler      = "index.handler"
      runtime      = "nodejs18.x"
      timeout      = 30
      memory_size  = 128
      dlq_enabled  = true
      environment  = {
        FILE_ID_EXTRACTION_QUEUE_URL = module.sqs_queues.queue_urls["file-id-extraction-queue"],
        AWS_LAMBDA_LOG_LEVEL = "INFO",
        CHECKLIST_API_KEY = var.checklist_api_key
      }
    },
    "new-object-validation-gatherer" = {
      filename     = "${local.lambda_dist_path}/new-object-validation-gatherer.zip"
      handler      = "index.handler"
      runtime      = "nodejs18.x"
      timeout      = 30
      memory_size  = 256
      dlq_enabled  = true
      environment  = {
        VALIDATION_QUEUE_URL = module.sqs_queues.queue_urls["validation-task-queue"],
        WEBHOOK_CHECKLIST_DATA = var.webhook_checklist_data,
        CHECKLIST_API_KEY = var.checklist_api_key,
        AWS_LAMBDA_LOG_LEVEL = "INFO"
      }
    },
    "object-validation-processor" = {
      filename     = "${local.lambda_dist_path}/object-validation-processor.zip"
      handler      = "index.handler"
      runtime      = "nodejs18.x"
      timeout      = 30
      memory_size  = 128
      dlq_enabled  = true
      environment  = {
        VALIDATION_RESULT_QUEUE_URL = module.sqs_queues.queue_urls["validation-result-queue"],
        PERM_BUCKET_NAME = module.s3_buckets.perm_bucket.id,
        AWS_LAMBDA_LOG_LEVEL = "INFO",
        CHECKLIST_API_KEY = var.checklist_api_key
      }
    },
    "validation-result-handler" = {
      filename     = "${local.lambda_dist_path}/validation-result-handler.zip"
      handler      = "index.handler"
      runtime      = "nodejs18.x"
      timeout      = 30
      memory_size  = 128
      dlq_enabled  = true
      environment  = {
        AWS_LAMBDA_LOG_LEVEL = "INFO",
        CHECKLIST_API_KEY = var.checklist_api_key,
        WEBHOOK_VALIDATION_SUCCESS = var.webhook_validation_success,
        WEBHOOK_VALIDATION_ERROR = var.webhook_validation_error
      }
    }
  }
}

# Configuración para que S3 invoque la lambda bucket-file-id-extractor
resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_functions.function_names["bucket-file-id-extractor"]
  principal     = "s3.amazonaws.com"
  source_arn    = module.s3_buckets.temp_bucket.arn
}

# Configurar el trigger S3 para invocar la Lambda
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = module.s3_buckets.temp_bucket.id

  lambda_function {
    lambda_function_arn = module.lambda_functions.lambda_arns["bucket-file-id-extractor"]
    events              = ["s3:ObjectCreated:*"]
  }
}

# Mapeos de eventos SQS para las Lambdas
resource "aws_lambda_event_source_mapping" "mappings" {
  for_each = {
    "file-id-extraction-queue-mapping" = {
      event_source_arn = module.sqs_queues.queue_arns["file-id-extraction-queue"]
      function_name    = module.lambda_functions.function_names["new-object-validation-gatherer"]
    },
    "validation-task-queue-mapping" = {
      event_source_arn = module.sqs_queues.queue_arns["validation-task-queue"]
      function_name    = module.lambda_functions.function_names["object-validation-processor"]
    },
    "validation-result-queue-mapping" = {
      event_source_arn = module.sqs_queues.queue_arns["validation-result-queue"]
      function_name    = module.lambda_functions.function_names["validation-result-handler"]
    }
  }

  event_source_arn = each.value.event_source_arn
  function_name    = each.value.function_name
  batch_size       = 1
} 