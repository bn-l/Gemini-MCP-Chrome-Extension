/**
 * content.ts
 *
 * This file serves as the content script for the Chrome extension. It handles
 * DOM operations on the Gemini web page and offers three main capabilities:
 * 1. Writing text into the input field
 * 2. Clicking the send button
 * 3. Retrieving Gemini's response text and forwarding it
 *
 * It communicates with the background script and executes commands that come
 * from the MCP server.
 */
import { RequestMessage, ResponseMessage } from "./types";

/**
 * Initializes the main logic.
 *
 * This function is called once the Gemini web page is ready. It sets up all
 * DOM manipulation helpers and event listeners.
 */
function initializeMainLogic() {
  console.log(
    "[MCP-Content] Target frame confirmed. Initializing main logic..."
  );

  // CSS selectors used to locate elements on the Gemini page
  const SELECTORS = {
    INPUT_AREA: 'div[aria-label="Enter your prompt here"]',
    SEND_BUTTON: 'button[aria-label="Send prompt"]',
    RESPONSE_CONTAINER: 'div[id^="model-response-message-content"]',
  };

  // sessionStorage key for tracking the last response that was sent
  const STORAGE_KEY = "mcp_last_response";

  // Observer to watch DOM changes for new responses
  let responseObserver: MutationObserver | null = null;

  // Timeout ID used to debounce response extraction
  let debounceTimeout: number | null = null;

  /**
   * Extracts the latest response text from Gemini.
   * Returns null if the text cannot be found or an error occurs.
   */
  function extractResponseText(): string | null {
    try {
      const allResponses = document.querySelectorAll(
        SELECTORS.RESPONSE_CONTAINER
      );
      if (allResponses.length === 0) return null;
      const latestResponse = allResponses[allResponses.length - 1];
      return (latestResponse.textContent || "").trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Initializes sessionStorage.
   *
   * If an existing response is present when the page loads, store it so that we
   * don’t send the same response twice.
   */
  function primeSessionStorage() {
    const initialText = extractResponseText();
    if (initialText) {
      console.log(
        "[MCP-Content] Priming sessionStorage with initial last response:",
        initialText
      );
      sessionStorage.setItem(STORAGE_KEY, initialText);
    }
  }

  /**
   * Sends response text to the background script so it can be forwarded to the
   * MCP server.
   */
  function sendResponseToBackground(text: string) {
    const response: ResponseMessage = {
      status: "success",
      event: "responseReceived",
      payload: { text: text },
    };
    chrome.runtime.sendMessage(response);
  }

  /**
   * Starts the MutationObserver that watches for new Gemini responses.
   *
   * The observer is debounced to avoid firing multiple times in quick
   * succession. Detailed diagnostic logs trace every step.
   */
  function startResponseObserver() {
    // Disconnect existing observer, if any
    if (responseObserver) responseObserver.disconnect();

    const observerTarget = document.body;
    responseObserver = new MutationObserver(() => {
      // Debounce to avoid multiple triggers in quick succession
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = window.setTimeout(() => {
        console.log("[MCP-Content] --- Observer Fired ---");
        const finalText = extractResponseText();

        // If no response text could be extracted
        if (!finalText) {
          console.log(
            "[MCP-Content] Observer fired, but no text was extracted."
          );
          return;
        }
        console.log(
          `[MCP-Content] Step 1: Extracted text: "${finalText.substring(
            0,
            20
          )}..."`
        );

        try {
          // Retrieve the last response text that was sent
          const lastSent = sessionStorage.getItem(STORAGE_KEY) || "";
          console.log(
            `[MCP-Content] Step 2: Read from sessionStorage. lastSent: "${lastSent.substring(
              0,
              20
            )}..."`
          );

          // Only send if the response text is new
          if (finalText !== lastSent) {
            console.log(
              "[MCP-Content] Step 3: ✅ Text is new. Condition (finalText !== lastSent) is TRUE."
            );
            console.log(
              "[MCP-Content] Step 4: Attempting to write to sessionStorage..."
            );
            sessionStorage.setItem(STORAGE_KEY, finalText);
            console.log(
              "[MCP-Content] Step 5: Write to sessionStorage seems successful."
            );
            sendResponseToBackground(finalText);
          } else {
            console.log(
              "[MCP-Content] Step 3: ❌ Text is old (it matches sessionStorage). Condition is FALSE. Ignoring."
            );
          }
        } catch (e) {
          console.error(
            "[MCP-Content] ❌ A CRITICAL ERROR occurred while accessing sessionStorage!",
            e
          );
        }
      }, 500); // Debounce delay of 500 ms
    });

    // Observe changes on body and its descendants
    responseObserver.observe(observerTarget, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Writes the specified text into Gemini’s input field.
   */
  function setInput(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Get the input element
        const inputElement = document.querySelector(
          SELECTORS.INPUT_AREA
        ) as HTMLElement;
        if (!inputElement) {
          resolve(false);
          return;
        }

        // Insert the text
        inputElement.focus();
        inputElement.textContent = text;

        // Dispatch an input event to notify Gemini of the change
        const inputEvent = new Event("input", { bubbles: true });
        inputElement.dispatchEvent(inputEvent);

        resolve(true);
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Locates and clicks the Gemini send button. After the click the response
   * observer is started.
   */
  function clickSend(): Promise<boolean> {
    return new Promise((resolve) => {
      // Periodically check until the button becomes enabled
      const intervalId = setInterval(() => {
        const sendButton = document.querySelector(
          SELECTORS.SEND_BUTTON
        ) as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          clearInterval(intervalId);
          try {
            // Click the button and start the response observer
            sendButton.click();
            startResponseObserver();
            resolve(true);
          } catch (error) {
            resolve(false);
          }
        }
      }, 100); // Check every 100 ms
    });
  }

  /**
   * Sends an error message to the background script so it can be relayed to the
   * MCP server.
   */
  function sendErrorToBackground(errorMessage: string) {
    const errorResponse: ResponseMessage = {
      status: "error",
      message: errorMessage,
    };
    chrome.runtime.sendMessage(errorResponse);
  }

  // Prime sessionStorage during initialization
  primeSessionStorage();

  /**
   * Listener for messages coming from the background script.
   *
   * Supported commands:
   * - areYouReady: Reply with a readiness notification
   * - setInput:   Insert text into the input field
   * - clickSend:  Click the send button
   */
  chrome.runtime.onMessage.addListener((message: RequestMessage) => {
    switch (message.command) {
      case "areYouReady":
        // Respond to readiness check by notifying that content is ready
        console.log(
          "[MCP-Content] Received readiness check. Replying with content_ready."
        );
        chrome.runtime.sendMessage({ type: "content_ready" });
        break;
      case "setInput":
        // Handle text input command
        setInput(message.payload.text).then((success) => {
          if (!success) sendErrorToBackground("Failed to input text");
        });
        break;
      case "clickSend":
        // Handle send button click command
        clickSend().then((success) => {
          if (!success) sendErrorToBackground("Failed to click send button");
        });
        break;
    }
    return true; // Enable asynchronous response
  });

  // Notify background script that content is ready after initialization
  chrome.runtime.sendMessage({ type: "content_ready" });
}

/**
 * Polls for an element to appear in the DOM before executing a callback.
 *
 * Periodically checks for an element matching the specified selector, and
 * executes the callback function once the element is found.
 *
 * @param selector - CSS selector for the element to wait for
 * @param callback - Function to execute when the element is found
 */
function pollForElement(selector: string, callback: () => void) {
  const intervalId = setInterval(() => {
    if (document.querySelector(selector)) {
      clearInterval(intervalId);
      callback();
    }
  }, 500); // Check every 500 milliseconds
}

// Wait for the input field to appear and then initialize the main logic
pollForElement('div[aria-label="Enter your prompt here"]', initializeMainLogic);
