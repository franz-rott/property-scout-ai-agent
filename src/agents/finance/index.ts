// src/agents/finance/index.ts
import { ChatOpenAI } from '@langchain/openai';
import { PropertyListing, FinanceEvaluation, FinanceEvaluationSchema } from '../../types';
import { serpApiTool } from '../../tools/serp-api';
import { createSpecialistAgent } from '../agent-factory';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are a financial analyst at Greenzero, specializing in real estate and sustainable investments.
Your task is to evaluate the financial feasibility of acquiring a plot of land.

Instructions:
1. You are given property details, including price and size.
2. Use the 'webSearch' tool to research comparable land prices in the property's city and region (e.g., search for 'Bodenrichtwert [city name]' or 'land prices [region name]').
3. Analyze the data to assess:
   - Market Value Comparison: How does the asking price per square meter compare to market averages in the area?
   - Potential ROI: Briefly assess the potential long-term return on investment from an ecological perspective (e.g., carbon credits, subsidies for renaturation), not just a financial one.
   - Cost Breakdown: Estimate any obvious additional costs.
4. Provide a score from 0 (financially unviable) to 100 (excellent financial value).
5. Summarize your findings concisely.
6. You MUST output your final evaluation as a raw JSON object that strictly follows the provided schema. Do not add any extra text, formatting, or markdown like \`\`\`json.
`;

export async function evaluateFinance(
  listing: PropertyListing
): Promise<FinanceEvaluation> {
  const agent = await createSpecialistAgent({
    llm: llm, // Pass the original LLM instance
    tools: [serpApiTool],
    systemPrompt,
  });

  const input = `Evaluate the following property: ${JSON.stringify(listing)}`;
  const result = await agent.invoke({ input });

  // The agent's output is a string, which we parse into our structured type
  return FinanceEvaluationSchema.parse(JSON.parse(result.output));
}