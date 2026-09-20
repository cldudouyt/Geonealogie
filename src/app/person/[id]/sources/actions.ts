'use server';
import { requireRole } from '@/lib/session';
import { changeOverrides, type SourceEvidence } from '@/lib/overrides-store';
import { getPerson, clearStore } from '@/lib/gedcom-store';
import { getDocumentsForPerson } from '@/lib/documents-store';
import { revalidatePath } from 'next/cache';
export async function addSource(id: string, _previous: { error?: string; success?: boolean } | null, form: FormData) {
  const session = await requireRole('contributor');
  if (!await getPerson(id)) return { error: 'Personne introuvable.' };
  const event = String(form.get('event') || '').trim();
  const reference = String(form.get('reference') || '').trim();
  const url = String(form.get('url') || '').trim();
  const documentId = String(form.get('documentId') || '');
  const confidence = String(form.get('confidence')) as SourceEvidence['confidence'];
  if (!event || !reference || reference.length > 2000 || event.length > 200) return { error: 'Indiquez l’événement et sa référence (2 000 caractères maximum).' };
  if (!['confirmed','approximate','unverified'].includes(confidence)) return { error: 'Choisissez un niveau de certitude.' };
  if (url) { try { if (!['https:', 'http:'].includes(new URL(url).protocol)) throw new Error(); } catch { return { error: 'Le lien doit commencer par https:// ou http://.' }; } }
  if (documentId && !(await getDocumentsForPerson(id)).some(d => d.id === documentId)) return { error: 'Document introuvable sur cette fiche.' };
  try {
    await changeOverrides(session.name, 'Ajout de source', [id], s => {
      const record = s.newPersons.find(p => p.id === id) ?? (s.persons[id] ??= {});
      record.sources ??= []; record.sources.push({ id: crypto.randomUUID(), event, reference, url: url || undefined, documentId: documentId || undefined, confidence });
    });
    clearStore(); revalidatePath(`/person/${id}`); return { success: true };
  } catch { return { error: 'La source n’a pas été enregistrée. Réessayez.' }; }
}
