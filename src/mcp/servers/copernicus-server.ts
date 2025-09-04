// src/mcp/servers/copernicus-server.ts
import express from 'express';
import config from '../../utils/config';
import logger from '../../utils/logger';
import { McpRequest, McpResponse } from '../protocols';

const app = express();
app.use(express.json());
const PORT = config.mcpPorts.copernicus;

// Mock function for Copernicus API
const getLandData = (lat: number, lon: number): any => {
  logger.info(`Mock Copernicus API: Fetching land data for coords (${lat}, ${lon})`);
  return {
    landCover: 'Predominantly agricultural land with patches of broad-leaved forest.',
    soilSealing: 'Low (2-5% impervious surfaces).',
    biodiversityPotential: 'Moderate due to proximity to mixed woodland.',
    climateResilience: 'Good, area shows low risk of soil erosion.',
  };
};

app.post('/invoke', (req, res) => {
  const { tool_name, params } = req.body as McpRequest;
  let response: McpResponse;

  if (tool_name === 'getLandMonitoringData') {
    const { latitude, longitude } = params;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      response = { status: 'error', message: 'Invalid or missing coordinates.' };
      return res.status(400).json(response);
    }
    const landData = getLandData(latitude, longitude);
    response = { status: 'success', data: landData };
    res.status(200).json(response);
  } else {
    response = { status: 'error', message: `Tool '${tool_name}' not found.` };
    res.status(404).json(response);
  }
});

app.listen(PORT, () => {
  logger.info(`Copernicus MCP Server running on http://localhost:${PORT}`);
});