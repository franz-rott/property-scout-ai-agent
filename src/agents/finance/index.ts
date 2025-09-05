// src/agents/finance/index.ts
import { ChatOpenAI } from '@langchain/openai';
import {
  PropertyListing,
  FinanceEvaluation,
  FinanceEvaluationSchema,
} from '../../types';
import { serpApiTool } from '../../tools/serp-api';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are a financial analyst at Greenzero, specializing in real estate and sustainable investments.
Your task is to evaluate the financial feasibility of acquiring a plot of land.

Analyze the data to assess:
 - Market Value Comparison: How does the asking price per square meter compare to market averages in the area?
 - Potential ROI: Briefly assess the potential long-term return on investment from an ecological perspective (e.g., carbon credits, subsidies for renaturation), not just a financial one.
 - Cost Breakdown: Estimate any obvious additional costs (e.g., land survey, legal fees, land transfer tax).

Provide a score from 0 (financially unviable) to 100 (excellent financial value) and summarize your findings concisely.

You MUST provide your response as a single, valid JSON object that strictly adheres to the following structure. Do NOT add any text or formatting outside of the JSON object.

### REQUIRED JSON OUTPUT STRUCTURE ###
{
  "score": <number (0-100)>,
  "summary": "<string>",
  "details": {
    "marketValueComparison": "<string>",
    "potentialRoi": "<string>",
    "costBreakdown": {
      "land_survey_estimate": <number>,
      "legal_fees_estimate": <number>
    }
  }
}
Note: If no specific additional costs can be estimated, provide an empty object for "costBreakdown": {}.
`;

export async function evaluateFinance(
  listing: PropertyListing
): Promise<FinanceEvaluation> {
  // 1. Gather all necessary data from the tools.
  const webSearchData = await serpApiTool.func({
    query: `average land prices (Bodenrichtwert) ${listing.address.city} ${listing.address.state}`,
  });

  // 2. Bind the Zod schema to the LLM.
  const structuredLlm = llm.withStructuredOutput(FinanceEvaluationSchema, {
    name: 'finance_evaluation',
  });

  // 3. Create a detailed prompt with the fetched data.
  const prompt = `
    ${systemPrompt}

    Please evaluate the following property:
    \`\`\`json
    ${JSON.stringify(listing, null, 2)}
    \`\`\`

    Use the following data gathered from a web search to inform your evaluation:
    - Market Price Research: ${webSearchData}

    Based on all this information, provide your complete financial evaluation as a single JSON object.
  `;

  // 4. Invoke the model to get the structured result.
  const result = await structuredLlm.invoke(prompt);

  return result;
}