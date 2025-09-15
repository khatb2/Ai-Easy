import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Only include Google AI plugin if API key is provided
const plugins = [];
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  }));
}

export const ai = genkit({
  plugins,
  // Only set model if Google AI is configured
  ...(plugins.length > 0 ? { model: 'googleai/gemini-2.0-flash' } : {})
});