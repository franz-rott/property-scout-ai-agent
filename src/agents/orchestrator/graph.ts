// src/agents/orchestrator/graph.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
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
import logger from '../../utils/logger';

const tools = [
  immoScoutScraperTool,
  ecoImpactTool,
  legalTool,
  financeTool,
  serpApiTool,
];
const toolNode = new ToolNode(tools);

let orchestratorAgent: Runnable;

const runAgentNode = async (state: MessagesState, config?: any) => {
  if (!orchestratorAgent) {
    orchestratorAgent = await orchestratorAgentRunnablePromise;
  }
  
  logger.debug({ messageCount: state.messages.length }, 'Running agent node with state messages');
  
  const result = await orchestratorAgent.invoke({
    messages: state.messages,
  }, config);
  
  // Log if the agent decided to call tools
  if (result instanceof AIMessage && result.tool_calls && result.tool_calls.length > 0) {
    logger.info({ 
      toolCount: result.tool_calls.length,
      tools: result.tool_calls.map((tc: any) => tc.name)
    }, `Agent calling ${result.tool_calls.length} tool(s)`);
  }
  
  return { messages: [result] };
};

/**
 * Executes the tools called by the agent.
 */
const runToolNode = async (state: MessagesState, config?: any) => {
  logger.debug('Running tool node');
  
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls) {
    logger.info({ 
      toolCalls: lastMessage.tool_calls.map((tc: any) => ({
        tool: tc.name,
        args: tc.args
      }))
    }, 'Executing tool calls');
  }
  
  const result = await toolNode.invoke(state, config);
  
  // Log tool results
  if (result.messages && result.messages.length > 0) {
    result.messages.forEach((msg: BaseMessage) => {
      if (msg instanceof ToolMessage) {
        logger.info({ 
          tool: msg.name,
          contentLength: typeof msg.content === 'string' ? msg.content.length : 'non-string'
        }, `Tool '${msg.name}' completed`);
      }
    });
  }
  
  return result;
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
    logger.debug('Continuing to tools');
    return 'tools';
  }
  // Otherwise, the conversation is finished.
  logger.debug('Ending conversation');
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

// Export a version that includes enhanced tracing capabilities
export const appGraphWithTrace = workflow.compile({
  checkpointer: undefined, // You can add a checkpointer here if needed
});