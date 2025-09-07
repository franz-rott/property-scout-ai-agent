// src/tools/serp-api.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { McpClient } from '../mcp/client';
import config from '../utils/config';

// Use environment variable for hostname, defaulting to 'localhost' for local dev
const MCP_HOSTNAME = process.env.MCP_HOSTNAME || 'localhost';

// When running in Docker, use the service name instead of localhost
const getServiceUrl = (): string => {
  if (MCP_HOSTNAME === 'docker') {
    return `http://serpapi-server:${config.mcpPorts.serpApi}`;
  }
  return `http://localhost:${config.mcpPorts.serpApi}`;
};

const serpApiClient = new McpClient(getServiceUrl());

export const serpApiTool = new DynamicStructuredTool({
  name: 'webSearch',
  description: `
    Performs a web search to find current information on any topic. Use this when:
    - The user asks about current events, news, or recent developments
    - You need specific information about German regulations or local laws
    - Market data, prices, or economic information is required
    - You need to research topics not covered by the specialist tools
    - The user asks general questions about land development, ecology, or sustainability
    This is a versatile tool for gathering any web-based information.
  `,
  schema: z.object({
    query: z.string().describe('The search query to execute. Be specific and concise.'),
  }),
  func: async ({ query }) => {
    try {
      const result = await serpApiClient.call('search', { query });
      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof Error) {
        return `Error performing web search: ${error.message}`;
      }
      return 'An unknown error occurred during web search.';
    }
  },
});