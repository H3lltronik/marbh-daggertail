# Marbh Lambdas

Este proyecto proporciona una serie de funciones AWS Lambda para gestionar el proceso de validación y procesamiento de archivos.

## Estructura del proyecto

```
project/
├── core/                 # Dominio y servicios compartidos 
│   ├── aws/              # Servicios de infraestructura para AWS (S3, SQS)
│   ├── integrations/     # Adaptadores para servicios externos
│   └── shared/           # Tipos, excepciones, utilidades
├── lambdas/              # Funciones Lambda (casos de uso)
│   ├── bucket-file-id-extractor/       # Extrae ID del nombre del archivo 
│   ├── new-object-validation-gatherer/ # Obtiene metadatos para validación
│   ├── object-validation-processor/    # Valida el objeto contra las reglas
│   └── validation-result-handler/      # Envía resultados mediante webhooks
├── dist/                 # Código compilado (generado al construir)
│   ├── [lambda-name]/    # Cada lambda tiene su propio directorio
│   └── zips/             # Archivos ZIP listos para desplegar
├── terraform/            # Configuración de infraestructura como código
├── build.js              # Script de compilación con esbuild
└── zip-lambdas.js        # Script para crear ZIPs de despliegue
```

## Arquitectura

Este proyecto sigue una arquitectura orientada al dominio, con una clara separación entre:

- **Dominio**: Tipos, lógica y reglas de negocio fundamentales
- **Aplicación**: Lambdas que implementan casos de uso específicos
- **Infraestructura**: Servicios que interactúan con AWS y otros sistemas externos

## Flujo de las Lambdas

1. **bucket-file-id-extractor**: Se activa cuando se sube un objeto a S3. Extrae el ID del nombre del archivo y envía un mensaje a SQS.
2. **new-object-validation-gatherer**: Recibe el mensaje con el ID y consulta los metadatos del checklist. Envía estos datos a la siguiente cola.
3. **object-validation-processor**: Realiza la validación del objeto basada en los metadatos obtenidos. Si es válido, mueve el objeto al bucket definitivo y le asigna un nuevo nombre basado en UUID.
4. **validation-result-handler**: Comunica el resultado de la validación mediante webhooks externos.

## Tecnologías Utilizadas

- TypeScript
- AWS SDK v3 (para S3 y SQS)
- Terraform (para infraestructura como código)
- esbuild (para compilación optimizada)
- Jest (para pruebas)
- mime-types (para detección de tipos MIME)
- uuid (para generación de identificadores únicos)

## Configuración y Desarrollo

### Requisitos previos

- Node.js 20.x o superior
- AWS CLI configurado con credenciales
- Terraform (opcional, solo para despliegue de infraestructura)

### Instalación

```bash
npm install
```

### Scripts disponibles

- `npm run build`: Compila el proyecto con esbuild
- `npm run lint`: Ejecuta el linter para verificar el código
- `npm run test`: Ejecuta las pruebas unitarias
- `npm run zip`: Crea los archivos ZIP para despliegue
- `npm run deploy:aws`: Ejecuta la compilación, empaquetado y despliegue en AWS

## Despliegue

El despliegue puede realizarse a través de Terraform:

```bash
npm run terraform:apply:prod
```

O mediante el script combinado:

```bash
npm run deploy:aws
```

## Variables de entorno

- `FILE_ID_EXTRACTION_QUEUE_URL`: URL de la cola SQS para procesar IDs extraídos
- `VALIDATION_QUEUE_URL`: URL de la cola SQS para la validación
- `VALIDATION_RESULT_QUEUE_URL`: URL de la cola SQS para los resultados de validación
- `PERM_BUCKET_NAME`: Nombre del bucket permanente donde se mueven los archivos válidos
- `WEBHOOK_CHECKLIST_DATA`: URL del webhook para obtener datos del checklist
- `WEBHOOK_VALIDATION_SUCCESS`: URL del webhook para notificar validaciones exitosas
- `WEBHOOK_VALIDATION_ERROR`: URL del webhook para notificar errores de validación
- `CHECKLIST_API_KEY`: Clave de API para el checklist (si es necesario)
- `IS_LOCAL`: Establece a "true" para desarrollo local

## Características clave

- **Validación de archivos**: Verifica el tipo MIME, tamaño y límites de archivos
- **Renombrado de objetos**: Transforma los nombres de archivos a formato UUID
- **Procesamiento asíncrono**: Utiliza colas SQS para comunicación entre lambdas
- **Notificaciones de estado**: Envía resultados de validación a través de webhooks
- **Optimización para Lambda**: Bundles livianos con tiempo de arranque rápido 