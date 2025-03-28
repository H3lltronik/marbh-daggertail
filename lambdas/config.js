/**
 * Configuration file for lambdas in the project
 * This centralizes the list of lambdas to avoid duplication across build scripts
 */

// List of all lambdas in the project
export const lambdas = [
  'bucket-file-id-extractor',
  'new-object-validation-gatherer',
  'object-validation-processor',
  'validation-result-handler',
  'dlq-processor'
];

// Export default for ES modules
export default lambdas; 