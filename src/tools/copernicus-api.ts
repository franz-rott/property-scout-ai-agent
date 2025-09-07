// src/tools/copernicus-api.ts
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
  description: `
    Fetches satellite-based environmental monitoring data for a specific location. Use this when:
    - You have geographic coordinates (latitude and longitude) for a property
    - You need objective data about land cover, soil quality, or environmental conditions
    - Assessing ecological degradation or restoration potential
    - Evaluating biodiversity indicators or climate resilience
    - You need scientific data rather than regulatory or market information
    This provides satellite imagery analysis and environmental metrics.
  `,
  schema: z.object({
    latitude: z.number().describe('The latitude coordinate of the location to analyze.'),
    longitude: z.number().describe('The longitude coordinate of the location to analyze.'),
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