import Link from 'next/link';
import { getAllPersons, getStore } from '@/lib/gedcom-store';
import type { PersonRecord } from '@/lib/gedcom-store';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

export const metadata = { title: 'Rapport d\'anomalies — Géonéalogie' };

interface Anomaly {
  id: string;
  personId: string;
  name: string;
  severity: 'err' | 'warn' | 'info';
  message: string;
}

const SEVERITY_ORDER: Record<Anomaly['severity'], number> = { err: 0, warn: 1, info: 2 };

const ACCENT: Record<Anomaly['severity'], string> = {
  err:  '#d98b82',
  warn: '#e3c685',
  info: '#d8d0bd',
};

const SEVERITY_TONE: Record<Anomaly['severity'], BadgeTone> = {
  err:  'danger',
  warn: 'warn',
  info: 'neutral',
};

const BADGE_LABEL: Record<Anomaly['severity'], string> = {
  err:  'Erreur',
  warn: 'Attention',
  info: 'Info',
};

export default async function AnomaliesPage() {
  const persons = await getAllPersons();
  const store = await getStore();
  const anomalies: Anomaly[] = [];
  const currentYear = new Date().getFullYear();

  let uid = 0;
  const push = (personId: string, name: string, severity: Anomaly['severity'], message: string) => {
    anomalies.push({ id: String(uid++), personId, name, severity, message });
  };

  // ── Index nom → personnes (homonymes) ──────────────────────────────────────
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  const nameGroups = new Map<string, PersonRecord[]>();
  for (const p of persons) {
    const first = p.givenNames.split(/[,\s]+/)[0];
    if (!first || !p.surname) continue;
    const key = `${norm(first)}_${norm(p.surname)}`;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(p);
  }
  const homonymGroups = [...nameGroups.values()].filter(g => g.length > 1);

  // Homonymes → erreurs
  for (const group of homonymGroups) {
    for (const p of group) {
      const others = group
        .filter(o => o.id !== p.id)
        .map(o => o.displayName + (o.birthYear ? ` (${o.birthYear})` : ''))
        .join(', ');
      push(p.id, p.displayName, 'warn', `Homonyme de : ${others}`);
    }
  }

  // ── Boucle principale par personne ────────────────────────────────────────
  for (const p of persons) {
    const birthY = p.birthYear ? parseInt(p.birthYear) : null;
    const deathY = p.deathYear ? parseInt(p.deathYear) : null;

    // Erreur : décès avant naissance
    if (birthY && deathY && deathY < birthY) {
      push(p.id, p.displayName, 'err', `Décès (${deathY}) avant la naissance (${birthY})`);
    }

    // Erreur : naissance dans le futur
    if (birthY && birthY > currentYear) {
      push(p.id, p.displayName, 'err', `Naissance dans le futur : ${birthY}`);
    }

    // Erreur : âge au décès > 120 ans
    if (birthY && deathY && deathY - birthY > 120) {
      push(p.id, p.displayName, 'err', `Âge au décès anormalement élevé : ${deathY - birthY} ans`);
    }

    // Erreur : enfant né avant ou trop proche d'un parent (< 10 ans)
    if (birthY) {
      const parentIds = store.childToParents.get(p.id) ?? [];
      for (const parentId of parentIds) {
        const parent = store.persons.get(parentId);
        if (!parent) continue;
        const parentBirthY = parent.birthYear ? parseInt(parent.birthYear) : null;
        if (!parentBirthY) continue;
        const gap = birthY - parentBirthY;
        if (gap < 0) {
          push(p.id, p.displayName, 'err', `Né(e) avant son parent ${parent.displayName} (${parentBirthY})`);
        } else if (gap < 10) {
          push(p.id, p.displayName, 'err', `Seulement ${gap} an${gap !== 1 ? 's' : ''} de différence avec le parent ${parent.displayName}`);
        } else if (gap > 80) {
          push(p.id, p.displayName, 'warn', `Parent ${parent.displayName} avait ${gap} ans à la naissance (peu probable)`);
        }
      }
    }

    // Avertissement : date de naissance estimée (ABT / EST / CAL / BEF / AFT)
    if (p.birthDateRaw && /^(ABT|EST|CAL|BEF|AFT)\b/i.test(p.birthDateRaw.trim())) {
      push(p.id, p.displayName, 'warn', `Date de naissance estimée : ${p.birthDateRaw}`);
    }

    // Avertissement : personne vivante de plus de 110 ans
    if (birthY && !deathY && currentYear - birthY > 110) {
      push(p.id, p.displayName, 'warn', `Potentiellement vivante mais née il y a ${currentYear - birthY} ans`);
    }

    // Avertissement : mariage avec plus de 50 ans d'écart entre conjoints
    if (birthY) {
      const spouseRels = store.spouseRelations.get(p.id) ?? [];
      for (const rel of spouseRels) {
        const spouse = store.persons.get(rel.spouseId);
        if (!spouse?.birthYear) continue;
        const spouseBirthY = parseInt(spouse.birthYear);
        const gap = Math.abs(birthY - spouseBirthY);
        if (gap > 50 && p.id < rel.spouseId) {
          push(p.id, p.displayName, 'warn', `Écart de ${gap} ans avec le conjoint ${spouse.displayName} (${spouseBirthY})`);
        }
      }
    }

    // Info : pas de date de naissance
    if (!p.birthDateRaw && !p.birthYear) {
      push(p.id, p.displayName, 'info', 'Aucune date de naissance renseignée');
    }

    // Info : pas de lieu de naissance
    if (!p.birthPlace && !p.birthPlaceFull) {
      push(p.id, p.displayName, 'info', 'Lieu de naissance inconnu');
    }

    // Info : pas de date de décès et statut inconnu (personne adulte)
    if (!p.deathYear && !p.deathDateRaw && birthY && currentYear - birthY > 30) {
      push(p.id, p.displayName, 'info', 'Aucune date de décès — statut inconnu');
    }

    // Info : sans parents connus dans l'arbre
    const hasParents = (store.childToParents.get(p.id) ?? []).length > 0;
    if (!hasParents) {
      push(p.id, p.displayName, 'info', "Aucun parent connu dans l'arbre");
    }
  }

  // ── Tri : erreurs → avertissements → infos, puis nom ──────────────────────
  anomalies.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.name.localeCompare(b.name, 'fr')
  );

  const errors = anomalies.filter(a => a.severity === 'err');
  const warnings = anomalies.filter(a => a.severity === 'warn');
  const infos = anomalies.filter(a => a.severity === 'info');

  const statsCards = [
    { label: 'Erreurs',        count: errors.length,        color: '#c0392b' },
    { label: 'Avertissements', count: warnings.length,      color: '#b8860b' },
    { label: 'Informations',   count: infos.length,         color: '#8a8474' },
    { label: 'Homonymes',      count: homonymGroups.length, color: '#b07d57' },
  ];

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: '#f4f1ea' }}>
      <main className="mx-auto px-6 py-10" style={{ maxWidth: 820 }}>

        {/* En-tête */}
        <div className="mb-7">
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#1c1f1c',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Rapport d&apos;anomalies
          </h1>
          <p style={{ fontSize: 13.5, color: '#8a8474', marginTop: 6, marginBottom: 0 }}>
            Incohérences détectées automatiquement dans les données.
          </p>
        </div>

        {/* Grille de stats — 4 colonnes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 26,
          }}
        >
          {statsCards.map(({ label, count, color }) => (
            <div
              key={label}
              style={{
                background: '#fffdf9',
                border: '1px solid #e9e2d2',
                borderRadius: 14,
                padding: 18,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 30,
                  fontWeight: 500,
                  color,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {count}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#8a8474',
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Liste des anomalies */}
        {anomalies.length === 0 ? (
          <div
            style={{
              background: '#fffdf9',
              border: '1px solid #e9e2d2',
              borderRadius: 16,
              padding: '48px 24px',
              textAlign: 'center',
              color: '#8a8474',
              fontSize: 14,
            }}
          >
            Aucune anomalie détectée.
          </div>
        ) : (
          <div
            style={{
              background: '#fffdf9',
              border: '1px solid #e9e2d2',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {anomalies.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 13,
                  padding: '13px 18px',
                  borderBottom: i < anomalies.length - 1 ? '1px solid #f1ebdd' : 'none',
                  borderLeft: `4px solid ${ACCENT[a.severity]}`,
                }}
              >
                {/* Badge sévérité */}
                <Badge tone={SEVERITY_TONE[a.severity]} style={{ flexShrink: 0, marginTop: 1 }}>
                  {BADGE_LABEL[a.severity]}
                </Badge>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/person/${a.personId}?highlight=anomaly`}
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#1c1f1c',
                      textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                    className="anomaly-name"
                  >
                    {a.name}
                  </Link>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: '#7c7666',
                      margin: '2px 0 0',
                    }}
                  >
                    {a.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`.anomaly-name:hover { color: #2f5142 !important; }`}</style>
    </div>
  );
}
