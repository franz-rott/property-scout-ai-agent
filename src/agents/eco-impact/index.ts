// src/agents/eco-impact/index.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor } from 'langchain/agents';
import { copernicusApiTool } from '../../tools/copernicus-api';
import { serpApiTool } from '../../tools/serp-api';
import { createSpecialistAgent } from '../agent-factory';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0.1 });

const systemPrompt = `
You are a specialist in environmental science and ecological restoration, working for Greenzero.
Your task is to conduct a detailed ecological evaluation of a given property.

Your Process:
1.  You will be given a URL or address of a property.
2.  Use the 'getEnvironmentalData' tool with the property's coordinates to get core land monitoring data.
3.  Analyze the data to assess Land Cover, Soil Sealing, Biodiversity Potential, and Climate Resilience.
4.  If the initial data is insufficient or mentions specific features (e.g., a certain type of forest, a nearby river), use the 'webSearch' tool to find more specific local context.
5.  Synthesize all your findings into a concise, clear summary.
6.  Your final answer MUST be a JSON object with two keys: "summary" (a string with your detailed analysis) and "score" (a number between 0 and 100).
`;

// Create and export a PROMISE for the ECO agent executor.
export const ecoAgentExecutorPromise: Promise<AgentExecutor> =
  createSpecialistAgent({
    llm,
    tools: [copernicusApiTool, serpApiTool],
    systemPrompt,
  });