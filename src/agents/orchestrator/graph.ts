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

// The agent node invokes the orchestrator runnable.
const runAgentNode = async (state: MessagesState) => {
  if (!orchestratorAgent) {
    orchestratorAgent = await orchestratorAgentRunnablePromise;
  }
  // The agent runnable expects a dictionary with keys matching the prompt's
  // placeholders. We provide the conversation history to 'messages' and also
  // to 'agent_scratchpad'. The agent's internal logic will correctly format the
  // scratchpad by filtering for only the tool-related messages.
  const result = await orchestratorAgent.invoke({
    messages: state.messages,
    agent_scratchpad: state.messages,
  });
  return { messages: [result] };
};

// Wrap the toolNode in a function to correctly format its output for the graph state.
const runToolNode = async (state: MessagesState) => {
  const toolCallOutput = await toolNode.invoke(state);
  return { messages: toolCallOutput };
};


// This conditional edge decides whether to call tools or end the conversation.
const shouldContinue = (state: MessagesState): 'tools' | 'end' => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }
  return 'end';
};

// Define the graph state and structure in a single chained call.
const workflow = new StateGraph<MessagesState>({
  channels: {
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    },
  },
})
  .addNode('agent', runAgentNode)
  .addNode('tools', runToolNode); // Use the new wrapper function here.

workflow.setEntryPoint('agent');

workflow.addConditionalEdges('agent', shouldContinue, {
  tools: 'tools',
  end: END,
});

workflow.addEdge('tools', 'agent');

// Compile the graph.
export const appGraph = workflow.compile();