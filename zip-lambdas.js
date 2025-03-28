import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Lista de las lambdas que queremos empaquetar
const lambdas = [
  "bucket-file-id-extractor",
  "new-object-validation-gatherer",
  "object-validation-processor",
  "validation-result-handler",
];

// Función principal
const main = () => {
  // Paths
  const distDir = path.join(process.cwd(), "dist");
  const zipDir = path.join(process.cwd(), "dist", "zips");

  // Asegurar que el directorio de zips existe
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
    console.log(`Directorio creado: ${zipDir}`);
  }

  console.log("Creando archivos ZIP para las lambdas compiladas...");
  
  // Verificar que existan las lambdas compiladas
  let existingLambdas = [];
  for (const lambda of lambdas) {
    const lambdaPath = path.join(distDir, lambda);
    if (fs.existsSync(lambdaPath)) {
      existingLambdas.push(lambda);
    } else {
      console.warn(`⚠️ La lambda ${lambda} no está compilada. Ejecuta primero 'npm run build'.`);
    }
  }

  if (existingLambdas.length === 0) {
    console.error("❌ No se encontraron lambdas compiladas en el directorio dist/");
    console.error("Asegúrate de ejecutar primero el script build.js");
    process.exitCode = 1;
    return;
  }

  console.log(
    `📦 Se encontraron ${existingLambdas.length} lambda(s) compiladas: ${existingLambdas.join(", ")}`,
  );

  // Crear ZIP para cada lambda
  let zippedCount = 0;
  let failedCount = 0;

  for (const lambda of existingLambdas) {
    const zipFile = path.join(zipDir, `${lambda}.zip`);
    const lambdaDir = path.join(distDir, lambda);

    console.log(`\n--- Creando ZIP para la lambda: ${lambda} ---`);

    try {
      // Eliminar el ZIP existente si existe
      if (fs.existsSync(zipFile)) {
        fs.unlinkSync(zipFile);
        console.log(`Eliminado ZIP existente: ${zipFile}`);
      }

      // Obtener los archivos en el directorio de la lambda
      const files = fs.readdirSync(lambdaDir)
        .filter(file => file.endsWith(".js") || file.endsWith(".js.map"));
      
      if (files.length === 0) {
        console.warn(`⚠️ No se encontraron archivos JS en ${lambdaDir}`);
        failedCount++;
        continue;
      }
      
      // Crear el ZIP con los archivos de la lambda
      for (const file of files) {
        const filePath = path.join(lambdaDir, file);
        console.log(`Agregando ${file} al ZIP...`);
        
        // Crear el ZIP con el primer archivo o agregar archivos adicionales
        if (file === files[0]) {
          execSync(`zip -j "${zipFile}" "${filePath}"`, { stdio: "inherit" });
        } else {
          execSync(`zip -j -u "${zipFile}" "${filePath}"`, { stdio: "inherit" });
        }
      }

      console.log(`✅ ZIP creado exitosamente para ${lambda}: ${zipFile}`);
      zippedCount++;
    } catch (error) {
      console.error(`❌ Error creando ZIP para ${lambda}:`, error.message);
      failedCount++;
    }
  }

  // Resumen
  console.log("\n--- Resumen de creación de ZIPs ---");
  console.log(`Total de lambdas: ${existingLambdas.length}`);
  console.log(`ZIPs creados exitosamente: ${zippedCount}`);
  console.log(`Fallidos: ${failedCount}`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    console.log("\n🎉 ¡Todos los ZIPs fueron creados exitosamente!");
    console.log(`Los archivos ZIP están disponibles en: ${zipDir}`);
  }
};

// Ejecutar la función principal
main(); 