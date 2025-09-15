# Understanding Next.js Build Structure

This document explains the build output structure of your Next.js application and why it differs from traditional web applications.

## Why No Simple `dist/index.html`?

Unlike traditional web applications that compile to a single `dist/index.html` file with associated assets, Next.js applications have a more complex structure because they support:

1. **Server-Side Rendering (SSR)**
2. **Static Site Generation (SSG)**
3. **Client-Side Rendering (CSR)**
4. **API Routes**
5. **Dynamic Routing**

## The `.next` Directory Structure

Your built application is contained in the `.next` directory with the following key components:

### 1. `server/` Directory
Contains server-side code and pre-rendered pages:
- `app/` - App Router pages and layouts
- `pages/` - Pages Router files (if used)
- `chunks/` - Code-split server bundles

### 2. `static/` Directory
Contains client-side assets:
- `chunks/` - Client-side JavaScript bundles
- `css/` - Compiled CSS files
- Hash-named directories - Asset files with content hashes

### 3. Manifest Files
JSON files that tell Next.js how to serve your application:
- `build-manifest.json` - Client build information
- `app-paths-manifest.json` - App Router path mappings
- `pages-manifest.json` - Pages Router path mappings

## How Next.js Serves Your Application

When you run `npm run start`, Next.js:

1. Starts a Node.js server
2. Reads the manifest files to understand routing
3. Serves pre-rendered pages from `server/` for SSR/SSG routes
4. Serves client-side bundles from `static/` for CSR
5. Handles API routes from server code

## For Deployment

You need to deploy:
1. The entire `.next` directory
2. Your `package.json` and `package-lock.json`
3. Your `public/` directory (if it exists)
4. Environment configuration files

The hosting platform must support Node.js to run the server-side components.

## Traditional vs Next.js Deployment

| Traditional Web App | Next.js App |
|---------------------|-------------|
| Single `index.html` | Complex `.next` directory |
| Static files only | Server-side code + static assets |
| Any static hosting | Requires Node.js server |
| Simple deployment | More complex deployment |

## Deployment Platforms

### Platforms that Support Next.js Natively:
- Vercel (official)
- Netlify (with Next.js plugin)
- AWS Amplify
- DigitalOcean App Platform

### Self-Hosted:
- Any server with Node.js installed
- Docker containers
- Cloud VMs (AWS EC2, Google Compute Engine, etc.)

## Key Takeaway

Your Next.js application is not a simple static site but a full web application with both client and server components. This is why the build output is more complex than a single `index.html` file, but it also provides powerful features like server-side rendering and API routes.