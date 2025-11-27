import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

// Init OpenAI client (official SDK)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Chat wrapper is running" });
});

/**
 * POST /chat
 * Body:
 * {
 *   messages: [{ role: "user" | "assistant" | "system", content: string }],
 *   temperature?: number,
 *   max_tokens?: number
 * }
 */
app.post("/chat", async (req, res) => {
  try {
    const {
      messages,
      temperature = 0.7,
      max_tokens = 256,
      model = "gpt-4.1-mini", // or "gpt-4o-mini" etc.
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages array is required and must not be empty",
      });
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    }); //:contentReference[oaicite:1]{index=1}

    const choice = completion.choices[0];

    res.json({
      reply: choice.message?.content,
      usage: completion.usage,
      // expose raw if you want to inspect full response
      raw: completion,
    });
  } catch (err) {
    console.error("Error in /chat:", err);

    res.status(500).json({
      error: "Something went wrong",
      details: process.env.NODE_ENV === "development" ? String(err) : undefined,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chat wrapper server listening on http://localhost:${PORT}`);
});

// uncomment to test the server from cli/curl
// curl -X POST http://localhost:3000/chat \
//   -H "Content-Type: application/json" \
//   -d '{
//     "messages": [
//       { "role": "system", "content": "You are a helpful assistant." },
//       { "role": "user", "content": "Say hello in one short sentence." }
//     ],
//     "temperature": 0.3,
//     "max_tokens": 50
//   }'
