'use client';
import { useActionState } from 'react';
import { restoreAction } from './actions';
export default function RestoreButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(restoreAction, null);
  return <details><summary>Annuler cette modification</summary><form action={action}><input type="hidden" name="entryId" value={id} /><p>Les données retrouveront leur état juste avant cette opération. L’annulation sera conservée dans l’historique.</p><button disabled={pending} className="primary-action">{pending ? 'Restauration…' : 'Confirmer la restauration'}</button>{state?.error && <p role="alert">{state.error}</p>}{state?.success && <p role="status">Restauration effectuée.</p>}</form></details>;
}
