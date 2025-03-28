import fs from 'node:fs';
import path from 'node:path';
import { lambdas } from './lambdas/config.js';

/**
 * Script para listar las lambdas disponibles en el proyecto
 * Muestra información sobre cada lambda, incluyendo:
 * - Si está compilada
 * - Si está empaquetada en ZIP
 * - Tamaño del archivo index.ts
 */

// Función auxiliar para obtener el tamaño del archivo
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

// Función auxiliar para formatear el tamaño
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función auxiliar para verificar si un directorio existe
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// Función auxiliar para verificar si un archivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

// Función principal
function listLambdas() {
  console.log('🔍 Listando lambdas disponibles en el proyecto...\n');
  
  const distDir = path.join(process.cwd(), 'dist');
  const zipDir = path.join(distDir, 'zips');
  const lambdasDir = path.join(process.cwd(), 'lambdas');
  
  // Cabecera de la tabla
  console.log('| Lambda | Código Fuente | Compilada | ZIP | Tamaño index.ts |');
  console.log('|--------|--------------|-----------|-----|-----------------|');
  
  lambdas.forEach(lambda => {
    const sourceDir = path.join(lambdasDir, lambda);
    const indexFile = path.join(sourceDir, 'index.ts');
    const compiledDir = path.join(distDir, lambda);
    const compiledFile = path.join(compiledDir, 'index.js');
    const zipFile = path.join(zipDir, `${lambda}.zip`);
    
    const hasSource = dirExists(sourceDir) && fileExists(indexFile);
    const isCompiled = dirExists(compiledDir) && fileExists(compiledFile);
    const isZipped = fileExists(zipFile);
    
    const sourceSize = hasSource ? getFileSize(indexFile) : 0;
    const formattedSize = hasSource ? formatSize(sourceSize) : 'N/A';
    
    console.log(
      `| ${lambda.padEnd(6)} | ${hasSource ? '✅' : '❌'} | ${isCompiled ? '✅' : '❌'} | ${isZipped ? '✅' : '❌'} | ${formattedSize.padEnd(15)} |`
    );
  });
  
  console.log('\n📝 Información adicional:');
  console.log('- Para compilar las lambdas: npm run build');
  console.log('- Para crear los ZIPs: npm run zip-lambdas');
}

// Ejecutar la función principal
listLambdas(); 