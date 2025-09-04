// src/index.ts
import { CronJob } from 'cron';
import config from './utils/config';
import logger from './utils/logger';
import { immoScoutApiTool } from './tools/immoscout-api';
import { Orchestrator } from './agents/orchestrator';
import { AggregatedEvaluationSchema } from './types';
import fs from 'fs';
import path from 'path';

// This is the main function that runs the entire process.
async function runDailyScout() {
  logger.info('🚀 Starting Greenzero Daily Property Scout...');

  try {
    // Step 1: Fetch new listings using the ImmoScout tool.
    // For this example, we use a mocked response.
    const listings = await immoScoutApiTool.fetchNewListings();

    if (!listings || listings.length === 0) {
      logger.info('No new listings found today that match the criteria.');
      return;
    }

    logger.info(`Found ${listings.length} new listings to evaluate.`);

    // Step 2: Initialize the orchestrator.
    const orchestrator = new Orchestrator();

    // Step 3: Iterate through each listing and evaluate it.
    for (const listing of listings) {
      const evaluationResult = await orchestrator.evaluateProperty(listing);

      // Step 4: Validate the final output with Zod.
      const validatedOutput =
        AggregatedEvaluationSchema.parse(evaluationResult);

      // Step 5: Save the structured output to a file.
      const outputDir = path.join(__dirname, '..', 'evaluations');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      const filePath = path.join(outputDir, `${listing.id}.json`);
      fs.writeFileSync(
        filePath,
        JSON.stringify(validatedOutput, null, 2)
      );

      logger.info(
        { listingId: listing.id, path: filePath },
        `✅ Successfully evaluated and saved report for listing`
      );
      console.log(JSON.stringify(validatedOutput, null, 2));
    }
  } catch (error: unknown) {
    logger.error({ error }, 'An error occurred during the daily scout process');
  } finally {
    logger.info('Finished Greenzero Daily Property Scout run.');
  }
}

// --- Main Execution ---
// To run this system, you need to start the MCP servers first.
// In a real deployment, they would be separate processes managed by Docker Compose.
// For a simple local run: `npm run dev`
// A cron job could be set up in a production environment.

// For demonstration, we'll run the scout once immediately.
runDailyScout();

// Example of setting up a cron job for daily runs.
// const job = new CronJob(
//   config.cronSchedule,
//   runDailyScout,
//   null,
//   true,
//   'Europe/Berlin'
// );
// logger.info(`Cron job scheduled with pattern: "${config.cronSchedule}"`);
// job.start();