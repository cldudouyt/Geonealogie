'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        position: 'fixed', top: 16, right: 16,
        padding: '8px 16px', background: '#1e40af', color: 'white',
        border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
        fontFamily: 'sans-serif', zIndex: 9999,
      }}
      className="no-print"
    >
      Imprimer / PDF
    </button>
  );
}
