import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getDesignDnaById } from "@/lib/design-dna/data";
import { DesignDnaExportButtons } from "@/components/design-dna/DesignDnaExportButtons";

export const dynamic = "force-dynamic";

function formatRoleDetails(item: {
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
}) {
  return [item.fontSize, item.fontFamily, item.fontWeight].filter(Boolean).join("  ");
}

export default async function DesignDnaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const designDna = await getDesignDnaById(supabase, id, user.id);
  if (!designDna) notFound();

  const primaryFont = designDna.typography[0]?.fontFamily || "Inferred typography";

  return (
    <main className="design-dna-detail">
      <article className="design-dna-print-surface">
        <header className="design-dna-hero">
          <div className="design-dna-hero__nav">
            <Link href="/app/design-dna">
              <ArrowLeftIcon size={15} />
              Back to Design DNA
            </Link>
            <span>{designDna.source_domain}</span>
          </div>
          <div className="design-dna-hero__main">
            <div>
              <p className="design-dna-kicker">{designDna.source_domain}</p>
              <h1>{designDna.title || designDna.source_title || "Design DNA"}</h1>
              <a href={designDna.source_url} target="_blank" rel="noopener noreferrer">
                Source link
                <ArrowSquareOutIcon size={14} />
              </a>
            </div>
            <div className="design-dna-hero__actions">
              <span className="design-dna-method-badge">HTML/CSS inferred</span>
              <DesignDnaExportButtons designDnaId={designDna.id} />
            </div>
          </div>
        </header>

        <section className="design-dna-section design-dna-typography">
          <div className="design-dna-type-specimen">
            <p className="design-dna-section-label">Typography</p>
            <strong style={{ fontFamily: designDna.typography[0]?.fontStack || primaryFont }}>Aa</strong>
            <span>{primaryFont}</span>
          </div>

          <div className="design-dna-type-scale">
            {designDna.typography.map((item) => (
              <div key={`${item.role}-${item.selector || item.fontSize}`} className="design-dna-type-row">
                <div className="design-dna-type-row__meta">
                  <strong>{item.role}</strong>
                  <span>{formatRoleDetails(item)}</span>
                </div>
                <p style={{ fontFamily: item.fontStack || item.fontFamily }}>
                  {item.sample || "Manage your work with patients"}
                </p>
                <small>{item.lineHeight} line height · {item.confidence}</small>
              </div>
            ))}
          </div>

          <p className="design-dna-note">
            Typography is inferred from source HTML/CSS. Font preview may fall back if the font is not available locally.
          </p>
        </section>

        <section className="design-dna-section">
          <p className="design-dna-section-label">Colors</p>
          <div className="design-dna-colors">
            {designDna.colors.map((color) => (
              <div key={color.hex} className="design-dna-color-card">
                <div className="design-dna-color-swatch" style={{ backgroundColor: color.hex }} />
                <strong>{color.name}</strong>
                <span>{color.hex}</span>
                <small>{color.usage}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="design-dna-section design-dna-chip-section">
          <div>
            <p className="design-dna-section-label">UI Components</p>
            <div className="design-dna-chip-list">
              {designDna.components.length
                ? designDna.components.map((component) => <span className="design-dna-chip" key={component}>{component}</span>)
                : <span className="design-dna-chip">None detected</span>}
            </div>
          </div>
          <div>
            <p className="design-dna-section-label">Layout Patterns</p>
            <div className="design-dna-chip-list">
              {designDna.layout_patterns.length
                ? designDna.layout_patterns.map((pattern) => <span className="design-dna-chip" key={pattern}>{pattern}</span>)
                : <span className="design-dna-chip">None detected</span>}
            </div>
          </div>
        </section>

        <section className="design-dna-section design-dna-source-reference">
          <div>
            <p className="design-dna-section-label">Source Reference</p>
            <h2>{designDna.source_title || designDna.source_domain}</h2>
            <p>{designDna.source_url}</p>
            <a href={designDna.source_url} target="_blank" rel="noopener noreferrer">
              Visit website
              <ArrowSquareOutIcon size={14} />
            </a>
          </div>
          {designDna.screenshot_url && (
            <img src={designDna.screenshot_url} alt={`${designDna.title} screenshot`} />
          )}
        </section>
      </article>
    </main>
  );
}
