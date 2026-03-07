import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';
import type { PersonRecord } from '@/lib/gedcom-store';
import { notFound } from 'next/navigation';
import AutoPrint from './AutoPrint';
import PrintButton from './PrintButton';

interface Props { params: Promise<{ id: string }> }

export default async function PrintPage({ params }: Props) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  const [parents, children, spouses, siblings] = await Promise.all([
    getParents(id),
    getChildren(id),
    getSpouses(id),
    getSiblings(id),
  ]);

  const sexLabel = person.sex === 'M' ? 'Masculin' : person.sex === 'F' ? 'Féminin' : 'Inconnu';
  const accentColor = person.sex === 'M' ? '#3b82f6' : person.sex === 'F' ? '#ec4899' : '#6b7280';

  const timeline: Array<{ label: string; dateRaw?: string; place?: string; note?: string }> = [];
  if (person.chrDateRaw || person.chrPlace) timeline.push({ label: 'Baptême', dateRaw: person.chrDateRaw, place: person.chrPlace });
  if (person.birthDateRaw || person.birthPlaceFull) timeline.push({ label: 'Naissance', dateRaw: person.birthDateRaw, place: person.birthPlaceFull });
  for (const evt of person.events) timeline.push({ label: evt.type, dateRaw: evt.dateRaw, place: evt.placeFull || evt.place, note: evt.note });
  if (person.deathDateRaw || person.deathPlaceFull) timeline.push({ label: 'Décès', dateRaw: person.deathDateRaw, place: person.deathPlaceFull });
  if (person.burialDateRaw || person.burialPlace) timeline.push({ label: 'Inhumation', dateRaw: person.burialDateRaw, place: person.burialPlace });

  return (
    <>
      <AutoPrint />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, 'Times New Roman', serif; background: white; color: #1e293b; font-size: 11pt; line-height: 1.5; }
        @page { size: A4; margin: 20mm 18mm; }
        @media print { .no-print { display: none !important; } }
        .page { max-width: 800px; margin: 0 auto; padding: 24px; }
        h1 { font-size: 22pt; font-weight: bold; color: #0f172a; letter-spacing: 0.01em; }
        h2 { font-size: 11pt; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 0.08em; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .meta { font-size: 10pt; color: #64748b; margin-top: 4px; }
        .accent-bar { height: 4px; width: 60px; border-radius: 2px; margin: 8px 0 16px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
        .field { margin-bottom: 6px; }
        .field label { font-size: 9pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; display: block; }
        .field span { font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 4px; }
        table th { text-align: left; font-size: 9pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 8px 4px 0; border-bottom: 1px solid #e2e8f0; }
        table td { padding: 5px 8px 5px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .note-text { font-size: 9.5pt; color: #475569; font-style: italic; margin-top: 2px; white-space: pre-wrap; }
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #94a3b8; display: flex; justify-content: space-between; }
        .print-btn { no-print; position: fixed; top: 16px; right: 16px; padding: 8px 16px; background: #1e40af; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: sans-serif; }
        .print-btn:hover { background: #1d4ed8; }
      `}</style>

      <PrintButton />

      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h1>{person.displayName}</h1>
            {person.nickname && <p className="meta" style={{ fontStyle: 'italic' }}>&ldquo;{person.nickname}&rdquo;</p>}
            <div className="accent-bar" style={{ backgroundColor: accentColor }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', color: '#94a3b8', marginTop: 4 }}>
            <p>Fiche généalogique</p>
            <p>ID : {person.id}</p>
          </div>
        </div>

        {/* Identity */}
        <h2>Identité</h2>
        <div className="grid2">
          <div>
            {person.birthDateRaw && <div className="field"><label>Naissance</label><span>{person.birthDateRaw}</span></div>}
            {person.birthPlaceFull && <div className="field"><label>Lieu de naissance</label><span>{person.birthPlaceFull}</span></div>}
            {person.chrDateRaw && <div className="field"><label>Baptême</label><span>{person.chrDateRaw}{person.chrPlace && ` — ${person.chrPlace}`}</span></div>}
          </div>
          <div>
            {person.deathDateRaw && <div className="field"><label>Décès</label><span>{person.deathDateRaw}</span></div>}
            {person.deathPlaceFull && <div className="field"><label>Lieu de décès</label><span>{person.deathPlaceFull}</span></div>}
            {person.burialDateRaw && <div className="field"><label>Inhumation</label><span>{person.burialDateRaw}{person.burialPlace && ` — ${person.burialPlace}`}</span></div>}
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 8 }}>
          <div>
            <div className="field"><label>Sexe</label><span>{sexLabel}</span></div>
            {person.occupations.length > 0 && <div className="field"><label>Profession(s)</label><span>{person.occupations.join(', ')}</span></div>}
          </div>
          <div>
            {person.nationality && <div className="field"><label>Nationalité</label><span>{person.nationality}</span></div>}
            {person.isAdopted && <div className="field"><label>Statut</label><span>Adopté(e)</span></div>}
          </div>
        </div>

        {/* Family */}
        {parents.length > 0 && (
          <>
            <h2>Parents</h2>
            <FamilyTable persons={parents} />
          </>
        )}

        {spouses.length > 0 && (
          <>
            <h2>Conjoint(s)</h2>
            <table>
              <thead><tr><th>Nom</th><th>Naissance</th><th>Mariage</th><th>Décès</th></tr></thead>
              <tbody>
                {spouses.map(s => s.person && (
                  <tr key={s.familyId}>
                    <td>{(s.person as PersonRecord).displayName}</td>
                    <td>{(s.person as PersonRecord).birthDateRaw || '—'}</td>
                    <td>{s.marriageDateRaw ? `${s.marriageDateRaw}${s.marriagePlace ? ` — ${s.marriagePlace}` : ''}` : '—'}</td>
                    <td>{(s.person as PersonRecord).deathDateRaw || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {siblings.length > 0 && (
          <>
            <h2>Fratrie</h2>
            <FamilyTable persons={siblings} />
          </>
        )}

        {children.length > 0 && (
          <>
            <h2>Enfants</h2>
            <FamilyTable persons={children} />
          </>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <>
            <h2>Chronologie</h2>
            <table>
              <thead><tr><th style={{ width: '22%' }}>Événement</th><th style={{ width: '28%' }}>Date</th><th>Lieu</th></tr></thead>
              <tbody>
                {timeline.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 'bold' }}>{item.label}</td>
                    <td>{item.dateRaw || '—'}</td>
                    <td>
                      {item.place || '—'}
                      {item.note && <p className="note-text">{item.note.length > 300 ? item.note.substring(0, 300) + '…' : item.note}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Notes */}
        {person.notes && (
          <>
            <h2>Notes biographiques</h2>
            <p style={{ fontSize: '10pt', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{person.notes}</p>
          </>
        )}

        {/* Footer */}
        <div className="footer">
          <span>Geonealogie — Arbre généalogique</span>
          <span>Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </>
  );
}

function FamilyTable({ persons }: { persons: PersonRecord[] }) {
  return (
    <table>
      <thead><tr><th>Nom</th><th>Naissance</th><th>Lieu de naissance</th><th>Décès</th></tr></thead>
      <tbody>
        {persons.map(p => (
          <tr key={p.id}>
            <td>{p.displayName}</td>
            <td>{p.birthDateRaw || '—'}</td>
            <td>{p.birthPlace || '—'}</td>
            <td>{p.deathDateRaw || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
