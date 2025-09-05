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

  logger.info({ sessionId: currentSessionId, input }, 'Invoking agent graph');

  try {
    // We pass the entire message history to the graph.
    const stream = await appGraph.stream({
      messages: [...sessionMessages, new HumanMessage(input)],
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    let finalMessage: AIMessage | null = null;
    for await (const event of stream) {
      // Stream out the agent's final response chunk by chunk.
      if (event.agent?.messages) {
        const message = event.agent.messages[0];
        if (message instanceof AIMessage) {
          finalMessage = message;
          res.write(JSON.stringify(message.content));
        }
      }
    }

    // Update the session history with the latest exchange.
    sessions[currentSessionId].messages.push(new HumanMessage(input));
    if (finalMessage) {
      sessions[currentSessionId].messages.push(finalMessage);
    }

    res.end();
  } catch (error) {
    logger.error({ error }, 'Error processing chat request.');
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export function startServer() {
  app.listen(PORT, () => {
    logger.info(`🤖 Analyst Assistant server listening on http://localhost:${PORT}`);
    logger.info('Send POST requests to http://localhost:3000/chat');
    logger.info('Example curl command:');
    logger.info(
      `curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"input": "Hello, can you look at a property for me? https://www.immobilienscout24.de/expose/12345678"}' --no-buffer`
    );
  });
}