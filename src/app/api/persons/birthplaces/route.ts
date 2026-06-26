import { NextResponse } from 'next/server';
import { getAllPersons } from '@/lib/gedcom-store';

const PIN_COLORS = [
  '#2f5142',
  '#5b7da3',
  '#c9a86a',
  '#9c5a52',
  '#b07d57',
  '#6b8f70',
];

export async function GET() {
  try {
    const persons = await getAllPersons();

    const placeMap = new Map<string, { region: string; lat: number; lng: number; count: number }>();

    for (const p of persons) {
      if (!p.birthPlace || p.birthLat == null || p.birthLon == null) continue;
      const existing = placeMap.get(p.birthPlace);
      if (existing) {
        existing.count++;
      } else {
        const parts = p.birthPlaceFull?.split(',').map(s => s.trim()) ?? [];
        const region = parts.length > 1 ? parts[parts.length - 1] : '';
        placeMap.set(p.birthPlace, { region, lat: p.birthLat, lng: p.birthLon, count: 1 });
      }
    }

    const places = Array.from(placeMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([place, data], i) => ({
        place,
        region: data.region,
        lat: data.lat,
        lng: data.lng,
        count: data.count,
        color: PIN_COLORS[i % PIN_COLORS.length],
      }));

    return NextResponse.json({ places });
  } catch (err) {
    console.error('[birthplaces]', err);
    return NextResponse.json({ places: [] }, { status: 500 });
  }
}
