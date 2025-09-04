// src/mcp/servers/immoscout-server.ts
import express from 'express';
import { v4 as uuidv4 } from 'uuid'; // Use a library for UUID generation
import config from '../../utils/config';
import logger from '../../utils/logger';
import { PropertyListing, PropertyListingSchema } from '../../types';
import { McpRequest, McpResponse } from '../protocols';

const app = express();
app.use(express.json());
const PORT = config.mcpPorts.immoScout;

// Mock function to simulate fetching data from the ImmoScout24 API
const fetchListingsFromApi = (filters: any): PropertyListing[] => {
  logger.info({ filters }, 'Mock ImmoScout API: Fetching listings');
  // In a real implementation, this would make an API call.
  // Here, we return a mocked property that matches the criteria.
  return [
    {
      id: uuidv4(),
      title: 'Großes Baugrundstück in ländlicher Lage',
      address: {
        street: 'Musterweg 10',
        city: 'Düsseldorf',
        postalCode: '40210',
        state: 'Nordrhein-Westfalen',
      },
      plotArea: 6200,
      price: 744000,
      pricePerSqm: 120,
      plotType: 'agricultural',
      url: 'https://www.immobilienscout24.de/expose/12345678',
      retrievedAt: new Date().toISOString(),
      geoCoordinates: {
        latitude: 51.2277,
        longitude: 6.7735,
      },
    },
  ];
};

app.post('/invoke', (req, res) => {
  const { tool_name, params } = req.body as McpRequest;
  let response: McpResponse;

  if (tool_name === 'fetchNewListings') {
    try {
      const listings = fetchListingsFromApi(params);
      // Validate the output against our Zod schema
      const validatedListings = listings.map(listing => PropertyListingSchema.parse(listing));
      response = { status: 'success', data: validatedListings };
      res.status(200).json(response);
    } catch (error: unknown) {
      logger.error({ error }, 'Error processing ImmoScout request');
      response = { status: 'error', message: 'Failed to fetch or validate listings.' };
      res.status(500).json(response);
    }
  } else {
    response = { status: 'error', message: `Tool '${tool_name}' not found.` };
    res.status(404).json(response);
  }
});

app.listen(PORT, () => {
  logger.info(`ImmoScout MCP Server running on http://localhost:${PORT}`);
});