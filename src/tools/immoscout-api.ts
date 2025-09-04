// src/tools/immoscout-api.ts
import { McpClient } from '../mcp/client';
import config from '../utils/config';
import { PropertyListing } from '../types';

const immoScoutClient = new McpClient(
  // Use the Docker service name 'immoscout-server'
  `http://immoscout-server:${config.mcpPorts.immoScout}`
);

export const immoScoutApiTool = {
  async fetchNewListings(): Promise<PropertyListing[]> {
    try {
      const filters = config.searchFilters;
      const result = await immoScoutClient.call('fetchNewListings', {
        filters,
      });
      return result as PropertyListing[];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error fetching ImmoScout listings: ${error.message}`);
      }
      throw new Error('An unknown error occurred while fetching listings.');
    }
  },
};