'use server';

import { runQuery } from '@/lib/neo4j';

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

  try {
    await runQuery(
      `CREATE (f:Feedback {
        id: randomUUID(),
        name: $name,
        title: $title,
        description: $description,
        createdAt: datetime(),
        status: 'new'
      })`,
      { name: name || 'Anonyme', title, description },
    );
    return { success: true };
  } catch (err) {
    console.error('Feedback save error:', err);
    return { error: 'Erreur lors de l\'envoi. Réessayez plus tard.' };
  }
}
