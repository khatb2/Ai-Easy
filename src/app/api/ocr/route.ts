import { NextRequest } from 'next/server';
import { performOcr, OcrInput } from '@/ai/flows/ocr-flow';

export async function POST(request: NextRequest) {
  try {
    const body: OcrInput = await request.json();
    
    // Validate input
    if (!body.pageImage || !body.language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pageImage and language' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate image data URI format
    if (!body.pageImage.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Must be a data URI with image MIME type.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const result = await performOcr(body);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('OCR API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'OCR processing failed', 
        message: error.message || 'Unknown error occurred' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}