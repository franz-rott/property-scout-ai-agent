// src/server.ts
import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AIMessage, HumanMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { appGraphWithTrace } from './agents/orchestrator/graph';
import logger from './utils/logger';

const app = express();
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;

// In-memory session storage for demonstration purposes.
interface Session {
  messages: BaseMessage[];
  executionTraces: ExecutionTrace[][];
}

interface ExecutionTrace {
  type: 'tool' | 'agent';
  tool?: string;
  agent?: string;
  input: any;
  output: any;
  timestamp: string;
}

const sessions: Record<string, Session> = {};

app.post('/chat', async (req, res) => {
  logger.info('[/chat] endpoint hit. Processing request...');

  const { sessionId, input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input message is required.' });
  }

  const currentSessionId = sessionId || uuidv4();
  if (!sessions[currentSessionId]) {
    sessions[currentSessionId] = { 
      messages: [],
      executionTraces: []
    };
    logger.info(`New session created: ${currentSessionId}`);
  }

  const session = sessions[currentSessionId];
  // Add the new user message to the history for this call
  const updatedMessages = [...session.messages, new HumanMessage(input)];

  // Create an array to collect execution traces for this request
  const currentExecutionTrace: ExecutionTrace[] = [];

  try {
    logger.info({ sessionId: currentSessionId, input }, 'Invoking agent graph...');

    const finalState = await appGraphWithTrace.invoke({
      messages: updatedMessages,
    }, {
      callbacks: [{
        handleToolStart: (tool: any, input: string) => {
          const toolName = tool?.name || 'unknown';
          logger.info(`Tool started: ${toolName}`);
          currentExecutionTrace.push({
            type: 'tool',
            tool: toolName,
            input: input,
            output: null,
            timestamp: new Date().toISOString()
          });
        },
        handleToolEnd: (output: any) => {
          const lastTrace = currentExecutionTrace[currentExecutionTrace.length - 1];
          if (lastTrace && lastTrace.type === 'tool' && !lastTrace.output) {
            lastTrace.output = output;
            logger.info(`Tool ended: ${lastTrace.tool}`);
          }
        },
        handleAgentAction: (action: any) => {
          logger.info(`Agent action:`, action);
          if (action?.tool) {
            const existingTrace = currentExecutionTrace.find(
              t => t.tool === action.tool && !t.output
            );
            if (!existingTrace) {
              currentExecutionTrace.push({
                type: 'tool',
                tool: action.tool,
                input: action.toolInput || action.tool_input,
                output: null,
                timestamp: new Date().toISOString()
              });
            }
          }
        },
        handleAgentEnd: (action: any) => {
          logger.info(`Agent end:`, action);
        },
        handleLLMStart: (llm: any, prompts: string[]) => {
          logger.debug(`LLM started with prompts`);
        },
        handleLLMEnd: (output: any) => {
          logger.debug(`LLM ended`);
        }
      }]
    });

    logger.info('Agent graph invocation complete.');

    // Extract tool messages from the final state for tracing
    const toolMessages = finalState.messages.filter(
      (msg: BaseMessage) => msg instanceof ToolMessage
    );

    // Enhance execution trace with tool message content
    toolMessages.forEach((msg: ToolMessage) => {
      const trace = currentExecutionTrace.find(
        t => t.tool === msg.name && !t.output
      );
      if (trace) {
        trace.output = msg.content;
      }
    });

    const lastMessage = finalState.messages[finalState.messages.length - 1];

    if (lastMessage && lastMessage instanceof AIMessage && lastMessage.content) {
      // Add the user's message and the AI's final response to the session history
      session.messages.push(new HumanMessage(input));
      session.messages.push(lastMessage);
      session.executionTraces.push(currentExecutionTrace);

      res.status(200).json({
        sessionId: currentSessionId,
        output: lastMessage.content,
        executionTrace: currentExecutionTrace.length > 0 ? currentExecutionTrace : undefined
      });
    } else {
      logger.error(
        { finalState },
        'Graph execution finished, but the last message was not a valid AI response.'
      );
      res
        .status(500)
        .json({ error: 'Agent did not produce a valid response.' });
    }
  } catch (error: unknown) {
    logger.error('Error processing chat request.');

    if (error instanceof Error) {
      logger.error(
        { message: error.message, stack: error.stack, name: error.name },
        'Caught a standard Error:'
      );
    } else {
      logger.error(
        { rawError: JSON.stringify(error, null, 2) },
        'Caught a non-standard error type:'
      );
    }

    if (!res.headersSent) {
      res.status(500).json({ error: 'An internal error occurred.' });
    }
  }
});

// Serve the main UI on the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export function startServer() {
  app.listen(PORT, () => {
    logger.info(`🤖 Greenzero Property Scout server listening on http://localhost:${PORT}`);
    logger.info('🌐 Open your browser and navigate to http://localhost:' + PORT);
    logger.info('📡 API endpoint available at http://localhost:' + PORT + '/chat');
  });
}