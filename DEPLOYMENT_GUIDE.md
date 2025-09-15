# Deployment Guide for PDF AI Application

This guide explains how to deploy your Next.js PDF AI application to various hosting platforms.

## Understanding Next.js Build Output

Unlike traditional web applications that generate a simple `dist/index.html` file, Next.js creates a `.next` directory containing:

- **server/**: Server-side code and pages
- **static/**: Client-side assets (CSS, JS bundles, images)
- **Build manifests**: Files that describe how to serve the application

## Deployment Options

### 1. Vercel (Recommended - Official Next.js Platform)

Vercel is the official hosting platform for Next.js applications and provides the easiest deployment experience.

#### Steps:
1. Sign up at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm install -g vercel`
3. In your project directory, run: `vercel`
4. Follow the prompts to deploy

#### Benefits:
- Zero configuration deployment
- Automatic SSL certificates
- Global CDN
- Automatic scaling

### 2. Other Hosting Platforms

#### Netlify
1. Create a `netlify.toml` file in your project root:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

2. Connect your Git repository to Netlify or drag and drop your project folder

#### AWS (Amazon Web Services)
1. Use AWS Amplify:
   - Connect your Git repository
   - Set build command to: `npm run build`
   - Set output directory to: `.next`

2. Or use EC2 with Node.js:
   - Copy your entire project directory to the server
   - Run `npm install` and `npm run start`

#### DigitalOcean App Platform
1. Connect your Git repository
2. Set build command: `npm run build`
3. Set run command: `npm run start`

### 3. Self-Hosted Deployment

If you want to host on your own server:

#### Prerequisites:
- Node.js installed on the server
- Your project files uploaded to the server

#### Steps:
1. Upload your project files to the server (including the `.next` directory)
2. Install dependencies: `npm install --production`
3. Start the server: `npm run start`

This will start the application on port 3000 by default.

#### Using a Process Manager (Recommended for Production):
1. Install PM2: `npm install -g pm2`
2. Start your app: `pm2 start npm --name "pdf-ai" -- run start`
3. Set PM2 to start on boot: `pm2 startup` and `pm2 save`

## Environment Variables

Make sure to set your environment variables on your hosting platform:

- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) for AI functionality

## Important Notes

1. **Server-Side Rendering**: Next.js applications require a Node.js server to run, unlike static sites that can be served directly from a CDN.

2. **API Routes**: Your application includes API routes (like `/api/ocr`) that need to run on a Node.js server.

3. **File Uploads**: If your application handles file uploads, ensure your hosting platform supports file system operations or use external storage services.

## Testing Your Deployment

After deployment, test these key features:
1. Homepage loads correctly
2. PDF tools are accessible
3. OCR functionality works (requires API key)
4. All static pages load properly

## Troubleshooting

### Common Issues:
1. **Missing Environment Variables**: Ensure all required environment variables are set on your hosting platform
2. **Build Failures**: Check that your hosting platform supports the Node.js version specified in your package.json
3. **Performance Issues**: For large PDF processing, consider implementing queue systems for heavy operations

### Checking Logs:
Most hosting platforms provide access to application logs which can help diagnose issues.

## Scaling Considerations

For high-traffic applications:
1. Consider using a CDN for static assets
2. Implement caching strategies
3. Use database for persistent storage if needed
4. Consider microservices architecture for heavy processing tasks

## Support

If you encounter issues during deployment:
1. Check the build logs on your hosting platform
2. Verify all environment variables are correctly set
3. Ensure your hosting platform supports Next.js applications
4. Consult your hosting platform's documentation for Next.js deployment