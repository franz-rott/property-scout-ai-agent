// src/agents/finance/index.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor } from 'langchain/agents';
import { serpApiTool } from '../../tools/serp-api';
import { createSpecialistAgent } from '../agent-factory';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are a financial analyst at Greenzero, specializing in real estate and sustainable investments.
Your goal is to evaluate the financial feasibility of acquiring a plot of land.

Your Process:
1.  You will be given the details of a property, including its price and location.
2.  Use the 'webSearch' tool to find the average land prices ('Bodenrichtwert') for the property's city and state to establish a market comparison.
3.  Analyze the asking price against the market data.
4.  Briefly consider the potential long-term ecological ROI (e.g., potential for carbon credits, subsidies), not just financial.
5.  Synthesize your findings. Your final answer MUST be a JSON object with two keys: "summary" (a string with your analysis) and "score" (a number between 0 and 100).
`;

// Create and export a PROMISE for the Finance agent executor.
export const financeAgentExecutorPromise: Promise<AgentExecutor> =
  createSpecialistAgent({
    llm,
    tools: [serpApiTool],
    systemPrompt,
  });   