// src/tools/immoscout-api.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { McpClient } from '../mcp/client';
import config from '../utils/config';

// Use environment variable for hostname, defaulting to 'localhost' for local dev
const MCP_HOSTNAME = process.env.MCP_HOSTNAME || 'localhost';

// When running in Docker, use the service name instead of localhost
const getServiceUrl = (): string => {
  if (MCP_HOSTNAME === 'docker') {
    return `http://immoscout-server:${config.mcpPorts.immoScout}`;
  }
  return `http://localhost:${config.mcpPorts.immoScout}`;
};

const immoScoutClient = new McpClient(getServiceUrl());

export const immoScoutScraperTool = new DynamicStructuredTool({
  name: 'scrapeImmoScoutListing',
  description:
    'Fetches (scrapes) the details of a single property listing from an Immobilienscout24 URL. This should be the first step in any property evaluation.',
  schema: z.object({
    url: z
      .string()
      .url()
      .describe('The full URL of the property listing on ImmoScout24.'),
  }),
  func: async ({ url }) => {
    try {
      // The MCP server's mock will return a single listing.
      const result = await immoScoutClient.call('fetchSingleListingByUrl', {
        url,
      });
      // The result from the MCP call is already an object, stringify for the LLM.
      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof Error) {
        return `Error fetching ImmoScout listing: ${error.message}`;
      }
      return 'An unknown error occurred while fetching the listing.';
    }
  },
});