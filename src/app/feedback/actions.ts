'use server';

import { requireRole } from '@/lib/session';
import { insertSuggestion, updateSuggestionStatus } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface FeedbackState {
  success?: boolean;
  error?: string;
}

export async function submitFeedback(
  _prev: FeedbackState | null,
  formData: FormData,
): Promise<FeedbackState> {
  const name = formData.get('name')?.toString().trim() || '';
  const title = formData.get('title')?.toString().trim() || '';
  const description = formData.get('description')?.toString().trim() || '';
  const type = formData.get('type')?.toString().trim() || 'general';
  const personId = formData.get('personId')?.toString().trim() || '';
  const personName = formData.get('personName')?.toString().trim() || '';
  const fieldName = formData.get('fieldName')?.toString().trim() || '';
  const suggestedValue = formData.get('suggestedValue')?.toString().trim() || '';

  // Auto-derive title when absent based on type
  let resolvedTitle = title;
  if (!resolvedTitle) {
    if (type === 'souvenir') resolvedTitle = personName ? `Souvenir : ${personName}` : 'Souvenir';
    else if (type === 'correction') resolvedTitle = personName ? `Correction : ${personName}` : fieldName ? `Correction : ${fieldName}` : 'Correction';
    else if (type === 'identifier') resolvedTitle = personName ? `Identification photo : ${personName}` : 'Identification photo';
    else resolvedTitle = 'Contribution';
  }
  if (!description && type !== 'correction') return { error: 'La description est obligatoire.' };
  if (type === 'correction' && !suggestedValue) return { error: 'La valeur proposée est obligatoire.' };

  return submitSuggestion({
    author: name || undefined,
    title: resolvedTitle,
    body: description || (type === 'correction' ? `Correction du champ "${fieldName}" → "${suggestedValue}"` : ''),
    type,
    personId: personId || undefined,
    personName: personName || undefined,
    fieldName: fieldName || undefined,
    suggestedValue: suggestedValue || undefined,
  });
}

export async function submitSuggestion(data: {
  author?: string;
  title: string;
  body: string;
  type?: string;
  personId?: string;
  personName?: string;
  fieldName?: string;
  suggestedValue?: string;
}): Promise<FeedbackState> {
  await requireRole('contributor');
  const { author, title, body, type, personId, fieldName, suggestedValue } = data;

  if (!title) return { error: 'Le titre est obligatoire.' };
  if (!body) return { error: 'La description est obligatoire.' };
  try {
    await insertSuggestion({ title, body, author, type, personId, fieldName, suggestedValue });

    if (process.env.GITHUB_TOKEN) {
      const [owner, repo] = (process.env.GITHUB_REPO || '').split('/');
      if (owner && repo) {
        const issueBody = [
          author ? `**Par ${author}**\n` : '',
          body,
          personId ? `\n\n—\nFiche : /person/${personId}` : '',
          fieldName ? `\nChamp : ${fieldName}` : '',
          suggestedValue ? `\nValeur proposée : ${suggestedValue}` : '',
        ].join('');
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
          },
          body: JSON.stringify({
            title,
            body: issueBody,
            labels: ['suggestion', type || 'general'].filter(Boolean),
          }),
        });
      }
    }

    revalidatePath('/feedback');
    return { success: true };
  } catch (err) {
    console.error('Suggestion save error:', err);
    return { error: "Erreur lors de l'envoi. Réessayez plus tard." };
  }
}

export async function updateStatus(id: string, status: string): Promise<void> {
  await requireRole('admin');
  await updateSuggestionStatus(id, status);
  revalidatePath('/feedback');
}
