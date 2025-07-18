/**
 * types.ts
 *
 * This file provides type definitions for messaging between the Chrome
 * extension and the MCP server. Clear typing enables type-safe communication
 * and makes it easier to catch errors during development.
 */

/**
 * Request message types coming from the MCP server to the extension
 */

/**
 * Readiness-check message
 *
 * Used by the background script to ask the content script whether it is ready.
 */
export interface AreYouReadyMessage {
  command: 'areYouReady';
}

/**
 * Text-input message
 *
 * Instructs the content script to enter the specified text into Gemini’s input
 * field.
 */
export interface SetInputMessage {
  command: 'setInput';
  payload: {
    text: string; // Text to input
  };
}

/**
 * Send-button-click message
 *
 * Instructs the content script to click Gemini’s send button.
 */
export interface ClickSendMessage {
  command: 'clickSend';
}

/**
 * Discriminated union of request messages.
 *
 * Represents every request type that can be sent from the MCP server to the
 * Chrome extension.
 */
export type RequestMessage = SetInputMessage | ClickSendMessage | AreYouReadyMessage;


/**
 * Response message types coming from the extension to the MCP server
 */

/**
 * Discriminated union of response messages.
 *
 * Represents every response type that can be sent from the Chrome extension to
 * the MCP server.
 */
export type ResponseMessage = SuccessResponseMessage | ErrorResponseMessage;

/**
 * Success response message
 *
 * Used to forward Gemini’s response text back to the MCP server.
 */
export interface SuccessResponseMessage {
  status: 'success';
  event: 'responseReceived';
  payload: {
    text: string; // Gemini response text
  };
}

/**
 * Error response message
 *
 * Used to notify the MCP server of an error that occurred during an operation.
 */
export interface ErrorResponseMessage {
  status: 'error';
  message: string; // Error message
}
