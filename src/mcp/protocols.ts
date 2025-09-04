// src/mcp/protocols.ts

/**
 * Defines a generic structure for requests sent to any MCP server.
 * The `tool_name` specifies which operation to perform, and `params`
 * contains the necessary input for that operation.
 */
export interface McpRequest {
  tool_name: string;
  params: Record<string, any>;
}

/**
 * Defines a generic structure for successful responses from an MCP server.
 * The `data` field contains the result of the tool execution.
 */
export interface McpSuccessResponse {
  status: 'success';
  data: any;
}

/**
 * Defines a generic structure for error responses from an MCP server.
 * The `message` provides a human-readable error description.
 */
export interface McpErrorResponse {
  status: 'error';
  message: string;
  details?: Record<string, any>;
}

export type McpResponse = McpSuccessResponse | McpErrorResponse;