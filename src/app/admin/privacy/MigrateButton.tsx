'use client';
import { useActionState } from 'react';
import { migrateAction } from './actions';
export default function MigrateButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(migrateAction, null);
  return <form action={action}><input type="hidden" name="id" value={id} /><button className="secondary-action" disabled={pending}>{pending ? 'Migration…' : 'Migrer / terminer la suppression publique'}</button><p role="status">{state?.message}</p></form>;
}
