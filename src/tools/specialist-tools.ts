// src/tools/specialist-tools.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentExecutor } from 'langchain/agents';
import { ecoAgentExecutorPromise } from '../agents/eco-impact';
import { legalAgentExecutorPromise } from '../agents/legal';
import { financeAgentExecutorPromise } from '../agents/finance';
import logger from '../utils/logger';

// Cache the agents after they are created once.
let ecoAgent: AgentExecutor;
let legalAgent: AgentExecutor;
let financeAgent: AgentExecutor;

const SpecialistToolSchema = z.object({
  propertyDetails: z
    .string()
    .describe(
      'A JSON string containing the full details of the property listing.'
    ),
});

// A helper function to run a specialist agent and collect its steps
async function runSpecialistAgent(
  agentPromise: Promise<AgentExecutor>,
  cachedAgent: AgentExecutor | undefined,
  propertyDetails: string,
  agentName: string
): Promise<{ agent: AgentExecutor; result: { output: string; intermediateSteps: any[] } }> {
  let agent = cachedAgent;
  if (!agent) {
    logger.debug(`Initializing ${agentName} agent...`);
    agent = await agentPromise;
  }
  
  const result = await agent.invoke({
    input: `Evaluate the property with these details: ${propertyDetails}`,
  });

  // Map intermediate steps to include tool, input, output
  const mappedSteps = result.intermediateSteps ? result.intermediateSteps.map((step: any) => ({
    tool: step.action.tool,
    input: step.action.toolInput,
    output: step.observation,
  })) : [];

  return {
    agent,
    result: {
      output: result.output,
      intermediateSteps: mappedSteps,
    }
  };
}

export const ecoImpactTool = new DynamicStructuredTool({
  name: 'evaluateEcoImpact',
  description:
    'Invokes the ECO specialist agent to evaluate the ecological potential of a property.',
  schema: SpecialistToolSchema,
  func: async ({ propertyDetails }) => {
    logger.info('🌱 ECO Impact Tool invoked');
    try {
      const { agent, result } = await runSpecialistAgent(ecoAgentExecutorPromise, ecoAgent, propertyDetails, 'ECO');
      if (!ecoAgent) ecoAgent = agent;

      const finalResult = {
        finalOutput: `ECO Agent Assessment: ${result.output}`,
        intermediateSteps: result.intermediateSteps,
      };

      logger.info(`✅ ECO Agent completed`);
      return JSON.stringify(finalResult);
    } catch (e: any) {
      logger.error(`❌ ECO Agent error: ${e.message}`);
      return `Error invoking ECO agent: ${e.message}`;
    }
  },
});

export const legalTool = new DynamicStructuredTool({
  name: 'evaluateLegalCompliance',
  description:
    'Invokes the Legal specialist agent to evaluate the legal viability of acquiring a property.',
  schema: SpecialistToolSchema,
  func: async ({ propertyDetails }) => {
    logger.info('⚖️ Legal Compliance Tool invoked');
    try {
      const { agent, result } = await runSpecialistAgent(legalAgentExecutorPromise, legalAgent, propertyDetails, 'Legal');
      if (!legalAgent) legalAgent = agent;
      
      const finalResult = {
        finalOutput: `Legal Agent Assessment: ${result.output}`,
        intermediateSteps: result.intermediateSteps,
      };

      logger.info(`✅ Legal Agent completed`);
      return JSON.stringify(finalResult);
    } catch (e: any) {
      logger.error(`❌ Legal Agent error: ${e.message}`);
      return `Error invoking Legal agent: ${e.message}`;
    }
  },
});

export const financeTool = new DynamicStructuredTool({
  name: 'evaluateFinancialViability',
  description:
    'Invokes the Finance specialist agent to evaluate the financial viability of a property.',
  schema: SpecialistToolSchema,
  func: async ({ propertyDetails }) => {
    logger.info('💰 Financial Viability Tool invoked');
    try {
      const { agent, result } = await runSpecialistAgent(financeAgentExecutorPromise, financeAgent, propertyDetails, 'Finance');
      if (!financeAgent) financeAgent = agent;
      
      const finalResult = {
        finalOutput: `Finance Agent Assessment: ${result.output}`,
        intermediateSteps: result.intermediateSteps,
      };

      logger.info(`✅ Finance Agent completed`);
      return JSON.stringify(finalResult);
    } catch (e: any) {
      logger.error({ error: e.message }, `❌ Finance Agent error: ${e.message}`);
      return `Error invoking Finance agent: ${e.message}`;
    }
  },
});