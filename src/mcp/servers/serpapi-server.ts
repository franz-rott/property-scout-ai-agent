// src/mcp/servers/serpapi-server.ts
import express from 'express';
import config from '../../utils/config';
import logger from '../../utils/logger';
import { McpRequest, McpResponse } from '../protocols';

const app = express();
app.use(express.json());
const PORT = config.mcpPorts.serpApi;

// Mock function for SerpAPI web search
const performWebSearch = (query: string): any => {
  logger.info(`Mock SerpAPI: Performing search for "${query}"`);
  // In a real implementation, this would call the SerpAPI.
  return {
    organic_results: [
      {
        position: 1,
        title: `Results for ${query}`,
        snippet: 'This is a mocked search result snippet providing context about the query.',
      },
    ],
  };
};

app.post('/invoke', (req, res) => {
  const { tool_name, params } = req.body as McpRequest;
  let response: McpResponse;

  if (tool_name === 'search') {
    if (!params.query || typeof params.query !== 'string') {
      response = { status: 'error', message: "Missing or invalid 'query' parameter." };
      return res.status(400).json(response);
    }
    const searchResults = performWebSearch(params.query);
    response = { status: 'success', data: searchResults };
    res.status(200).json(response);
  } else {
    response = { status: 'error', message: `Tool '${tool_name}' not found.` };
    res.status(404).json(response);
  }
});

app.listen(PORT, () => {
  logger.info(`SerpAPI MCP Server running on http://localhost:${PORT}`);
});