import readline from "readline";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3000}/chat`;

// Keep messages in memory so the model has context
const messages = [
  {
    role: "system",
    content: "You are a helpful assistant chatting in the terminal.",
  },
];

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function callChatEndpoint(userInput) {
  messages.push({ role: "user", content: userInput });

  const body = {
    messages,
    temperature: 0.7,
    max_tokens: 256,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const reply = data.reply || "(no reply)";

  messages.push({ role: "assistant", content: reply });

  return reply;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("=== Console Chat (type 'exit' to quit) ===\n");

  while (true) {
    const userInput = await askQuestion(rl, "You: ");

    if (!userInput.trim()) continue;
    if (userInput.toLowerCase() === "exit") break;

    try {
      process.stdout.write("Assistant: ");
      const reply = await callChatEndpoint(userInput);
      console.log(reply);
      console.log(""); // blank line
    } catch (err) {
      console.error("\nError:", err.message);
    }
  }

  rl.close();
  console.log("Goodbye!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
