// src/agents/agent-factory.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * A factory function to create a structured-output agent with specific tools.
 */
export async function createSpecialistAgent({
  llm,
  tools,
  systemPrompt,
}: {
  llm: ChatOpenAI;
  tools: Array<any>; // <-- FIX: Use 'any' to bypass complex tool type incompatibility.
  systemPrompt: string;
}) {
  const prompt = await ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools,
    verbose: true,
  });
}