// src/agents/orchestrator/graph.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { MessagesState } from '../../types';
import { orchestratorAgentRunnablePromise } from './agent';
import {
  ecoImpactTool,
  financeTool,
  legalTool,
} from '../../tools/specialist-tools';
import { serpApiTool } from '../../tools/serp-api';
import { immoScoutScraperTool } from '../../tools/immoscout-api';

const tools = [
  immoScoutScraperTool,
  ecoImpactTool,
  legalTool,
  financeTool,
  serpApiTool,
];
const toolNode = new ToolNode(tools);

let orchestratorAgent: Runnable;

const runAgentNode = async (state: MessagesState) => {
  if (!orchestratorAgent) {
    orchestratorAgent = await orchestratorAgentRunnablePromise;
  }
  const result = await orchestratorAgent.invoke({
    messages: state.messages,
  });
  return { messages: [result] };
};

/**
 * Executes the tools called by the agent.
 *
 * The error logs prove that `toolNode.invoke(state)` returns an object that
 * already matches the state's shape (e.g., `{ messages: [ToolMessage] }`).
 *
 * The definitive fix is to return this object directly. Previous attempts
 * incorrectly wrapped this result, causing the data corruption.
 */
const runToolNode = async (state: MessagesState) => {
  return toolNode.invoke(state);
};

// This conditional edge decides whether to call tools or end the conversation.
const shouldContinue = (state: MessagesState): 'tools' | 'end' => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  // Check if the last message is an AIMessage with tool calls.
  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }
  // Otherwise, the conversation is finished.
  return 'end';
};

// Define the graph state and structure.
const workflow = new StateGraph<MessagesState>({
  channels: {
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    },
  },
})
  .addNode('agent', runAgentNode)
  .addNode('tools', runToolNode);

// Define the workflow edges.
workflow.setEntryPoint('agent');

workflow.addConditionalEdges('agent', shouldContinue, {
  tools: 'tools',
  end: END,
});

workflow.addEdge('tools', 'agent');

// Compile the graph into a runnable object.
export const appGraph = workflow.compile();