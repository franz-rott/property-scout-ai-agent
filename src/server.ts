// src/server.ts
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { appGraph } from './agents/orchestrator/graph';
import logger from './utils/logger';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In-memory session storage for demonstration purposes.
const sessions: Record<string, { messages: BaseMessage[] }> = {};

app.post('/chat', async (req, res) => {
  // **FIX START**: Add logging to trace execution
  logger.info('[/chat] endpoint hit. Processing request...');
  // **FIX END**

  const { sessionId, input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input message is required.' });
  }

  const currentSessionId = sessionId || uuidv4();
  if (!sessions[currentSessionId]) {
    sessions[currentSessionId] = { messages: [] };
    logger.info(`New session created: ${currentSessionId}`);
  }

  const sessionMessages = sessions[currentSessionId].messages;

  try {
    logger.info({ sessionId: currentSessionId, input }, 'Attempting to invoke agent graph stream...');
    // We pass the entire message history to the graph.
    const stream = await appGraph.stream({
      messages: [...sessionMessages, new HumanMessage(input)],
    });
    logger.info('Agent graph stream successfully created. Streaming response...');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    let finalMessage: AIMessage | null = null;
    for await (const event of stream) {
      if (event.agent?.messages) {
        const message = event.agent.messages[0];
        if (message instanceof AIMessage) {
          finalMessage = message;
          res.write(JSON.stringify(message.content));
        }
      }
    }

    logger.info('Stream finished.');
    // Update the session history with the latest exchange.
    sessions[currentSessionId].messages.push(new HumanMessage(input));
    if (finalMessage) {
      sessions[currentSessionId].messages.push(finalMessage);
    }

    res.end();
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

    // Check if headers have been sent before trying to send another response
    if (!res.headersSent) {
        res.status(500).json({ error: 'An internal error occurred.' });
    } else {
        res.end(); // End the connection if headers are already sent
    }
  }
});

export function startServer() {
  app.listen(PORT, () => {
    logger.info(`🤖 Analyst Assistant server listening on http://localhost:${PORT}`);
    logger.info('Send POST requests to http://localhost:3000/chat');
    logger.info(
      'Example curl command:'
    );
    logger.info(
      `Invoke-WebRequest -Uri http://localhost:3000/chat -Method POST -Headers @{'Content-Type' = 'application/json'} -Body '{"input": "Hello, can you look at a property for me? https://www.immobilienscout24.de/expose/123456789"}`
    );
  });
}