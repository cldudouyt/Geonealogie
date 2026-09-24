'use client';

const cardStyle: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 400,
  background: '#fffdf9', borderRadius: 22,
  padding: '38px 34px', boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
  textAlign: 'center',
};

export default function ResetPage() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(155deg, #1e3a2f 0%, #15271f 60%, #0f1d16 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 600px 500px at 80% -10%, rgba(201,168,106,.45) 0%, transparent 70%)',
        opacity: 0.6, pointerEvents: 'none',
      }} />
      <div style={cardStyle}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 52, height: 52, borderRadius: 15,
          background: 'linear-gradient(145deg, #2f5142 0%, #1e3a2f 100%)', marginBottom: 16,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif, Newsreader, Georgia, serif)',
          fontSize: 22, fontWeight: 500, color: '#1c1f1c',
          letterSpacing: '-0.02em', margin: '0 0 12px',
        }}>
          Réinitialiser votre mot de passe
        </h1>
        <p style={{ fontSize: 14, color: '#5a6058', lineHeight: 1.6, margin: '0 0 20px' }}>
          Pour des raisons de sécurité, la réinitialisation se fait via un lien envoyé
          directement par l'administrateur.
        </p>
        <p style={{ fontSize: 14, color: '#5a6058', lineHeight: 1.6, margin: '0 0 28px' }}>
          Contactez l'administrateur du site pour obtenir un lien de réinitialisation.
          Vous recevrez un lien personnel valable 7 jours.
        </p>
        <a href="/login" style={{
          display: 'inline-block', padding: '10px 24px',
          background: '#1e3a2f', color: '#f1ede2',
          borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-sans)',
        }}>
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
