import Link from "next/link";
import { redirect } from "next/navigation";
import { PaletteIcon, TextTIcon, SquaresFourIcon, CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getDesignDnaList } from "@/lib/design-dna/data";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    completed: "dna-badge--completed",
    processing: "dna-badge--processing",
    failed: "dna-badge--failed",
  };
  return map[status] ?? "dna-badge--pending";
}

export default async function DesignDnaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getDesignDnaList(supabase, user.id);

  return (
    <main className="dna-page">
      <header className="dna-header">
        <p className="dna-kicker">Styleguides</p>
        <h1 className="dna-heading">Design DNA</h1>
        <p className="dna-sub">Saved styleguides extracted from your bookmarks.</p>
      </header>

      {items.length === 0 ? (
        <section className="dna-empty" aria-label="No Design DNA yet">
          <div className="dna-empty__icon" aria-hidden="true">
            <PaletteIcon size={22} />
          </div>
          <h2>No Design DNA yet</h2>
          <p>Generate one from a bookmark to save typography, colors, and UI patterns.</p>
          <Link href="/app">Back to bookmarks</Link>
        </section>
      ) : (
        <section className="dna-grid" aria-label="Saved Design DNA">
          {items.map((item) => (
            <Link key={item.id} href={`/app/design-dna/${item.id}`} className="dna-card">
              <div className="dna-card__preview">
                {item.screenshot_url ? (
                  <img src={item.screenshot_url} alt="" />
                ) : (
                  <div className="dna-card__fallback" aria-hidden="true">
                    <PaletteIcon size={24} />
                  </div>
                )}
              </div>

              <div className="dna-card__body">
                <div className="dna-card__topline">
                  <span className="dna-card__domain">
                    {item.source_domain || "Unknown source"}
                  </span>
                  <span className={`dna-badge ${statusBadgeClass(item.extraction_status)}`}>
                    {item.extraction_status}
                  </span>
                </div>

                <h2 className="dna-card__title">
                  {item.title || item.source_title || item.source_domain}
                </h2>

                {item.colors.length > 0 && (
                  <div className="dna-card__swatches" aria-label="Brand colors">
                    {item.colors.slice(0, 4).map((color) => (
                      <span
                        key={color.hex}
                        className="dna-swatch"
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                        aria-label={color.hex}
                      />
                    ))}
                  </div>
                )}

                <div className="dna-card__meta">
                  {item.typography[0]?.fontFamily && (
                    <span className="dna-meta-item">
                      <TextTIcon size={12} aria-hidden="true" />
                      {item.typography[0].fontFamily}
                    </span>
                  )}
                  <span className="dna-meta-item">
                    <SquaresFourIcon size={12} aria-hidden="true" />
                    {item.components.length} components
                  </span>
                  <span className="dna-meta-item">
                    <CalendarBlankIcon size={12} aria-hidden="true" />
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}