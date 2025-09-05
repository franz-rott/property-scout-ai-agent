// src/agents/eco-impact/index.ts
import { ChatOpenAI } from '@langchain/openai';
import {
  PropertyListing,
  EcoImpactEvaluation,
  EcoImpactEvaluationSchema,
} from '../../types';
import { copernicusApiTool } from '../../tools/copernicus-api';
import { serpApiTool } from '../../tools/serp-api';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const systemPrompt = `
You are an expert in environmental science and ecological restoration, working for Greenzero.
Your task is to evaluate the ecological potential of a given plot of land based on the provided data.

Analyze the data to assess:
 - Land Cover: What is the current state of the land (e.g., forest, agricultural)?
 - Soil Sealing: How much of the area is covered by artificial surfaces? Lower is better.
 - Biodiversity Potential: What is the potential for improving biodiversity? Consider proximity to forests, water bodies, etc.
 - Climate Resilience: How resilient is the area to climate change factors like drought or flooding?

Provide a score from 0 (very poor) to 100 (excellent ecological potential) and summarize your findings in a concise summary.

You MUST provide your response as a single, valid JSON object that strictly adheres to the following structure. Do NOT add any text or formatting outside of the JSON object.

### REQUIRED JSON OUTPUT STRUCTURE ###
{
  "score": <number (0-100)>,
  "summary": "<string>",
  "details": {
    "landCover": "<string>",
    "soilSealing": "<string>",
    "biodiversityPotential": "<string>",
    "climateResilience": "<string>"
  }
}
`;

export async function evaluateEcoImpact(
  listing: PropertyListing
): Promise<EcoImpactEvaluation> {
  // 1. First, gather all necessary data from the tools.
  const environmentalData = await copernicusApiTool.func({
    latitude: listing.geoCoordinates!.latitude,
    longitude: listing.geoCoordinates!.longitude,
  });

  const webSearchData = await serpApiTool.func({
    query: `climate risks ${listing.address.city} ${listing.address.state}`,
  });

  // 2. Bind the Zod schema to the LLM for structured output.
  const structuredLlm = llm.withStructuredOutput(EcoImpactEvaluationSchema, {
    name: 'eco_impact_evaluation', // Name for the underlying tool
  });

  // 3. Create a detailed prompt with the fetched data.
  const prompt = `
    ${systemPrompt}

    Please evaluate the following property:
    \`\`\`json
    ${JSON.stringify(listing, null, 2)}
    \`\`\`

    Use the following data gathered from our tools to inform your evaluation:
    - Core Environmental Data: ${environmentalData}
    - Web Search Results for local context: ${webSearchData}

    Based on all this information, provide your complete evaluation as a single JSON object.
  `;

  // 4. Invoke the model. The result is a guaranteed, validated object.
  const result = await structuredLlm.invoke(prompt);

  return result;
}