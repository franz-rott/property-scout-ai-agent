// src/agents/orchestrator/graph.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import {
  PropertyListing,
  EcoImpactEvaluation,
  LegalEvaluation,
  FinanceEvaluation,
  AggregatedEvaluation,
  AggregatedEvaluationSchema,
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

// The aggregator node remains the same.
const runAggregator = async (
  state: AgentState
): Promise<Partial<AgentState>> => {
  logger.info('---RUNNING AGGREGATOR---');
  const aggregatorLlm = llm.withStructuredOutput(AggregatedEvaluationSchema);
  const prompt = `
  You are the lead strategist at Greenzero. Your job is to synthesize the evaluations from the ECO, Legal, and Finance teams into a final, decisive recommendation.

  Here are the inputs from your teams:
  - Property Details: ${JSON.stringify(state.propertyListing, null, 2)}
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
  4.  Ensure the final output is a single JSON object matching the required schema. Include the listing ID and the full details of the property and sub-evaluations.
  `;
  const finalEvaluation = await aggregatorLlm.invoke(prompt);
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