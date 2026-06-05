import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getDesignDnaById } from "@/lib/design-dna/data";
import { DesignDnaExportButtons } from "@/components/design-dna/DesignDnaExportButtons";
import type { DesignDnaTypographyItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatRoleDetails(item: DesignDnaTypographyItem) {
  return [item.fontSize, item.fontWeight, item.letterSpacing, item.lineHeight].filter(Boolean).join(" · ");
}

function sourcePreviewTitle(title: string, sourceTitle: string, domain: string) {
  return title || sourceTitle || domain || "Design DNA";
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
  const primaryStack = designDna.typography[0]?.fontStack || primaryFont;
  const title = sourcePreviewTitle(designDna.title, designDna.source_title, designDna.source_domain);

  return (
    <main className="design-dna-detail">
      <article className="design-dna-print-surface">
        <div className="design-dna-hero__nav">
          <Link href="/app/design-dna">
            <ArrowLeftIcon size={15} />
            Back to Design DNA
          </Link>
          <span>{designDna.source_domain}</span>
        </div>

        <header className="design-dna-hero">
          <p className="design-dna-kicker">{designDna.source_domain}</p>
          <h1>{title}</h1>
          <div className="design-dna-hero-meta">
            <span className="design-dna-method-badge">HTML/CSS inferred</span>
            <a className="design-dna-source-link" href={designDna.source_url} target="_blank" rel="noopener noreferrer">
              <ArrowSquareOutIcon size={14} />
              Source link
            </a>
            <DesignDnaExportButtons designDnaId={designDna.id} />
          </div>
        </header>

        <section className="design-dna-section design-dna-typography">
          <p className="design-dna-section-label">Typography</p>
          <div className="design-dna-type-specimen-row">
            <strong className="design-dna-type-specimen" style={{ fontFamily: primaryStack }}>Aa</strong>
            <div className="design-dna-type-specimen-info">
              <span>{primaryFont}</span>
              <small>Primary typeface · {primaryStack.toLowerCase().includes("serif") ? "serif" : "sans-serif"}</small>
            </div>
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
              </div>
            ))}
          </div>

          <p className="design-dna-note">
            Typography inferred from source HTML/CSS. Font preview may fall back if unavailable locally.
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
                <small>{color.usage || color.source || "Unknown"}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="design-dna-section">
          <p className="design-dna-section-label">Components &amp; patterns</p>
          <div className="design-dna-chip-section">
            <div className="design-dna-chip-group">
              <span>UI components</span>
              <div className="design-dna-chip-list">
                {designDna.components.length
                  ? designDna.components.map((component) => <span className="design-dna-chip" key={component}>{component}</span>)
                  : <span className="design-dna-chip">None detected</span>}
              </div>
            </div>
            <div className="design-dna-chip-group">
              <span>Layout patterns</span>
              <div className="design-dna-chip-list">
                {designDna.layout_patterns.length
                  ? designDna.layout_patterns.map((pattern) => <span className="design-dna-chip" key={pattern}>{pattern}</span>)
                  : <span className="design-dna-chip">None detected</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="design-dna-section design-dna-source-reference">
          <p className="design-dna-section-label">Source reference</p>
          <div className="design-dna-source-layout">
            <div className="design-dna-source-info">
              <h2>{designDna.source_title || designDna.source_domain}</h2>
              <p>{designDna.source_url}</p>
              <a href={designDna.source_url} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon size={14} />
                Visit website
              </a>
            </div>
            <div className="design-dna-source-preview">
              {designDna.screenshot_url ? (
                <img src={designDna.screenshot_url} alt={`${title} screenshot`} />
              ) : (
                <div>
                  <span>{designDna.source_domain}</span>
                  <strong>{title}</strong>
                </div>
              )}
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
