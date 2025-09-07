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
  description: `
    Fetches official regulatory and legal data for a specific location from government databases. Use this when:
    - You have geographic coordinates and need official zoning information
    - Checking for protected area designations (Natura 2000, nature reserves)
    - Verifying land use classifications from official sources
    - Identifying regulatory restrictions or compliance requirements
    - You need authoritative government data rather than general web information
    This provides official regulatory status from European and German databases.
  `,
  schema: z.object({
    latitude: z.number().describe('The latitude coordinate for regulatory lookup.'),
    longitude: z.number().describe('The longitude coordinate for regulatory lookup.'),
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