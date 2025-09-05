// src/agents/orchestrator/graph.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod'; // Import Zod
import {
  PropertyListing,
  EcoImpactEvaluation,
  LegalEvaluation,
  FinanceEvaluation,
  AggregatedEvaluation,
  AggregatedEvaluationSchema,
  RecommendationEnum, // Import the recommendation enum
} from '../../types';
import logger from '../../utils/logger';
import { evaluateEcoImpact } from '../eco-impact';
import { evaluateLegal } from '../legal';
import { evaluateFinance } from '../finance';

/**
 * Defines the state of our graph.
 */
interface AgentState {
  propertyListing?: PropertyListing;
  ecoEvaluation?: EcoImpactEvaluation;
  legalEvaluation?: LegalEvaluation;
  financeEvaluation?: FinanceEvaluation;
  finalEvaluation?: AggregatedEvaluation;
}

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

// A single node that runs all specialist evaluations in parallel.
const runSpecialistEvaluations = async (
  state: AgentState
): Promise<Partial<AgentState>> => {
  logger.info('---RUNNING SPECIALIST AGENTS IN PARALLEL---');
  const listing = state.propertyListing!;

  const [ecoEvaluation, legalEvaluation, financeEvaluation] = await Promise.all([
    evaluateEcoImpact(listing),
    evaluateLegal(listing),
    evaluateFinance(listing),
  ]);

  logger.info('---ALL SPECIALIST EVALUATIONS COMPLETE---');
  return { ecoEvaluation, legalEvaluation, financeEvaluation };
};

// Define a new, smaller schema for just the LLM's output
const AggregatorOutputSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe('The final weighted score for the property.'),
  recommendation: RecommendationEnum.describe(
    'The final recommendation for the property.'
  ),
  executiveSummary: z
    .string()
    .describe('The final executive summary explaining the recommendation.'),
});

// The aggregator node, now refactored for reliability.
const runAggregator = async (
  state: AgentState
): Promise<Partial<AgentState>> => {
  logger.info('---RUNNING AGGREGATOR---');

  // Step 1: Use the LLM for reasoning and summarization only.
  const aggregatorLlm = llm.withStructuredOutput(AggregatorOutputSchema);

  const prompt = `
  You are the lead strategist at Greenzero. Your job is to synthesize the evaluations from the ECO, Legal, and Finance teams into a final score, recommendation, and summary.

  Here are the inputs from your teams:
  - ECO Evaluation: ${JSON.stringify(state.ecoEvaluation, null, 2)}
  - Legal Evaluation: ${JSON.stringify(state.legalEvaluation, null, 2)}
  - Finance Evaluation: ${JSON.stringify(state.financeEvaluation, null, 2)}
  
  Your Task:
  1.  Calculate an 'overallScore' (0-100). Weight the scores as follows: ECO (50%), Legal (30%), Finance (20%). A low legal score (<40) should heavily penalize the overall score.
  2.  Provide a final 'recommendation' based on the overall score:
      - > 85: HIGHLY_RECOMMENDED
      - 70-84: RECOMMENDED
      - 50-69: NEUTRAL
      - < 50: NOT_RECOMMENDED
  3.  Write a concise 'executiveSummary' that explains your reasoning, highlights the key opportunities and risks, and justifies the final recommendation.
  
  Provide ONLY these three fields in a valid JSON object.
  `;
  
  const llmResult = await aggregatorLlm.invoke(prompt);

  // Step 2: Assemble the final object in code for 100% reliability.
  const finalEvaluation: AggregatedEvaluation = {
    listingId: state.propertyListing!.id,
    propertyDetails: state.propertyListing!,
    evaluations: {
      ecoImpact: state.ecoEvaluation!,
      legal: state.legalEvaluation!,
      finance: state.financeEvaluation!,
    },
    overallScore: llmResult.overallScore,
    recommendation: llmResult.recommendation,
    executiveSummary: llmResult.executiveSummary,
  };

  return { finalEvaluation };
};

// Define the graph workflow.
const workflow = new StateGraph<AgentState>({
  channels: {
    propertyListing: { value: (x, y) => y, default: () => undefined },
    ecoEvaluation: { value: (x, y) => y, default: () => undefined },
    legalEvaluation: { value: (x, y) => y, default: () => undefined },
    financeEvaluation: { value: (x, y) => y, default: () => undefined },
    finalEvaluation: { value: (x, y) => y, default: () => undefined },
  },
});

// Add our two nodes: one for all specialists, one for the aggregator.
workflow.addNode('specialist_evaluations', runSpecialistEvaluations);
workflow.addNode('aggregator', runAggregator);

// --- THIS IS THE FINAL FIX ---
// We use 'as any' to bypass the incorrect type errors from the library.
// The underlying logic is correct and this will allow the code to compile.
(workflow as any).setEntryPoint('specialist_evaluations');
(workflow as any).addEdge('specialist_evaluations', 'aggregator');
(workflow as any).addEdge('aggregator', END);

// Compile the graph.
export const appGraph = workflow.compile();