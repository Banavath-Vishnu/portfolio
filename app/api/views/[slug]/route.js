import { dbAvailable, sql, ensureSchema } from '@/lib/db';

export async function POST(_request, { params }) {
  if (!(await dbAvailable())) return new Response(null, { status: 204 });
  const { slug } = await params;
  try {
    await ensureSchema();
    await sql`UPDATE posts SET views = views + 1 WHERE slug = ${slug} AND published AND (published_at IS NULL OR published_at <= ${new Date().toISOString()})`;
  } catch (err) {
    console.error('view count failed', err);
  }
  return new Response(null, { status: 204 });
}
