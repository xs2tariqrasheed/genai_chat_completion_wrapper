# OpenAI Chat Completions API - Notes

## Table of Contents
1. [Basic Concepts](#basic-concepts)
2. [API Method: client.chat.completions.create](#api-method)
3. [Key Parameters](#key-parameters)
4. [Context Management in Production](#context-management)
5. [Compression Strategies](#compression-strategies)

---

## Basic Concepts

### What is `client.chat.completions.create`?

`client.chat.completions.create()` is a method from the **OpenAI Node.js SDK** (v4.0.0) that:
- Sends a request to OpenAI's `/v1/chat/completions` endpoint
- Returns a Promise that resolves to the API response
- Takes a configuration object with parameters like `model`, `messages`, `temperature`, `max_tokens`, etc.

**Structure:**
- `client` - An instance of `OpenAI` (created with `new OpenAI({ apiKey: ... })`)
- `.chat` - Namespace for chat-related operations
- `.completions` - Namespace for completion operations
- `.create()` - The method that makes the API call

**Response includes:**
- `choices`: Array with the generated message(s)
- `usage`: Token usage statistics
- Other metadata

---

## Key Parameters

### 1. Role

The `role` field indicates who is speaking in the conversation. There are three roles:

- **`"user"`** - The person asking questions or making requests
- **`"assistant"`** - The AI's previous responses (for context)
- **`"system"`** - Instructions that set the AI's behavior/personality

**Example:**
```javascript
messages: [
  { role: "system", content: "You are a helpful math tutor." },
  { role: "user", content: "What is 2 + 2?" },
  { role: "assistant", content: "2 + 2 equals 4." },
  { role: "user", content: "What about 3 + 3?" }
]
```

**Why roles matter:** They help the model understand conversation flow and context. The `system` role sets behavior, `user` is the human, and `assistant` provides prior responses for continuity.

---

### 2. Temperature

`temperature` controls randomness/creativity in responses. Range: **0.0 to 2.0**

- **Low (0.0 - 0.3)**: More deterministic, focused, consistent
- **Medium (0.7 - 1.0)**: Balanced creativity and consistency
- **High (1.5 - 2.0)**: More creative, varied, less predictable

**Examples:**

**Temperature = 0.1** (Very deterministic):
```javascript
// Same prompt multiple times → very similar responses
temperature: 0.1
// Good for: Code generation, factual answers, translations
```

**Temperature = 0.7** (Default, balanced):
```javascript
// Same prompt → similar but with some variation
temperature: 0.7
// Good for: General conversations, creative writing
```

**Temperature = 1.5** (Very creative):
```javascript
// Same prompt → very different responses each time
temperature: 1.5
// Good for: Creative writing, brainstorming, generating ideas
```

**Real-world example:**
```javascript
// Factual question - use low temperature
const result1 = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "What is the capital of France?" }],
  temperature: 0.1  // Consistent answer: "Paris"
});

// Creative story - use high temperature
const result2 = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Write a short story about a robot." }],
  temperature: 1.2  // Different story each time
});
```

---

### 3. Token

A token is a unit of text the model processes. It can be:
- A whole word: `"hello"` = 1 token
- Part of a word: `"learning"` = 2 tokens (`"learn"` + `"ing"`)
- Punctuation: `"!"` = 1 token
- Sometimes multiple words: `"New York"` might be 1-2 tokens

**Token counting examples:**
```
"Hello!"           → ~2 tokens
"Hello world"      → ~2 tokens  
"Hello, world!"    → ~3 tokens
"The quick brown fox jumps over the lazy dog" → ~9 tokens
```

**In code:**
```javascript
const result = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 256  // Limits response to ~256 tokens
});

// Response includes usage info:
console.log(result.usage);
// {
//   prompt_tokens: 10,      // Tokens in your input
//   completion_tokens: 5,   // Tokens in AI's response
//   total_tokens: 15        // Total used
// }
```

**Why tokens matter:**
- **Cost**: You're charged per token (input + output)
- **Limits**: Models have maximum token limits (context windows)
- **Control**: `max_tokens` limits response length

**Example with token limits:**
```javascript
// Short response (cheaper, faster)
max_tokens: 50   // ~50 words max

// Longer response (more expensive)
max_tokens: 1000 // ~1000 words max
```

---

### 4. max_tokens Default Value

**Important:** When `max_tokens` is **not specified** in the Chat Completions API:

- **No fixed default value** - The model will generate until it reaches a natural stopping point (end-of-sequence token) or until it hits the model's context window limit
- The model will generate as long as needed (within the context limit), rather than using a fixed default

**Note:** The older Completions API defaults to 16 tokens when `max_tokens` is omitted, but the Chat Completions API does not have a fixed default.

**Model context limits:**
- `gpt-4o-mini`: ~128,000 tokens total (input + output)
- The model will stop before exceeding this limit

**Recommendation:** Always specify `max_tokens` to:
- Control costs (you pay per token)
- Predict response length
- Avoid unexpectedly long responses
- Stay within your budget

---

## Context Management in Production

### The Problem

In production apps, you need to maintain conversation context across multiple messages. Each API call needs to include the full conversation history so the model understands the context.

### Pattern 1: Server-Side Storage (Most Common)

Store conversation history in a database and retrieve it for each request:

```javascript
// Example: Using in-memory store (use Redis/DB in production)
const conversations = new Map(); // conversationId -> messages[]

app.post("/chat", async (req, res) => {
  const { conversationId, message, ...options } = req.body;
  
  // Retrieve existing conversation
  let messages = conversations.get(conversationId) || [];
  
  // Add new user message
  messages.push({ role: "user", content: message });
  
  // Call OpenAI with full history
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    ...options
  });
  
  // Add assistant response to history
  const assistantMessage = completion.choices[0].message;
  messages.push(assistantMessage);
  
  // Save updated conversation
  conversations.set(conversationId, messages);
  
  res.json({ reply: assistantMessage.content });
});
```

**Client-side usage:**
```javascript
// First message
const response1 = await fetch("/chat", {
  method: "POST",
  body: JSON.stringify({
    conversationId: "user-123",
    message: "Hello!"
  })
});

// Second message - context is automatically included
const response2 = await fetch("/chat", {
  method: "POST",
  body: JSON.stringify({
    conversationId: "user-123",  // Same ID = same conversation
    message: "What did I just say?"
  })
});
```

### Pattern 2: Client-Side Context Management

Client sends the full conversation history each time:

```javascript
// Client maintains conversation state
let conversationHistory = [
  { role: "system", content: "You are a helpful assistant." }
];

// First message
conversationHistory.push({ role: "user", content: "Hello!" });
const response1 = await fetch("/chat", {
  body: JSON.stringify({ messages: conversationHistory })
});
const data1 = await response1.json();
conversationHistory.push({ role: "assistant", content: data1.reply });

// Second message - includes full history
conversationHistory.push({ role: "user", content: "What did I say?" });
const response2 = await fetch("/chat", {
  body: JSON.stringify({ messages: conversationHistory })
});
```

---

## Compression Strategies

As conversations grow, you need strategies to stay within token limits. Here are common approaches:

### Strategy 1: Sliding Window (Keep Recent N Messages)

Keep only the most recent N messages:

```javascript
function truncateMessages(messages, maxMessages = 20) {
  // Keep system message + recent messages
  const systemMessage = messages.find(m => m.role === "system");
  const recentMessages = messages.slice(-maxMessages);
  
  return systemMessage 
    ? [systemMessage, ...recentMessages]
    : recentMessages;
}

// Usage
let messages = [...]; // Long conversation
messages = truncateMessages(messages, 20); // Keep last 20
```

### Strategy 2: Summarization (Compress Old Messages)

Use the model to summarize older messages:

```javascript
async function summarizeOldMessages(oldMessages) {
  const summaryPrompt = `Summarize this conversation concisely:\n\n${oldMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;
  
  const summary = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a conversation summarizer." },
      { role: "user", content: summaryPrompt }
    ],
    max_tokens: 200
  });
  
  return {
    role: "system",
    content: `Previous conversation summary: ${summary.choices[0].message.content}`
  };
}

// Usage
async function manageContext(messages, maxRecent = 10) {
  if (messages.length <= maxRecent) return messages;
  
  const systemMsg = messages.find(m => m.role === "system");
  const oldMessages = messages.slice(0, -maxRecent);
  const recentMessages = messages.slice(-maxRecent);
  
  const summary = await summarizeOldMessages(oldMessages);
  
  return [
    systemMsg,
    summary,
    ...recentMessages
  ].filter(Boolean);
}
```

### Strategy 3: Token-Based Truncation

Remove oldest messages until under token limit:

```javascript
import { encoding_for_model } from "tiktoken"; // npm install tiktoken

function truncateByTokens(messages, maxTokens = 4000) {
  const enc = encoding_for_model("gpt-4o-mini");
  let totalTokens = 0;
  const result = [];
  
  // Always keep system message
  const systemMsg = messages.find(m => m.role === "system");
  if (systemMsg) {
    totalTokens += enc.encode(systemMsg.content).length;
    result.push(systemMsg);
  }
  
  // Add messages from newest to oldest until limit
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "system") continue; // Already added
    
    const tokens = enc.encode(msg.content).length;
    if (totalTokens + tokens > maxTokens) break;
    
    totalTokens += tokens;
    result.unshift(msg); // Add to beginning
  }
  
  return result;
}
```

### Strategy 4: Hybrid Approach (Summary + Recent)

Combine summarization with recent messages:

```javascript
async function smartContextManagement(messages, maxRecent = 10, maxTokens = 8000) {
  // If under limit, return as-is
  if (estimateTokens(messages) < maxTokens) return messages;
  
  // Keep system message
  const systemMsg = messages.find(m => m.role === "system");
  
  // Keep recent messages
  const recentMessages = messages.slice(-maxRecent);
  
  // Summarize everything else
  const oldMessages = messages.slice(
    systemMsg ? 1 : 0,
    -maxRecent
  );
  
  if (oldMessages.length > 0) {
    const summary = await summarizeOldMessages(oldMessages);
    return [
      systemMsg,
      summary,
      ...recentMessages
    ].filter(Boolean);
  }
  
  return [systemMsg, ...recentMessages].filter(Boolean);
}
```

---

## Production Example

Here's a complete production-ready pattern:

```javascript
import express from "express";
import OpenAI from "openai";
// In production: import Redis or your DB client

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const conversations = new Map(); // Use Redis/DB in production

app.post("/chat", async (req, res) => {
  const { conversationId, message, ...options } = req.body;
  
  // Get or create conversation
  let messages = conversations.get(conversationId) || [
    { role: "system", content: "You are a helpful assistant." }
  ];
  
  // Add user message
  messages.push({ role: "user", content: message });
  
  // Compress if needed (before API call to save tokens)
  messages = await smartContextManagement(messages, 10, 8000);
  
  // Call OpenAI
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    max_tokens: options.max_tokens || 500,
    temperature: options.temperature || 0.7
  });
  
  // Add assistant response
  const assistantMsg = completion.choices[0].message;
  messages.push(assistantMsg);
  
  // Save conversation
  conversations.set(conversationId, messages);
  
  res.json({
    reply: assistantMsg.content,
    conversationId,
    usage: completion.usage
  });
});
```

---

## Key Takeaways

1. **Storage**: Use Redis, PostgreSQL, or MongoDB to store conversations by `conversationId`
2. **Context passing**: Include full message history in each API call
3. **Compression strategies**:
   - **Sliding window**: Keep last N messages
   - **Summarization**: Compress old messages into a summary
   - **Token-based**: Remove oldest messages until under limit
   - **Hybrid**: Summary + recent messages
4. **Cost optimization**: Compress before API calls to reduce token usage
5. **Always specify `max_tokens`**: To control costs and response length
6. **Temperature selection**: Use low for factual, high for creative
7. **Role management**: Use `system` for instructions, `user` for requests, `assistant` for history

---

## Resources

- OpenAI API Documentation: https://platform.openai.com/docs/api-reference/chat
- OpenAI Node.js SDK: https://github.com/openai/openai-node
- Token counting library: `tiktoken` (npm install tiktoken)