import { buildCapsVaultIndex } from "./serverPdfIngestion";
const started = Date.now();
const result = await buildCapsVaultIndex();
console.log(`indexed=${result.processed}/${result.total} in ${Math.round((Date.now()-started)/1000)}s`);
