<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/101ad353-a3cb-4740-9998-c951fd62fd1c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` locally, or in Vercel Project Settings for deployment.
   Optional overrides:
   - `GEMINI_TEXT_MODEL` defaults to `gemini-3.5-flash`
   - `GEMINI_IMAGE_MODEL` defaults to `gemini-3.1-flash-image`
3. Run the app:
   `npm run dev`

For full local API testing with Vercel Functions, run `vercel dev`.
