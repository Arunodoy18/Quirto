export function Placeholder({ title, step }: { title: string; step: number }) {
  return (
    <section className="panel" style={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span className="panel-title" style={{ fontSize: 16 }}>{title}</span>
      <span className="muted">Built in step {step} of docs/BUILD_GUIDE.md</span>
    </section>
  );
}
