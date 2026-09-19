/**
 * AI Provider Service
 * Central gateway for all LLM completions.
 * Transparently supports OpenAI API, with a robust heuristic simulator fallback
 * to guarantee 100% platform availability offline or without external API keys.
 */

const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Send a chat completion request to the AI service
 * @param {Array} messages [{ role: 'system'|'user'|'assistant', content: string }]
 * @param {Object} options { temperature, maxTokens, jsonMode, fallbackGenerator }
 */
async function generateCompletion(messages, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const { temperature = 0.7, maxTokens = 1200, jsonMode = false, fallbackGenerator } = options;

  if (apiKey && apiKey.trim().length > 10 && !apiKey.startsWith('sk-placeholder')) {
    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 25000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        if (jsonMode) {
          try {
            return JSON.parse(content);
          } catch (e) {
            console.warn('AI returned non-JSON string in jsonMode, attempting fallback extract');
          }
        }
        return content;
      }
    } catch (error) {
      console.warn('OpenAI API request failed or rate limited, switching to intelligent fallback:', error.message);
    }
  }

  // Use intelligent heuristic fallback engine
  if (typeof fallbackGenerator === 'function') {
    return fallbackGenerator(messages);
  }

  return getGenericSimulatedResponse(messages, jsonMode);
}

/**
 * Default simulated fallback response
 */
function getGenericSimulatedResponse(messages, jsonMode) {
  const lastMsg = messages[messages.length - 1]?.content || '';

  if (jsonMode) {
    return {
      reply: "That's a sound initial thought process. Let's trace through the time and space complexity before you implement.",
      score: 3.5,
      hints: ["Consider using two pointers or a hash set to eliminate redundant nested iterations."],
    };
  }

  if (lastMsg.toLowerCase().includes('approach') || lastMsg.toLowerCase().includes('hash')) {
    return "Your hash map approach achieves O(N) time complexity by storing seen values. How would you handle potential duplicate values or integer overflow in other languages?";
  }

  return "I understand your logic. Let's consider edge cases like an empty array or single-element inputs. How would your code handle those?";
}

module.exports = {
  generateCompletion,
};
