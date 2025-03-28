# Entornos para Clientes

Este directorio contiene la configuración específica para cada cliente y sus diferentes entornos (desarrollo, producción, etc.).

## Estructura

```
environments/
├── cliente1/
│   ├── dev/               # Entorno de desarrollo
│   │   ├── main.tf        # Configuración principal
│   │   ├── variables.tf   # Definición de variables
│   │   ├── outputs.tf     # Outputs del entorno
│   │   └── dev.tfvars     # Valores específicos del entorno
│   └── prod/              # Entorno de producción
│       ├── main.tf        # Configuración principal
│       ├── variables.tf   # Definición de variables
│       ├── outputs.tf     # Outputs del entorno
│       └── prod.tfvars    # Valores específicos del entorno
├── cliente2/
│   ├── dev/
│   └── prod/
└── README.md              # Este archivo
```

## Cómo añadir un nuevo cliente

1. Crea un nuevo directorio con el nombre del cliente:
   ```bash
   mkdir -p cliente-nuevo/dev cliente-nuevo/prod
   ```

2. Copia los archivos base de un cliente existente:
   ```bash
   cp -r cliente1/dev/* cliente-nuevo/dev/
   cp -r cliente1/prod/* cliente-nuevo/prod/
   ```

3. Actualiza las variables en los archivos `.tfvars` con la configuración específica del cliente.

4. Actualiza el prefijo del proyecto en `main.tf`:
   ```hcl
   locals {
     project_prefix = "cliente-nuevo"
     # ...
   }
   ```

5. Crea los workspaces en Terraform Cloud:
   - Workspace: `cliente-nuevo-dev`
   - Workspace: `cliente-nuevo-prod`

6. Actualiza la referencia al workspace en `main.tf`:
   ```hcl
   terraform {
     # ...
     cloud {
       organization = "tu-organizacion"
       workspaces {
         name = "cliente-nuevo-dev" # o "cliente-nuevo-prod"
       }
     }
   }
   ```

## Variables específicas por cliente

Cada cliente necesita su propio conjunto de variables en los archivos `.tfvars`. Las variables más importantes a personalizar son:

- **Nombres de buckets**: Deben ser únicos en AWS
  ```hcl
  temp_bucket_name = "cliente-nuevo-temp-bucket-prod"
  perm_bucket_name = "cliente-nuevo-perm-bucket-prod"
  ```

- **Endpoints de webhooks**: URL específicas del cliente
  ```hcl
  webhook_checklist_data = "https://api.cliente-nuevo.com/webhooks/assignation-uploaded-files"
  webhook_validation_success = "https://api.cliente-nuevo.com/webhooks/files/update-status"
  webhook_validation_error = "https://api.cliente-nuevo.com/webhooks/files/validation-error"
  ```

- **Origen CORS**: Dominios del frontend del cliente
  ```hcl
  temp_bucket_cors_allowed_origins = ["https://app.cliente-nuevo.com"]
  ```

## Secretos y variables sensibles

Nunca incluyas variables sensibles como claves API en los archivos `.tfvars` que se suben al repositorio. En su lugar:

1. Agrégalas como variables de entorno en Terraform Cloud marcadas como "Sensitive"
2. O usa AWS Secrets Manager/Parameter Store para almacenarlas y referenciarlas desde Terraform

## Despliegue

Para desplegar la infraestructura de un cliente:

```bash
cd terraform/environments/cliente-nuevo/prod
terraform init
terraform apply -var-file=prod.tfvars
```

O si prefieres usar Terraform Cloud directamente:

```bash
terraform init
terraform plan
terraform apply
```

## Gestión del estado

El estado de la infraestructura de cada cliente se almacena en su propio workspace en Terraform Cloud, lo que permite:

- Despliegues aislados por cliente
- Gestión de permisos por cliente
- Visualización del historial de cambios específico 