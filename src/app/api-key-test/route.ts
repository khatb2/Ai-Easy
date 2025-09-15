import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found in environment variables' }, { status: 400 });
  }
  
  // Check if API key has the expected format (AIza followed by 39 characters)
  const isValidFormat = /^AIza[A-Za-z0-9\-_]{39}$/.test(apiKey);
  
  return NextResponse.json({ 
    message: 'API key found',
    hasValidFormat: isValidFormat,
    keyLength: apiKey.length,
    startsWith: apiKey.substring(0, 4)
  });
}