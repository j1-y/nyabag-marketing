export default function DesignDnaDetailLoading() {
  return (
    <main className="design-dna-detail">
      <article className="design-dna-print-surface">
        <header className="design-dna-hero">
          <div className="skeleton-line skeleton-line-kicker" />
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-button" />
        </header>
        <section className="design-dna-section design-dna-typography">
          <div className="design-dna-type-specimen">
            <div className="skeleton-line skeleton-line-kicker" />
            <div className="skeleton-line skeleton-line-title" />
          </div>
          <div className="design-dna-type-scale">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="design-dna-type-row">
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line-title" />
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
