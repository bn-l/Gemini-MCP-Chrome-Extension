// public/popup.js

// Get handles to DOM elements
const inputTextArea = document.getElementById('input-text');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const statusMessage = document.getElementById('status-message');
const responseText = document.getElementById('response-text');

// ★Change 1: Register the response listener only once when the popup opens.
// This prevents duplicate listeners when the button is clicked multiple times.
chrome.runtime.onMessage.addListener(handleResponse);


// Click handler for the send button
sendButton.addEventListener('click', () => {
  const text = inputTextArea.value.trim();

  if (!text) {
    setStatus('Please enter text', true);
    return;
  }

  // ★Change 2: Keep the click handler simple—just ask the background page to do the work.
  // This greatly reduces the chance of parse errors in this file.
  setLoading(true);
  setStatus('Sending to Gemini...', false);

  // Send a message to the background script
  chrome.runtime.sendMessage({
    // Note: Make sure background.ts can recognize this command name.
    // We stay close to the existing message format for compatibility.
    command: 'setInput',
    payload: { text: text }
  });
  // Immediately send the second command
  chrome.runtime.sendMessage({ command: 'clickSend' });
});


// Click handler for the clear button
clearButton.addEventListener('click', () => {
  inputTextArea.value = '';
  responseText.textContent = '';
  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
});


// Handles incoming response messages
function handleResponse(message) {
  // Ignore messages not related to the popup
  if (!message.status) {
    return;
  }

  console.log('Received response:', message);

  if (message.status === 'success' && message.event === 'responseReceived') {
    // Success response
    responseText.textContent = message.payload.text;
    setStatus('Response received', false);
  } else if (message.status === 'error') {
    // Error response
    responseText.textContent = `Error: ${message.message}`;
    setStatus(`An error occurred: ${message.message}`, true);
  }

  // Re-enable the UI
  setLoading(false);
}


// Sets the status message
function setStatus(message, isError) {
  statusMessage.textContent = message;
  if (isError) {
    statusMessage.classList.add('error');
  } else {
    statusMessage.classList.remove('error');
  }
}

// Toggles the loading state
function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  inputTextArea.disabled = isLoading;
}

// Initialization when the popup opens
document.addEventListener('DOMContentLoaded', () => {
  // Focus the input field
  inputTextArea.focus();
});