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
// This now returns a single, detailed object representing a scraped page.
const fetchListingByUrl = (url: string): PropertyListing => {
  logger.info({ url }, 'Mock ImmoScout API: Fetching single listing by URL');
  // In a real implementation, this would scrape the URL.
  // Here, we return a consistent mocked property.
  return {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    title: 'Großes Agrarlandstück bei Düsseldorf',
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
    url: url, // Return the requested URL
    retrievedAt: new Date().toISOString(),
    geoCoordinates: {
      latitude: 51.2277,
      longitude: 6.7735,
    },
  };
};

app.post('/invoke', (req, res) => {
  const { tool_name, params } = req.body as McpRequest;
  let response: McpResponse;

  if (tool_name === 'fetchSingleListingByUrl') {
    try {
      if (!params.url || typeof params.url !== 'string') {
        response = {
          status: 'error',
          message: "Missing or invalid 'url' parameter.",
        };
        return res.status(400).json(response);
      }
      const listing = fetchListingByUrl(params.url);
      // Validate the output against our Zod schema
      const validatedListing = PropertyListingSchema.parse(listing);
      response = { status: 'success', data: validatedListing };
      res.status(200).json(response);
    } catch (error: unknown) {
      logger.error({ error }, 'Error processing ImmoScout request');
      response = {
        status: 'error',
        message: 'Failed to fetch or validate listing.',
      };
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