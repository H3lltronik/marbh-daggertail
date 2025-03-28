# Guía de Terraform Cloud para Múltiples Clientes

Esta guía explica cómo utilizar Terraform Cloud para gestionar la infraestructura de múltiples clientes utilizando nuestro sistema modular de Terraform.

## Estructura del proyecto

```
terraform/
├── modules/              # Módulos reutilizables
│   ├── lambda/           # Configuración de funciones Lambda
│   ├── s3/               # Configuración de buckets S3
│   └── sqs/              # Configuración de colas SQS
├── environments/         # Configuraciones por entorno
│   ├── cliente1/
│   │   ├── dev/
│   │   └── prod/
│   └── cliente2/
│       ├── dev/
│       └── prod/
└── README_TERRAFORM_CLOUD.md  # Esta guía
```

## Requisitos

1. Cuenta en [Terraform Cloud](https://app.terraform.io/)
2. Permisos para crear workspaces y configurar variables
3. Credenciales de AWS configuradas
4. Terraform CLI instalado localmente (para desarrollo)

## Configuración inicial en Terraform Cloud

### 1. Crear una organización

- Inicia sesión en [Terraform Cloud](https://app.terraform.io/)
- Crea una nueva organización o usa una existente
- Ve a "Settings" > "General" para obtener el nombre de la organización

### 2. Configurar la integración con VCS (opcional)

- Ve a "Settings" > "Version Control"
- Conecta tu proveedor de VCS (GitHub, GitLab, etc.)
- Sigue las instrucciones para autorizar Terraform Cloud

### 3. Crear workspaces para cada cliente/entorno

Para cada cliente y entorno, crea un workspace:

1. Ve a "Workspaces" > "New workspace"
2. Selecciona "CLI-driven workflow" (o VCS si integraste un repo)
3. Nombre del workspace: `cliente1-prod`, `cliente1-dev`, etc.
4. Configura la ejecución automática según tus necesidades

### 4. Configurar variables en Terraform Cloud

Para cada workspace, configura las variables necesarias:

1. Ve al workspace > "Variables"
2. Agrega las variables específicas del cliente como "Terraform variables":
   - `temp_bucket_name`
   - `perm_bucket_name`
   - `webhook_checklist_data`
   - `webhook_validation_success`
   - `webhook_validation_error`
   - `temp_bucket_cors_allowed_origins`

3. Agrega las variables sensibles como secretos:
   - `checklist_api_key` (marca como "Sensitive")
   
4. Agrega credenciales de AWS como "Environment variables":
   - `AWS_ACCESS_KEY_ID` (marca como "Sensitive")
   - `AWS_SECRET_ACCESS_KEY` (marca como "Sensitive")
   - `AWS_DEFAULT_REGION`

## Uso desde la línea de comandos

### Inicializar un directorio con Terraform Cloud

1. Navega al directorio del entorno del cliente:
   ```bash
   cd terraform/environments/cliente1/prod
   ```

2. Inicializa Terraform con el workspace remoto:
   ```bash
   terraform init
   ```

3. Verifica la configuración:
   ```bash
   terraform plan
   ```
   
   Nota: El plan debería mostrar que está utilizando el workspace remoto de Terraform Cloud.

### Aplicar cambios

1. Aplica los cambios localmente para subirlos a Terraform Cloud:
   ```bash
   terraform apply
   ```
   
   Esto iniciará una ejecución en Terraform Cloud que puedes monitorear en la interfaz web.

## Uso desde la interfaz web de Terraform Cloud

1. Ve al workspace en Terraform Cloud
2. Haz clic en "Actions" > "Start new run"
3. Selecciona "Plan and apply" para aplicar los cambios

## Gestión de variables con archivos .tfvars

Cada directorio de cliente/entorno tiene su propio archivo `.tfvars`:

- `terraform/environments/cliente1/prod/prod.tfvars`
- `terraform/environments/cliente1/dev/dev.tfvars`
- etc.

Estos archivos contienen la configuración específica para cada entorno:

```hcl
# ejemplo de prod.tfvars
temp_bucket_name = "cliente1-temp-bucket-prod"
perm_bucket_name = "cliente1-perm-bucket-prod"
webhook_checklist_data = "https://api.cliente1.com/webhooks/assignation-uploaded-files"
# ... otras variables específicas del entorno
```

### Cargar archivos .tfvars en Terraform Cloud

Puedes cargar el contenido de un archivo .tfvars como variables en Terraform Cloud:

1. Ve al workspace > "Variables"
2. Haz clic en "Add variable"
3. Selecciona "Load from .tfvars file"
4. Sube el archivo `.tfvars` correspondiente

## Mejores prácticas

1. **Nomenclatura coherente**: Usa un prefijo claro para cada cliente en todos los recursos
2. **Variables específicas por cliente**: Mantén variables separadas para cada cliente
3. **Secretos**: Nunca guardes secretos en archivos `.tfvars` que se suban al repositorio
4. **Documentación**: Mantén un registro de cada workspace y su propósito
5. **Acceso por equipos**: Usa la función de equipos de Terraform Cloud para gestionar permisos

## Comandos útiles

```bash
# Ver estado del workspace remoto
terraform state list

# Importar un recurso existente
terraform import aws_s3_bucket.example cliente1-bucket-name

# Refrescar el estado sin aplicar cambios
terraform refresh
```

## Resolución de problemas

- **Error de autenticación**: Verifica las credenciales de AWS
- **Error de permisos**: Asegúrate de tener los permisos correctos en Terraform Cloud
- **Error de recursos**: Verifica que los nombres de recursos no colisionen entre clientes
- **Error de dependencias**: Asegúrate de que los módulos estén correctamente referenciados

## Documentación adicional

- [Terraform Cloud](https://www.terraform.io/cloud-docs)
- [CLI-driven Runs](https://www.terraform.io/cloud-docs/run/cli) 