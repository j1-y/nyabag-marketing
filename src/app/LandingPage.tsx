"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitEarlyAccessSignup } from "@/lib/early-access-actions";
import styles from "./landing.module.css";

const EarlyAccessForm = ({ compact = false }: { compact?: boolean }) => {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("source", "landing");

    startTransition(async () => {
      const result = await submitEarlyAccessSignup(formData);
      if (!result.success) {
        setMessageType("error");
        setMessage(result.error);
        return;
      }

      setMessageType("success");
      setMessage(result.data.duplicate ? "You're already on the list." : "Thanks. You're on the early access list.");
      form.reset();
    });
  }

  return (
    <form
      className={compact ? styles.earlyAccessFormCompact : styles.earlyAccessForm}
      onSubmit={handleSubmit}
    >
      <div className={styles.earlyAccessRow}>
        <label className={styles.earlyAccessLabel}>
          <span>Email address</span>
          <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" disabled={isPending} />
        </label>
        <button type="submit" disabled={isPending}>
          {isPending ? "Joining..." : "Join early access"}
        </button>
      </div>
      {message && (
        <p className={messageType === "error" ? styles.earlyAccessError : styles.earlyAccessThanks}>
          {message}
        </p>
      )}
    </form>
  );
};

/* ── Inline SVG icons ─────────────────── */
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M3 13c0-2.2 2.24-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="4" y="2" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 6h4M6 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.2" />
    <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M13 3L8 1 3 3v5c0 3 2.5 5.5 5 7 2.5-1.5 5-4 5-7V3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/* ── SimLine helper ─────────────────── */
const SimLine = ({ w = "100%", h = 6, mt = 0 }: { w?: string; h?: number; mt?: number }) => (
  <div
    style={{
      height: h,
      width: w,
      borderRadius: 3,
      background: "rgba(255,255,255,0.07)",
      marginTop: mt,
    }}
  />
);

/* ── Bookmark card ──────────────────── */
type CardProps = {
  thumbBg: string;
  title: string;
  url: string;
  tags: string[];
  palette: string[];
  thumbContent: React.ReactNode;
};

const BookmarkCard = ({ thumbBg, title, url, tags, palette, thumbContent }: CardProps) => (
  <article className={styles.bookmarkCard}>
    <div className={styles.cardThumb} style={{ background: thumbBg }}>
      {thumbContent}
    </div>
    <div className={styles.cardMeta}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardUrl}>{url}</div>
      <div className={styles.tagRow}>
        {tags.map((t) => (
          <span key={t} className={styles.tag}>{t}</span>
        ))}
      </div>
      <div className={styles.paletteStrip} aria-label="Extracted color palette">
        {palette.map((c) => (
          <div key={c} className={styles.paletteSwatch} style={{ background: c }} />
        ))}
      </div>
    </div>
  </article>
);

/* ── Feature card ───────────────────── */
type FeatureCardProps = {
  icon: React.ReactNode;
  name: string;
  desc: string;
};

const FeatureCard = ({ icon, name, desc }: FeatureCardProps) => (
  <article className={styles.featureCard} role="listitem">
    <div className={styles.featureIconWrap}>{icon}</div>
    <div className={styles.featureName}>{name}</div>
    <p className={styles.featureDesc}>{desc}</p>
  </article>
);

/* ── CapabilityRow helper ─────────────── */
const CapabilityRow = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className={styles.canvasCapabilityRow}>
    <div className={styles.canvasCapabilityIcon}>{icon}</div>
    {label}
  </div>
);

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export function LandingPage() {
  return (
    <div className={styles.root}>
      {/* ── NAV ── */}
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.navLogo}>
          <img src="/assets/Nyabag-Dark-Logo.svg" alt="Nyabag" />
        </Link>
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#canvas" className={styles.navLink}>Canvas</Link>
          <Link href="#compare" className={styles.navLink}>Why Nyabag</Link>
          <Link href="/blog" className={styles.navLink}>Blog</Link>
        </div>
        <Link href="#early-access" className={styles.navCta}>Early access</Link>
      </nav>

      {/* ── HERO ── */}
      <header className={styles.hero} role="banner">
        <div className={styles.heroBgGrid} aria-hidden="true" />

        <div className={styles.heroBadge} aria-label="Status: Now in early access">
          <span className={styles.heroBadgeDot} aria-hidden="true" />
          Now in early access
        </div>

        <h1 className={styles.heroHeadline}>
          Your second memory<br />
          <em>for design.</em>
        </h1>

        <p className={styles.heroSub}>
          Save websites, screenshots, UI references, colors, fonts, and ideas in one visual workspace. Find them again when it matters.
        </p>

        <div id="early-access" className={styles.heroActions}>
          <EarlyAccessForm />
        </div>

        <p className={styles.heroTrust}>
          Built for designers who keep forgetting where they saved that one perfect reference.
        </p>

        {/* Product mockup */}
        <div
          className={styles.heroPreview}
          role="img"
          aria-label="Nyabag product interface showing a visual bookmark library with screenshot cards, color palettes, and tags"
        >
          <div className={styles.previewBar}>
            <span className={`${styles.previewDot} ${styles.previewDotRed}`} aria-hidden="true" />
            <span className={`${styles.previewDot} ${styles.previewDotYellow}`} aria-hidden="true" />
            <span className={`${styles.previewDot} ${styles.previewDotGreen}`} aria-hidden="true" />
            <div className={styles.previewUrl} aria-hidden="true">nyabag.com / library</div>
          </div>

          <div className={styles.previewBody}>
            <aside className={styles.previewSidebar} aria-label="Sidebar navigation" aria-hidden="true">
              <div className={styles.sidebarLabel}>Library</div>
              {["All saves", "UI References", "Typography", "Color Inspo"].map((item, i) => (
                <div key={item} className={`${styles.sidebarItem} ${i === 0 ? styles.sidebarItemActive : ""}`}>
                  <div className={styles.sidebarIcon} />
                  {item}
                </div>
              ))}
              <div className={styles.sidebarLabel}>Canvas</div>
              {["Moodboard 01", "Project Ref"].map((item) => (
                <div key={item} className={styles.sidebarItem}>
                  <div className={styles.sidebarIcon} />
                  {item}
                </div>
              ))}
            </aside>

            <main className={styles.cardGrid} aria-label="Saved bookmark cards">
              <BookmarkCard
                thumbBg="linear-gradient(160deg,#1a1a1a,#222)"
                title="Linear — Where ideas become software"
                url="linear.app"
                tags={["product", "saas", "dark"]}
                palette={["#1a1a2e", "#16213e", "#5865f2", "#e2e8f0", "#0f3460"]}
                thumbContent={
                  <div style={{ width: "100%", padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ height: 24, background: "rgba(255,255,255,0.04)", borderRadius: 3, marginBottom: 6 }} />
                    <SimLine w="80%" />
                    <SimLine w="60%" />
                    <SimLine w="80%" mt={4} />
                    <SimLine w="40%" />
                  </div>
                }
              />
              <BookmarkCard
                thumbBg="linear-gradient(160deg,#111,#1c1c1c)"
                title="Rauno Fischbacher — Design Engineer"
                url="rauno.me"
                tags={["portfolio", "minimal"]}
                palette={["#0d0d0d", "#1f1f1f", "#f5f5f5", "#888", "#333"]}
                thumbContent={
                  <div style={{ width: "100%", padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ height: 24, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 6 }} />
                    <div style={{ height: 10, width: "50%", background: "rgba(255,255,255,0.07)", borderRadius: 3 }} />
                    <div style={{ height: 8, width: "60%", background: "rgba(255,255,255,0.05)", borderRadius: 3, marginTop: 6 }} />
                    <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                      <div style={{ width: 36, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.1)" }} />
                      <div style={{ width: 36, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  </div>
                }
              />
              <BookmarkCard
                thumbBg="linear-gradient(160deg,#0f1117,#1a1d27)"
                title="Vercel Dashboard — Deploy and ship faster"
                url="vercel.com/dashboard"
                tags={["dashboard", "ui", "nav"]}
                palette={["#0f1117", "#1c1f26", "#5865f2", "#ededed", "#444"]}
                thumbContent={
                  <div style={{ width: "100%", padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ height: 24, background: "rgba(255,255,255,0.03)", borderRadius: 3, marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ width: "50%", height: 16, borderRadius: 3, background: "rgba(88,101,242,0.3)" }} />
                      <div style={{ width: "30%", height: 16, borderRadius: 3, background: "rgba(255,255,255,0.05)" }} />
                    </div>
                    <SimLine w="70%" h={6} mt={8} />
                    <SimLine w="60%" mt={4} />
                  </div>
                }
              />
            </main>
          </div>
        </div>
      </header>

      {/* ── PAIN SECTION ── */}
      <section className={`${styles.section} ${styles.painSection}`} id="problem" aria-labelledby="pain-title">
        <div className={styles.container}>
          <p className={styles.sectionEyebrow}>The problem</p>
          <div className={styles.painGrid}>
            <div>
              <h2 id="pain-title" className={styles.sectionTitle}>
                Design inspiration is easy to save. Hard to find again.
              </h2>
              <p className={styles.sectionBody}>
                You spend years collecting references. And when you finally need them, they&apos;re buried somewhere impossible to search.
              </p>
              <div className={styles.painItems} style={{ marginTop: 48 }}>
                {[
                  { num: "01", content: <><strong>Screenshots pile up</strong> in folders with no context, no source link, no reason they were saved.</> },
                  { num: "02", content: <><strong>Links get sent to yourself</strong> on WhatsApp, Telegram, and Notes — where they quietly disappear.</> },
                  { num: "03", content: <><strong>Browser bookmarks</strong> become unsorted graveyards with no visual preview or searchable metadata.</> },
                  { num: "04", content: <><strong>Context is lost immediately.</strong> You save a reference but not why it mattered, what caught your eye.</> },
                  { num: "05", content: <><strong>Rediscovery is painful.</strong> You know it exists. You just can&apos;t find it when you need direction.</> },
                ].map(({ num, content }) => (
                  <div key={num} className={styles.painItem}>
                    <span className={styles.painNum}>{num}</span>
                    <p className={styles.painText}>{content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.painVisual} aria-hidden="true">
              <div className={styles.painPile}>
                <div className={styles.pileTitle}>Screenshots folder</div>
                {["Screen Shot 2024-09-12...", "Screen Shot 2024-10-01...", "IMG_4829.PNG", "Screen Shot 2024-11-22...", "Screen Shot 2025-01-05..."].map((f) => (
                  <div key={f} className={styles.pileItem}>🖼 {f}</div>
                ))}
              </div>
              <div className={styles.painPile}>
                <div className={styles.pileTitle}>Browser bookmarks</div>
                {["Design stuff", "inspo (untitled)", "Read later", "Folder 1", "Untitled"].map((f) => (
                  <div key={f} className={styles.pileItem}>🔖 {f}</div>
                ))}
              </div>
              <div className={styles.painPile} style={{ gridColumn: "1/-1" }}>
                <div className={styles.pileTitle}>WhatsApp — Saved messages</div>
                {[
                  "https://dribbble.com/shots/22849...",
                  "https://www.figma.com/community/fi...",
                  "check this out later",
                  "https://ui.aceternity.com/componen...",
                ].map((f) => (
                  <div key={f} className={styles.pileItem}>💬 {f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE SECTION ── */}
      <section className={`${styles.section} ${styles.featureSection}`} id="features" aria-labelledby="features-title">
        <div className={styles.container}>
          <div className={styles.featureIntro}>
            <p className={styles.sectionEyebrow}>What Nyabag does</p>
            <h2 id="features-title" className={styles.sectionTitle}>
              Everything a designer&apos;s memory should be.
            </h2>
            <p className={styles.sectionBody}>
              Not just a place to store links — a workspace that holds context, visuals, and structure around every piece of inspiration you find.
            </p>
          </div>

          <div className={styles.featureGrid} role="list">
            <FeatureCard
              icon={<IconGrid />}
              name="Visual Bookmark Moodboard"
              desc="Turn saved links into a visual library of references — screenshots, tags, palettes, and notes, all at a glance."
            />
            <FeatureCard
              icon={<IconUser />}
              name="Design-Aware Metadata"
              desc="Nyabag extracts titles, summaries, palettes, font hints, and tags — so every save carries context without extra effort."
            />
            <FeatureCard
              icon={<IconPlus />}
              name="Infinite Notes Canvas"
              desc="Think beyond folders. Arrange notes, links, images, videos, and social embeds on a freeform canvas."
            />
            <FeatureCard
              icon={<IconPhone />}
              name="Mobile Capture"
              desc="Found something on your phone? Save the URL quickly and organize it later on desktop, when you have focus."
            />
            <FeatureCard
              icon={<IconSearch />}
              name="Search That Feels Natural"
              desc="Find inspiration by title, URL, tags, notes, summaries, or the design context attached to each save."
            />
            <FeatureCard
              icon={<IconShield />}
              name="Built for Designers"
              desc="Nyabag is shaped around how designers actually collect, forget, compare, and reuse inspiration — not how PMs organize tasks."
            />
          </div>
        </div>
      </section>

      {/* ── WORKFLOW SECTION ── */}
      <section className={`${styles.section} ${styles.workflowSection}`} id="workflow" aria-labelledby="workflow-title">
        <div className={styles.container}>
          <p className={styles.sectionEyebrow}>The loop</p>
          <h2 id="workflow-title" className={styles.sectionTitle}>
            Save once. Rediscover when it counts.
          </h2>

          <div className={styles.stepsRow} role="list">
            {/* Step 1 */}
            <div className={styles.step} role="listitem">
              <div className={styles.stepNum} aria-hidden="true">01</div>
              <div className={styles.stepTitle}>Save a reference</div>
              <p className={styles.stepDesc}>
                Paste a URL, share from mobile, or drop a link from anywhere. Nyabag handles the rest.
              </p>
              <div className={styles.stepVisual} aria-hidden="true">
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--lp-bg-3)", borderRadius: 6, fontSize: 12, color: "var(--lp-text-dim)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#555", flexShrink: 0 }} />
                  https://mobbin.com/patterns/nav
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--lp-text-dim)", textAlign: "center" }}>
                  Saving · Processing metadata…
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.step} role="listitem">
              <div className={styles.stepNum} aria-hidden="true">02</div>
              <div className={styles.stepTitle}>A visual memory is created</div>
              <p className={styles.stepDesc}>
                Nyabag screenshots the page, extracts color palettes, detects font hints, and infers tags automatically.
              </p>
              <div className={styles.stepVisual} aria-hidden="true">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--lp-text-dim)", marginBottom: 4 }}>Screenshot</div>
                    <div style={{ height: 48, background: "var(--lp-bg-3)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: "70%", height: 6, background: "var(--lp-bg-4)", borderRadius: 3 }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--lp-text-dim)", marginBottom: 4 }}>Palette</div>
                    <div style={{ display: "flex", gap: 3, height: 48, alignItems: "center" }}>
                      {["#1a1a2e", "#5865f2", "#e2e8f0", "#888"].map((c) => (
                        <div key={c} style={{ flex: 1, height: 28, borderRadius: 4, background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["navigation", "mobile", "dark ui"].map((t) => (
                    <span key={t} style={{ background: "var(--lp-bg-4)", borderRadius: 4, padding: "2px 7px", fontSize: 10, color: "var(--lp-text-dim)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={styles.step} role="listitem">
              <div className={styles.stepNum} aria-hidden="true">03</div>
              <div className={styles.stepTitle}>Rediscover it later</div>
              <p className={styles.stepDesc}>
                Search by tag, color, concept, or keyword. The context is already there — you just need to ask.
              </p>
              <div className={styles.stepVisual} aria-hidden="true">
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--lp-bg-3)", borderRadius: 6, fontSize: 12, color: "var(--lp-text-dim)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="5" cy="5" r="3.5" stroke="#555" strokeWidth="1.2" />
                    <path d="M8 8l2 2" stroke="#555" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  dark navigation with tab bar…
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--lp-text-dim)" }}>
                  3 results found · navigation · dark ui
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CANVAS SECTION ── */}
      <section className={`${styles.section} ${styles.canvasSection}`} id="canvas" aria-labelledby="canvas-title">
        <div className={styles.container}>
          <div className={styles.canvasInner}>
            <div>
              <p className={styles.sectionEyebrow}>Infinite canvas</p>
              <h2 id="canvas-title" className={styles.sectionTitle}>
                From saved references to structured ideas.
              </h2>
              <p className={styles.sectionBody}>
                Use the canvas to group references, collect notes, compare directions, and shape messy inspiration into something usable. Think of it as your design thinking layer.
              </p>

              <div className={styles.canvasCapabilities}>
                <CapabilityRow
                  icon={
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="0.6" y="0.6" width="10.8" height="10.8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M3 4h6M3 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  }
                  label="Text notes, link notes, image notes, video notes"
                />
                <CapabilityRow
                  icon={
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 3h10M1 6h7M1 9h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  }
                  label="Grouped sections to cluster related ideas"
                />
                <CapabilityRow
                  icon={
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 10L10 2M6 2h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  label="Drag, resize, and arrange with FigJam-style freedom"
                />
                <CapabilityRow
                  icon={
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M6 4v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  }
                  label="Social embeds — Twitter, YouTube, Loom, and more"
                />
              </div>
            </div>

            {/* Canvas mockup */}
            <div
              className={styles.canvasMock}
              role="img"
              aria-label="Canvas interface showing notes, grouped sections, and color references"
            >
              <div className={styles.canvasBgDots} aria-hidden="true" />

              {/* Section group */}
              <div
                className={styles.canvasSectionBlock}
                style={{ left: 20, top: 20, width: 260, height: 175 }}
                aria-hidden="true"
              >
                <div style={{ fontSize: 10, color: "var(--lp-text-dim)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>
                  Nav Patterns
                </div>
                {["linear.app — Tab navigation", "vercel.com — Sidebar layout", "notion.so — Nested nav"].map((item) => (
                  <div key={item} className={styles.canvasMiniCard}>{item}</div>
                ))}
              </div>

              {/* Text note */}
              <div className={styles.canvasNote} style={{ right: 20, top: 30, width: 190 }} aria-hidden="true">
                <div className={styles.canvasNoteLabel}>Note</div>
                <div className={styles.canvasNoteContent}>
                  All dark nav patterns use iconography — reconsider label-only approach for v2
                </div>
              </div>

              {/* Link note */}
              <div className={styles.canvasNote} style={{ left: 40, bottom: 30, width: 200 }} aria-hidden="true">
                <div className={styles.canvasNoteLabel}>Link</div>
                <div style={{ color: "#4a9eff", fontSize: 11 }}>https://mobbin.com/patterns/...</div>
                <div style={{ fontSize: 11, color: "var(--lp-text-dim)", marginTop: 4 }}>
                  Mobile navigation patterns · Mobbin
                </div>
              </div>

              {/* Color note */}
              <div className={styles.canvasNote} style={{ right: 24, bottom: 60, width: 170 }} aria-hidden="true">
                <div className={styles.canvasNoteLabel}>Color reference</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {[
                    { bg: "#0a0a0a", border: "1px solid #333" },
                    { bg: "#5865f2" },
                    { bg: "#ededed" },
                    { bg: "#888" },
                  ].map(({ bg, border }, i) => (
                    <div key={i} style={{ flex: 1, height: 20, borderRadius: 4, background: bg, border: border || "none" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATION SECTION ── */}
      <section className={`${styles.section} ${styles.diffSection}`} id="compare" aria-labelledby="diff-title">
        <div className={styles.container}>
          <div className={styles.diffTitleArea}>
            <p className={styles.sectionEyebrow}>The difference</p>
            <h2 id="diff-title" className={styles.sectionTitle}>
              Not another bookmark graveyard.
            </h2>
            <p className={styles.sectionBody}>
              Every tool has a graveyard — bookmarks you never open, screenshots you never find, tabs you never close. Nyabag is structured to prevent that.
            </p>
          </div>

          <div className={styles.diffGrid} role="list">
            {[
              {
                vs: "Bookmarks store links.",
                old: "A URL with a favicon and a forgotten folder",
                next: "Nyabag stores context.",
              },
              {
                vs: "Folders hide inspiration.",
                old: "Nested directories with no visual memory",
                next: "Nyabag keeps it visual.",
              },
              {
                vs: "Screenshots lose source links.",
                old: "A flat image file, orphaned from its origin",
                next: "Nyabag connects visuals to their source.",
              },
              {
                vs: "Notes alone are flat.",
                old: "Fragmented ideas in a linear notebook",
                next: "Nyabag gives you a workspace.",
              },
            ].map(({ vs, old, next }) => (
              <div key={vs} className={styles.diffItem} role="listitem">
                <p className={styles.diffVs}>{vs}</p>
                <p className={styles.diffOld}>{old}</p>
                <p className={styles.diffNew}>{next}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className={styles.blogTeaserSection} aria-labelledby="blog-teaser-title">
        <div className={styles.container}>
          <div className={styles.blogTeaser}>
            <div>
              <p className={styles.sectionEyebrow}>From the blog</p>
              <h2 id="blog-teaser-title">Top design inspiration apps for designers in 2026</h2>
              <p>
                A practical guide to Nyabag, Mobbin, Dribbble, Behance, and Awwwards,
                and how designers can build a stronger visual memory.
              </p>
            </div>
            <Link href="/blog/best-design-inspiration-apps" className={styles.blogTeaserLink}>
              Read the guide
            </Link>
          </div>
        </div>
      </section>

      <section className={`${styles.ctaSection}`} id="start" aria-labelledby="cta-title">
        <div className={styles.ctaGlow} aria-hidden="true" />
        <div className={styles.container} style={{ position: "relative" }}>
          <p className={styles.sectionEyebrow} style={{ textAlign: "center" }}>Start now</p>
          <h2 id="cta-title" className={styles.sectionTitle}>
            Build your design memory<br />before you need it.
          </h2>
          <p className={styles.sectionBody}>
            Nyabag is being built for designers who collect references obsessively and lose them constantly. Start saving your best inspiration in one place.
          </p>
          <div className={styles.ctaActions}>
            <EarlyAccessForm compact />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer} role="contentinfo">
        <div>
          <div className={styles.footerLogo}>nyabag</div>
          <div className={styles.footerTagline}>Your second memory for design.</div>
        </div>
        <nav className={styles.footerLinks} aria-label="Footer navigation">
          {[
            { href: "/", label: "Product" },
            { href: "/blog", label: "Blog" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "mailto:hello@nyabag.com", label: "Contact" },
          ].map(({ href, label }) => (
            <Link key={label} href={href} className={styles.footerLink}>
              {label}
            </Link>
          ))}
        </nav>
        <p className={styles.footerCredit}>
          Built with ❤️ by{" "}
          <Link href="https://www.linkedin.com/in/jayanzth" target="_blank" rel="noopener noreferrer">
            Jayanth
          </Link>
        </p>
      </footer>
    </div>
  );
}
