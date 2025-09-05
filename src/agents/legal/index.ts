// src/agents/legal/index.ts
import { ChatOpenAI } from '@langchain/openai';
import {
  PropertyListing,
  LegalEvaluation,
  LegalEvaluationSchema,
} from '../../types';
import { inspireApiTool } from '../../tools/inspire-api';
import { serpApiTool } from '../../tools/serp-api';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are a legal expert specializing in German land use and environmental law for Greenzero.
Your task is to evaluate the legal viability of acquiring a plot of land based on the provided data.

Analyze the data to assess:
 - Zoning Compliance: Is the land zoned appropriately for ecological projects?
 - Protected Area Status: Is the land part of a protected area (e.g., Natura 2000) that would restrict its use?
 - Potential Restrictions: Identify any other potential legal hurdles or restrictions.

Provide a score from 0 (major legal barriers) to 100 (legally straightforward) and summarize your findings concisely.

You MUST provide your response as a single, valid JSON object that strictly adheres to the following structure. Do NOT add any text or formatting outside of the JSON object.

### REQUIRED JSON OUTPUT STRUCTURE ###
{
  "score": <number (0-100)>,
  "summary": "<string>",
  "details": {
    "zoningCompliance": "<string>",
    "protectedAreaStatus": "<string>",
    "potentialRestrictions": ["<string>", "<string>"]
  }
}
Note: If there are no potential restrictions, provide an empty array: [].
`;

export async function evaluateLegal(
  listing: PropertyListing
): Promise<LegalEvaluation> {
  // 1. Gather all necessary data from the tools.
  const regulatoryData = await inspireApiTool.func({
    latitude: listing.geoCoordinates!.latitude,
    longitude: listing.geoCoordinates!.longitude,
  });

  const webSearchData = await serpApiTool.func({
    query: `local land use regulations (Bebauungsplan) ${listing.address.city}`,
  });

  // 2. Bind the Zod schema to the LLM.
  const structuredLlm = llm.withStructuredOutput(LegalEvaluationSchema, {
    name: 'legal_evaluation',
  });

  // 3. Create a detailed prompt with the fetched data.
  const prompt = `
    ${systemPrompt}

    Please evaluate the following property:
    \`\`\`json
    ${JSON.stringify(listing, null, 2)}
    \`\`\`

    Use the following data gathered from our tools to inform your evaluation:
    - Regulatory Data: ${regulatoryData}
    - Web Search for local context: ${webSearchData}

    Based on all this information, provide your complete legal evaluation as a single JSON object.
  `;

  // 4. Invoke the model to get the structured result.
  const result = await structuredLlm.invoke(prompt);

  return result;
}