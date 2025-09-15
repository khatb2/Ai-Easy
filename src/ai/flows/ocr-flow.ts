'use server';
/**
 * @fileOverview An OCR flow for extracting text from an image.
 *
 * - performOcr - A function that handles the OCR process.
 * - OcrInput - The input type for the performOcr function.
 * - OcrOutput - The return type for the performOcr function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OcrInputSchema = z.object({
  pageImage: z
    .string()
    .describe(
      "A photo of a document page, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.enum(['ar', 'en']).describe("The language of the text in the image ('ar' for Arabic, 'en' for English)."),
});
export type OcrInput = z.infer<typeof OcrInputSchema>;

const OcrOutputSchema = z.object({
  extractedText: z.string().describe('The recognized text extracted from the image.'),
});
export type OcrOutput = z.infer<typeof OcrOutputSchema>;

export async function performOcr(input: OcrInput): Promise<OcrOutput> {
  // If AI is not configured, return a placeholder response
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return {
      extractedText: "OCR functionality requires a Google AI API key. Please configure GEMINI_API_KEY or GOOGLE_API_KEY in your environment variables."
    };
  }
  
  try {
    return await ocrFlow(input);
  } catch (error: any) {
    console.error('OCR Error:', error);
    // Check if it's an API key error
    if (error.message && error.message.includes('API key not valid')) {
      return {
        extractedText: "The provided API key is not valid. Please check your GEMINI_API_KEY in the .env.local file and ensure it's a valid Google AI API key."
      };
    }
    return {
      extractedText: `OCR failed with error: ${error.message || 'Unknown error'}`
    };
  }
}

const prompt = ai.definePrompt({
  name: 'ocrPrompt',
  input: {schema: OcrInputSchema},
  output: {schema: OcrOutputSchema},
  prompt: `You are an expert in Optical Character Recognition (OCR). Extract all text from the provided image.
The text is in {{language}}. Preserve the original line breaks and formatting as much as possible.
For Arabic text, ensure the text is extracted in the correct right-to-left order and that letters are correctly joined.
Do not add any commentary or notes, only return the extracted text.

Image: {{media url=pageImage}}`,
});

const ocrFlow = ai.defineFlow(
  {
    name: 'ocrFlow',
    inputSchema: OcrInputSchema,
    outputSchema: OcrOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);