export default function DesignDnaLoading() {
  return (
    <main className="design-dna-page">
      <section className="design-dna-page-header">
        <div>
          <div className="skeleton-line skeleton-line-kicker" />
          <div className="skeleton-line skeleton-line-title" />
        </div>
      </section>
      <section className="design-dna-grid" aria-label="Loading Design DNA">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="design-dna-card design-dna-card--skeleton">
            <div className="design-dna-card__preview" />
            <div className="design-dna-card__body">
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line-title" />
              <div className="skeleton-line" />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
