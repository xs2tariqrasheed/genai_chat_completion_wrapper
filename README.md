# Chat Completion Wrapper

A simple Node.js project that provides a REST API wrapper around OpenAI's chat completion API, along with a command-line interface (CLI) client for interactive chat sessions.

## Project Overview

This project consists of two main components:

1. **`server.js`** - An Express.js server that wraps OpenAI's chat completion API, providing a simple REST endpoint for chat interactions
2. **`cli.js`** - A command-line client that connects to the server and provides an interactive terminal-based chat interface

Together, they create a complete chat system where the server handles API communication with OpenAI, and the CLI provides a user-friendly way to interact with the chat model.

## How It Works

### Architecture

```
┌─────────────┐         HTTP POST         ┌─────────────┐         OpenAI API         ┌─────────────┐
│   cli.js    │ ────────────────────────> │  server.js  │ ────────────────────────> │   OpenAI   │
│  (Client)   │ <──────────────────────── │   (Server)  │ <──────────────────────── │   (API)    │
└─────────────┘      JSON Response        └─────────────┘      Chat Completion      └─────────────┘
```

### `server.js` - The API Server

The server (`server.js`) is an Express.js application that:

- **Initializes OpenAI Client**: Creates an OpenAI client instance using the API key from environment variables
- **Provides Health Check**: Exposes a `GET /` endpoint to verify the server is running
- **Handles Chat Requests**: Provides a `POST /chat` endpoint that:
  - Accepts chat messages, temperature, max_tokens, and model parameters
  - Validates the request (ensures messages array is present and not empty)
  - Forwards the request to OpenAI's chat completion API
  - Returns a simplified response with the assistant's reply, usage statistics, and raw API response

**Key Features:**
- Error handling with appropriate HTTP status codes
- Environment-based error details (only shows full errors in development)
- Configurable port via `PORT` environment variable (defaults to 3000)

### `cli.js` - The Command-Line Client

The CLI (`cli.js`) is an interactive terminal application that:

- **Maintains Conversation Context**: Keeps a messages array in memory that includes:
  - A system message defining the assistant's role
  - All user messages and assistant responses from the conversation
- **Provides Interactive Interface**: Uses Node.js `readline` to create a REPL-like interface
- **Communicates with Server**: Sends HTTP POST requests to the server's `/chat` endpoint
- **Handles User Input**: 
  - Prompts for user input
  - Sends messages to the server
  - Displays assistant responses
  - Allows graceful exit with "exit" command

**Key Features:**
- Conversation memory - maintains full chat history for context
- Error handling for network and API errors
- Clean terminal interface with clear prompts

### How They Work Together

1. **Startup**: The server must be running before the CLI can connect to it
2. **Request Flow**:
   - User types a message in the CLI
   - CLI adds the message to its conversation history
   - CLI sends a POST request to `http://localhost:3000/chat` with all messages
   - Server receives the request, validates it, and forwards it to OpenAI
   - Server receives OpenAI's response and sends it back to the CLI
   - CLI displays the response and adds it to the conversation history
3. **Context Preservation**: The CLI maintains the full conversation history, so each request includes all previous messages, allowing the model to maintain context throughout the conversation

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)
- OpenAI API key

## Step-by-Step Setup Guide

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages:
- `express` - Web server framework
- `openai` - Official OpenAI SDK
- `dotenv` - Environment variable management
- `node-fetch` - HTTP client for making requests

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
touch .env
```

Add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

**Note**: Replace `your_api_key_here` with your actual OpenAI API key. You can get one from [OpenAI's website](https://platform.openai.com/api-keys).

### 3. Start the Server

In your first terminal window, start the server:

```bash
npm run server
```

Or directly:

```bash
node server.js
```

You should see:
```
Chat wrapper server listening on http://localhost:3000
```

### 4. Run the CLI Client

In a **second terminal window**, start the CLI client:

```bash
npm run cli
```

Or directly:

```bash
node cli.js
```

You should see:
```
=== Console Chat (type 'exit' to quit) ===

You: 
```

### 5. Start Chatting!

Type your message and press Enter. The CLI will:
1. Send your message to the server
2. Wait for the server to get a response from OpenAI
3. Display the assistant's reply
4. Prompt you for the next message

Type `exit` to quit the CLI.

## Example Usage

```
=== Console Chat (type 'exit' to quit) ===

You: Hello, how are you?
Assistant: Hello! I'm doing well, thank you for asking. How can I help you today?

You: What is 2+2?
Assistant: 2+2 equals 4.

You: exit
Goodbye!
```

## Project Structure

```
chat_completion_wrapper/
├── server.js          # Express server with OpenAI API wrapper
├── cli.js             # Interactive CLI client
├── package.json        # Project dependencies and scripts
├── .env               # Environment variables (not in git)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## API Endpoint

### POST `/chat`

**Request Body:**
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 256,
  "model": "gpt-4o-mini"
}
```

**Response:**
```json
{
  "reply": "Hello! How can I help you today?",
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  },
  "raw": { /* full OpenAI API response */ }
}
```

## Troubleshooting

### Server won't start
- Check that port 3000 (or your configured PORT) is not already in use
- Verify your `.env` file exists and contains `OPENAI_API_KEY`

### CLI can't connect to server
- Make sure the server is running (`npm run server`)
- Verify the server is listening on the correct port (check the server startup message)
- Check that `PORT` in `.env` matches the port the server is using

### API errors
- Verify your OpenAI API key is correct and has sufficient credits
- Check that the model name is valid (e.g., "gpt-4o-mini", "gpt-4", etc.)
- Review server console logs for detailed error messages

## License

This project is for educational purposes.

