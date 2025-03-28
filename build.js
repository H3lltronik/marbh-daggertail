import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

// Lista de las lambdas que queremos compilar
const lambdas = [
  'bucket-file-id-extractor',
  'new-object-validation-gatherer',
  'object-validation-processor',
  'validation-result-handler'
];

// Función auxiliar para asegurar que un directorio existe
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directorio creado: ${dirPath}`);
  }
}

// Función principal para compilar cada lambda
async function buildLambdas() {
  console.log('Iniciando compilación de lambdas...');
  
  // Asegurarnos que el directorio dist existe
  const distDir = path.join(process.cwd(), 'dist');
  ensureDirectoryExists(distDir);
  
  // Compilar cada lambda
  for (const lambda of lambdas) {
    console.log(`\nCompilando lambda: ${lambda}...`);
    
    // Crear el directorio para esta lambda
    const lambdaDistDir = path.join(distDir, lambda);
    ensureDirectoryExists(lambdaDistDir);
    
    try {
      // Configurar la compilación
      await build({
        entryPoints: [path.join(process.cwd(), 'lambdas', lambda, 'index.ts')],
        bundle: true,
        minify: true,
        sourcemap: 'external', // Generar sourcemaps para debuggear más fácilmente
        platform: 'node',
        target: 'node16', // Usar la versión de Node que sea compatible con Lambda
        outfile: path.join(lambdaDistDir, 'index.js'),
        external: [
          // Dependencias que son proporcionadas por el entorno de AWS Lambda
          '@aws-sdk/client-s3',
          '@aws-sdk/client-sqs'
        ],
        define: {
          // Usar estas variables para optimizar el bundle
          'process.env.NODE_ENV': '"production"',
        },
        // Necesario para garantizar que las variables de entorno se pasen correctamente
        inject: [path.join(process.cwd(), 'env-inject.js')],
        // No compilar los módulos de AWS SDK, son demasiado grandes
        // packages: 'external', // Comentamos esta línea para incluir todas las dependencias excepto las listadas en 'external'
        // Evitar problemas con dependencias dinámicas
        mainFields: ['module', 'main'],
      });
      
      console.log(`✅ Lambda ${lambda} compilada exitosamente`);
    } catch (error) {
      console.error(`❌ Error compilando lambda ${lambda}:`, error);
      process.exitCode = 1;
    }
  }
}

// Crear archivo inyector de variables de entorno
const envInjectFile = path.join(process.cwd(), 'env-inject.js');
const envInjectContent = `
// Este archivo se inyecta en cada lambda para asegurar que las variables de entorno 
// estén disponibles en tiempo de ejecución
export {}; // Necesario para TypeScript
`;
fs.writeFileSync(envInjectFile, envInjectContent);

// Ejecutar la compilación
buildLambdas().then(() => {
  console.log('\n🎉 Todas las lambdas fueron compiladas exitosamente');
  // Limpiar archivo temporal
  if (fs.existsSync(envInjectFile)) {
    fs.unlinkSync(envInjectFile);
  }
}).catch(err => {
  console.error('Error en el proceso de compilación:', err);
  process.exitCode = 1;
  // Limpiar archivo temporal en caso de error
  if (fs.existsSync(envInjectFile)) {
    fs.unlinkSync(envInjectFile);
  }
}); 