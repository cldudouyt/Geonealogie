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
    <div className="fixed top-14 right-0 bottom-0 w-[var(--sidebar-width)] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 z-40 overflow-y-auto shadow-lg transition-transform duration-300">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {loading ? (
        <div className="p-6 space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
        </div>
      ) : person ? (
        <div className="p-6">
          {/* Header */}
          <div className={`border-l-4 ${borderColor} pl-4 mb-6`}>
            <div className="flex items-center gap-3 mb-1">
              <Monogram name={person.displayName} sex={person.sex} size="sm" />
              <h2 className="text-xl font-bold">{person.displayName}</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {person.birthYear && `${person.birthDateRaw || person.birthYear}`}
              {person.deathYear && ` - ${person.deathDateRaw || person.deathYear}`}
            </p>
            {person.birthPlaceFull && (
              <p className="text-sm text-slate-500">{person.birthPlaceFull}</p>
            )}
            {person.occupation && (
              <p className="text-sm text-primary-light font-medium mt-1">{person.occupation}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => onFocus(personId)}
              className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
            >
              Centrer l'arbre
            </button>
            <button
              onClick={() => onNavigate(personId)}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                    <p className="text-xs text-slate-400 ml-8">
                      Mariage : {s.marriageDateRaw || s.marriageDate}
                      {s.marriagePlace && ` - ${s.marriagePlace}`}
                    </p>
                  )}
                  {s.divorceDateRaw && (
                    <p className="text-xs text-slate-400 ml-8">
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
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function PersonLink({ person, onClick }: { person: PersonSummary; onClick: () => void }) {
  const dot = person.sex === 'M' ? 'bg-male' : person.sex === 'F' ? 'bg-female' : 'bg-neutral';
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
    >
      <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
      <span className="text-sm group-hover:text-primary transition-colors">{person.displayName}</span>
      {person.birthDate && (
        <span className="text-xs text-slate-400 ml-auto">{person.birthDate?.substring(0, 4)}</span>
      )}
    </button>
  );
}

function ExpandableText({ text, limit }: { text: string; limit: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= limit) {
    return <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{text}</p>;
  }
  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
        {expanded ? text : text.substring(0, limit) + '…'}
      </p>
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-primary hover:text-primary-light mt-1 transition-colors"
      >
        {expanded ? 'Voir moins' : 'Voir plus'}
      </button>
    </div>
  );
}
