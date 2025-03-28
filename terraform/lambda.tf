# IAM role for Lambda execution
resource "aws_iam_role" "lambda_execution_role" {
  name = "marbh-lambda-execution-role"

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

# Policy for Lambda to access S3 and SQS
resource "aws_iam_policy" "lambda_policy" {
  name        = "marbh-lambda-policy"
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
          "${aws_s3_bucket.temp_bucket.arn}",
          "${aws_s3_bucket.temp_bucket.arn}/*",
          "${aws_s3_bucket.perm_bucket.arn}",
          "${aws_s3_bucket.perm_bucket.arn}/*"
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
        Resource = [
          "${aws_sqs_queue.main_queue.arn}",
          "${aws_sqs_queue.file_id_extraction_queue.arn}",
          "${aws_sqs_queue.validation_task_queue.arn}",
          "${aws_sqs_queue.validation_result_queue.arn}",
          "${aws_sqs_queue.validation_dlq.arn}",
          "${aws_sqs_queue.lambda_dlq.arn}"
        ]
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

# Attach policy to role
resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# Permisos para que S3 invoque la lambda bucket-file-id-extractor
resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bucket_file_id_extractor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.temp_bucket.arn
}

# 1. Configuración para la Lambda bucket-file-id-extractor
resource "aws_lambda_function" "bucket_file_id_extractor" {
  function_name    = "marbh-bucket-file-id-extractor"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = "../dist/zips/bucket-file-id-extractor.zip"
  source_code_hash = filebase64sha256("../dist/zips/bucket-file-id-extractor.zip")
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      FILE_ID_EXTRACTION_QUEUE_URL = aws_sqs_queue.file_id_extraction_queue.url,
      AWS_LAMBDA_LOG_LEVEL = "DEBUG",
      CHECKLIST_API_KEY = var.checklist_api_key
    }
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
}

# 2. Configuración para la Lambda new-object-validation-gatherer
resource "aws_lambda_function" "new_object_validation_gatherer" {
  function_name    = "marbh-new-object-validation-gatherer"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = "../dist/zips/new-object-validation-gatherer.zip"
  source_code_hash = filebase64sha256("../dist/zips/new-object-validation-gatherer.zip")
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      VALIDATION_QUEUE_URL = aws_sqs_queue.validation_task_queue.url,
      WEBHOOK_CHECKLIST_DATA = var.webhook_checklist_data,
      CHECKLIST_API_KEY = var.checklist_api_key,
      AWS_LAMBDA_LOG_LEVEL = "DEBUG"
    }
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
}

# 3. Configuración para la Lambda object-validation-processor
resource "aws_lambda_function" "object_validation_processor" {
  function_name    = "marbh-object-validation-processor"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = "../dist/zips/object-validation-processor.zip"
  source_code_hash = filebase64sha256("../dist/zips/object-validation-processor.zip")
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      VALIDATION_RESULT_QUEUE_URL = aws_sqs_queue.validation_result_queue.url,
      PERM_BUCKET_NAME = aws_s3_bucket.perm_bucket.id,
      AWS_LAMBDA_LOG_LEVEL = "DEBUG",
      CHECKLIST_API_KEY = var.checklist_api_key
    }
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
}

# 4. Configuración para la Lambda validation-result-handler
resource "aws_lambda_function" "validation_result_handler" {
  function_name    = "marbh-validation-result-handler"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = "../dist/zips/validation-result-handler.zip"
  source_code_hash = filebase64sha256("../dist/zips/validation-result-handler.zip")
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      AWS_LAMBDA_LOG_LEVEL = "DEBUG",
      CHECKLIST_API_KEY = var.checklist_api_key,
      WEBHOOK_VALIDATION_SUCCESS = var.webhook_validation_success,
      WEBHOOK_VALIDATION_ERROR = var.webhook_validation_error
    }
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
}

# Trigger de S3 para invocar la Lambda bucket-file-id-extractor
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.temp_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.bucket_file_id_extractor.arn
    events              = ["s3:ObjectCreated:*"]
  }
}

# Mapping SQS file_id_extraction_queue -> new_object_validation_gatherer Lambda
resource "aws_lambda_event_source_mapping" "file_id_extraction_mapping" {
  event_source_arn = aws_sqs_queue.file_id_extraction_queue.arn
  function_name    = aws_lambda_function.new_object_validation_gatherer.arn
  batch_size       = 1
}

# Mapping SQS validation_task_queue -> object_validation_processor Lambda
resource "aws_lambda_event_source_mapping" "validation_task_mapping" {
  event_source_arn = aws_sqs_queue.validation_task_queue.arn
  function_name    = aws_lambda_function.object_validation_processor.arn
  batch_size       = 1
}

# Mapping SQS validation_result_queue -> validation_result_handler Lambda
resource "aws_lambda_event_source_mapping" "validation_result_mapping" {
  event_source_arn = aws_sqs_queue.validation_result_queue.arn
  function_name    = aws_lambda_function.validation_result_handler.arn
  batch_size       = 1
} 