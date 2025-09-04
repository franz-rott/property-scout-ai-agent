// src/tools/serp-api.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { McpClient } from '../mcp/client';
import config from '../utils/config';

const serpApiClient = new McpClient(
  // Use the Docker service name 'serpapi-server'
  `http://serpapi-server:${config.mcpPorts.serpApi}`
);

export const serpApiTool = new DynamicStructuredTool({
  name: 'webSearch',
  description:
    'Performs a web search to find up-to-date information, news, or context on a given topic. Input should be a concise search query.',
  schema: z.object({
    query: z.string().describe('The search query to execute.'),
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