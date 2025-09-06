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

export const ecoImpactTool = new DynamicStructuredTool({
  name: 'evaluateEcoImpact',
  description:
    'Invokes the ECO specialist agent to evaluate the ecological potential of a property.',
  schema: SpecialistToolSchema,
  func: async ({ propertyDetails }) => {
    logger.info('🌱 ECO Impact Tool invoked');
    const startTime = Date.now();
    
    try {
      // Parse property details for logging
      let parsedDetails: any;
      try {
        parsedDetails = JSON.parse(propertyDetails);
        logger.info(`Evaluating property: ${parsedDetails.title || 'Unknown'} in ${parsedDetails.address?.city || 'Unknown location'}`);
      } catch {
        logger.debug('Could not parse property details for logging');
      }
      
      // Lazy-load the agent on first use.
      if (!ecoAgent) {
        logger.debug('Initializing ECO agent...');
        ecoAgent = await ecoAgentExecutorPromise;
      }
      
      const result = await ecoAgent.invoke({
        input: `Evaluate the property with these details: ${propertyDetails}`,
      });
      
      const duration = Date.now() - startTime;
      logger.info(`✅ ECO Agent completed in ${duration}ms`);
      
      // Try to parse and log the score if available
      try {
        const output = JSON.parse(result.output);
        if (output.score !== undefined) {
          logger.info(`ECO Score: ${output.score}/100`);
        }
      } catch {
        // Output might not be JSON, that's okay
      }
      
      return `ECO Agent Assessment: ${result.output}`;
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
    const startTime = Date.now();
    
    try {
      // Parse property details for logging
      let parsedDetails: any;
      try {
        parsedDetails = JSON.parse(propertyDetails);
        logger.info(`Checking legal compliance for: ${parsedDetails.address?.city || 'Unknown location'}`);
      } catch {
        logger.debug('Could not parse property details for logging');
      }
      
      // Lazy-load the agent on first use.
      if (!legalAgent) {
        logger.debug('Initializing Legal agent...');
        legalAgent = await legalAgentExecutorPromise;
      }
      
      const result = await legalAgent.invoke({
        input: `Evaluate the property with these details: ${propertyDetails}`,
      });
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Legal Agent completed in ${duration}ms`);
      
      // Try to parse and log the score if available
      try {
        const output = JSON.parse(result.output);
        if (output.score !== undefined) {
          logger.info(`Legal Score: ${output.score}/100`);
        }
      } catch {
        // Output might not be JSON, that's okay
      }
      
      return `Legal Agent Assessment: ${result.output}`;
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
    const startTime = Date.now();
    
    try {
      // Parse property details for logging
      let parsedDetails: any;
      try {
        parsedDetails = JSON.parse(propertyDetails);
        logger.info({ 
          price: parsedDetails.price || 'Unknown',
          area: parsedDetails.plotArea || 'Unknown'
        }, `Analyzing financials: €${parsedDetails.price || 'Unknown'} for ${parsedDetails.plotArea || 'Unknown'}m²`);
      } catch {
        logger.debug('Could not parse property details for logging');
      }
      
      // Lazy-load the agent on first use.
      if (!financeAgent) {
        logger.debug('Initializing Finance agent...');
        financeAgent = await financeAgentExecutorPromise;
      }
      
      const result = await financeAgent.invoke({
        input: `Evaluate the property with these details: ${propertyDetails}`,
      });
      
      const duration = Date.now() - startTime;
      logger.info({ duration }, `✅ Finance Agent completed in ${duration}ms`);
      
      // Try to parse and log the score if available
      try {
        const output = JSON.parse(result.output);
        if (output.score !== undefined) {
          logger.info({ score: output.score }, `Finance Score: ${output.score}/100`);
        }
      } catch {
        // Output might not be JSON, that's okay
      }
      
      return `Finance Agent Assessment: ${result.output}`;
    } catch (e: any) {
      logger.error({ error: e.message }, `❌ Finance Agent error: ${e.message}`);
      return `Error invoking Finance agent: ${e.message}`;
    }
  },
});