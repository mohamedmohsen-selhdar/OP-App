export default function PlaceholderScreen({ titleAr, titleEn, icon, phase }) {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{icon} {titleAr}</h1>
          <p className="page-subtitle">{titleEn}</p>
        </div>
      </div>
      <div style={{ marginTop: 60, padding: 40, borderRadius: 16, border: '1.5px dashed var(--bg-border)', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: 12 }}>{icon}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          {titleAr} — قيد الإنشاء (Phase {phase})
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
          {titleEn} — Building in Phase {phase}
        </p>
      </div>
    </div>
  );
}
