// src/agents/legal/index.ts
import { ChatOpenAI } from '@langchain/openai';
import { PropertyListing, LegalEvaluation, LegalEvaluationSchema } from '../../types';
import { inspireApiTool } from '../../tools/inspire-api';
import { serpApiTool } from '../../tools/serp-api';
import { createSpecialistAgent } from '../agent-factory';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are a legal expert specializing in German land use and environmental law for Greenzero.
Your task is to evaluate the legal viability of acquiring a plot of land.

Instructions:
1. You will be given property details. Use your tools to investigate.
2. Use the 'getRegulatoryData' tool with the property's coordinates to check zoning and protected area status.
3. Use the 'webSearch' tool if you need to research specific local regulations ('Bebauungsplan'), water protection laws ('Wasserschutzgebiet'), or recent legal news relevant to the area.
4. Analyze the data to assess:
   - Zoning Compliance: Is the land zoned appropriately for ecological projects?
   - Protected Area Status: Is the land part of a protected area (e.g., Natura 2000) that would restrict its use?
   - Potential Restrictions: Identify any other potential legal hurdles or restrictions.
5. Provide a score from 0 (major legal barriers) to 100 (legally straightforward).
6. Summarize your findings concisely.
7. You MUST output your final evaluation as a raw JSON object that strictly follows the provided schema. Do not add any extra text, formatting, or markdown like \`\`\`json.
`;

export async function evaluateLegal(
  listing: PropertyListing
): Promise<LegalEvaluation> {
  const agent = await createSpecialistAgent({
    llm: llm, // Pass the original LLM instance
    tools: [inspireApiTool, serpApiTool],
    systemPrompt,
  });

  const input = `Evaluate the following property: ${JSON.stringify(listing)}`;
  const result = await agent.invoke({ input });

  // The agent's output is a string, which we parse into our structured type
  return LegalEvaluationSchema.parse(JSON.parse(result.output));
}