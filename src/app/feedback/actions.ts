'use server';

import { requireRole } from '@/lib/session';
import { insertSuggestion } from '@/lib/db';
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
  let description = formData.get('description')?.toString().trim() || '';
  const personId = formData.get('personId')?.toString().trim() || '';
  const personName = formData.get('personName')?.toString().trim() || '';

  if (!title) return { error: 'Le titre est obligatoire.' };
  if (!description) return { error: 'La description est obligatoire.' };

  if (personId) {
    description += `\n\n—\nFiche concernée : ${personName ? `${personName} ` : ''}(/person/${personId})`;
  }

  return submitSuggestion({ author: name || undefined, title, body: description });
}

export async function submitSuggestion(data: {
  author?: string;
  title: string;
  body: string;
}): Promise<FeedbackState> {
  await requireRole('contributor');
  const { author, title, body } = data;

  if (!title) return { error: 'Le titre est obligatoire.' };
  if (!body) return { error: 'La description est obligatoire.' };

  try {
    await insertSuggestion({ title, body, author });

    if (process.env.GITHUB_TOKEN) {
      const [owner, repo] = (process.env.GITHUB_REPO || '').split('/');
      if (owner && repo) {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
          },
          body: JSON.stringify({
            title,
            body: author ? `**Par ${author}**\n\n${body}` : body,
            labels: ['suggestion'],
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
