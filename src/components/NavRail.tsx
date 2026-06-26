'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';

/* ── Inline SVG icons ─────────────────────────────────────────────── */
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>
  </svg>
);
const TreeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <rect x="9" y="3" width="6" height="5" rx="1.3"/><rect x="3" y="16" width="6" height="5" rx="1.3"/><rect x="15" y="16" width="6" height="5" rx="1.3"/>
    <path d="M12 8v3M6 16v-2.5h12V16"/>
  </svg>
);
const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
  </svg>
);
const NetworkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/>
    <path d="M10.5 6.8 6.5 16M13.5 6.8 17.5 16M7 18h10"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 13h18M12 8V5m0 0 1.5-1.5M12 5l-1.5-1.5"/>
  </svg>
);
const RelationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8.5 12h7"/>
  </svg>
);
const TimelineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <path d="M3 12h4l3-7 4 14 3-7h4"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>
  </svg>
);
const DoublonsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>
  </svg>
);
const GeoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <circle cx="12" cy="10" r="3"/><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/>
  </svg>
);
const FeedbackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Accueil', icon: <HomeIcon /> },
      { href: '/tree', label: 'Arbre', icon: <TreeIcon /> },
      { href: '/map', label: 'Carte des origines', icon: <MapIcon /> },
      { href: '/search', label: 'Recherche', icon: <SearchIcon /> },
    ],
  },
  {
    label: 'Explorer',
    items: [
      { href: '/network', label: 'Réseau de relations', icon: <NetworkIcon /> },
      { href: '/anniversaires', label: 'Anniversaires', icon: <CalendarIcon /> },
      { href: '/relation', label: 'Chemin de parenté', icon: <RelationIcon /> },
      { href: '/timeline', label: 'Parcours migratoire', icon: <TimelineIcon /> },
    ],
  },
  {
    label: 'Qualité des données',
    items: [
      { href: '/anomalies', label: 'Anomalies', icon: <AlertIcon /> },
      { href: '/doublons', label: 'Doublons', icon: <DoublonsIcon /> },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/geocode', label: 'Géocodage', icon: <GeoIcon /> },
      { href: '/feedback', label: 'Suggestions reçues', icon: <FeedbackIcon /> },
    ],
  },
];

export default function NavRail() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        width: 248,
        flexShrink: 0,
        height: '100vh',
        background: '#15271f',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '22px 16px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, #2f5142, #1c3528)',
            border: '1px solid rgba(176,141,87,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" strokeWidth={1.7} strokeLinecap="round">
              <rect x="9" y="3" width="6" height="5" rx="1.3"/>
              <rect x="3" y="16" width="6" height="5" rx="1.3"/>
              <rect x="15" y="16" width="6" height="5" rx="1.3"/>
              <path d="M12 8v3M6 16v-2.5h12V16"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 21, fontWeight: 600,
              color: '#f0ece0', lineHeight: 1.2,
            }}>
              Géonéalogie
            </div>
            <div style={{
              fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase',
              color: '#9aa89b', marginTop: 4,
            }}>
              Famille Dudouyt
            </div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div style={{ height: '100%', padding: '0 8px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
              color: '#5a7060', padding: '0 11px', marginBottom: 4,
            }}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                />
              );
            })}
          </div>
        ))}
        </div>
        {/* Fade to indicate more items below */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
          background: 'linear-gradient(to bottom, transparent, #15271f)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Footer — profile + logout */}
      <div style={{ marginTop: 18, padding: '14px 8px 4px', borderTop: '1px solid rgba(255,255,255,.09)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#2f5142',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: '#c9a86a', flexShrink: 0,
          }}>
            CD
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e8e4d8' }}>Clément Dudouyt</div>
            <div style={{ fontSize: 10.5, color: '#8b9a8c', marginTop: 2 }}>Administrateur</div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Se déconnecter"
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                color: '#8b9a8c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <LogoutIcon />
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

/* Sub-component to avoid inline event handlers on Server Components boundary */
function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '9px 11px',
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 600,
        textDecoration: 'none',
        color: active ? '#f0e6cf' : '#a9b6a9',
        background: active ? 'rgba(201,168,106,.16)' : 'transparent',
      }}
      className={active ? '' : 'nav-item-inactive'}
    >
      {icon}
      {label}
    </Link>
  );
}
