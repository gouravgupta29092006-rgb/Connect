// src/ai/gemini.js
// Singleton Gemini client.
// Returns null (with a warning) if GEMINI_API_KEY is not configured —
// callers must handle the null case and fall back to SQL-only results.

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

let _client = null;
let _model = null;

function getModel() {
  if (_model) return _model;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      '⚠️  GEMINI_API_KEY not set — AI summaries disabled. ' +
      'Get a free key at https://aistudio.google.com/app/apikey'
    );
    return null;
  }

  _client = new GoogleGenerativeAI(apiKey);
  // gemini-1.5-flash: free tier, fast, 1M tokens/day
  _model = _client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  return _model;
}

/**
 * Send a prompt to Gemini and return the text response.
 * Returns null if the API key is missing or the call fails.
 */
async function generate(prompt) {
  const model = getModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (err) {
    console.error('Gemini generate error:', err.message);
    return null;
  }
}

module.exports = { generate };
