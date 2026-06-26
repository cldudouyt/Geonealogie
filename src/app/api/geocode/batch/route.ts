import { getAllPersons, clearStore } from '@/lib/gedcom-store';
import { geocodeSingle, getCached } from '@/lib/geocoder';
import { loadOverrides, savePersonEdit, type PersonEdit } from '@/lib/overrides-store';

export const maxDuration = 300;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(sseEvent(data)));
      }

      try {
        const [persons, overrides] = await Promise.all([getAllPersons(), loadOverrides()]);

        let idx = 0;
        let success = 0;
        let failed = 0;

        // ── 1. Geocode GEDCOM places ─────────────────────────────────────────
        const gedcomPlaces = new Set<string>();
        for (const p of persons) {
          if (p.birthPlaceFull && p.birthLat == null) gedcomPlaces.add(p.birthPlaceFull);
          if (p.deathPlaceFull && p.deathLat == null) gedcomPlaces.add(p.deathPlaceFull);
          for (const evt of p.events) {
            if (evt.lat == null) {
              const key = evt.placeFull || evt.place;
              if (key) gedcomPlaces.add(key);
            }
          }
        }

        for (const place of gedcomPlaces) {
          const cached = getCached(place);
          if (cached !== undefined) continue;
          if (idx > 0) await sleep(1100);
          idx++;
          const result = await geocodeSingle(place);
          if (result) {
            success++;
            send({ type: 'success', place, lat: result.lat, lng: result.lon });
          } else {
            failed++;
            send({ type: 'error', place, message: 'non trouvé' });
          }
        }

        // ── 2. Geocode override places → persist in Neo4j ───────────────────
        for (const [personId, edit] of Object.entries(overrides.persons)) {
          const updated: PersonEdit = {};
          let changed = false;

          if (edit.birthPlace && edit.birthLat == null) {
            if (idx > 0) await sleep(1100);
            idx++;
            const result = await geocodeSingle(edit.birthPlace);
            if (result) {
              success++;
              updated.birthLat = result.lat;
              updated.birthLon = result.lon;
              changed = true;
              send({ type: 'success', place: edit.birthPlace, lat: result.lat, lng: result.lon });
            } else {
              failed++;
              send({ type: 'error', place: edit.birthPlace, message: 'non trouvé' });
            }
          }

          if (edit.deathPlace && edit.deathLat == null) {
            if (idx > 0) await sleep(1100);
            idx++;
            const result = await geocodeSingle(edit.deathPlace);
            if (result) {
              success++;
              updated.deathLat = result.lat;
              updated.deathLon = result.lon;
              changed = true;
              send({ type: 'success', place: edit.deathPlace, lat: result.lat, lng: result.lon });
            } else {
              failed++;
              send({ type: 'error', place: edit.deathPlace, message: 'non trouvé' });
            }
          }

          if (edit.events) {
            const updatedEvents = [...edit.events];
            for (let i = 0; i < updatedEvents.length; i++) {
              const evt = updatedEvents[i];
              if (!evt.place || evt.lat != null) continue;
              if (idx > 0) await sleep(1100);
              idx++;
              const result = await geocodeSingle(evt.place);
              if (result) {
                success++;
                updatedEvents[i] = { ...evt, lat: result.lat, lon: result.lon };
                changed = true;
                send({ type: 'success', place: evt.place, lat: result.lat, lng: result.lon });
              } else {
                failed++;
                send({ type: 'error', place: evt.place, message: 'non trouvé' });
              }
            }
            if (changed) updated.events = updatedEvents;
          }

          if (changed) {
            await savePersonEdit(personId, updated);
          }
        }

        clearStore();
        send({ type: 'done', total: idx, success, failed });
      } catch (err) {
        send({ type: 'error', place: '', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
