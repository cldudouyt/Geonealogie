'use client';
import { useActionState } from 'react';
import { restorePersonAction } from './actions';
export default function RestorePersonButton({ entryId, personId, revision }: { entryId: string; personId: string; revision: number }) {
  const [state, action, pending] = useActionState(restorePersonAction, null);
  return <details><summary>Restaurer cette version de la fiche {personId}</summary><form action={action}><input type="hidden" name="entryId" value={entryId} /><input type="hidden" name="personId" value={personId} /><input type="hidden" name="revision" value={revision} /><p>Vérifiez les valeurs ci-dessus. Cette action remplace la fiche par son état avant cette opération. Les autres fiches et les fichiers restent inchangés. Une fusion ou un changement de liens bloque la restauration individuelle.</p><button className="primary-action" disabled={pending}>{pending ? 'Restauration…' : 'Confirmer pour cette fiche'}</button>{state?.error && <p role="alert">{state.error}</p>}{state?.success && <p role="status">Fiche restaurée.</p>}</form></details>;
}
