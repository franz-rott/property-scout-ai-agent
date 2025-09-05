// src/tools/specialist-tools.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentExecutor } from 'langchain/agents';
import { ecoAgentExecutorPromise } from '../agents/eco-impact';
import { legalAgentExecutorPromise } from '../agents/legal';
import { financeAgentExecutorPromise } from '../agents/finance';

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

export const ecoImpactTool = new DynamicStructuredTool({
  name: 'evaluateEcoImpact',
  description:
    'Invokes the ECO specialist agent to evaluate the ecological potential of a property.',
  schema: SpecialistToolSchema,
  func: async ({ propertyDetails }) => {
    try {
      // Lazy-load the agent on first use.
      if (!ecoAgent) {
        ecoAgent = await ecoAgentExecutorPromise;
      }
      const result = await ecoAgent.invoke({
        input: `Evaluate the property with these details: ${propertyDetails}`,
      });
      return `ECO Agent Assessment: ${result.output}`;
    } catch (e: any) {
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
    try {
      // Lazy-load the agent on first use.
      if (!legalAgent) {
        legalAgent = await legalAgentExecutorPromise;
      }
      const result = await legalAgent.invoke({
        input: `Evaluate the property with these details: ${propertyDetails}`,
      });
      return `Legal Agent Assessment: ${result.output}`;
    } catch (e: any) {
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
    try {
      // Lazy-load the agent on first use.
      if (!financeAgent) {
        financeAgent = await financeAgentExecutorPromise;
      }
      const result = await financeAgent.invoke({
        input: `Evaluate the property with these details: ${propertyDetails}`,
      });
      return `Finance Agent Assessment: ${result.output}`;
    } catch (e: any) {
      return `Error invoking Finance agent: ${e.message}`;
    }
  },
});