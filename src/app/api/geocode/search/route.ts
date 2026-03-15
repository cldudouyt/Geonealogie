import { NextResponse } from 'next/server';

export interface GeoSuggestion {
  label: string;       // short display name
  fullLabel: string;   // full display name for confirmation
  lat: number;
  lon: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const params = new URLSearchParams({ q, format: 'json', limit: '6', addressdetails: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'Geonealogie/1.0 (genealogy app)' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json([]);

    type NominatimResult = {
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string; town?: string; village?: string; municipality?: string;
        county?: string; state?: string; country?: string; country_code?: string;
      };
    };

    const data = await res.json() as NominatimResult[];

    const suggestions: GeoSuggestion[] = data.map(r => {
      const a = r.address ?? {};
      const city = a.city || a.town || a.village || a.municipality || '';
      const region = a.county || a.state || '';
      const country = a.country || '';
      const parts = [city, region, country].filter(Boolean);
      const label = parts.length > 0 ? parts.join(', ') : r.display_name.split(',').slice(0, 3).join(',').trim();
      return {
        label,
        fullLabel: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      };
    });

    // Deduplicate by label
    const seen = new Set<string>();
    const unique = suggestions.filter(s => {
      if (seen.has(s.label)) return false;
      seen.add(s.label);
      return true;
    });

    return NextResponse.json(unique);
  } catch {
    return NextResponse.json([]);
  }
}
