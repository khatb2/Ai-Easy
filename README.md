# PDF AI Application

A web-based application for PDF manipulation with AI-powered features.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Running the Application
1. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:3000

2. Start the AI flow server (optional, for OCR features):
   ```bash
   npm run genkit:dev
   ```
   The Genkit UI will be available at http://localhost:4000

## AI Features

Some features like OCR require a Google AI API key. To enable these features:

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env.local` file in the project root
3. Add your API key to the file:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```
4. Restart the development servers

## Available Tools

- PDF Merge
- PDF Split
- PDF Compress
- PDF Crop
- PDF Rotate
- Extract Pages
- Extract Text
- Image to PDF
- PDF to JPG
- Add Page Numbers
- QR Code Generator
- Word Counter
- Blur Image
- Compress Image
- OCR (with Google AI API key)

## Learn More

To learn more about the technologies used:
- [Next.js Documentation](https://nextjs.org/docs)
- [Genkit Documentation](https://genkit.dev)
- [pdf-lib Documentation](https://pdf-lib.js.org/)