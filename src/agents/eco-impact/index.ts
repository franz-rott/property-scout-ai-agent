// src/agents/eco-impact/index.ts
import { ChatOpenAI } from '@langchain/openai';
import { PropertyListing, EcoImpactEvaluation, EcoImpactEvaluationSchema } from '../../types';
import { copernicusApiTool } from '../../tools/copernicus-api';
import { serpApiTool } from '../../tools/serp-api';
import { createSpecialistAgent } from '../agent-factory';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are an expert in environmental science and ecological restoration, working for Greenzero.
Your task is to evaluate the ecological potential of a given plot of land.

Instructions:
1. You will be given property details as input. Use the provided tools to gather data.
2. Use the 'getEnvironmentalData' tool with the property's coordinates to get core ecological data.
3. Use the 'webSearch' tool if you need additional context, such as local biodiversity initiatives, climate risks, or soil type information not covered by the primary tool.
4. Analyze the data to assess:
   - Land Cover: What is the current state of the land (e.g., forest, agricultural)?
   - Soil Sealing: How much of the area is covered by artificial surfaces? Lower is better.
   - Biodiversity Potential: What is the potential for improving biodiversity? Consider proximity to forests, water bodies, etc.
   - Climate Resilience: How resilient is the area to climate change factors like drought or flooding?
5. Provide a score from 0 (very poor) to 100 (excellent ecological potential).
6. Summarize your findings in a concise summary.
7. You MUST output your final evaluation as a raw JSON object that strictly follows the provided schema. Do not add any extra text, formatting, or markdown like \`\`\`json.
`;

export async function evaluateEcoImpact(
  listing: PropertyListing
): Promise<EcoImpactEvaluation> {
  const agent = await createSpecialistAgent({
    llm: llm, // Pass the original LLM instance
    tools: [copernicusApiTool, serpApiTool],
    systemPrompt,
  });

  const input = `Evaluate the following property: ${JSON.stringify(listing)}`;
  const result = await agent.invoke({ input });

  // The agent's output is a string, which we parse into our structured type
  return EcoImpactEvaluationSchema.parse(JSON.parse(result.output));
}