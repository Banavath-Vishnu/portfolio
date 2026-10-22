import { buildLlms, textResponse } from '@/lib/llms';

// /llms.txt — overview of the site for AI assistants and agents (see lib/llms.js).
export const dynamic = 'force-dynamic';

export async function GET() {
  return textResponse(await buildLlms());
}
