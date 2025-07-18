# Gemini MCP Chrome Extension

This Chrome extension allows an external MCP client to operate the Google Gemini web interface through an MCP server.

## Project Overview

The project is written in TypeScript to ensure high code quality and maintainability. The overall data flow is shown below:

`[MCP Client] <--(MCP)--> [MCP Server] <--(Native Messaging)--> [Chrome Extension] <--(DOM)--> [Gemini Web Page]`

## Setup

### Prerequisites

- Node.js and npm installed
- Google Chrome installed

### Installation Steps

1. Clone or download the repository
   ```bash
   git clone <repository_url>
   cd Gemini-MCP-Chrome-Extension
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run build
   ```

4. Load the extension in Chrome
   1. Open `chrome://extensions` in Chrome
   2. Enable **Developer mode**
   3. Click **Load unpacked** and choose the project directory (make sure the `dist` folder exists)

### MCP Server Setup

On the MCP server side you must create and place a Native Host manifest. The manifest must contain the following information:

- Host name: `com.example.gemini_mcp_gateway` (must match the value in `background.ts`)
- Path to the executable
- The ID of the allowed Chrome extension

For details, see the [Chrome Native Messaging documentation](https://developer.chrome.com/docs/apps/nativeMessaging).

## Usage

### With an MCP Server

1. With the extension installed, navigate to the Gemini web page: `https://gemini.google.com/`
2. From the MCP client send one of the following commands through the MCP server:
   - Check readiness: `{"command": "areYouReady"}`
   - Set input text: `{"command": "setInput", "payload": {"text": "your text"}}`
   - Click send: `{"command": "clickSend"}`
3. Gemini’s response is forwarded back through the MCP server to the client:
   - Success: `{"status": "success", "event": "responseReceived", "payload": {"text": "response text"}}`
   - Error: `{"status": "error", "message": "error message"}`
4. The content script announces its readiness with:
   - `{"type": "content_ready"}`

### Testing Without an MCP Server

A popup UI is built into the extension so you can test it without an MCP server:

1. With the extension installed, open `https://gemini.google.com/`
2. Click the extension icon in the browser toolbar to open the popup UI
3. Type the text you want to send in the input field
4. Click **Send** to transmit the text to Gemini and see the response in the popup
5. Click **Clear** to reset the input and response areas

## Development Information

### Project Structure

```
/project-root
|-- /dist            <- Build output
|-- /public          <- Static assets
|   |-- manifest.json <- Extension manifest
|   |-- popup.html    <- Test popup HTML
|   `-- popup.js      <- Test popup JavaScript
|-- /src             <- Source code
|   |-- background.ts <- Native Messaging handler
|   |-- content.ts    <- DOM manipulation logic
|   `-- types.ts      <- Type definitions
|-- package.json
|-- tsconfig.json
`-- webpack.config.js
```

### Build Commands

- `npm run build` – Build the extension

## Notes

- The CSS selectors (`SELECTORS`) may need adjustment to match changes in the Gemini page structure.
- The Native Messaging host name (`HOST_NAME`) must match the MCP server configuration.
- The Content Security Policy follows Chrome extension security requirements (no `'unsafe-eval'`).
- The Service Worker is configured to run as an ES module.
- During the build process the `dist` directory is automatically cleared to prevent stale files from causing issues.
