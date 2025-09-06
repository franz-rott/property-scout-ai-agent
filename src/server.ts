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
  logger.info('[/chat] endpoint hit. Processing request...');

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
  // Add the new user message to the history for this call
  const updatedMessages = [...sessionMessages, new HumanMessage(input)];

  try {
    logger.info({ sessionId: currentSessionId, input }, 'Invoking agent graph...');

    const finalState = await appGraph.invoke({
      messages: updatedMessages,
    });

    logger.info('Agent graph invocation complete.');

    const lastMessage = finalState.messages[finalState.messages.length - 1];

    // **FIX START**: Replace the fragile `_getType()` check with the robust `instanceof`.
    if (lastMessage && lastMessage instanceof AIMessage && lastMessage.content) {
    // **FIX END**
      // Add the user's message and the AI's final response to the session history
      sessions[currentSessionId].messages.push(new HumanMessage(input));
      sessions[currentSessionId].messages.push(lastMessage);

      res.status(200).json({
        sessionId: currentSessionId,
        output: lastMessage.content,
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

export function startServer() {
  app.listen(PORT, () => {
    logger.info(`🤖 Analyst Assistant server listening on http://localhost:${PORT}`);
    logger.info('Send POST requests to http://localhost:3000/chat');
    logger.info('Example curl command:');
    logger.info(
      `Invoke-WebRequest -Uri http://localhost:3000/chat -Method POST -Headers @{'Content-Type' = 'application/json'} -Body '{"input": "Hello, can you look at a property for me? https://www.immobilienscout24.de/expose/123456789"}'`
    );
  });
}