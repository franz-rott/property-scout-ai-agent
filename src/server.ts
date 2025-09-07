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
}

interface ExecutionTrace {
  type: 'tool' | 'agent';
  tool?: string;
  agent?: string;
  input: any;
  output: any;
  children?: ExecutionTrace[];  // NEW: Add children for hierarchical structure
}

const sessions: Record<string, Session> = {};

// Map to track which tools are actually specialist agents
const SPECIALIST_AGENTS: Record<string, string> = {
  'evaluateEcoImpact': 'ECO Impact Agent',
  'evaluateLegalCompliance': 'Legal Compliance Agent',
  'evaluateFinancialViability': 'Financial Viability Agent'
};

// Map to track actual tool names
const TOOL_NAMES: Record<string, string> = {
  'scrapeImmoScoutListing': 'ImmoScout Scraper',
  'getEnvironmentalData': 'Copernicus Environmental Data',
  'getRegulatoryData': 'INSPIRE Regulatory Data',
  'webSearch': 'Web Search (SerpAPI)'
};

/**
 * Builds a clean execution trace from the final message history,
 * including and correctly naming nested steps from specialist agents.
 * Now builds a hierarchical structure to represent depth.
 */
function buildTraceFromMessages(messages: BaseMessage[]): ExecutionTrace[] {
  const trace: ExecutionTrace[] = [];
  const toolCallMap = new Map<string, any>();

  for (const message of messages) {
    if (message instanceof AIMessage && Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        if (!call.id) continue;
        toolCallMap.set(call.id, {
          name: call.name,
          args: call.args,
        });
      }
    } else if (message instanceof ToolMessage && message.tool_call_id) {
      const toolCall = toolCallMap.get(message.tool_call_id);
      if (!toolCall) continue;

      const isAgent = !!SPECIALIST_AGENTS[toolCall.name];
      const name = isAgent
        ? SPECIALIST_AGENTS[toolCall.name]
        : (TOOL_NAMES[toolCall.name] || toolCall.name);

      let parsedContent;
      if (typeof message.content === 'string') {
        try { parsedContent = JSON.parse(message.content); } catch { parsedContent = message.content; }
      } else {
        parsedContent = message.content;
      }
      
      const entry: ExecutionTrace = {
        type: isAgent ? 'agent' : 'tool',
        [isAgent ? 'agent' : 'tool']: name,
        input: toolCall.args,
        output: isAgent ? parsedContent.finalOutput : parsedContent,
      };

      if (isAgent && Array.isArray(parsedContent.intermediateSteps)) {
        entry.children = parsedContent.intermediateSteps.map((step: any) => {
          const friendlyToolName = TOOL_NAMES[step.tool] || step.tool;
          return {
            type: 'tool',
            tool: friendlyToolName,
            input: step.input,
            output: step.output,
          };
        });
      }

      trace.push(entry);
    }
  }
  return trace;
}


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
    };
    logger.info(`New session created: ${currentSessionId}`);
  }

  const session = sessions[currentSessionId];
  const updatedMessages = [...session.messages, new HumanMessage(input)];

  try {
    logger.info({ sessionId: currentSessionId, input }, 'Invoking agent graph...');

    const finalState = await appGraphWithTrace.invoke({
      messages: updatedMessages,
    });

    logger.info('Agent graph invocation complete.');

    const lastMessage = finalState.messages[finalState.messages.length - 1];

    if (lastMessage && lastMessage instanceof AIMessage && lastMessage.content) {
      session.messages = finalState.messages;
      const executionTrace = buildTraceFromMessages(finalState.messages);

      res.status(200).json({
        sessionId: currentSessionId,
        output: lastMessage.content,
        executionTrace: executionTrace.length > 0 ? executionTrace : undefined
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