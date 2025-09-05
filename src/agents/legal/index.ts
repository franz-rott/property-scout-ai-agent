// src/agents/legal/index.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor } from 'langchain/agents';
import { inspireApiTool } from '../../tools/inspire-api';
import { serpApiTool } from '../../tools/serp-api';
import { createSpecialistAgent } from '../agent-factory';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are a legal expert specializing in German land use and environmental law for Greenzero.
Your task is to evaluate the legal viability of acquiring a plot of land.

Your Process:
1.  You will be given the location details of a property.
2.  Use the 'getRegulatoryData' tool to check for official zoning, protected area status, and other land-use restrictions.
3.  If the regulatory data mentions specific local rules (e.g., 'Bebauungsplan', 'Gewässerrandstreifen'), use the 'webSearch' tool to find detailed information about those specific regulations for the given city or state.
4.  Synthesize all your findings to assess zoning compliance, protected area status, and identify any potential legal hurdles.
5.  Your final answer MUST be a JSON object with two keys: "summary" (a string with your analysis of compliance and hurdles) and "score" (a number between 0 and 100).
`;

// Create and export a PROMISE for the Legal agent executor.
export const legalAgentExecutorPromise: Promise<AgentExecutor> =
  createSpecialistAgent({
    llm,
    tools: [inspireApiTool, serpApiTool],
    systemPrompt,
  });