// src/agents/orchestrator/index.ts
import { PropertyListing } from '../../types';
import logger from '../../utils/logger';
import { appGraph } from './graph';

export class Orchestrator {
  async evaluateProperty(listing: PropertyListing): Promise<any> {
    logger.info(`Starting evaluation for property ID: ${listing.id}`);

    const initialState = {
      propertyListing: listing,
    };

    // LangGraph's .stream() or .invoke() can be used here.
    // We'll use invoke for a complete final result.
    const finalState = await appGraph.invoke(initialState);

    logger.info(`Evaluation complete for property ID: ${listing.id}`);
    return finalState.finalEvaluation;
  }
}