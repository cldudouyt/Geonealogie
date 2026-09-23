'use server';
import { requireRole } from '@/lib/session';
import { migrateDocument } from '@/lib/document-privacy';
import { revalidatePath } from 'next/cache';
export async function migrateAction(_previous: { message: string } | null, form: FormData) {
  await requireRole('admin');
  try { await migrateDocument(String(form.get('id'))); revalidatePath('/admin/privacy'); return { message: 'Copie privée vérifiée et ancienne URL publique supprimée.' }; }
  catch { return { message: 'Migration incomplète. L’original est conservé si la copie n’a pas été vérifiée. Vérifiez la configuration Blob puis réessayez ; une suppression en attente peut être reprise.' }; }
}
