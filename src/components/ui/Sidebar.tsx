'use client';

import { useEffect, useState } from 'react';
import type { PersonSummary } from '@/lib/types';
import type { PersonRecord } from '@/lib/gedcom-store';
import { Monogram } from './Monogram';

interface SpouseEntry {
  person: PersonSummary;
  familyId: string;
  marriageDate?: string;
  marriageDateRaw?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorceDateRaw?: string;
}

interface PersonDetailData {
  person: PersonRecord;
  parents: PersonSummary[];
  children: PersonSummary[];
  spouses: SpouseEntry[];
  siblings: PersonSummary[];
}

interface SidebarProps {
  personId: string | null;
  onClose: () => void;
  onFocus: (personId: string) => void;
  onNavigate: (personId: string) => void;
}

export default function Sidebar({ personId, onClose, onFocus, onNavigate }: SidebarProps) {
  const [data, setData] = useState<PersonDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personId) {
      setData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/persons/${personId}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [personId]);

  if (!personId) return null;

  const person = data?.person;
  const sex = person?.sex ?? 'U';
  const borderColor = sex === 'M' ? 'border-male' : sex === 'F' ? 'border-female' : 'border-neutral';

  return (
    <div className="fixed top-14 right-0 bottom-0 w-[var(--sidebar-width)] sidebar-root z-40 overflow-y-auto shadow-lg transition-transform duration-300">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 sidebar-btn-close"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {loading ? (
        <div className="p-6 space-y-4">
          <div className="sidebar-skeleton h-8" />
          <div className="sidebar-skeleton h-4 w-2/3" />
          <div className="sidebar-skeleton h-4 w-1/2" />
        </div>
      ) : person ? (
        <div className="p-6">
          {/* Header */}
          <div className={`border-l-4 ${borderColor} pl-4 mb-6`}>
            <div className="flex items-center gap-3 mb-1">
              <Monogram name={person.displayName} sex={person.sex} size="sm" />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink-900)', margin: 0 }}>{person.displayName}</h2>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-500)', marginTop: '4px' }}>
              {person.birthYear && `${person.birthDateRaw || person.birthYear}`}
              {person.deathYear && ` — ${person.deathDateRaw || person.deathYear}`}
            </p>
            {person.birthPlaceFull && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-500)' }}>{person.birthPlaceFull}</p>
            )}
            {person.occupation && (
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--green-600)', marginTop: '4px' }}>{person.occupation}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => onFocus(personId)}
              style={{ flex: 1, padding: '9px 12px', background: 'var(--green-700)', color: 'var(--paper-card)', borderRadius: 'var(--r-md)', fontSize: 'var(--text-sm)', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background var(--ease)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--green-600)')}
              onMouseOut={e => (e.currentTarget.style.background = 'var(--green-700)')}
            >
              Centrer l'arbre
            </button>
            <button
              onClick={() => onNavigate(personId)}
              style={{ flex: 1, padding: '9px 12px', background: 'var(--paper-card)', color: 'var(--green-700)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', transition: 'background var(--ease)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--paper-body)')}
              onMouseOut={e => (e.currentTarget.style.background = 'var(--paper-card)')}
            >
              Voir la fiche
            </button>
          </div>

          {/* Parents */}
          {data?.parents && data.parents.length > 0 && (
            <Section title="Parents">
              {data.parents.map(p => (
                <PersonLink key={p.id} person={p} onClick={() => onFocus(p.id)} />
              ))}
            </Section>
          )}

          {/* Spouses */}
          {data?.spouses && data.spouses.length > 0 && (
            <Section title="Conjoints">
              {data.spouses.map(s => (
                <div key={s.familyId}>
                  <PersonLink person={s.person} onClick={() => onFocus(s.person.id)} />
                  {s.marriageDate && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-label)', marginLeft: '24px', marginTop: '2px' }}>
                      Mariage : {s.marriageDateRaw || s.marriageDate}
                      {s.marriagePlace && ` · ${s.marriagePlace}`}
                    </p>
                  )}
                  {s.divorceDateRaw && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-label)', marginLeft: '24px', marginTop: '2px' }}>
                      Divorce : {s.divorceDateRaw}
                    </p>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Children */}
          {data?.children && data.children.length > 0 && (
            <Section title="Enfants">
              {data.children.map(c => (
                <PersonLink key={c.id} person={c} onClick={() => onFocus(c.id)} />
              ))}
            </Section>
          )}

          {/* Siblings */}
          {data?.siblings && data.siblings.length > 0 && (
            <Section title="Fratrie">
              {data.siblings.map(s => (
                <PersonLink key={s.id} person={s} onClick={() => onFocus(s.id)} />
              ))}
            </Section>
          )}

          {/* Notes */}
          {person.notes && (
            <Section title="Notes">
              <ExpandableText text={person.notes} limit={500} />
            </Section>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="sidebar-section-title mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function PersonLink({ person, onClick }: { person: PersonSummary; onClick: () => void }) {
  const dot = person.sex === 'M' ? 'bg-male' : person.sex === 'F' ? 'bg-female' : 'bg-neutral';
  return (
    <button onClick={onClick} className="sidebar-person-link">
      <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
      <span className="sidebar-person-name">{person.displayName}</span>
      {person.birthDate && (
        <span className="sidebar-person-year">{person.birthDate?.substring(0, 4)}</span>
      )}
    </button>
  );
}

function ExpandableText({ text, limit }: { text: string; limit: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= limit) {
    return <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-600)', whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-body)' }}>{text}</p>;
  }
  return (
    <div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-600)', whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-body)' }}>
        {expanded ? text : text.substring(0, limit) + '…'}
      </p>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ fontSize: 'var(--text-xs)', color: 'var(--green-600)', marginTop: '4px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {expanded ? 'Voir moins' : 'Voir plus'}
      </button>
    </div>
  );
}
