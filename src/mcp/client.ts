// src/mcp/client.ts
import axios, { AxiosInstance } from 'axios';
import { McpRequest, McpResponse } from './protocols';
import logger from '../utils/logger';

/**
 * A client for communicating with MCP (Model Context Protocol) servers.
 * It provides a standardized way for agents to invoke tools that are
 * exposed via dedicated microservices.
 */
export class McpClient {
  private httpClient: AxiosInstance;

  /**
   * @param baseURL The base URL of the MCP server to connect to.
   */
  constructor(baseURL: string) {
    this.httpClient = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Calls a tool on the connected MCP server.
   *
   * @param tool_name The name of the tool to execute.
   * @param params The parameters to pass to the tool.
   * @returns A promise that resolves with the data from the tool's execution.
   * @throws An error if the MCP server returns an error response.
   */
  async call(tool_name: string, params: Record<string, any>): Promise<any> {
    const requestPayload: McpRequest = { tool_name, params };

    logger.debug(
      { tool_name, url: this.httpClient.defaults.baseURL, params },
      `Calling MCP tool '${tool_name}'`
    );

    try {
      const response = await this.httpClient.post<McpResponse>(
        '/invoke',
        requestPayload
      );

      const mcpResponse = response.data;

      if (mcpResponse.status === 'success') {
        logger.debug({ tool_name }, `MCP tool '${tool_name}' call successful.`);
        return mcpResponse.data;
      } else {
        logger.error(
          { tool_name, error: mcpResponse },
          `MCP tool '${tool_name}' returned an error: ${mcpResponse.message}`
        );
        throw new Error(
          `MCP Server Error: ${mcpResponse.message} | Details: ${JSON.stringify(
            mcpResponse.details
          )}`
        );
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error({ error }, `HTTP error calling MCP server: ${error.message}`);
        throw new Error(`Failed to communicate with MCP server: ${error.message}`);
      }
      // Re-throw errors from the MCP error response or other unexpected errors
      throw error;
    }
  }
}