'use server';

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

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { error: 'GITHUB_TOKEN non configuré — contactez l\'administrateur.' };

  const body = [
    description,
    '',
    `---`,
    `*Soumis par : ${name || 'Anonyme'}*`,
  ].join('\n');

  const res = await fetch('https://api.github.com/repos/cldudouyt/Geonealogie/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[Suggestion] ${title}`,
      body,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`GitHub API error (${res.status}):`, JSON.stringify(err));
    return { error: `Erreur lors de l'envoi (${res.status}). Réessayez plus tard.` };
  }

  return { success: true };
}
