/**
 * One-shot GEDCOM cleaner: removes duplicated INDI/FAM blocks left by the
 * Heredis export bug (a whole ancestor branch was exported twice, the copy
 * having thinner children lists).
 *
 * Merge rules (deterministic, identity-based — never fuzzy):
 * - personKey = every line of the INDI block except FAMC/FAMS pointers.
 * - Two FAM merge iff marriage payload identical, husband & wife identical
 *   by personKey, and one children multiset (by personKey) is a subset of
 *   the other (the thinned copy folds into the full one).
 * - Two INDI merge iff personKey identical AND their FAMC/FAMS sets are
 *   identical after applying current family merges.
 * - Iterate both steps until fixpoint (handles the duplicated chain).
 *
 * Afterwards, data/overrides.json is reconciled: manual merge entries whose
 * ids no longer exist are dropped (the duplicate is physically gone).
 *
 * Usage: npx tsx scripts/dedupe-gedcom.ts [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const GED_PATH = path.resolve(process.cwd(), 'Dudouyt Heredis 2014-Export.ged');
const OVERRIDES_PATH = path.resolve(process.cwd(), 'data', 'overrides.json');
const DRY_RUN = process.argv.includes('--dry-run');

const raw = fs.readFileSync(GED_PATH, 'utf-8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

interface Block {
  header: string;
  id: string | null;
  type: string;
  body: string[];
}

const blocks: Block[] = [];
let current: Block | null = null;
for (const line of lines) {
  if (line === '') continue; // GEDCOM has no empty lines (trailing newline artifact)
  const m = line.match(/^0\s+(?:@([^@]+)@\s+)?(\S+)/);
  if (m) {
    current = { header: line, id: m[1] ?? null, type: m[2], body: [] };
    blocks.push(current);
  } else if (current) {
    current.body.push(line);
  }
}

const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex');

const indiBlocks = blocks.filter(b => b.type === 'INDI' && b.id);
const famBlocks = blocks.filter(b => b.type === 'FAM' && b.id);
const indiOrder = new Map(indiBlocks.map((b, i) => [b.id!, i]));
const famOrder = new Map(famBlocks.map((b, i) => [b.id!, i]));

const personKey = new Map<string, string>();
const indiFams = new Map<string, { famc: string[]; fams: string[] }>();
for (const b of indiBlocks) {
  const kept: string[] = [];
  const famc: string[] = [];
  const fams: string[] = [];
  for (const l of b.body) {
    const pm = l.match(/^1\s+(FAMC|FAMS)\s+@([^@]+)@/);
    if (pm) (pm[1] === 'FAMC' ? famc : fams).push(pm[2]);
    else kept.push(l);
  }
  personKey.set(b.id!, hash(kept.join('\n')));
  indiFams.set(b.id!, { famc, fams });
}

const famPayload = new Map<string, string>();
const famMembers = new Map<string, { husb: string | null; wife: string | null; children: string[] }>();
for (const b of famBlocks) {
  const kept: string[] = [];
  let husb: string | null = null;
  let wife: string | null = null;
  const children: string[] = [];
  for (const l of b.body) {
    const pm = l.match(/^1\s+(HUSB|WIFE|CHIL)\s+@([^@]+)@/);
    if (pm) {
      if (pm[1] === 'HUSB') husb = pm[2];
      else if (pm[1] === 'WIFE') wife = pm[2];
      else children.push(pm[2]);
    } else kept.push(l);
  }
  famPayload.set(b.id!, hash(kept.join('\n')));
  famMembers.set(b.id!, { husb, wife, children });
}

// ── Iterative merging ───────────────────────────────────────────────────────
const indiRemap = new Map<string, string>(); // removed -> kept
const famRemap = new Map<string, string>();
const rIndi = (id: string): string => { while (indiRemap.has(id)) id = indiRemap.get(id)!; return id; };
const rFam = (id: string): string => { while (famRemap.has(id)) id = famRemap.get(id)!; return id; };

function multisubset(small: string[], big: string[]): boolean {
  const counts = new Map<string, number>();
  for (const k of big) counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const k of small) {
    const c = counts.get(k) ?? 0;
    if (c === 0) return false;
    counts.set(k, c - 1);
  }
  return true;
}

for (let iter = 0; iter < 20; iter++) {
  let changed = false;

  // FAM step: group by payload + spouse personKeys
  const famGroups = new Map<string, string[]>();
  for (const b of famBlocks) {
    if (famRemap.has(b.id!)) continue;
    const m = famMembers.get(b.id!)!;
    if (!m.husb && !m.wife) continue;
    const key = [
      famPayload.get(b.id!),
      m.husb ? personKey.get(rIndi(m.husb)) ?? '?' : '-',
      m.wife ? personKey.get(rIndi(m.wife)) ?? '?' : '-',
    ].join('|');
    const g = famGroups.get(key) ?? [];
    g.push(b.id!);
    famGroups.set(key, g);
  }
  for (const group of famGroups.values()) {
    if (group.length < 2) continue;
    const childKeys = (id: string) =>
      famMembers.get(id)!.children.map(c => personKey.get(rIndi(c)) ?? '?');
    // canonical: most children, then first in file
    const sorted = [...group].sort((a, b) =>
      childKeys(b).length - childKeys(a).length || famOrder.get(a)! - famOrder.get(b)!);
    const keep = sorted[0];
    for (const other of sorted.slice(1)) {
      if (multisubset(childKeys(other), childKeys(keep))) {
        famRemap.set(other, keep);
        changed = true;
      }
    }
  }

  // INDI step: group by personKey, merge iff same resolved FAMC/FAMS sets
  const indiGroups = new Map<string, string[]>();
  for (const b of indiBlocks) {
    if (indiRemap.has(b.id!)) continue;
    const g = indiGroups.get(personKey.get(b.id!)!) ?? [];
    g.push(b.id!);
    indiGroups.set(personKey.get(b.id!)!, g);
  }
  for (const group of indiGroups.values()) {
    if (group.length < 2) continue;
    const ctx = (id: string) => {
      const f = indiFams.get(id)!;
      return [
        f.famc.map(rFam).sort().join(','),
        f.fams.map(rFam).sort().join(','),
      ].join(';');
    };
    const sorted = [...group].sort((a, b) => indiOrder.get(a)! - indiOrder.get(b)!);
    const keep = sorted[0];
    for (const other of sorted.slice(1)) {
      if (ctx(other) === ctx(keep)) {
        indiRemap.set(other, keep);
        changed = true;
      }
    }
  }

  if (!changed) break;
}

// ── Report ──────────────────────────────────────────────────────────────────
const nameOf = (id: string) => {
  const b = indiBlocks.find(x => x.id === rIndi(id));
  const body = b?.body.join('\n') ?? '';
  const name = body.match(/^1\s+NAME\s+(.+)$/m)?.[1]?.replace(/\//g, ' ').replace(/\s+/g, ' ').trim() ?? '?';
  const birt = body.match(/^1\s+BIRT[^]*?^2\s+DATE\s+(.+)$/m)?.[1] ?? '';
  return `${name}${birt ? ` (né ${birt})` : ''}`;
};

console.log(`\n=== Doublons stricts (résolution itérative) ===`);
console.log(`INDI : ${indiBlocks.length} personnes, ${indiRemap.size} doublons supprimés`);
for (const [removed, kept] of [...indiRemap].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  @${removed}@ -> @${kept}@  ${nameOf(kept)}`);
}
console.log(`FAM  : ${famBlocks.length} familles, ${famRemap.size} doublons supprimés`);

// ── Reconcile overrides ─────────────────────────────────────────────────────
interface OverridesJson {
  persons?: Record<string, unknown>;
  newPersons?: unknown[];
  mergedPersons?: Record<string, string>;
  deletedPersonIds?: string[];
  ignoredDoublons?: string[];
}
const norm = (id: string) => id.replace(/@/g, '');
let overrides: OverridesJson | null = null;
let droppedMerges = 0;
let remappedMerges = 0;
try {
  overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8')) as OverridesJson;
  const removed = new Set(indiRemap.keys());
  const newMerged: Record<string, string> = {};
  const dropFromDeleted = new Set<string>();

  for (const [k, v] of Object.entries(overrides.mergedPersons ?? {})) {
    const nk = norm(k);
    const nv = norm(v);
    if (removed.has(nk)) {
      // The duplicate side no longer exists — manual merge is obsolete.
      droppedMerges++;
      dropFromDeleted.add(nk);
    } else if (removed.has(nv)) {
      const target = rIndi(nv);
      if (target === nk) {
        // delete-id and keep-id are now the same record
        droppedMerges++;
        dropFromDeleted.add(nk);
      } else {
        newMerged[k] = `@${target}@`;
        remappedMerges++;
      }
    } else {
      newMerged[k] = v;
    }
  }
  overrides.mergedPersons = newMerged;
  overrides.deletedPersonIds = (overrides.deletedPersonIds ?? []).filter(
    id => !removed.has(norm(id)) && !dropFromDeleted.has(norm(id)),
  );
  overrides.ignoredDoublons = (overrides.ignoredDoublons ?? []).filter(
    pair => pair.split(':').every(id => !removed.has(norm(id))),
  );
  const editConflicts = Object.keys(overrides.persons ?? {}).filter(id => removed.has(norm(id)));
  if (editConflicts.length > 0) {
    console.log(`\n⚠ Édits de fiche sur des ids supprimés (à remapper à la main) : ${editConflicts.join(', ')}`);
  }
  console.log(`\nOverrides : ${droppedMerges} fusions manuelles devenues obsolètes supprimées, ${remappedMerges} remappées, ${Object.keys(newMerged).length} conservées.`);
} catch (err) {
  console.log(`\n(overrides.json non réconcilié : ${err})`);
}

if (DRY_RUN) {
  console.log(`\n--dry-run : aucun fichier modifié.`);
  process.exit(0);
}

// ── Rewrite GEDCOM ──────────────────────────────────────────────────────────
const removedIds = new Set([...indiRemap.keys(), ...famRemap.keys()]);
const remapRef = (l: string) =>
  l.replace(/@([^@]+)@/g, (_, id) => `@${rIndi(id) !== id ? rIndi(id) : rFam(id)}@`);

const out: string[] = [];
for (const b of blocks) {
  if (b.id && removedIds.has(b.id) && (b.type === 'INDI' || b.type === 'FAM')) continue;
  out.push(b.header);
  const seenPointers = new Set<string>();
  for (const l of b.body) {
    const remapped = remapRef(l);
    if (/^\d+\s+(FAMS|FAMC|CHIL|HUSB|WIFE)\s+@/.test(remapped)) {
      if (seenPointers.has(remapped)) continue;
      seenPointers.add(remapped);
    }
    out.push(remapped);
  }
}
fs.writeFileSync(GED_PATH, out.join(EOL) + EOL, 'utf-8');
if (overrides) {
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n', 'utf-8');
}
console.log(`\nFichiers réécrits.`);
console.log(`Personnes : ${indiBlocks.length} -> ${indiBlocks.length - indiRemap.size}`);
console.log(`Familles  : ${famBlocks.length} -> ${famBlocks.length - famRemap.size}`);
