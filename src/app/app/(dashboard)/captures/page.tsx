import { redirect } from "next/navigation";
import Link from "next/link";
import { CameraIcon, LinkSimpleIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getCaptures } from "@/lib/captures/data";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function sourceLabel(source: string | null) {
  if (source === "extension-scroll") return "Full-page";
  if (source === "extension-visible") return "Visible tab";
  return "Extension";
}

export default async function CapturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const captures = await getCaptures(supabase, user.id);

  return (
    <main className="captures-page">
      <section className="captures-header">
        <div>
          <p className="captures-kicker">Browser Extension</p>
          <h1>Captures</h1>
          <p>Screenshots saved by the Nyabag extension.</p>
        </div>
        <div className="captures-header-meta">
          <span className="captures-count">
            {captures.length > 0 ? `${captures.length} capture${captures.length !== 1 ? "s" : ""}` : ""}
          </span>
        </div>
      </section>

      {captures.length === 0 ? (
        <section className="captures-empty" aria-label="No captures yet">
          <div className="captures-empty__icon" aria-hidden="true">
            <CameraIcon size={22} />
          </div>
          <h2>No captures yet</h2>
          <p>
            Use the Nyabag extension to capture full-page screenshots or visible
            tab snapshots. They&apos;ll appear here.
          </p>
          <Link href="/app">Back to bookmarks</Link>
        </section>
      ) : (
        <section className="captures-grid" aria-label="Screenshot captures">
          {captures.map((capture) => (
            <article key={capture.id} className="capture-card">
              <div className="capture-card__preview">
                {capture.capture_url ? (
                  <img
                    src={capture.capture_url}
                    alt={capture.page_title ?? "Captured screenshot"}
                    loading="lazy"
                  />
                ) : (
                  <div className="capture-card__fallback" aria-hidden="true">
                    <CameraIcon size={24} />
                  </div>
                )}
              </div>

              <div className="capture-card__body">
                <div className="capture-card__topline">
                  <span className="capture-card__source-badge">
                    {sourceLabel(capture.source)}
                  </span>
                  {capture.compressed_size && capture.original_size && (
                    <span className="capture-card__size">
                      {formatBytes(capture.compressed_size)}
                      {" · "}
                      <span className="capture-card__savings">
                        {Math.round((1 - capture.compressed_size / capture.original_size) * 100)}% smaller
                      </span>
                    </span>
                  )}
                </div>

                <p className="capture-card__title">
                  {capture.page_title || capture.page_url || "Untitled capture"}
                </p>

                <div className="capture-card__footer">
                  <time className="capture-card__date" dateTime={capture.created_at}>
                    {formatDate(capture.created_at)}
                  </time>

                  <div className="capture-card__actions">
                    {capture.capture_url && (
                      <a
                        href={capture.capture_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capture-card__action"
                        title="Open full-size image"
                        aria-label="Open full-size image"
                      >
                        <ArrowSquareOutIcon size={14} />
                      </a>
                    )}
                    {capture.page_url && (
                      <a
                        href={capture.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capture-card__action"
                        title={`Visit source: ${capture.page_url}`}
                        aria-label="Visit source page"
                      >
                        <LinkSimpleIcon size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
