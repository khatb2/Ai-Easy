# Build and Deployment Instructions

This document provides step-by-step instructions for building and deploying your PDF AI application.

## Prerequisites

Before building and deploying, ensure you have:

1. Node.js installed (version specified in package.json)
2. All dependencies installed (`npm install`)
3. Environment variables configured in `.env.local`

## Building the Application

### Step 1: Clean Previous Builds (Optional)
```bash
# Remove previous build files
rm -rf .next
```

### Step 2: Run Type Checking
```bash
npm run typecheck
```
Ensure there are no TypeScript errors before building.

### Step 3: Build the Application
```bash
npm run build
```

This command will:
- Create a `.next` directory with optimized production files
- Generate server-side and client-side bundles
- Optimize all assets for production

### Step 4: Verify Build Success
Check that the `.next` directory was created with content:
```bash
ls -la .next
```

You should see directories like `server/`, `static/`, and files like `build-manifest.json`.

## Deployment Options

### Option 1: Deploy to Vercel (Easiest)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to link to your project and deploy.

### Option 2: Self-Hosted Deployment

1. Copy the entire project directory (including `.next`) to your server

2. Install production dependencies:
   ```bash
   npm install --production
   ```

3. Start the application:
   ```bash
   npm run start
   ```

4. The application will be available on port 3000 by default.

### Option 3: Deploy to Other Platforms

For platforms like Netlify, AWS, or DigitalOcean:

1. Push your code to a Git repository
2. Connect your repository to the hosting platform
3. Set the build command to: `npm run build`
4. Set environment variables as needed
5. Deploy

## Environment Variables for Production

Make sure these environment variables are set in your production environment:

- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (for OCR functionality)
- Any other variables from your `.env.local` file (excluding development-only variables)

## Testing Your Deployment

After deployment, verify that:

1. The homepage loads correctly
2. All PDF tools are accessible
3. OCR functionality works (if API key is configured)
4. Static pages load properly
5. No console errors appear in the browser

## Common Issues and Solutions

### Build Issues
- If the build fails, check for TypeScript errors with `npm run typecheck`
- Ensure all dependencies are installed with `npm install`

### Runtime Issues
- Verify environment variables are correctly set
- Check server logs for error messages
- Ensure the server has sufficient memory for PDF processing

### Performance Issues
- For large PDF files, consider implementing processing queues
- Use a CDN for static assets
- Implement caching strategies

## Monitoring and Maintenance

1. Regularly update dependencies for security patches
2. Monitor application logs for errors
3. Set up uptime monitoring
4. Regularly test all functionality after updates

## Support

If you encounter issues:
1. Check the build and server logs
2. Verify environment variables
3. Ensure your hosting platform supports Next.js applications
4. Consult the hosting platform's documentation