// src/mcp/servers/inspire-server.ts
import express from 'express';
import config from '../../utils/config';
import logger from '../../utils/logger';
import { McpRequest, McpResponse } from '../protocols';

const app = express();
app.use(express.json());
const PORT = config.mcpPorts.inspire;

// Mock function for INSPIRE Geoportal API
const getLegalData = (lat: number, lon: number): any => {
  logger.info(`Mock INSPIRE API: Fetching legal data for coords (${lat}, ${lon})`);
  return {
    zoningCompliance: 'Designated as agricultural land (Flächennutzungsplan: Landwirtschaft).',
    protectedAreaStatus: 'Outside of major protected zones (Natura 2000, etc.).',
    potentialRestrictions: [
      'Standard agricultural land use regulations apply.',
      'Proximity to a small, locally protected stream may require a buffer zone.',
    ],
  };
};

app.post('/invoke', (req, res) => {
  const { tool_name, params } = req.body as McpRequest;
  let response: McpResponse;

  if (tool_name === 'getRegulatoryData') {
    const { latitude, longitude } = params;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      response = { status: 'error', message: 'Invalid or missing coordinates.' };
      return res.status(400).json(response);
    }
    const legalData = getLegalData(latitude, longitude);
    response = { status: 'success', data: legalData };
    res.status(200).json(response);
  } else {
    response = { status: 'error', message: `Tool '${tool_name}' not found.` };
    res.status(404).json(response);
  }
});

app.listen(PORT, () => {
  logger.info(`INSPIRE MCP Server running on http://localhost:${PORT}`);
});