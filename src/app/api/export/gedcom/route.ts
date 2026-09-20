import { NextResponse } from 'next/server';
import { loadOverrides } from '@/lib/overrides-store';
import { getAllPersons, getStore } from '@/lib/gedcom-store';

function gedDate(raw?: string): string {
  return raw ? raw.toUpperCase() : '';
}

function gedPlace(place?: string): string {
  return place || '';
}

export async function GET() {
  const persons = await getAllPersons();
  const store = await getStore();

  const overrides = await loadOverrides();
  const sourceRecords: string[] = [];
  const lines: string[] = [];

  // Header
  lines.push('0 HEAD');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('1 CHAR UTF-8');
  lines.push('1 SOUR Geonealogie');
  lines.push('2 VERS 1.0');
  lines.push(`1 DATE ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`);

  // Individuals
  for (const p of persons) {
    lines.push(`0 @${p.id}@ INDI`);
    lines.push(`1 NAME ${p.givenNames} /${p.surname}/`);
    if (p.givenNames) lines.push(`2 GIVN ${p.givenNames}`);
    if (p.surname) lines.push(`2 SURN ${p.surname}`);
    if (p.nickname) lines.push(`2 NICK ${p.nickname}`);
    if (p.sex !== 'U') lines.push(`1 SEX ${p.sex}`);

    if (p.birthDateRaw || p.birthPlaceFull || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDateRaw) lines.push(`2 DATE ${gedDate(p.birthDateRaw)}`);
      if (p.birthPlaceFull || p.birthPlace) lines.push(`2 PLAC ${gedPlace(p.birthPlaceFull || p.birthPlace)}`);
    }

    if (p.chrDateRaw || p.chrPlace) {
      lines.push('1 CHR');
      if (p.chrDateRaw) lines.push(`2 DATE ${gedDate(p.chrDateRaw)}`);
      if (p.chrPlace) lines.push(`2 PLAC ${p.chrPlace}`);
    }

    if (p.deathDateRaw || p.deathPlaceFull || p.deathPlace) {
      lines.push('1 DEAT');
      if (p.deathDateRaw) lines.push(`2 DATE ${gedDate(p.deathDateRaw)}`);
      if (p.deathPlaceFull || p.deathPlace) lines.push(`2 PLAC ${gedPlace(p.deathPlaceFull || p.deathPlace)}`);
    }

    if (p.burialDateRaw || p.burialPlace) {
      lines.push('1 BURI');
      if (p.burialDateRaw) lines.push(`2 DATE ${gedDate(p.burialDateRaw)}`);
      if (p.burialPlace) lines.push(`2 PLAC ${p.burialPlace}`);
    }

    for (const occ of p.occupations) {
      lines.push(`1 OCCU ${occ}`);
    }

    if (p.nationality) lines.push(`1 NATI ${p.nationality}`);
    if (p.isAdopted) lines.push('1 _FIL ADOPTED_CHILD');

    if (p.notes) {
      const noteLines = p.notes.split('\n');
      lines.push(`1 NOTE ${noteLines[0]}`);
      for (let i = 1; i < noteLines.length; i++) {
        lines.push(`2 CONT ${noteLines[i]}`);
      }
    }

    for (const event of p.events) {
      lines.push('1 EVEN', `2 TYPE ${event.type}`);
      if (event.dateRaw) lines.push(`2 DATE ${gedDate(event.dateRaw)}`);
      if (event.placeFull || event.place) lines.push(`2 PLAC ${event.placeFull || event.place}`);
      if (event.note) { const [first, ...rest] = event.note.split('\n'); lines.push(`2 NOTE ${first}`, ...rest.map(line => `3 CONT ${line}`)); }
    }
    const sources = (overrides.newPersons.find(n => n.id === p.id) ?? overrides.persons[p.id])?.sources ?? [];
    for (const source of sources) {
      const sourceId = `S-${source.id}`;
      lines.push(`1 SOUR @${sourceId}@`, `2 NOTE ${source.event}`, `2 QUAY ${source.confidence === 'confirmed' ? 3 : source.confidence === 'approximate' ? 1 : 0}`);
      const [first, ...rest] = source.reference.split('\n');
      sourceRecords.push(`0 @${sourceId}@ SOUR`, `1 TITL ${source.event}`, `1 TEXT ${first}`, ...rest.map(line => `2 CONT ${line}`));
      if (source.url) sourceRecords.push(`1 NOTE ${source.url}`);
    }
    // Family links
    const parentFams = new Set<string>();
    for (const [famId, fam] of store.families) {
      if (fam.childrenIds.includes(p.id)) parentFams.add(famId);
      if (fam.husbandId === p.id || fam.wifeId === p.id) {
        lines.push(`1 FAMS @${famId}@`);
      }
    }
    for (const famId of parentFams) {
      lines.push(`1 FAMC @${famId}@`);
    }
  }

  // Families
  for (const [famId, fam] of store.families) {
    lines.push(`0 @${famId}@ FAM`);
    if (fam.husbandId) lines.push(`1 HUSB @${fam.husbandId}@`);
    if (fam.wifeId) lines.push(`1 WIFE @${fam.wifeId}@`);
    for (const childId of fam.childrenIds) {
      lines.push(`1 CHIL @${childId}@`);
    }
    if (fam.marriageDateRaw || fam.marriagePlace) {
      lines.push('1 MARR');
      if (fam.marriageDateRaw) lines.push(`2 DATE ${gedDate(fam.marriageDateRaw)}`);
      if (fam.marriagePlace) lines.push(`2 PLAC ${fam.marriagePlace}`);
    }
    if (fam.divorceDateRaw) {
      lines.push('1 DIV');
      lines.push(`2 DATE ${gedDate(fam.divorceDateRaw)}`);
    }
  }

  lines.push(...sourceRecords, '0 TRLR');

  const gedcom = lines.filter(Boolean).join('\r\n') + '\r\n';

  return new NextResponse(gedcom, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="genealogie-export.ged"',
    },
  });
}
