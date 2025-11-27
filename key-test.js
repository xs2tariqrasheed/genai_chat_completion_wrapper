import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

console.log(process.env.OPENAI_API_KEY);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const result = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(result.choices[0].message.content);
