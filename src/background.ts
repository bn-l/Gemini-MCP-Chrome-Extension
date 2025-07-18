/**
 * background.ts
 *
 * This file acts as the background script for the Chrome extension.
 * It communicates with an external MCP server via Native Messaging
 * and also manages communication with tabs that have the Gemini web page open.
 */

import { RequestMessage, ResponseMessage } from './types';

// Native Messaging host name (must match the MCP server configuration)
const HOST_NAME = 'com.example.gemini_mcp_gateway';

// Native Messaging port (used to communicate with the MCP server)
let nativePort: chrome.runtime.Port | null = null;

// Tracks the readiness state of Gemini tabs (tabId => ready flag)
let geminiTabStatus: { [key: number]: boolean } = {};

// Message queue for tabs that are not yet ready (tabId => array of messages)
let messageQueue: { [key: number]: RequestMessage[] } = {};

/**
 * Connects to the Native Messaging host.
 *
 * This function establishes a connection to the external MCP server (Native
 * Messaging host) and sets up handlers for message exchange and error
 * processing. If the connection is terminated, it retries after 5 seconds. On
 * successful connection, it sends readiness-check messages to any existing
 * Gemini tabs.
 */
function connectToNativeHost() {
  try {
    console.log('[MCP-Background] Attempting to connect to native host...');
    nativePort = chrome.runtime.connectNative(HOST_NAME);

    // Handler for messages received from the MCP server
    nativePort.onMessage.addListener((message: RequestMessage) => {
      sendCommandsToGeminiTab(message);
    });

    // Handler invoked when the connection is disconnected
    nativePort.onDisconnect.addListener(() => {
      console.log('%c[MCP-Background] Disconnected from native host.', 'color: red;');
      const error = chrome.runtime.lastError;
      if (error && error.message) console.error('[MCP-Background] Disconnect error:', error.message);
      nativePort = null;
      // ★★★ Do NOT reset state ★★★
      // geminiTabStatus = {};
      // messageQueue = {};
      setTimeout(connectToNativeHost, 5000); // Retry connection after 5 seconds
    });

    console.log('%c[MCP-Background] Successfully connected to native host.', 'color: orange;');

    // On successful connection, ping existing Gemini tabs to check readiness
    chrome.tabs.query({ url: "https://gemini.google.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          console.log(`[MCP-Background] Sending readiness check to Tab ID: ${tab.id}`);
          chrome.tabs.sendMessage(tab.id, { command: 'areYouReady' });
        }
      });
    });

  } catch (error: any) {
    // Handler for connection errors
    if (error && error.message) console.error('[MCP-Background] Failed to connect:', error.message);
    else console.error('[MCP-Background] Failed to connect with an unknown error.');
    setTimeout(connectToNativeHost, 5000); // Retry connection after 5 seconds
  }
}

// Start connecting to the native messaging host
connectToNativeHost();

/**
 * Message listener
 *
 * This listener handles three kinds of messages:
 * 1. "Ready" notifications from Gemini tabs
 * 2. Response messages from Gemini tabs (forwarded to the MCP server)
 * 3. Commands from other sources such as the popup UI (forwarded to Gemini tabs)
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  // Handle messages coming from a Gemini tab
  if (sender.tab && sender.tab.url?.includes('gemini.google.com')) {
    const tabId = sender.tab.id;
    if (tabId) {
        // Handle "content ready" notification from the tab
        if (message.type === 'content_ready') {
            console.log(`%c[MCP-Background] Tab ID: ${tabId} is now ready.`, 'color: green;');
            geminiTabStatus[tabId] = true;

            // If there are queued messages, send them
            if (messageQueue[tabId] && messageQueue[tabId].length > 0) {
                console.log(`[MCP-Background] Sending ${messageQueue[tabId].length} queued messages to Tab ID: ${tabId}`);
                messageQueue[tabId].forEach(queuedMsg => {
                    chrome.tabs.sendMessage(tabId, queuedMsg);
                });
                delete messageQueue[tabId];
            }
            return;
        }
    }

    // Forward response messages from Gemini tabs to the MCP server
    if (message.status && nativePort) {
      nativePort.postMessage(message);
    }
  } 
  // Handle commands from other sources such as the popup UI
  else if (!sender.tab && message.command) {
    sendCommandsToGeminiTab(message as RequestMessage);
  }
  return true; // Enable asynchronous response
});

/**
 * Sends command messages to a Gemini tab.
 *
 * This function forwards commands coming from the MCP server or the popup UI
 * to a Gemini tab. If the tab is not ready yet, the message is queued and sent
 * later.
 *
 * @param message - The command message to send to the Gemini tab
 */
async function sendCommandsToGeminiTab(message: RequestMessage) {
    // Find Gemini tabs
    const tabs = await chrome.tabs.query({ url: "https://gemini.google.com/*" });
    if (tabs.length === 0) return; // Do nothing if no Gemini tab is found

    const targetTab = tabs[0];
    if (targetTab && typeof targetTab.id !== 'undefined') {
        const tabId = targetTab.id;

        // If the tab isn't ready, enqueue the message
        if (!geminiTabStatus[tabId]) {
            console.warn(`[MCP-Background] Tab ${tabId} is not ready yet. Queuing message.`, message);
            if (!messageQueue[tabId]) messageQueue[tabId] = [];
            messageQueue[tabId].push(message);
            return;
        }
        // If the tab is ready, send the message immediately
        chrome.tabs.sendMessage(tabId, message);
    }
}
