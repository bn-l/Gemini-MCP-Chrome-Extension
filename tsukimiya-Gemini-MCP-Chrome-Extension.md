# tsukimiya/Gemini-MCP-Chrome-Extension

## .gitignore

```
/tmp
/out-tsc

/node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
/.pnp
.pnp.js

.vscode/*

# Implementation plan document
実装計画.md

.repomix
repomix-output.txt
```

## .idea\.gitignore

```
# Default ignored files
/shelf/
/workspace.xml
# Editor-based HTTP client requests
/httpRequests/
# Datasource local storage ignored files
/dataSources/
/dataSources.local.xml
```

## .idea\GeminiMcpGateway.iml

```
<?xml version="1.0" encoding="UTF-8"?>
<module type="WEB_MODULE" version="4">
  <component name="NewModuleRootManager">
    <content url="file://$MODULE_DIR$">
      <excludeFolder url="file://$MODULE_DIR$/.tmp" />
      <excludeFolder url="file://$MODULE_DIR$/temp" />
      <excludeFolder url="file://$MODULE_DIR$/tmp" />
    </content>
    <orderEntry type="inheritedJdk" />
    <orderEntry type="sourceFolder" forTests="false" />
  </component>
</module>
```

## .idea\material_theme_project_new.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="MaterialThemeProjectNewConfig">
    <option name="metadata">
      <MTProjectMetadataState>
        <option name="migrated" value="true" />
        <option name="pristineConfig" value="false" />
        <option name="userId" value="-782da8c1:18750b35ca8:-8000" />
        <option name="version" value="8.13.2" />
      </MTProjectMetadataState>
    </option>
    <option name="titleBarState">
      <MTProjectTitleBarConfigState>
        <option name="overrideColor" value="false" />
      </MTProjectTitleBarConfigState>
    </option>
  </component>
</project>
```

## .idea\modules.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectModuleManager">
    <modules>
      <module fileurl="file://$PROJECT_DIR$/.idea/GeminiMcpGateway.iml" filepath="$PROJECT_DIR$/.idea/GeminiMcpGateway.iml" />
    </modules>
  </component>
</project>
```

## .idea\vcs.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="VcsDirectoryMappings">
    <mapping directory="$PROJECT_DIR$" vcs="Git" />
  </component>
</project>
```

## package.json

```json
{
  "name": "GeminiMcpGateway",
  "version": "1.0.0",
  "description": "",
  "main": "dist/index.js",
  "scripts": {
    "build": "rimraf dist && webpack"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.326",
    "@types/node": "^22.15.30",
    "copy-webpack-plugin": "^13.0.0",
    "rimraf": "^6.0.1",
    "ts-loader": "^9.5.2",
    "typescript": "^5.5.3",
    "webpack": "^5.99.9",
    "webpack-cli": "^6.0.1"
  },
  "private": true
}
```

## public\icon16.png

```

```

## public\manifest.json

```json
{
  "manifest_version": 3,
  "name": "Gemini MCP Connector",
  "version": "1.0",
  "permissions": ["nativeMessaging", "scripting"],
  "host_permissions": ["https://gemini.google.com/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://gemini.google.com/*"],
      "js": ["content.js"],
      "all_frames": true
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Gemini MCP Connector"
  }
}
```

## public\popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gemini MCP Connector</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      width: 350px;
      padding: 10px;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 15px;
    }
    textarea {
      width: 100%;
      height: 100px;
      margin-bottom: 10px;
      padding: 5px;
      resize: vertical;
    }
    button {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    button:hover {
      background-color: #3367d6;
    }
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .response-area {
      margin-top: 15px;
      border: 1px solid #ddd;
      padding: 10px;
      max-height: 200px;
      overflow-y: auto;
      background-color: #f9f9f9;
    }
    .status {
      margin-top: 10px;
      font-style: italic;
      color: #666;
    }
    .error {
      color: #d32f2f;
    }
  </style>
</head>
<body>
  <h1>Gemini MCP Connector Test</h1>
  
  <div>
    <textarea id="input-text" placeholder="Enter the text to send to Gemini"></textarea>
  </div>
  
  <div>
    <button id="send-button">Send</button>
    <button id="clear-button">Clear</button>
  </div>
  
  <div class="status" id="status-message"></div>
  
  <div>
    <h2 style="font-size: 16px; margin-top: 15px;">Response from Gemini:</h2>
    <div class="response-area" id="response-text"></div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

## public\popup.js

```javascript
// public/popup.js

// Get references to DOM elements first
const inputTextArea = document.getElementById('input-text');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const statusMessage = document.getElementById('status-message');
const responseText = document.getElementById('response-text');

// ★Change 1: Set up the response listener only once when the popup is opened.
// This prevents duplicate listeners even if the button is clicked multiple times.
chrome.runtime.onMessage.addListener(handleResponse);


// Send button click event
sendButton.addEventListener('click', () => {
  const text = inputTextArea.value.trim();

  if (!text) {
    setStatus('Please enter text', true);
    return;
  }

  // ★Change 2: Simplify the click handling. Just request the background to process.
  // This makes it very unlikely that this file will have a parsing error.
  setLoading(true); //
  setStatus('Sending to Gemini...', false); //

  // Send a message to the background script
  chrome.runtime.sendMessage({
    // *Note: So that background.ts can recognize this command,
    // either use a command name like 'executeFromPopup' as previously suggested,
    // or the logic on the background.ts side needs to be adjusted.
    // Here, to utilize the existing logic of background.ts,
    // we will revert to a format close to the original message format.
    command: 'setInput',
    payload: { text: text }
  });
  // Send the second command immediately as well
  chrome.runtime.sendMessage({ command: 'clickSend' });
});


// Clear button click event
clearButton.addEventListener('click', () => {
  inputTextArea.value = '';
  responseText.textContent = '';
  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
});


// Function to handle response messages
function handleResponse(message) {
  // Ignore messages not related to the popup
  if (!message.status) {
    return;
  }

  console.log('Received response:', message);

  if (message.status === 'success' && message.event === 'responseReceived') {
    // Process success response
    responseText.textContent = message.payload.text;
    setStatus('Response received', false); //
  } else if (message.status === 'error') {
    // Process error response
    responseText.textContent = `Error: ${message.message}`;
    setStatus(`An error occurred: ${message.message}`, true); //
  }

  // Enable the UI
  setLoading(false); //
}


// Function to set the status message
function setStatus(message, isError) {
  statusMessage.textContent = message;
  if (isError) {
    statusMessage.classList.add('error'); //
  } else {
    statusMessage.classList.remove('error'); //
  }
}

// Function to set the loading state
function setLoading(isLoading) {
  sendButton.disabled = isLoading; //
  inputTextArea.disabled = isLoading; //
}

// Initialization when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
  // Focus on the input field
  inputTextArea.focus();
});
```

## README.md

```markdown
# Gemini MCP Chrome Extension

This is a project for operating the Gemini Web interface from an MCP client using a Chrome extension.

## Project Overview

This project is a Chrome extension for operating the Google Gemini Web interface from an external MCP client via an MCP server. It is developed in TypeScript to enhance code quality and maintainability.

### System Architecture

The data flow is as follows:

`[MCP Client] <--(MCP)--> [MCP Server] <--(Native Messaging)--> [Chrome Extension] <--(DOM)--> [Gemini Web Page]`

## Setup Method

### Prerequisites

- Node.js and npm are installed
- Google Chrome browser is installed

### Installation Steps

1. Clone or download the repository
   ```
   git clone <repository_url>
   cd GeminiMcpGateway
   ```

2. Install dependent packages
   ```
   npm install
   ```

3. Build the extension
   ```
   npm run build
   ```

4. Install the Chrome extension
   - Open `chrome://extensions` in Chrome
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory (make sure it contains the dist directory)

### MCP Server Configuration

On the MCP server side, you need to create a Native Host manifest and place it in the appropriate location. The manifest must include the following information:

- Host name: `com.example.gemini_mcp_gateway` (must match the name specified in background.ts)
- Path to the executable file
- ID of the allowed Chrome extension

For detailed configuration instructions, please refer to the [Chrome Native Messaging documentation](https://developer.chrome.com/docs/apps/nativeMessaging).

## Usage

### When using an MCP server

1. With the Chrome extension installed, access the Gemini Web page (https://gemini.google.com/)
2. From the MCP client, you can send the following commands via the MCP server:
   - Check readiness status: `{"command": "areYouReady"}`
   - Input text: `{"command": "setInput", "payload": {"text": "Text to input"}}`
   - Click send button: `{"command": "clickSend"}`
3. The response from Gemini is returned to the MCP client via the MCP server:
   - On success: `{"status": "success", "event": "responseReceived", "payload": {"text": "Response text"}}`
   - On error: `{"status": "error", "message": "Error message"}`
4. The ready state of the content script is notified by the following message:
   - When ready: `{"type": "content_ready"}`

### When testing without an MCP server

The extension includes a popup UI for testing the functionality without an MCP server:

1. With the Chrome extension installed, access the Gemini Web page (https://gemini.google.com/)
2. Click the extension icon in the browser's toolbar to open the popup UI
3. Enter the text you want to send to Gemini in the text input field
4. Click the "Send" button to send the text to Gemini and display the response
5. Click the "Clear" button to clear the input and response fields

Using this test feature, you can verify that the extension is working correctly even without an MCP server implementation.

## Development Information

### Project Structure

```
/project-root
|-- /dist            <- Directory where built files are output
|-- /public          <- Directory to store static files
|   |-- manifest.json <- Chrome extension manifest
|   |-- popup.html    <- HTML for the test popup
|   `-- popup.js      <- JavaScript for the test popup
|-- /src             <- Directory to store source code
|   |-- background.ts <- Responsible for Native Messaging
|   |-- content.ts    <- Responsible for DOM manipulation
|   `-- types.ts      <- Type definitions
|-- package.json
|-- tsconfig.json
`-- webpack.config.js
```

### Build Command

- `npm run build`: Builds the extension

## Notes

- The selectors (SELECTORS) may need to be adjusted to match the actual structure of the Gemini page
- The Native Messaging host name (HOST_NAME) must match the settings on the MCP server side
- The Content Security Policy (CSP) settings comply with the security requirements of Chrome extensions ('unsafe-eval' is not used)
- The Service Worker is configured to operate as an ES module
- The dist directory is automatically cleared during the build. This prevents problems caused by old files remaining
```

## src\background.ts

```typescript
/**
 * background.ts
 * 
 * This file acts as the background script for the Chrome extension,
 * and communicates with an external MCP server using Native Messaging.
 * It also manages communication with the tab that has the Gemini Web page open.
 */

import { RequestMessage, ResponseMessage } from './types';

// Native Messaging host name (must match the settings on the MCP server side)
const HOST_NAME = 'com.example.gemini_mcp_gateway';

// Native Messaging port (used for communication with the MCP server)
let nativePort: chrome.runtime.Port | null = null;

// Object to track the ready state of Gemini tabs (tab ID => ready flag)
let geminiTabStatus: { [key: number]: boolean } = {};

// Message queue for tabs that are not ready (tab ID => message array)
let messageQueue: { [key: number]: RequestMessage[] } = {};

/**
 * Function to connect to the Native Messaging host
 * 
 * This function establishes a connection to the external MCP server (Native Messaging host),
 * and sets up message sending/receiving and error handling.
 * If the connection is lost, it will attempt to reconnect after 5 seconds.
 * Upon successful connection, it sends a readiness check message to existing Gemini tabs.
 */
function connectToNativeHost() {
  try {
    console.log('[MCP-Background] Attempting to connect to native host...');
    nativePort = chrome.runtime.connectNative(HOST_NAME);

    // Processing when a message is received from the MCP server
    nativePort.onMessage.addListener((message: RequestMessage) => {
      sendCommandsToGeminiTab(message);
    });

    // Processing when the connection is disconnected
    nativePort.onDisconnect.addListener(() => {
      console.log('%c[MCP-Background] Disconnected from native host.', 'color: red;');
      const error = chrome.runtime.lastError;
      if (error && error.message) console.error('[MCP-Background] Disconnect error:', error.message);
      nativePort = null;
      // ★★★ Do not reset the state ★★★
      // geminiTabStatus = {};
      // messageQueue = {};
      setTimeout(connectToNativeHost, 5000); // Attempt to reconnect after 5 seconds
    });

    console.log('%c[MCP-Background] Successfully connected to native host.', 'color: orange;');

    // On successful connection, check if existing Gemini tabs are ready (roll call)
    chrome.tabs.query({ url: "https://gemini.google.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          console.log(`[MCP-Background] Sending readiness check to Tab ID: ${tab.id}`);
          chrome.tabs.sendMessage(tab.id, { command: 'areYouReady' });
        }
      });
    });

  } catch (error: any) {
    // Processing on connection error
    if (error && error.message) console.error('[MCP-Background] Failed to connect:', error.message);
    else console.error('[MCP-Background] Failed to connect with an unknown error.');
    setTimeout(connectToNativeHost, 5000); // Attempt to reconnect after 5 seconds
  }
}

// Start connecting to the Native Messaging host
connectToNativeHost();

/**
 * Message listener
 * 
 * This listener handles the following three types of messages:
 * 1. "Ready" notification from the Gemini tab
 * 2. Response message from the Gemini tab (forwarded to the MCP server)
 * 3. Commands from other sources such as the popup UI (forwarded to the Gemini tab)
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  // Process messages from the Gemini tab
  if (sender.tab && sender.tab.url?.includes('gemini.google.com')) {
    const tabId = sender.tab.id;
    if (tabId) {
        // Process "ready" notification from the tab
        if (message.type === 'content_ready') {
            console.log(`%c[MCP-Background] Tab ID: ${tabId} is now ready.`, 'color: green;');
            geminiTabStatus[tabId] = true;

            // Send any messages that were queued up
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

    // Forward the response from Gemini to the MCP server
    if (message.status && nativePort) {
      nativePort.postMessage(message);
    }
  } 
  // Process commands from other sources such as the popup UI
  else if (!sender.tab && message.command) {
    sendCommandsToGeminiTab(message as RequestMessage);
  }
  return true; // Enable asynchronous response
});

/**
 * Function to send command messages to the Gemini tab
 * 
 * This function forwards commands from the MCP server or the popup UI to the Gemini tab.
 * If the tab is not ready, it queues the message to be sent later.
 * 
 * @param message - The command message to send to the Gemini tab
 */
async function sendCommandsToGeminiTab(message: RequestMessage) {
    // Search for the Gemini tab
    const tabs = await chrome.tabs.query({ url: "https://gemini.google.com/*" });
    if (tabs.length === 0) return; // Do nothing if no Gemini tab is found

    const targetTab = tabs;
    if (targetTab && typeof targetTab.id !== 'undefined') {
        const tabId = targetTab.id;

        // If the tab is not ready, queue the message
        if (!geminiTabStatus[tabId]) {
            console.warn(`[MCP-Background] Tab ${tabId} is not ready yet. Queuing message.`, message);
            if (!messageQueue[tabId]) messageQueue[tabId] = [];
            messageQueue[tabId].push(message);
            return;
        }
        // If the tab is ready, send the message directly
        chrome.tabs.sendMessage(tabId, message);
    }
}
```

## src\content.ts

```typescript
/**
 * content.ts
 * 
 * This file acts as a content script for the Chrome extension,
 * and is responsible for DOM manipulation on the Gemini Web page. Main functions are:
 * 1. Inputting text into the text input field
 * 2. Clicking the send button
 * 3. Retrieving and forwarding the response text from Gemini
 * 
 * It performs messaging with the extension's background script,
 * and executes commands from the MCP server.
 */
import { RequestMessage, ResponseMessage } from './types';

/**
 * Function to initialize the main processing
 * 
 * This function is called when the Gemini Web page is ready,
 * and sets up DOM manipulation and event listeners.
 */
function initializeMainLogic() {
  console.log('[MCP-Content] Target frame confirmed. Initializing main logic...');

  // Selectors for identifying elements on the Gemini Web page
  const SELECTORS = {
    INPUT_AREA: 'div[aria-label="Enter a prompt here"]',
    SEND_BUTTON: 'button[aria-label="Send prompt"]',
    RESPONSE_CONTAINER: 'div[id^="model-response-message-content"]'
  };

  // Storage key for recording the last sent response
  const STORAGE_KEY = 'mcp_last_response';

  // Observer for monitoring DOM changes
  let responseObserver: MutationObserver | null = null;

  // Timeout ID for debouncing response text retrieval
  let debounceTimeout: number | null = null;

  /**
   * Function to extract the response text from Gemini
   * 
   * Retrieves the latest response text from Gemini's response container on the page.
   * Returns null if the response is not found or an error occurs.
   * 
   * @returns The extracted response text, or null if no response is found
   */
  function extractResponseText(): string | null {
    try {
      const allResponses = document.querySelectorAll(SELECTORS.RESPONSE_CONTAINER);
      if (allResponses.length === 0) return null;
      const latestResponse = allResponses[allResponses.length - 1];
      return (latestResponse.textContent || '').trim();
    } catch (error) { return null; }
  }

  /**
   * Function to initialize the session storage
   * 
   * On page load, if there is existing response text, it is saved to session storage.
   * This prevents the same response from being sent multiple times.
   */
  function primeSessionStorage() {
    const initialText = extractResponseText();
    if (initialText) {
      console.log('[MCP-Content] Priming sessionStorage with initial last response:', initialText);
      sessionStorage.setItem(STORAGE_KEY, initialText);
    }
  }

  /**
   * Function to send the response text to the background script
   * 
   * Sends the response text from Gemini to the background script in the appropriate format.
   * The background script forwards this to the MCP server.
   * 
   * @param text - The response text to send
   */
  function sendResponseToBackground(text: string) {
    const response: ResponseMessage = { status: 'success', event: 'responseReceived', payload: { text: text } };
    chrome.runtime.sendMessage(response);
  }

  /**
   * Function to start the observer that monitors Gemini's responses
   * 
   * Monitors DOM changes and detects new response text from Gemini.
   * When a new response is detected, it is sent to the background script.
   * It uses debouncing to prevent multiple notifications from occurring in a short period of time.
   * It outputs diagnostic logs to track each step of the response detection process.
   */
  function startResponseObserver() {
    // Disconnect any existing observer
    if (responseObserver) responseObserver.disconnect();

    const observerTarget = document.body;
    responseObserver = new MutationObserver(() => {
      // Debouncing (to prevent it from running multiple times in a short period)
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = window.setTimeout(() => {
        console.log('[MCP-Content] --- Observer Fired ---');
        const finalText = extractResponseText();

        // If no response text was retrieved
        if (!finalText) {
          console.log('[MCP-Content] Observer fired, but no text was extracted.');
          return;
        }
        console.log(`[MCP-Content] Step 1: Extracted text: "${finalText.substring(0, 20)}..."`);

        try {
          // Get the last sent response text
          const lastSent = sessionStorage.getItem(STORAGE_KEY) || '';
          console.log(`[MCP-Content] Step 2: Read from sessionStorage. lastSent: "${lastSent.substring(0, 20)}..."`);

          // Only send if it's a new response text
          if (finalText !== lastSent) {
            console.log('[MCP-Content] Step 3: ✅ Text is new. Condition (finalText !== lastSent) is TRUE.');
            console.log('[MCP-Content] Step 4: Attempting to write to sessionStorage...');
            sessionStorage.setItem(STORAGE_KEY, finalText);
            console.log('[MCP-Content] Step 5: Write to sessionStorage seems successful.');
            sendResponseToBackground(finalText);
          } else {
            console.log('[MCP-Content] Step 3: ❌ Text is old (it matches sessionStorage). Condition is FALSE. Ignoring.');
          }
        } catch (e) {
          console.error('[MCP-Content] ❌ A CRITICAL ERROR occurred while accessing sessionStorage!', e);
        }
      }, 500); // 500 millisecond debounce time
    });

    // Monitor changes to the body element and its descendants
    responseObserver.observe(observerTarget, { childList: true, subtree: true });
  }

  /**
   * Function to set text in the text input field
   * 
   * Inputs the specified text into Gemini's input field.
   * Returns a Promise indicating whether the input was successful.
   * 
   * @param text - The text to input
   * @returns A Promise indicating whether the input was successful
   */
  function setInput(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Get the input field element
        const inputElement = document.querySelector(SELECTORS.INPUT_AREA) as HTMLElement;
        if (!inputElement) { resolve(false); return; }

        // Input the text
        inputElement.focus();
        inputElement.textContent = text;

        // Fire an input event to notify Gemini of the change
        const inputEvent = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(inputEvent);

        resolve(true);
      } catch (error) { resolve(false); }
    });
  }

  /**
   * Function to click the send button
   * 
   * Finds and clicks Gemini's send button.
   * Waits for the button to become enabled, and starts response monitoring after the click.
   * 
   * @returns A Promise indicating whether the click was successful
   */
  function clickSend(): Promise<boolean> {
    return new Promise((resolve) => {
      // Periodically check until the button is enabled
      const intervalId = setInterval(() => {
        const sendButton = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          clearInterval(intervalId);
          try {
            // Click the button and start monitoring for a response
            sendButton.click();
            startResponseObserver();
            resolve(true);
          } catch (error) { resolve(false); }
        }
      }, 100); // Check every 100 milliseconds
    });
  }

  /**
   * Function to send an error message to the background script
   * 
   * If an error occurs during an operation, it sends an error message to the
   * background script.
   * 
   * @param errorMessage - The error message to send
   */
  function sendErrorToBackground(errorMessage: string) {
    const errorResponse: ResponseMessage = { status: 'error', message: errorMessage };
    chrome.runtime.sendMessage(errorResponse);
  }

  // Prepare the session storage on initialization
  primeSessionStorage();

  /**
   * Listener for processing messages from the background script
   * 
   * Handles the following commands:
   * - areYouReady: Responds to the readiness check
   * - setInput: Sets text in the text input field
   * - clickSend: Clicks the send button
   */
  chrome.runtime.onMessage.addListener((message: RequestMessage) => {
    switch (message.command) {
      case 'areYouReady':
        // Respond to the roll call from the background script and notify that it is ready
        console.log('[MCP-Content] Received readiness check. Replying with content_ready.');
        chrome.runtime.sendMessage({ type: 'content_ready' });
        break;
      case 'setInput':
        // Process the text input command
        setInput(message.payload.text).then(success => { 
          if (!success) sendErrorToBackground('Failed to input text'); 
        });
        break;
      case 'clickSend':
        // Process the send button click command
        clickSend().then(success => { 
          if (!success) sendErrorToBackground('Failed to click the send button'); 
        });
        break;
    }
    return true; // Enable asynchronous response
  });

  // Notify the background script that it is ready upon completion of initialization
  chrome.runtime.sendMessage({ type: 'content_ready' });
}

/**
 * Function to wait until a specific element appears in the DOM
 * 
 * Periodically checks until an element matching the specified selector
 * appears in the DOM, and executes a callback function when the element is found.
 * 
 * @param selector - The CSS selector of the element to wait for
 * @param callback - The callback function to execute when the element is found
 */
function pollForElement(selector: string, callback: () => void) {
  const intervalId = setInterval(() => {
    if (document.querySelector(selector)) {
      clearInterval(intervalId);
      callback();
    }
  }, 500); // Check every 500 milliseconds
}

// Wait for the input field to appear, and initialize the main processing once it does
pollForElement('div[aria-label="Enter a prompt here"]', initializeMainLogic);
```

## src\types.ts

```typescript
/**
 * types.ts
 * 
 * This file provides type definitions for messaging between the Chrome
 * extension and the MCP server. Clear type definitions enable type-safe
 * communication and facilitate error detection during development.
 */

/**
 * Type definition for request messages from the MCP server to the extension
 */

/**
 * Readiness check message
 * 
 * Used by the background script to check if the content script
 * is ready.
 */
export interface AreYouReadyMessage {
  command: 'areYouReady';
}

/**
 * Text input message
 * 
 * Used to instruct the content script to input specific text
 * into Gemini's input field.
 */
export interface SetInputMessage {
  command: 'setInput';
  payload: {
    text: string; // The text to input
  };
}

/**
 * Send button click message
 * 
 * Used to instruct the content script to click Gemini's
 * send button.
 */
export interface ClickSendMessage {
  command: 'clickSend';
}

/**
 * Union type for request messages
 * 
 * Used to handle all request types from the MCP server to the
 * Chrome extension as a single type.
 */
export type RequestMessage = SetInputMessage | ClickSendMessage | AreYouReadyMessage;


/**
 * Type definition for response messages from the extension to the MCP server
 */

/**
 * Union type for response messages
 * 
 * Used to handle all response types from the Chrome extension to the
 * MCP server as a single type.
 */
export type ResponseMessage = SuccessResponseMessage | ErrorResponseMessage;

/**
 * Success response message
 * 
 * Used to forward the response text from Gemini
 * to the MCP server.
 */
export interface SuccessResponseMessage {
  status: 'success';
  event: 'responseReceived';
  payload: {
    text: string; // The response text from Gemini
  };
}

/**
 * Error response message
 * 
 * Used to notify the MCP server of an error that
 * occurred during an operation.
 */
export interface ErrorResponseMessage {
  status: 'error';
  message: string; // The error message
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "types": ["chrome"]
  },
  "include": ["src"]
}
```

## webpack.config.js

```javascript
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: {
    background: './src/background.ts',
    content: './src/content.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
    // ★ remove module, library, experiments
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' }
      ]
    })
  ]
};
```