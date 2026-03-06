import fs from 'fs';
import path from 'path';
import neo4j, { Session } from 'neo4j-driver';
import { readGedcom } from 'read-gedcom';
import { cleanRtf } from '../src/lib/gedcom/rtf-cleaner';
import { normalizeDate, extractYear } from '../src/lib/gedcom/date-normalizer';

// --- Config ---
const GEDCOM_PATH = path.resolve(__dirname, '../Dudouyt Heredis 2014-Export.ged');
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'genealogy2024';
const BATCH_SIZE = 100;

// --- Helpers ---
function stripXref(pointer: string | undefined | null): string {
  if (!pointer) return '';
  return pointer.replace(/@/g, '');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function parsePlace(placeStr: string | undefined): {
  name: string; areaCode?: string; county?: string; region?: string; country?: string; subdivision?: string;
} | null {
  if (!placeStr) return null;
  const parts = placeStr.split(',').map(s => s.trim());
  return {
    name: parts[0] || '',
    areaCode: parts[1] || undefined,
    county: parts[2] || undefined,
    region: parts[3] || undefined,
    country: parts[4] || undefined,
    subdivision: parts[5] || undefined,
  };
}

function placeKey(parsed: { name: string; county?: string; country?: string }): string {
  return `${parsed.name}|${parsed.county || ''}|${parsed.country || ''}`;
}

function getTextValue(node: any): string | undefined {
  try {
    const val = node?.value();
    if (Array.isArray(val)) return val[0]?.toString();
    return val?.toString();
  } catch {
    return undefined;
  }
}

function getConcatenatedText(node: any): string {
  try {
    const val = node?.value();
    if (Array.isArray(val)) return val.join(' ');
    return val?.toString() || '';
  } catch {
    return '';
  }
}

// --- Main Import ---
async function main() {
  console.log('Reading GEDCOM file...');
  const fileBuffer = fs.readFileSync(GEDCOM_PATH);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer;
  const gedcom = readGedcom(arrayBuffer);

  console.log('Connecting to Neo4j...');
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  try {
    // Clear database
    console.log('Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');

    // Phase 1: Extract & create persons
    await importPersons(session, gedcom);

    // Phase 2: Extract & create families (relationships)
    await importFamilies(session, gedcom);

    // Phase 3: Create indexes
    await createIndexes(session);

    console.log('\n=== Import complete! ===');

    // Stats
    const stats = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
      ORDER BY count DESC
    `);
    console.log('\nDatabase stats:');
    for (const record of stats.records) {
      console.log(`  ${record.get('label')}: ${record.get('count').toNumber()}`);
    }

    const relStats = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) AS type, count(r) AS count
      ORDER BY count DESC
    `);
    console.log('\nRelationship stats:');
    for (const record of relStats.records) {
      console.log(`  ${record.get('type')}: ${record.get('count').toNumber()}`);
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

async function importPersons(session: Session, gedcom: any) {
  console.log('\nPhase 1: Importing persons...');

  const individuals = gedcom.getIndividualRecord().arraySelect();
  console.log(`  Found ${individuals.length} individuals`);

  let count = 0;
  for (const batch of chunk(individuals, BATCH_SIZE)) {
    const persons = batch.map((indi: any) => {
      const id = stripXref(indi.pointer()[0]);

      // Name
      const nameTag = indi.getName();
      const givenNames = getTextValue(nameTag?.getGivenName()) || '';
      const surname = getTextValue(nameTag?.getSurname()) || '';
      const nickname = getTextValue(indi.get('NAME')?.get('NICK')) || undefined;
      const displayName = `${givenNames.split(',')[0].trim()} ${surname}`.trim();

      // Sex
      const sexVal = getTextValue(indi.getSex());
      const sex = sexVal === 'M' ? 'M' : sexVal === 'F' ? 'F' : 'U';

      // Birth
      const birth = indi.getEventBirth();
      const birthDateRaw = getTextValue(birth?.getDate());
      const birthDate = normalizeDate(birthDateRaw);
      const birthYear = extractYear(birthDateRaw);
      const birthPlaceRaw = getTextValue(birth?.getPlace());
      const birthParsed = parsePlace(birthPlaceRaw);
      const birthPlace = birthParsed?.name || undefined;
      const birthPlaceFull = birthPlaceRaw || undefined;

      let birthLat: number | undefined;
      let birthLon: number | undefined;
      try {
        const map = birth?.getPlace()?.get('MAP');
        const latStr = getTextValue(map?.get('LATI'));
        const lonStr = getTextValue(map?.get('LONG'));
        if (latStr) {
          const dir = latStr.charAt(0);
          birthLat = parseFloat(latStr.substring(1)) * (dir === 'S' ? -1 : 1);
        }
        if (lonStr) {
          const dir = lonStr.charAt(0);
          birthLon = parseFloat(lonStr.substring(1)) * (dir === 'W' ? -1 : 1);
        }
      } catch {}

      // Death
      const death = indi.getEventDeath();
      const deathDateRaw = getTextValue(death?.getDate());
      const deathDate = normalizeDate(deathDateRaw);
      const deathYear = extractYear(deathDateRaw);
      const deathPlaceRaw = getTextValue(death?.getPlace());
      const deathParsed = parsePlace(deathPlaceRaw);
      const deathPlace = deathParsed?.name || undefined;
      const deathPlaceFull = deathPlaceRaw || undefined;

      // Occupation(s)
      const occuNodes = indi.get('OCCU')?.arraySelect() || [];
      const occupations: string[] = [];
      for (const occ of occuNodes) {
        const val = getTextValue(occ);
        if (val) occupations.push(val);
      }
      const occupation = occupations[0] || undefined;

      // Adopted?
      const filVal = getTextValue(indi.get('_FIL'));
      const isAdopted = filVal === 'ADOPTED_CHILD';

      // Notes - collect from OCCU notes and individual NOTE
      let notes = '';
      const noteNodes = indi.get('NOTE')?.arraySelect() || [];
      for (const n of noteNodes) {
        const val = getConcatenatedText(n);
        if (val) notes += (notes ? '\n\n' : '') + cleanRtf(val);
      }
      // Also get notes from occupation entries
      for (const occ of occuNodes) {
        const noteVal = getConcatenatedText(occ.get('NOTE'));
        if (noteVal) notes += (notes ? '\n\n' : '') + cleanRtf(noteVal);
      }
      // And event notes
      const eventNodes = indi.get('EVEN')?.arraySelect() || [];
      for (const evt of eventNodes) {
        const noteVal = getConcatenatedText(evt.get('NOTE'));
        if (noteVal) notes += (notes ? '\n\n' : '') + cleanRtf(noteVal);
      }

      // Nationality
      const natVal = getTextValue(indi.get('NATI')?.get('CAUS'));
      const nationality = natVal || undefined;

      return {
        id,
        gedcomId: `@${id}@`,
        givenNames,
        surname,
        displayName,
        nickname: nickname || null,
        sex,
        birthDate: birthDate || null,
        birthDateRaw: birthDateRaw || null,
        birthYear: birthYear || null,
        birthPlace: birthPlace || null,
        birthPlaceFull: birthPlaceFull || null,
        birthLat: birthLat ?? null,
        birthLon: birthLon ?? null,
        deathDate: deathDate || null,
        deathDateRaw: deathDateRaw || null,
        deathYear: deathYear || null,
        deathPlace: deathPlace || null,
        deathPlaceFull: deathPlaceFull || null,
        occupation: occupation || null,
        occupations: occupations.length > 0 ? occupations : null,
        nationality: nationality || null,
        isAdopted,
        notes: notes || null,
      };
    });

    await session.run(
      `UNWIND $persons AS p
       CREATE (n:Person)
       SET n = p`,
      { persons }
    );

    count += batch.length;
    process.stdout.write(`\r  Created ${count}/${individuals.length} persons`);
  }
  console.log('');
}

async function importFamilies(session: Session, gedcom: any) {
  console.log('\nPhase 2: Importing families & relationships...');

  const families = gedcom.getFamilyRecord().arraySelect();
  console.log(`  Found ${families.length} families`);

  let spouseCount = 0;
  let parentCount = 0;

  for (const fam of families) {
    const famId = stripXref(fam.pointer()[0]);

    // Husband & Wife
    const husbPointer = getTextValue(fam.getHusband());
    const wifePointer = getTextValue(fam.getWife());
    const husbId = stripXref(husbPointer);
    const wifeId = stripXref(wifePointer);

    // Marriage info
    const marr = fam.get('MARR');
    const marriageDateRaw = getTextValue(marr?.get('DATE'));
    const marriageDate = normalizeDate(marriageDateRaw);
    const marriagePlaceRaw = getTextValue(marr?.get('PLAC'));
    const marriageParsed = parsePlace(marriagePlaceRaw);
    const marriagePlace = marriageParsed ?
      `${marriageParsed.name}${marriageParsed.county ? ', ' + marriageParsed.county : ''}` :
      undefined;

    // Create SPOUSE_OF relationship
    if (husbId && wifeId) {
      await session.run(
        `MATCH (h:Person {id: $husbId}), (w:Person {id: $wifeId})
         CREATE (h)-[:SPOUSE_OF {
           familyId: $famId,
           marriageDate: $marriageDate,
           marriageDateRaw: $marriageDateRaw,
           marriagePlace: $marriagePlace
         }]->(w)`,
        {
          husbId, wifeId, famId,
          marriageDate: marriageDate || null,
          marriageDateRaw: marriageDateRaw || null,
          marriagePlace: marriagePlace || null,
        }
      );
      spouseCount++;
    }

    // Children
    const childNodes = fam.getChild()?.arraySelect() || [];
    for (const childNode of childNodes) {
      const childPointer = getTextValue(childNode);
      const childId = stripXref(childPointer);
      if (!childId) continue;

      // Create PARENT_OF and CHILD_OF for each parent
      for (const parentId of [husbId, wifeId].filter(Boolean)) {
        await session.run(
          `MATCH (parent:Person {id: $parentId}), (child:Person {id: $childId})
           CREATE (parent)-[:PARENT_OF]->(child)
           CREATE (child)-[:CHILD_OF]->(parent)`,
          { parentId, childId }
        );
        parentCount++;
      }
    }
  }

  console.log(`  Created ${spouseCount} spouse relationships`);
  console.log(`  Created ${parentCount} parent-child relationships`);
}

async function createIndexes(session: Session) {
  console.log('\nPhase 3: Creating indexes...');

  const indexes = [
    'CREATE INDEX person_id IF NOT EXISTS FOR (p:Person) ON (p.id)',
    'CREATE INDEX person_surname IF NOT EXISTS FOR (p:Person) ON (p.surname)',
    'CREATE INDEX person_display IF NOT EXISTS FOR (p:Person) ON (p.displayName)',
    'CREATE INDEX person_sex IF NOT EXISTS FOR (p:Person) ON (p.sex)',
  ];

  for (const idx of indexes) {
    await session.run(idx);
  }

  // Fulltext index for search
  try {
    await session.run(`
      CREATE FULLTEXT INDEX person_search IF NOT EXISTS
      FOR (p:Person) ON EACH [p.displayName, p.surname, p.givenNames, p.occupation, p.birthPlaceFull, p.deathPlaceFull]
    `);
  } catch (e) {
    console.log('  Fulltext index may already exist:', (e as Error).message);
  }

  console.log('  Indexes created');
}

// Run
main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
