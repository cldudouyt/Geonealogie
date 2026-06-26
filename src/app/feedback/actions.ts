'use server';

import { runQuery } from '@/lib/neo4j';
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

  if (!title) return { error: 'Le titre est obligatoire.' };
  if (!description) return { error: 'La description est obligatoire.' };

  return submitSuggestion({ author: name || undefined, title, body: description });
}

export async function submitSuggestion(data: {
  author?: string;
  title: string;
  body: string;
}): Promise<FeedbackState> {
  const { author, title, body } = data;

  if (!title) return { error: 'Le titre est obligatoire.' };
  if (!body) return { error: 'La description est obligatoire.' };

  try {
    await runQuery(
      `CREATE (s:Suggestion {
        id: randomUUID(),
        title: $title,
        body: $body,
        author: $author,
        status: 'open',
        createdAt: datetime()
      })`,
      { title, body, author: author || 'Anonyme' },
    );

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
