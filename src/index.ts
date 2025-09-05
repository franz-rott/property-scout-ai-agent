// src/index.ts
import { startServer } from './server';
import logger from './utils/logger';

// The main function now simply starts the interactive server.
async function main() {
  logger.info('🚀 Starting Greenzero Analyst Assistant Server...');
  startServer();
}

main().catch(error => {
  logger.error({ error }, 'Failed to start the server.');
  process.exit(1);
});