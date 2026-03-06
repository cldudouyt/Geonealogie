'use client';

import { useRouter } from 'next/navigation';
import SearchBar from './search/SearchBar';

export default function DashboardSearch() {
  const router = useRouter();

  return (
    <SearchBar
      onSelect={(id) => router.push(`/?focus=${id}`)}
      placeholder="Rechercher un ancêtre par nom, prénom..."
    />
  );
}
