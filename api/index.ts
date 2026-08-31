// Vercel serverless entry — re-exports the Express app
// @ts-ignore — importing compiled JS from backend
import { app } from '../backend/src/index.js';
export default app;
