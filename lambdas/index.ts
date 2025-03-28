/**
 * Este archivo sirve como punto de entrada para todas las lambdas
 * Facilita la importación y exportación de las funciones lambda
 */

// Exportar handlers de las lambdas
export { handler as bucketFileIdExtractorHandler } from "./bucket-file-id-extractor";
export { handler as newObjectValidationGathererHandler } from "./new-object-validation-gatherer";
export { handler as objectValidationProcessorHandler } from "./object-validation-processor";
export { handler as validationResultHandlerHandler } from "./validation-result-handler";

// Exportar tipos si es necesario
export * from "../core/shared/types"; 