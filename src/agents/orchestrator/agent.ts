// src/agents/orchestrator/agent.ts
import { ChatOpenAI } from '@langchain/openai';
import { createOpenAIToolsAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  ecoImpactTool,
  financeTool,
  legalTool,
} from '../../tools/specialist-tools';
import { serpApiTool } from '../../tools/serp-api';
import { immoScoutScraperTool } from '../../tools/immoscout-api';
import { Runnable } from '@langchain/core/runnables';

const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0 });

const tools = [
  immoScoutScraperTool,
  ecoImpactTool,
  legalTool,
  financeTool,
  serpApiTool,
];

const systemPrompt = `
You are a helpful AI assistant for Greenzero, a company focused on ecological rebuilding.
Your role is to act as the lead analyst, coordinating a team of specialist agents to evaluate potential land acquisitions.

Your Process:
1.  Start by greeting the user. When the user provides a URL for a property listing, your first step is ALWAYS to use the 'scrapeImmoScoutListing' tool to get the property details.
2.  Once you have the details, dispatch your specialist agents (ECO, Legal, Finance) IN PARALLEL to conduct their evaluations using their respective tools.
3.  Summarize the findings from your specialist agents for the user.
4.  Ask the user what they would like to explore next. You can answer follow-up questions using the 'webSearch' tool for information that your specialists might not have (e.g., specific local news, detailed regulations).
5.  You are conversational. Maintain a friendly and helpful tone. Remember the context of the conversation.
`;

// This function creates the agent RUNNABLE, not an AgentExecutor.
async function createOrchestratorAgent(): Promise<Runnable> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    // The graph will pass the full message history in the 'messages' variable.
    new MessagesPlaceholder('messages'),
    // **FIX:** Add the required placeholder for agent intermediate steps.
    new MessagesPlaceholder({ variableName: 'agent_scratchpad' }),
  ]);

  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });

  return agent;
}

// Export the promise for the agent runnable, not the agent executor.
export const orchestratorAgentRunnablePromise = createOrchestratorAgent();