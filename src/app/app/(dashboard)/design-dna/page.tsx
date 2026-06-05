import Link from "next/link";
import { redirect } from "next/navigation";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr";
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

export default async function DesignDnaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getDesignDnaList(supabase, user.id);

  return (
    <main className="design-dna-page">
      <section className="design-dna-page-header">
        <div>
          <p className="design-dna-kicker">Styleguides</p>
          <h1>Design DNA</h1>
          <p>Saved styleguides extracted from your bookmarks.</p>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="design-dna-empty">
          <span aria-hidden="true">
            <PaletteIcon size={22} />
          </span>
          <h2>No Design DNA yet</h2>
          <p>Generate one from a bookmark to save typography, colors, and UI patterns.</p>
          <Link href="/app">Back to bookmarks</Link>
        </section>
      ) : (
        <section className="design-dna-grid" aria-label="Saved Design DNA">
          {items.map((item) => (
            <Link key={item.id} href={`/app/design-dna/${item.id}`} className="design-dna-card">
              <div className="design-dna-card__preview">
                {item.screenshot_url ? (
                  <img src={item.screenshot_url} alt="" />
                ) : (
                  <div className="design-dna-card__fallback">
                    <PaletteIcon size={24} />
                  </div>
                )}
              </div>
              <div className="design-dna-card__body">
                <div className="design-dna-card__topline">
                  <span>{item.source_domain || "Unknown source"}</span>
                  <strong className={`design-dna-status design-dna-status--${item.extraction_status}`}>
                    {item.extraction_status}
                  </strong>
                </div>
                <h2>{item.title || item.source_title || item.source_domain}</h2>
                <div className="design-dna-card__swatches">
                  {item.colors.slice(0, 3).map((color) => (
                    <span key={color.hex} style={{ backgroundColor: color.hex }} title={color.hex} />
                  ))}
                </div>
                <div className="design-dna-card__meta">
                  <span>{item.typography[0]?.fontFamily || "Font inferred"}</span>
                  <span>{item.components.length} components</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
