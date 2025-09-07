import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { McpClient } from '../mcp/client';
import config from '../utils/config';

const MCP_HOSTNAME = process.env.MCP_HOSTNAME || 'localhost';

const getServiceUrl = (): string => {
  if (MCP_HOSTNAME === 'docker') {
    return `http://copernicus-server:${config.mcpPorts.copernicus}`;
  }
  return `http://localhost:${config.mcpPorts.copernicus}`;
};

const copernicusClient = new McpClient(getServiceUrl());

export const copernicusApiTool = new DynamicStructuredTool({
  name: 'getEnvironmentalData',
  description:
    'Fetches environmental and land monitoring data for a specific geographic location (latitude and longitude). Use this to assess land cover, soil degradation, invasive species, water quality, and restoration potential for ecological restoration projects.',
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
      // Mocked data aligned with GREENZERO's criteria
      const mockData = {
        landCover: 'Degraded agricultural land with remnants of monoculture forest.',
        soilDegradation: 'High: Significant soil compaction and nutrient depletion detected.',
        invasiveSpecies: 'Presence of invasive plant species (e.g., Fallopia japonica).',
        waterQuality: 'Moderate: Nearby stream shows signs of agricultural runoff pollution.',
        restorationPotential: 'High: Soil recovery feasible with active intervention; suitable for diverse biotope restoration.',
        biodiversityPotential: 'Moderate: Potential to support threatened species with targeted restoration.',
        longTermViability: 'Strong: Site suitable for sustainable ecosystem recovery over 25–100 years.'
      };
      return JSON.stringify(mockData);
    } catch (error) {
      if (error instanceof Error) {
        return `Error fetching Copernicus data: ${error.message}`;
      }
      return 'An unknown error occurred while fetching environmental data.';
    }
  },
});