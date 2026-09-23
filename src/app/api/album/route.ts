import { listAllDocuments, isImageMime } from '@/lib/documents-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docs = await listAllDocuments();
    const photos = docs.filter(d => !d.deletionPending && isImageMime(d.mimeType));
    return Response.json({ photos });
  } catch {
    return Response.json({ photos: [] });
  }
}
