// src/tools/inspire-api.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { McpClient } from '../mcp/client';
import config from '../utils/config';

// Use environment variable for hostname, defaulting to 'localhost' for local dev
const MCP_HOSTNAME = process.env.MCP_HOSTNAME || 'localhost';

// When running in Docker, use the service name instead of localhost
const getServiceUrl = (): string => {
  if (MCP_HOSTNAME === 'docker') {
    return `http://inspire-server:${config.mcpPorts.inspire}`;
  }
  return `http://localhost:${config.mcpPorts.inspire}`;
};

const inspireClient = new McpClient(getServiceUrl());

export const inspireApiTool = new DynamicStructuredTool({
  name: 'getRegulatoryData',
  description:
    'Fetches legal and regulatory data for a specific geographic location (latitude and longitude). Use this to check for zoning laws, protected area status, and other land-use restrictions.',
  schema: z.object({
    latitude: z.number().describe('The latitude of the property.'),
    longitude: z.number().describe('The longitude of the property.'),
  }),
  func: async ({ latitude, longitude }) => {
    try {
      const result = await inspireClient.call('getRegulatoryData', {
        latitude,
        longitude,
      });
      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof Error) {
        return `Error fetching INSPIRE data: ${error.message}`;
      }
      return 'An unknown error occurred while fetching regulatory data.';
    }
  },
});