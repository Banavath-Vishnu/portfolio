import { buildLlms, textResponse } from '@/lib/llms';

// /llms-full.txt — the overview plus the full text of every project and post (see lib/llms.js).
export const dynamic = 'force-dynamic';

export async function GET() {
  return textResponse(await buildLlms({ full: true }));
}
