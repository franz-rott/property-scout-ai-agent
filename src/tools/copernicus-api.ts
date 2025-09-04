// src/tools/copernicus-api.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { McpClient } from '../mcp/client';
import config from '../utils/config';

const copernicusClient = new McpClient(
  // Use the Docker service name 'copernicus-server'
  `http://copernicus-server:${config.mcpPorts.copernicus}`
);

export const copernicusApiTool = new DynamicStructuredTool({
  name: 'getEnvironmentalData',
  description:
    'Fetches environmental and land monitoring data for a specific geographic location (latitude and longitude). Use this to assess land cover, soil quality, and other ecological factors.',
  schema: z.object({
    latitude: z.number().describe('The latitude of the property.'),
    longitude: z.number().describe('The longitude of the property.'),
  }),
  func: async ({ latitude, longitude }) => {
    try {
      const result = await copernicusClient.call('getLandMonitoringData', {
        latitude,
        longitude,
      });
      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof Error) {
        return `Error fetching Copernicus data: ${error.message}`;
      }
      return 'An unknown error occurred while fetching environmental data.';
    }
  },
});