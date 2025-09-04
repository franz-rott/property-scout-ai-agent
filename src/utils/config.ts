// src/utils/config.ts
import { config as dotenvConfig } from 'dotenv';
import config from 'config';

// Load environment variables from .env file
dotenvConfig();

interface AppConfig {
  appName: string;
  cronSchedule: string;
  logLevel: string;
  apiKeys: {
    openai: string;
    immoScout: string;
    serpApi: string;
    copernicus: string;
    inspire: string;
  };
  mcpPorts: {
    immoScout: number;
    serpApi: number;
    copernicus: number;
    inspire: number;
  };
  apiUrls: {
    immoScout: string;
    serpApi: string;
    copernicus: string;
    inspire: string;
  };
  searchFilters: {
    region: string;
    minSizeSqm: number;
    maxPricePerSqm: number;
    plotTypes: string[];
  };
}

const appConfig: AppConfig = {
  appName: config.get<string>('appName'),
  cronSchedule: config.get<string>('cronSchedule'),
  logLevel: process.env.LOG_LEVEL || 'info',
  apiKeys: {
    openai: process.env.OPENAI_API_KEY!,
    immoScout: process.env.IMMOSCOUT24_API_KEY!,
    serpApi: process.env.SERPAPI_API_KEY!,
    copernicus: process.env.COPERNICUS_API_KEY!,
    inspire: process.env.INSPIRE_API_KEY!,
  },
  mcpPorts: {
    immoScout: parseInt(process.env.PORT_IMMOSCOUT || '3001', 10),
    serpApi: parseInt(process.env.PORT_SERPAPI || '3002', 10),
    copernicus: parseInt(process.env.PORT_COPERNICUS || '3003', 10),
    inspire: parseInt(process.env.PORT_INSPIRE || '3004', 10),
  },
  apiUrls: {
    immoScout: config.get<string>('immoScout.baseUrl'),
    serpApi: config.get<string>('serpApi.baseUrl'),
    copernicus: config.get<string>('copernicus.baseUrl'),
    inspire: config.get<string>('inspire.baseUrl'),
  },
  searchFilters: {
    region: config.get<string>('immoScout.filters.region'),
    minSizeSqm: config.get<number>('immoScout.filters.minSizeSqm'),
    maxPricePerSqm: config.get<number>('immoScout.filters.maxPricePerSqm'),
    plotTypes: config.get<string[]>('immoScout.filters.plotTypes'),
  },
};

// Validate that essential API keys are loaded
if (!appConfig.apiKeys.openai) {
  throw new Error('Missing OPENAI_API_KEY in environment variables.');
}

export default appConfig;