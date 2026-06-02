"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { earlyAccessInitialState, submitEarlyAccessSignupForm } from "@/lib/early-access-actions";

/* ─────────────────────────────────────────
   JSON-LD Schema for SEO (SoftwareApplication)
───────────────────────────────────────── */
const SchemaOrg = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Nyabag",
        url: "https://nyabag.com",
        description:
          "Nyabag is an early access visual memory system for designers to save, organize, and rediscover design inspiration. Capture websites, screenshots, UI references, color palettes, and fonts in one searchable visual workspace.",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web, iOS, Android",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/PreOrder",
          url: "https://www.nyabag.com/#early-access",
        },
        featureList: [
          "Visual bookmark moodboard",
          "Automatic website screenshots via Microlink",
          "Color palette extraction",
          "Font detection",
          "Metadata scraping",
          "Infinite canvas",
          "Draggable and resizable notes",
          "Mobile URL capture",
          "Full-text search",
          "Social embeds",
        ],
        creator: {
          "@type": "Person",
          name: "Jayanth Kumar",
        },
      }),
    }}
  />
);

/* ─────────────────────────────────────────
   useInView hook for scroll-triggered animations
───────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─────────────────────────────────────────
   Palette swatch colours for demo cards
───────────────────────────────────────── */
const palettes: Record<string, string[]> = {
  linear:   ["#1a1a2e","#16213e","#5865f2","#e2e8f0","#888"],
  rauno:    ["#0d0d0d","#f5f5f5","#888","#333","#ccc"],
  vercel:   ["#0f1117","#5865f2","#ededed","#444","#1c1f26"],
  stripe:   ["#0a2540","#635bff","#00d4ff","#f6f9fc","#425466"],
  figma:    ["#1e1e1e","#ff7262","#a259ff","#1abcfe","#0acf83"],
  mobbin:   ["#000","#fff","#aaa","#222","#555"],
};

/* ─────────────────────────────────────────
   BookmarkCard component
───────────────────────────────────────── */
function BookmarkCard({
  title, domain, tags, palette, delay = 0, thumb,
}: {
  title: string; domain: string; tags: string[];
  palette: string[]; delay?: number; thumb: string;
}) {
  return (
    <article
      className="lp-card"
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`Saved bookmark: ${title}`}
    >
      <div className="lp-card-thumb" aria-hidden="true">
        <div className="lp-card-thumb-inner" style={{ background: thumb }} />
        <div className="lp-card-thumb-overlay">
          <div className="lp-sim-nav" />
          <div className="lp-sim-line" style={{ width: "75%" }} />
          <div className="lp-sim-line" style={{ width: "55%" }} />
          <div className="lp-sim-line" style={{ width: "80%", marginTop: 6 }} />
          <div className="lp-sim-line" style={{ width: "40%" }} />
        </div>
      </div>
      <div className="lp-card-body">
        <div className="lp-card-title">{title}</div>
        <div className="lp-card-domain">{domain}</div>
        <div className="lp-tag-row">
          {tags.map((t) => <span key={t} className="lp-tag">{t}</span>)}
        </div>
        <div className="lp-palette" aria-label="Extracted color palette">
          {palette.map((c) => (
            <div key={c} className="lp-swatch" style={{ background: c }} />
          ))}
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────
   FeatureTab panel
───────────────────────────────────────── */
function FeatureTabs({
  tabs,
}: {
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(0);
  return (
    <div className="lp-ftabs">
      <div className="lp-ftab-list" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === active}
            className={`lp-ftab-btn${i === active ? " active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-ftab-panel" role="tabpanel">
        {tabs[active].content}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   AnimatedSearchBar
───────────────────────────────────────── */
const QUERIES = [
  '"dark SaaS hero section"',
  '"minimal onboarding flow"',
  '"tab bar navigation mobile"',
  '"pricing page with toggle"',
  '"bento grid layout"',
  '"settings page clean"',
];

function AnimatedSearch() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const target = QUERIES[idx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && text.length < target.length) {
      timeout = setTimeout(() => setText(target.slice(0, text.length + 1)), 55);
    } else if (!deleting && text.length === target.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(text.slice(0, -1)), 28);
    } else {
      timeout = setTimeout(() => {
        setDeleting(false);
        setIdx((i) => (i + 1) % QUERIES.length);
      }, 28);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, idx]);

  return (
    <div className="lp-search-bar" aria-label="Search demonstration">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" stroke="#666" strokeWidth="1.3" />
        <path d="M9.5 9.5L12 12" stroke="#666" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="lp-search-text">
        {text}<span className="lp-cursor" aria-hidden="true">|</span>
      </span>
      <span className="lp-search-kbd">⌘K</span>
    </div>
  );
}

const dashboardFolders = [
  { name: "UI References", children: ["Navigation", "Bento Grids"] },
  { name: "Landing Pages", children: ["SaaS", "Pricing"] },
  { name: "Portfolio Sites", children: [] },
  { name: "Typography", children: [] },
  { name: "Color Systems", children: [] },
  { name: "Mobile Patterns", children: ["Onboarding"] },
];

const skeletonBookmarks = [
  { name: "SaaS Landing", variant: "saas" },
  { name: "Portfolio Grid", variant: "portfolio" },
  { name: "Mobile App", variant: "mobile" },
];

function SkeletonBookmark({ variant, name }: { variant: string; name: string }) {
  return (
    <div className={`lp-skeleton-card lp-skeleton-${variant}`} aria-label={name}>
      <div className="lp-sk-browser">
        <span />
        <span />
        <span />
      </div>
      <div className="lp-sk-nav">
        <i />
        <div>
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="lp-sk-hero">
        <b />
        <b />
        <p />
        <p />
      </div>
      <div className="lp-sk-layout">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div
      className="lp-dashboard-mockup"
      aria-label="Nyabag dashboard preview with bookmark actions, reference cards, and search"
      role="img"
    >
      <aside className="lp-dash-sidebar" aria-hidden="true">
        <div className="lp-dash-sidebar-top">
          <div className="lp-dash-logo-row">
            <Image
              src="/assets/Nyabag-Dark-Logo.svg"
              alt=""
              width={200}
              height={100}
              className="lp-dash-logo"
            />
          </div>
          <div className="lp-dash-nav">
            <div className="lp-dash-nav-item active">
              <span className="lp-dash-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"></path></svg></span>
              <span>Bookmarks</span>
            </div>
            <div className="lp-dash-nav-item">
              <span className="lp-dash-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256"><path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z"></path></svg></span>
              <span>Canvas</span>
            </div>
          </div>
          <div className="lp-dash-folder-list">
            <div className="lp-dash-folder-label">Design folders</div>
            {dashboardFolders.map((folder) => (
              <div key={folder.name} className="lp-dash-folder-group">
                <div className="lp-dash-folder">
                  <span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#dcdcdc" viewBox="0 0 256 256"><path d="M245,110.64A16,16,0,0,0,232,104H216V88a16,16,0,0,0-16-16H130.67L102.94,51.2a16.14,16.14,0,0,0-9.6-3.2H40A16,16,0,0,0,24,64V208h0a8,8,0,0,0,8,8H211.1a8,8,0,0,0,7.59-5.47l28.49-85.47A16.05,16.05,0,0,0,245,110.64ZM93.34,64,123.2,86.4A8,8,0,0,0,128,88h72v16H69.77a16,16,0,0,0-15.18,10.94L40,158.7V64Zm112,136H43.1l26.67-80H232Z"></path></svg></span>
                  <span>{folder.name}</span>
                </div>
                {folder.children.length > 0 ? (
                  <div className="lp-dash-subfolders">
                    {folder.children.map((child) => (
                      <div key={child} className="lp-dash-subfolder">
                        {child}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="lp-dash-profile">
          <div className="lp-dash-avatar">J</div>
          <div>
            <div className="lp-dash-name">Jayanth Kumar</div>
            <div className="lp-dash-email">j4ynth@gmail.com</div>
          </div>
          <span className="lp-dash-gear">⚙</span>
        </div>
      </aside>

      <div className="lp-dash-surface">
        <div className="lp-dash-topbar" aria-hidden="true">
          <div className="lp-dash-switcher">
            <div className="lp-dash-switch active">
              <span className="lp-dash-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"></path></svg></span>
              Bookmarks
            </div>
            <div className="lp-dash-switch">
              <span className="lp-dash-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256"><path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z"></path></svg></span>
              Canvas
            </div>
          </div>
        </div>

        <div className="lp-dash-main">
          <h2 className="lp-dash-title">Designmaxxing today, Jayanth?</h2>

          <div className="lp-dash-actions" aria-hidden="true">
            <div className="lp-rainbow-button">
              <span className="lp-action-plus">+</span>
              New bookmark
            </div>
            <div className="lp-import-button">
              <span className="lp-import-icon">⇧</span>
              Import references
            </div>
          </div>

          <div className="lp-bookmark-shelf" aria-hidden="true">
            <div className="lp-skeleton-row">
              {skeletonBookmarks.map((bookmark) => (
                <SkeletonBookmark key={bookmark.name} {...bookmark} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Canvas mock with hover interaction
───────────────────────────────────────── */
function CanvasMock() {
  const [hovered, setHovered] = useState<number | null>(null);
  const notes = [
    { x: 32, y: 28, w: 210, label: "Note", content: "Dark nav patterns all use icons — reconsider label-only approach in v2 refresh.", color: "#1a1a1a" },
    { x: 264, y: 20, w: 190, label: "Link", content: "mobbin.com/patterns/navigation — iOS tab bars", color: "#111827", isLink: true },
    { x: 32, y: 170, w: 260, label: "Section — Nav References", content: null, isSection: true, color: "transparent" },
    { x: 300, y: 140, w: 160, label: "Color", content: null, isPalette: true, color: "#111" },
  ];
  return (
    <div
      className="lp-canvas-mock"
      role="img"
      aria-label="Infinite canvas showing design notes, links, and grouped references"
    >
      <div className="lp-canvas-dots" aria-hidden="true" />
      {notes.map((n, i) => (
        <div
          key={i}
          className={`lp-cnote${n.isSection ? " lp-csection" : ""}${hovered === i ? " lp-cnote-hover" : ""}`}
          style={{ left: n.x, top: n.y, width: n.w, background: n.isSection ? "transparent" : n.color }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          aria-hidden="true"
        >
          <div className="lp-cnote-label">{n.label}</div>
          {n.content && (
            <div className={`lp-cnote-content${n.isLink ? " lp-cnote-link" : ""}`}>
              {n.content}
            </div>
          )}
          {n.isSection && (
            <div className="lp-csection-cards">
              {["linear.app — Sidebar", "vercel.com — Top nav", "notion.so — Nested"].map((s) => (
                <div key={s} className="lp-csection-card">{s}</div>
              ))}
            </div>
          )}
          {n.isPalette && (
            <div className="lp-cpalette-row">
              {["#0a0a0a","#5865f2","#ededed","#888","#16213e"].map((c) => (
                <div key={c} className="lp-cpalette-chip" style={{ background: c }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   SECTION WRAPPER with scroll fade
───────────────────────────────────────── */
function FadeSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} className={`lp-fade${inView ? " lp-fade-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
function EarlyAccessForm({
  source,
  variant = "hero",
}: {
  source: "landing-hero" | "landing-cta";
  variant?: "hero" | "cta";
}) {
  const inputId = useId();
  const [state, formAction, pending] = useActionState(
    submitEarlyAccessSignupForm,
    earlyAccessInitialState
  );
  const success = state.status === "success";
  const error = state.status === "error";

  return (
    <form className={`lp-ea-form lp-ea-form-${variant}`} action={formAction}>
      <input type="hidden" name="source" value={source} />
      <label className="lp-sr-only" htmlFor={inputId}>
        Email address
      </label>
      <div className="lp-ea-row">
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={255}
          placeholder="you@example.com"
          className="lp-ea-input"
          aria-describedby={state.message ? `${inputId}-status` : undefined}
          disabled={pending || success}
        />
        <button className="lp-ea-submit" type="submit" disabled={pending || success}>
          {pending ? "Joining..." : success ? "Joined" : "Join early access"}
        </button>
      </div>
      <div className="lp-ea-status-wrap" aria-live="polite">
        {state.message ? (
          <p
            id={`${inputId}-status`}
            className={`lp-ea-status${success ? " success" : ""}${error ? " error" : ""}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function LandingPage() {
  /* Active section tracking for nav dot */
  const [activeSection, setActiveSection] = useState(0);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const progressSections = [
    { href: "#main-content", label: "Hero" },
    { href: "#save", label: "Save" },
    { href: "#enrich", label: "Enrich" },
    { href: "#organize", label: "Organize" },
    { href: "#think", label: "Canvas" },
  ];

  const registerSection = useCallback((el: HTMLElement | null, i: number) => {
    if (el) sectionsRef.current[i] = el;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + window.innerHeight / 3;
      let current = 0;
      sectionsRef.current.forEach((s, i) => {
        if (s && s.offsetTop <= scrollY) current = i;
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <SchemaOrg />
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <SiteHeader />

      {/* ── SECTION PROGRESS DOTS ── */}
      <nav className="lp-progress-dots" aria-label="Section navigation">
        {progressSections.map((section, i) => (
          <a
            key={section.href}
            href={section.href}
            className={`lp-progress-link${activeSection === i ? " active" : ""}`}
            aria-current={activeSection === i ? "true" : undefined}
          >
            <span className="lp-pdot" aria-hidden="true" />
            <span className="lp-pdot-label">{section.label}</span>
          </a>
        ))}
      </nav>

      <main id="main-content">

        {/* ════════════════════════════════════
            HERO
        ════════════════════════════════════ */}
        <header
          className="lp-hero"
          ref={(el) => registerSection(el as HTMLElement, 0)}
          aria-labelledby="hero-headline"
        >
          <div className="lp-hero-bg" aria-hidden="true">
            <div className="lp-hero-grid" />
            <div className="lp-hero-radial" />
          </div>

          <div className="lp-hero-content">
            <div className="lp-badge" aria-label="Status">
              <span className="lp-badge-dot" aria-hidden="true" />
              Early access for designers
            </div>

            <h1 id="hero-headline" className="lp-hero-h1">
              Your second memory<br />
              <em>for design.</em>
            </h1>

            <p className="lp-hero-sub">
              Stop losing references across screenshots, WhatsApp, and forgotten tabs.
              Join early access to build a searchable design memory before your next project needs it.
            </p>

            <EarlyAccessForm source="landing-hero" />
          </div>

          <DashboardMockup />
        </header>

        {/* ════════════════════════════════════
            1.0 SAVE
        ════════════════════════════════════ */}
        <section
          id="save"
          className="lp-section"
          ref={(el) => registerSection(el as HTMLElement, 1)}
          aria-labelledby="save-title"
        >
          <FadeSection>
            <div className="lp-section-label">
              <span className="lp-section-num">1.0</span>
              <span className="lp-section-slug">Save</span>
            </div>

            <div className="lp-section-intro">
              <h2 id="save-title" className="lp-section-h2">
                Capture design inspiration<br />the moment you see it.
              </h2>
              <p className="lp-section-body">
                Paste a URL from anywhere — desktop or mobile.
                Nyabag does the rest in seconds.
              </p>
              <a href="#early-access" className="lp-section-link">
                Join early access
              </a>
              <span> →</span>
            </div>

            <FeatureTabs tabs={[
              {
                label: "Website capture",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Paste a URL. Done.</h3>
                      <p className="lp-tab-p">
                        Add any website to your library in one step. Nyabag automatically captures a full screenshot, extracts the page title, and builds a searchable memory card — no manual tagging needed to get started.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-url-input-demo">
                        <div className="lp-uid-label">New bookmark</div>
                        <div className="lp-uid-field">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M6 1l5 5-5 5" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span style={{ color: "#888", fontSize: 12 }}>https://</span>
                          <span style={{ color: "#e0e0e0", fontSize: 12, marginLeft: 2 }}>dribbble.com/shots/2284910</span>
                          <span className="lp-cursor" style={{ marginLeft: 1 }}>|</span>
                        </div>
                        <div className="lp-uid-status">
                          <div className="lp-uid-dot" />
                          Fetching screenshot &amp; metadata…
                        </div>
                        <div className="lp-uid-preview">
                          <div className="lp-uid-thumb" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }} />
                          <div className="lp-uid-meta">
                            <div className="lp-uid-metatitle">Navigation Patterns — Dribbble</div>
                            <div className="lp-uid-metaurl">dribbble.com</div>
                            <div className="lp-tag-row" style={{ marginTop: 6 }}>
                              <span className="lp-tag">navigation</span>
                              <span className="lp-tag">mobile</span>
                              <span className="lp-tag">dark</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Mobile share",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Save from your phone instantly.</h3>
                      <p className="lp-tab-p">
                        Found something while scrolling? Share the URL directly to Nyabag from Safari, Chrome, or any app. It lands in your library. Organize it later on desktop when you have focus.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-mobile-share">
                        <div className="lp-share-sheet">
                          <div className="lp-share-handle" />
                          <div className="lp-share-title">Share to…</div>
                          <div className="lp-share-row">
                            <div className="lp-share-app lp-share-nyabag">
                              <div className="lp-share-app-icon">
                                <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="1.5" fill="#fff"/><rect x="10" y="1" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".5"/><rect x="1" y="10" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".5"/><rect x="10" y="10" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".2"/></svg>
                              </div>
                              <div className="lp-share-app-label">Nyabag</div>
                            </div>
                            {["Notes","Safari","Messages"].map((a) => (
                              <div key={a} className="lp-share-app">
                                <div className="lp-share-app-icon lp-share-app-icon-dim" />
                                <div className="lp-share-app-label">{a}</div>
                              </div>
                            ))}
                          </div>
                          <div className="lp-share-confirm">Saved to Nyabag</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Import references",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Bring your existing collection.</h3>
                      <p className="lp-tab-p">
                        Already have bookmarks scattered across browsers or other tools? Import them in bulk. Nyabag processes each URL and builds a visual card for every reference you have already collected.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-import-demo">
                        <div className="lp-import-header">Import references</div>
                        <div className="lp-import-drop">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4" stroke="#555" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="14" width="16" height="4" rx="1.5" stroke="#555" strokeWidth="1.3"/></svg>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>Drop bookmarks.html or paste URLs</div>
                        </div>
                        <div className="lp-import-progress">
                          <div className="lp-import-prog-label">Processing 24 URLs…</div>
                          <div className="lp-import-bar"><div className="lp-import-fill" /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]} />
          </FadeSection>
        </section>

        {/* ════════════════════════════════════
            2.0 ENRICH
        ════════════════════════════════════ */}
        <section
          id="enrich"
          className="lp-section lp-section-alt"
          ref={(el) => registerSection(el as HTMLElement, 2)}
          aria-labelledby="enrich-title"
        >
          <FadeSection>
            <div className="lp-section-label">
              <span className="lp-section-num">2.0</span>
              <span className="lp-section-slug">Enrich</span>
            </div>

            <div className="lp-section-intro">
              <h2 id="enrich-title" className="lp-section-h2">
                Every save becomes a<br />rich design memory.
              </h2>
              <p className="lp-section-body">
                Nyabag automatically enriches each bookmark with the visual and design context you would otherwise lose.
              </p>
            </div>

            <FeatureTabs tabs={[
              {
                label: "Screenshots",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">See it, not just the URL.</h3>
                      <p className="lp-tab-p">
                        Nyabag uses Microlink to capture a full-page screenshot of every saved website. So instead of a dead link or a forgotten domain, you see exactly what you saved — even if the site changes later.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-screenshot-demo">
                        <div className="lp-sd-before">
                          <div className="lp-sd-label">Without Nyabag</div>
                          <div className="lp-sd-bookmark-row">
                            {["dribbble.com/shots/22...", "mobbin.com/screens/...", "ui8.net/products/..."].map((u) => (
                              <div key={u} className="lp-sd-plain-bookmark">
                                <div className="lp-sd-favicon" />
                                <span>{u}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="lp-sd-arrow">→</div>
                        <div className="lp-sd-after">
                          <div className="lp-sd-label">With Nyabag</div>
                          <div className="lp-mockup-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[
                              { t: "Shot — Dribbble", d: "dribbble.com", bg: "linear-gradient(135deg,#1a1a2e,#2a1a3a)", p: palettes.linear },
                              { t: "Screen — Mobbin", d: "mobbin.com", bg: "linear-gradient(135deg,#000,#111)", p: palettes.mobbin },
                            ].map(({ t, d, bg, p }) => (
                              <BookmarkCard key={d} title={t} domain={d} tags={[]} palette={p} thumb={bg} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Color palettes",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Extract colors automatically.</h3>
                      <p className="lp-tab-p">
                        Nyabag analyses every screenshot and extracts the dominant color palette. So when you are looking for references with a specific visual feel — deep navy, warm neutrals, high contrast — you can see it at a glance without opening the link.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-palette-demo">
                        {[
                          { name: "Linear", p: palettes.linear },
                          { name: "Stripe", p: palettes.stripe },
                          { name: "Figma", p: palettes.figma },
                          { name: "Vercel", p: palettes.vercel },
                          { name: "Rauno", p: palettes.rauno },
                        ].map(({ name, p }) => (
                          <div key={name} className="lp-pd-row">
                            <div className="lp-pd-name">{name}</div>
                            <div className="lp-pd-swatches">
                              {p.map((c) => (
                                <div key={c} className="lp-pd-swatch" style={{ background: c }} title={c} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Metadata & tags",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Context without the manual work.</h3>
                      <p className="lp-tab-p">
                        Nyabag scrapes the page title, meta description, and Open Graph summary. It then infers relevant tags — dark mode, onboarding, pricing, or mobile — so your library is searchable from the moment you save.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-metadata-demo">
                        <div className="lp-meta-field">
                          <div className="lp-meta-label">Title</div>
                          <div className="lp-meta-value">Linear — The product development system</div>
                        </div>
                        <div className="lp-meta-field">
                          <div className="lp-meta-label">Summary</div>
                          <div className="lp-meta-value" style={{ fontSize: 11, lineHeight: 1.5 }}>Purpose-built for planning and building products. Designed for speed and focus.</div>
                        </div>
                        <div className="lp-meta-field">
                          <div className="lp-meta-label">Auto tags</div>
                          <div className="lp-tag-row">
                            {["saas","product","dark","dashboard","sidebar"].map((t) => (
                              <span key={t} className="lp-tag">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="lp-meta-field">
                          <div className="lp-meta-label">Font hints</div>
                          <div className="lp-meta-value">Inter Display — sans-serif system</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Font hints",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Know what fonts they use.</h3>
                      <p className="lp-tab-p">
                        Nyabag detects and surfaces font hints for every saved page. So when you are deep in a project and need to check what typeface that one site used — you do not need to open DevTools. It is already in your memory card.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-font-demo">
                        {[
                          { site: "linear.app", font: "Inter Display", cat: "Sans-serif" },
                          { site: "stripe.com", font: "Camphor", cat: "Sans-serif" },
                          { site: "rauno.me", font: "Geist Mono", cat: "Monospace" },
                          { site: "vercel.com", font: "Geist", cat: "Sans-serif" },
                        ].map(({ site, font, cat }) => (
                          <div key={site} className="lp-font-row">
                            <div className="lp-font-site">{site}</div>
                            <div className="lp-font-name">{font}</div>
                            <div className="lp-font-cat">{cat}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ),
              },
            ]} />
          </FadeSection>
        </section>

        {/* ════════════════════════════════════
            3.0 ORGANIZE
        ════════════════════════════════════ */}
        <section
          id="organize"
          className="lp-section"
          ref={(el) => registerSection(el as HTMLElement, 3)}
          aria-labelledby="organize-title"
        >
          <FadeSection>
            <div className="lp-section-label">
              <span className="lp-section-num">3.0</span>
              <span className="lp-section-slug">Organize</span>
            </div>

            <div className="lp-section-intro">
              <h2 id="organize-title" className="lp-section-h2">
                A visual library that stays<br />searchable forever.
              </h2>
              <p className="lp-section-body">
                Browse your inspiration visually. Search it precisely. Find what you need in seconds — not minutes.
              </p>
            </div>

            <FeatureTabs tabs={[
              {
                label: "Visual moodboard",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Your inspiration, beautifully surfaced.</h3>
                      <p className="lp-tab-p">
                        Nyabag renders every saved reference as a visual card — screenshot preview, color palette, tags, and source URL all in one place. Browse your entire library the way designers think: visually, not through text lists.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-mockup-grid lp-moodboard-grid">
                        {[
                          { t:"Linear", d:"linear.app", tags:["saas","dark"], bg:"linear-gradient(135deg,#0f1117,#1a1d27)", p:palettes.linear },
                          { t:"Stripe", d:"stripe.com", tags:["payments","clean"], bg:"linear-gradient(135deg,#0a2540,#0d3159)", p:palettes.stripe },
                          { t:"Figma", d:"figma.com", tags:["tool","colorful"], bg:"linear-gradient(135deg,#1e1e1e,#2d2d2d)", p:palettes.figma },
                          { t:"Vercel", d:"vercel.com", tags:["dashboard","ui"], bg:"linear-gradient(135deg,#0f1117,#16192a)", p:palettes.vercel },
                        ].map(({ t, d, tags, bg, p }, i) => (
                          <BookmarkCard key={d} title={t} domain={d} tags={tags} palette={p} delay={i * 60} thumb={bg} />
                        ))}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Smart search",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Search across everything.</h3>
                      <p className="lp-tab-p">
                        Search your entire library by title, URL, tags, your own notes, the auto-generated summary, or the design context attached to each save. Nyabag searches all of it at once. Type what you remember — Nyabag finds it.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-search-demo">
                        <AnimatedSearch />
                        <div className="lp-search-results">
                          <div className="lp-search-label">4 results for dark navigation</div>
                          {[
                            { t: "Linear — Sidebar nav", d: "linear.app", tags: ["dark","navigation","sidebar"] },
                            { t: "Vercel — Top nav pattern", d: "vercel.com", tags: ["dark","topnav"] },
                            { t: "Mobbin — Tab bar patterns", d: "mobbin.com", tags: ["mobile","dark","tabbar"] },
                            { t: "Raycast — Command menu", d: "raycast.com", tags: ["dark","command"] },
                          ].map(({ t, d, tags }) => (
                            <div key={d} className="lp-sr-item">
                              <div className="lp-sr-thumb" style={{ background: "linear-gradient(135deg,#1a1a2e,#222)" }} />
                              <div className="lp-sr-meta">
                                <div className="lp-sr-title">{t}</div>
                                <div className="lp-sr-domain">{d}</div>
                                <div className="lp-tag-row" style={{ marginTop: 4 }}>
                                  {tags.map((tg) => <span key={tg} className="lp-tag">{tg}</span>)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Bookmark detail",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Every save has depth.</h3>
                      <p className="lp-tab-p">
                        Open any bookmark to see its full detail page — the screenshot, all metadata, your personal note, extracted palette, font hints, and source link. Add notes at save time or later.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-detail-demo">
                        <div className="lp-detail-thumb" style={{ background: "linear-gradient(135deg,#0a2540,#0d3159)" }} />
                        <div className="lp-detail-body">
                          <div className="lp-detail-title">Stripe — The new standard in online payments</div>
                          <div className="lp-detail-domain">stripe.com · Saved 2 days ago</div>
                          <div className="lp-detail-section-label">Your note</div>
                          <div className="lp-detail-note">Love the subtle gradient on the pricing cards. Clean type hierarchy. Check the CTA button style.</div>
                          <div className="lp-detail-section-label">Palette</div>
                          <div className="lp-palette">
                            {palettes.stripe.map((c) => (
                              <div key={c} className="lp-swatch" style={{ background: c, height: 16, borderRadius: 3 }} />
                            ))}
                          </div>
                          <div className="lp-detail-section-label" style={{ marginTop: 10 }}>Tags</div>
                          <div className="lp-tag-row">
                            {["payments","landing","blue","clean","gradient"].map((t) => <span key={t} className="lp-tag">{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]} />
          </FadeSection>
        </section>

        {/* ════════════════════════════════════
            4.0 THINK / CANVAS
        ════════════════════════════════════ */}
        <section
          id="think"
          className="lp-section lp-section-alt"
          ref={(el) => registerSection(el as HTMLElement, 4)}
          aria-labelledby="canvas-title"
        >
          <FadeSection>
            <div className="lp-section-label">
              <span className="lp-section-num">4.0</span>
              <span className="lp-section-slug">Think</span>
            </div>

            <div className="lp-section-intro">
              <h2 id="canvas-title" className="lp-section-h2">
                From saved references to<br />structured ideas.
              </h2>
              <p className="lp-section-body">
                The canvas is your thinking layer. Group references, compare directions, and shape raw inspiration into something usable.
              </p>
            </div>

            <FeatureTabs tabs={[
              {
                label: "Infinite canvas",
                content: (
                  <div className="lp-tab-content lp-tab-content-canvas">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Think spatially.</h3>
                      <p className="lp-tab-p">
                        Nyabag canvas is a freeform workspace inspired by FigJam. Drag notes, links, images, and videos anywhere. Resize them. Group related references in sections. The canvas has no boundaries — just space to think.
                      </p>
                      <ul className="lp-feature-list">
                        <li>Text notes, link notes, image notes</li>
                        <li>Video notes and social embeds</li>
                        <li>Draggable and resizable blocks</li>
                        <li>Grouped sections for clustering ideas</li>
                      </ul>
                    </div>
                    <div className="lp-tab-visual">
                      <CanvasMock />
                    </div>
                  </div>
                ),
              },
              {
                label: "Note types",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Six types of canvas blocks.</h3>
                      <p className="lp-tab-p">
                        Every format a designer thinks in — text observations, reference links, inspiration images, video walkthroughs, social embeds, and section labels — has a native block type on the canvas.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-note-types">
                        {[
                          { label: "Text note", icon: "T", desc: "Observations, decisions, questions" },
                          { label: "Link note", icon: "↗", desc: "URLs with title preview" },
                          { label: "Image note", icon: "⬜", desc: "Drag in any image" },
                          { label: "Video note", icon: "▶", desc: "YouTube, Loom, Vimeo" },
                          { label: "Social embed", icon: "◇", desc: "Twitter, Figma, CodePen" },
                          { label: "Section group", icon: "⬡", desc: "Cluster related items" },
                        ].map(({ label, icon, desc }) => (
                          <div key={label} className="lp-note-type-card">
                            <div className="lp-nt-icon">{icon}</div>
                            <div>
                              <div className="lp-nt-label">{label}</div>
                              <div className="lp-nt-desc">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: "Grouped sections",
                content: (
                  <div className="lp-tab-content">
                    <div className="lp-tab-text">
                      <h3 className="lp-tab-h3">Group references by theme or direction.</h3>
                      <p className="lp-tab-p">
                        Draw a section around any cluster of notes. Label it by theme, audit, or product direction. Sections give structure to freeform thinking without forcing you into folders.
                      </p>
                    </div>
                    <div className="lp-tab-visual" aria-hidden="true">
                      <div className="lp-canvas-mock" style={{ height: 280 }}>
                        <div className="lp-canvas-dots" />
                        <div className="lp-csection" style={{ left: 20, top: 20, width: 260, bottom: 20 }}>
                          <div className="lp-cnote-label">Nav Patterns</div>
                          <div className="lp-csection-cards">
                            {["linear.app — Tab nav","vercel.com — Sidebar","notion.so — Nested","raycast.com — Command"].map((s) => (
                              <div key={s} className="lp-csection-card">{s}</div>
                            ))}
                          </div>
                        </div>
                        <div className="lp-cnote" style={{ right: 20, top: 20, width: 170 }}>
                          <div className="lp-cnote-label">Note</div>
                          <div className="lp-cnote-content">All use icons. Reconsider label-only approach.</div>
                        </div>
                        <div className="lp-cnote" style={{ right: 20, bottom: 20, width: 170 }}>
                          <div className="lp-cnote-label">Decision</div>
                          <div className="lp-cnote-content">Go with icon + label for primary tabs only.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]} />
          </FadeSection>
        </section>

        {/* ════════════════════════════════════
            DIFFERENTIATION
        ════════════════════════════════════ */}
        <section className="lp-diff-section" aria-labelledby="diff-title">
          <FadeSection>
            <div className="lp-container">
              <p className="lp-section-eyebrow">Why Nyabag</p>
              <h2 id="diff-title" className="lp-diff-h2">Not another bookmark graveyard.</h2>
              <p className="lp-diff-sub">
                Designers have tried bookmarks, screenshots, Notion, and WhatsApp. None of them were built for how design inspiration actually works.
              </p>

              <div className="lp-diff-grid" role="list">
                {[
                  { old: "Bookmarks store links.", next: "Nyabag stores context.", body: "A URL with a favicon tells you nothing. Nyabag gives you the screenshot, summary, palette, tags, and your own note — all in one card." },
                  { old: "Folders hide inspiration.", next: "Nyabag keeps it visual.", body: "Nested directories force you to remember where you put things. Nyabag surfaces everything visually so you browse instead of excavate." },
                  { old: "Screenshots lose their source.", next: "Nyabag connects both.", body: "An image file tells you nothing about where it came from. Every Nyabag card links back to the original URL — always." },
                  { old: "Notes alone are flat.", next: "Nyabag gives you a workspace.", body: "Text notes don't hold references. Nyabag's canvas lets you think spatially — combining notes, links, images, and saved cards in one place." },
                ].map(({ old, next, body }) => (
                  <div key={old} className="lp-diff-item" role="listitem">
                    <div className="lp-diff-old">{old}</div>
                    <div className="lp-diff-new">{next}</div>
                    <p className="lp-diff-body">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeSection>
        </section>

        {/* ════════════════════════════════════
            CTA
        ════════════════════════════════════ */}
        <section id="early-access" className="lp-cta-section" aria-labelledby="cta-title">
          <FadeSection>
            <div className="lp-container lp-cta-inner">
              <div className="lp-cta-glow" aria-hidden="true" />
              <p className="lp-section-eyebrow" style={{ textAlign: "center" }}>Early access</p>
              <h2 id="cta-title" className="lp-cta-h2">
                Build your design memory<br />before you need it.
              </h2>
              <p className="lp-cta-body">
                Nyabag is being built for designers who collect references obsessively and lose them constantly.
                Join the early access list and get an invite when spots open.
              </p>
              <EarlyAccessForm source="landing-cta" variant="cta" />
            </div>
          </FadeSection>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </>
  );
}

/* ─────────────────────────────────────────
   ALL CSS — inlined for portability
   (move to landing.module.css if preferred)
───────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Inter+Display:ital,wght@0,300;0,400;0,500;0,600;0,700;1,700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#08090a;
  --bg1:#0f1010;
  --bg2:#161717;
  --bg3:#1e1f1f;
  --bg4:#272828;
  --border:rgba(255,255,255,0.07);
  --border2:rgba(255,255,255,0.11);
  --text:#e8e8e8;
  --muted:#888;
  --dim:#4a4a4a;
  --white:#fff;
  --r4:4px;--r6:6px;--r8:8px;--r12:12px;--r16:16px;--r20:20px;
}

html{font-size:16px;scroll-behavior:smooth;background:var(--bg)}
body{background:var(--bg);color:var(--text);font-family:'Inter','Inter Display',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6;overflow-x:hidden}
.lp-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* SCROLL FADE */
.lp-fade{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}
.lp-fade-in{opacity:1;transform:none}

/* PROGRESS DOTS */
.lp-progress-dots{position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:100;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.lp-progress-link{position:relative;display:flex;align-items:center;justify-content:flex-end;gap:9px;min-width:74px;height:12px;text-decoration:none;outline:none}
.lp-pdot{width:5px;height:5px;border-radius:50%;background:var(--dim);transition:background .25s,transform .25s,box-shadow .25s;cursor:pointer;flex-shrink:0}
.lp-progress-link.active .lp-pdot{background:var(--white);transform:scale(1.4);box-shadow:0 0 8px rgba(255,255,255,.18)}
.lp-pdot-label{position:absolute;right:14px;color:var(--muted);font-size:11.5px;letter-spacing:.01em;white-space:nowrap;opacity:0;transform:translateX(6px);pointer-events:none;transition:opacity .2s ease,transform .2s ease,color .2s}
.lp-progress-link:hover .lp-pdot,.lp-progress-link:focus-visible .lp-pdot{background:var(--white);transform:scale(1.25)}
.lp-progress-link:hover .lp-pdot-label,.lp-progress-link:focus-visible .lp-pdot-label{opacity:1;transform:translateX(0);color:var(--text)}

/* BTNS */
.lp-btn-white{display:inline-flex;align-items:center;gap:8px;background:var(--white);color:#08090a;padding:11px 24px;border-radius:var(--r8);font-size:14.5px;font-weight:500;text-decoration:none;transition:opacity .2s,transform .2s}
.lp-btn-white:hover{opacity:.88;transform:translateY(-1px)}
.lp-btn-lg{padding:14px 32px;font-size:15px}
.lp-btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--muted);padding:11px 20px;border-radius:var(--r8);font-size:14.5px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);transition:color .2s,border-color .2s}
.lp-btn-ghost:hover{color:var(--text);border-color:rgba(255,255,255,0.18)}
.lp-section-link{font-size:14px;color:var(--text);text-decoration-line:underline;text-decoration-thickness:1px;text-decoration-color:rgba(74,158,255,.46);text-underline-offset:5px;display:inline-flex;align-items:center;gap:5px;transition:color .2s,text-decoration-color .2s;margin-top:20px}
.lp-section-link:hover{color:var(--text);text-decoration-color:#4a9eff}

/* HERO */
.lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:140px 40px 0;position:relative;overflow:hidden}
.lp-hero-bg{position:absolute;inset:0;pointer-events:none}
.lp-hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(ellipse 90% 60% at 50% 0%,black 30%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse 90% 60% at 50% 0%,black 30%,transparent 100%)}
.lp-hero-radial{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:800px;height:500px;background:radial-gradient(ellipse,rgba(255,255,255,0.04) 0%,transparent 65%)}
.lp-hero-content{position:relative;z-index:1;text-align:center;max-width:800px;margin:0 auto;animation:lp-fade-up .9s ease both}
.lp-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:100px;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:var(--muted);margin-bottom:36px;letter-spacing:.02em}
.lp-badge-dot{width:5px;height:5px;border-radius:50%;background:#4ade80;flex-shrink:0;box-shadow:0 0 6px #4ade80}
.lp-hero-h1{font-family:'Inter Display',sans-serif;font-size:clamp(44px,6.5vw,84px);font-weight:700;line-height:1.0;letter-spacing:-0.045em;color:var(--white);margin-bottom:24px}
.lp-hero-h1 em{font-style:italic;color:var(--muted)}
.lp-hero-sub{font-size:clamp(15px,1.4vw,18px);color:var(--muted);max-width:540px;margin:0 auto 30px;line-height:1.7}
.lp-hero-actions{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
/* EARLY ACCESS FORM */
.lp-ea-form{width:min(100%,560px);margin:0 auto 18px}
.lp-ea-form-cta{margin-bottom:0}
.lp-ea-row{display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);border-radius:var(--r12);box-shadow:0 18px 60px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.05)}
.lp-ea-input{min-width:0;flex:1;height:46px;background:transparent;border:0;outline:0;color:var(--white);font:inherit;font-size:14.5px;padding:0 14px}
.lp-ea-input::placeholder{color:#565656}
.lp-ea-input:disabled{opacity:.72}
.lp-ea-submit{height:46px;white-space:nowrap;border:0;border-radius:var(--r8);background:var(--white);color:#08090a;padding:0 18px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s,transform .2s}
.lp-ea-submit:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
.lp-ea-submit:disabled{cursor:default;opacity:.72}
.lp-ea-status-wrap{min-height:0;margin-top:9px}
.lp-ea-status{margin:0 2px;text-align:left;font-size:12.5px;color:var(--dim)}
.lp-ea-status.success{color:#7ddf9b}
.lp-ea-status.error{color:#ff8c8c}
.lp-ea-form-cta .lp-ea-status{text-align:center}

/* HERO MOCKUP */
.lp-dashboard-mockup{position:relative;z-index:1;width:min(1180px,100%);max-width:1180px;margin:64px auto 0;display:grid;grid-template-columns:184px 1fr;height:650px;border:1px solid rgba(255,255,255,.08);border-radius:10px 10px 0px 0px;overflow:hidden;background:#0b0c0e;box-shadow:0 42px 120px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.04);animation:lp-fade-up .9s .18s ease both}
.lp-dashboard-mockup::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 54% 20%,rgba(255,255,255,.05),transparent 30%),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px);background-size:auto,72px 60px,60px 60px;pointer-events:none}
.lp-dash-sidebar{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between;gap:28px;padding:20px 12px;background:linear-gradient(180deg,rgba(15,16,18,.98),rgba(10,11,13,.98));border-right:1px solid rgba(255,255,255,.075)}
.lp-dash-logo-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 8px 24px}
.lp-dash-logo{width:90px;height:auto;filter:brightness(1.5)}
.lp-dash-collapse{font-size:24px;line-height:1;color:#737373}
.lp-dash-nav{display:flex;flex-direction:column;gap:8px}
.lp-dash-nav-item{display:flex;align-items:center;gap:9px;height:35px;padding:0 10px;border-radius:9px;color:#9b9b9b;font-size:12.5px;font-weight:520}
.lp-dash-nav-item.active{background:rgba(255,255,255,.08);color:#f3f3f3;box-shadow:inset 0 0 0 1px rgba(255,255,255,.035)}
.lp-dash-icon{width:16px;color:#c8c8c8;text-align:center}
.lp-dash-profile{display:grid;grid-template-columns:28px 1fr 16px;align-items:center;gap:9px;padding:8px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.04)}
.lp-dash-avatar{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#1d4ed8,#c084fc);font-size:11px;font-weight:700;color:#fff}
.lp-dash-name{font-size:11.5px;color:#f2f2f2;font-weight:600;line-height:1.25}
.lp-dash-email{font-size:10px;color:#6e6e6e;line-height:1.25}
.lp-dash-gear{font-size:13px;color:#777}
.lp-dash-folder-list{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:8px}
.lp-dash-folder-label{padding:0 10px 2px;font-size:9.5px;color:#565656;text-transform:uppercase;letter-spacing:.09em}
.lp-dash-folder-group{display:flex;flex-direction:column;gap:4px}
.lp-dash-folder{display:flex;align-items:center;gap:8px;min-height:26px;padding:0 10px;border-radius:7px;color:#8f8f8f;font-size:11px;font-weight:540}
.lp-dash-folder-mark{width:11px;height:9px;border-radius:2px;background:linear-gradient(180deg,#373a40,#1d1f23);border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.lp-dash-subfolders{display:flex;flex-direction:column;gap:2px;margin-left:29px;padding-left:10px;border-left:1px solid rgba(255,255,255,.055)}
.lp-dash-subfolder{height:21px;display:flex;align-items:center;color:#646464;font-size:10.5px}
.lp-dash-surface{position:relative;z-index:1;min-width:0;background:linear-gradient(180deg,#101113 0%,#0d0e10 100%)}
.lp-dash-topbar{height:60px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center}
.lp-dash-switcher{display:flex;align-items:center;gap:4px;padding:4px;border-radius:10px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);box-shadow:0 14px 36px rgba(0,0,0,.34)}
.lp-dash-switch{display:flex;align-items:center;gap:7px;height:30px;padding:0 15px;border-radius:7px;color:#878787;font-size:12px;font-weight:650}
.lp-dash-switch.active{background:#050506;color:#f6f6f6;box-shadow:0 8px 22px rgba(0,0,0,.36)}
.lp-dash-switch-icon{font-size:11px}
.lp-dash-main{position:relative;display:flex;flex-direction:column;align-items:center;min-height:594px;padding:88px 28px 42px;overflow:hidden}
.lp-dash-title{margin:28px 0 50px;font-family:'Inter Display',sans-serif;font-size:clamp(32px,4.3vw,60px);font-weight:600;letter-spacing:-.055em;line-height:1;color:#f7f7f7;text-align:center;text-shadow:0 14px 52px rgba(0,0,0,.32)}
.lp-dash-actions{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:54px}
.lp-rainbow-button,.lp-import-button{position:relative;display:inline-flex;align-items:center;justify-content:center;height:42px;border:0;border-radius:9px;padding:0 19px;font:inherit;font-size:13px;font-weight:720;letter-spacing:-.01em;color:#f7f7f7;background:#111214;cursor:default}
.lp-rainbow-button{isolation:isolate;box-shadow:0 18px 44px rgba(0,0,0,.38)}
.lp-rainbow-button::before{content:'';position:absolute;inset:-1px;border-radius:inherit;background:conic-gradient(from var(--rainbow-angle),#ffcc00,#ff5f6d,#a855f7,#38bdf8,#22c55e,#ffcc00);z-index:-2;animation:lp-rainbow-spin 3s linear infinite}
.lp-rainbow-button::after{content:'';position:absolute;inset:1px;border-radius:7px;background:linear-gradient(180deg,#17181b,#101113);z-index:-1}
.lp-rainbow-button:hover{transform:translateY(-1px)}
.lp-action-plus{font-size:19px;line-height:0;margin-right:7px;vertical-align:-1px}
.lp-import-button{display:inline-flex;align-items:center;gap:8px;color:#9c9c9c;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);box-shadow:0 14px 32px rgba(0,0,0,.24)}
.lp-import-icon{font-size:13px;color:#cfcfcf}
.lp-bookmark-shelf{width:min(800px,100%);padding:20px 10px;margin:0 auto}
.lp-skeleton-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start}
.lp-skeleton-card{position:relative;min-height:290px;border-radius:10px;overflow:hidden;background:linear-gradient(180deg,#16181c,#0e0f12);border:1px solid rgba(255,255,255,.09);box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.045);padding:12px}
.lp-skeleton-card::before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.045) 36%,transparent 68%);transform:translateX(-120%);animation:lp-skeleton-shimmer 4s ease-in-out infinite;pointer-events:none}
.lp-sk-browser{display:flex;align-items:center;gap:4px;height:18px;border-radius:7px;background:#0a0b0d;border:1px solid rgba(255,255,255,.055);padding:0 8px}
.lp-sk-browser span{width:4px;height:4px;border-radius:50%;background:#3f4248}
.lp-sk-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:13px 0 22px}
.lp-sk-nav i{width:30px;height:10px;border-radius:999px;background:#2b2e35}
.lp-sk-nav div{display:flex;gap:6px}
.lp-sk-nav span{width:22px;height:5px;border-radius:999px;background:#25282e}
.lp-sk-hero{display:flex;flex-direction:column;align-items:center;margin-bottom:22px}
.lp-sk-hero b{display:block;height:10px;border-radius:999px;background:#464a52}
.lp-sk-hero b:first-child{width:72%;margin-bottom:8px}
.lp-sk-hero b:nth-child(2){width:54%;margin-bottom:14px}
.lp-sk-hero p{display:block;height:5px;border-radius:999px;background:#272a30;margin:0 0 6px}
.lp-sk-hero p:nth-of-type(1){width:82%}
.lp-sk-hero p:nth-of-type(2){width:66%}
.lp-sk-layout{display:grid;gap:9px}
.lp-sk-layout span{display:block;border-radius:9px;background:linear-gradient(145deg,#20232a,#121419);border:1px solid rgba(255,255,255,.045)}
.lp-skeleton-saas .lp-sk-layout{grid-template-columns:repeat(2,1fr)}
.lp-skeleton-saas .lp-sk-layout span{height:48px}
.lp-skeleton-portfolio .lp-sk-layout{grid-template-columns:repeat(3,1fr)}
.lp-skeleton-portfolio .lp-sk-layout span{height:40px}
.lp-skeleton-mobile{padding-inline:28px}
.lp-skeleton-mobile .lp-sk-layout{grid-template-columns:1fr}
.lp-skeleton-mobile .lp-sk-layout span{height:31px;border-radius:12px}
.lp-skeleton-mobile .lp-sk-layout span:nth-child(n+5){display:none}

/* SEARCH BAR */
.lp-search-bar{display:flex;align-items:center;gap:10px;background:rgba(20,22,26,.92);border:1px solid rgba(255,255,255,.11);border-radius:var(--r8);padding:10px 14px;font-size:13px;color:var(--muted);box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
.lp-search-text{flex:1;font-size:12.5px;color:var(--muted)}
.lp-search-kbd{font-size:10.5px;color:var(--dim);background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:2px 6px}
.lp-cursor{animation:lp-blink .9s step-end infinite;color:var(--muted)}

/* CARD GRID */
.lp-mockup-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lp-moodboard-grid{grid-template-columns:repeat(2,1fr)}

/* BOOKMARK CARD */
.lp-card{background:linear-gradient(180deg,rgba(26,28,33,.96),rgba(17,18,21,.96));border:1px solid rgba(255,255,255,.075);border-radius:var(--r12);overflow:hidden;animation:lp-card-in .5s ease both;transition:border-color .2s,transform .2s;box-shadow:0 10px 28px rgba(0,0,0,.22)}
.lp-card:hover{border-color:rgba(255,255,255,.16);transform:translateY(-2px)}
.lp-card-thumb{height:108px;position:relative;overflow:hidden}
.lp-card-thumb-inner{position:absolute;inset:0}
.lp-card-thumb-inner::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.22))}
.lp-card-thumb-overlay{position:absolute;inset:0;padding:11px;display:flex;flex-direction:column;gap:5px}
.lp-sim-nav{height:22px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,.035);border-radius:4px;margin-bottom:6px}
.lp-sim-line{height:5px;background:rgba(255,255,255,0.11);border-radius:3px}
.lp-card-body{padding:12px}
.lp-card-title{font-size:12px;font-weight:500;color:var(--text);margin-bottom:3px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-card-domain{font-size:10.5px;color:var(--dim);margin-bottom:7px}
.lp-tag-row{display:flex;gap:4px;flex-wrap:wrap}
.lp-tag{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.06);border-radius:4px;padding:2px 6px;font-size:10px;color:#888}
.lp-palette{display:flex;gap:4px;margin-top:8px}
.lp-swatch{height:8px;flex:1;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}

/* SECTIONS */
.lp-section{padding:100px 0;border-top:1px solid var(--border)}
.lp-section-alt{background:var(--bg1)}
.lp-container{max-width:1080px;margin:0 auto;padding:0 40px}
.lp-section-label{max-width:1080px;margin:0 auto 56px;padding:0 40px;display:flex;align-items:center;gap:12px}
.lp-section-num{font-family:'Inter Display',sans-serif;font-size:12px;color:var(--dim);letter-spacing:.08em}
.lp-section-slug{font-family:'Inter Display',sans-serif;font-size:12px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.lp-section-eyebrow{font-size:11.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:18px}
.lp-section-intro{max-width:1080px;margin:0 auto 56px;padding:0 40px}
.lp-section-h2{font-family:'Inter Display',sans-serif;font-size:clamp(28px,3.8vw,48px);font-weight:600;letter-spacing:-0.035em;line-height:1.1;color:var(--white);margin-bottom:16px}
.lp-section-body{font-size:16px;color:var(--muted);max-width:440px;line-height:1.7}

/* FEATURE TABS */
.lp-ftabs{max-width:1080px;margin:0 auto;padding:0 40px}
.lp-ftab-list{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:40px;padding-bottom:2px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.lp-ftab-list::-webkit-scrollbar{display:none}
.lp-ftab-btn{position:relative;background:none;border:none;padding:10px 18px 11px;font-size:13px;color:var(--muted);cursor:pointer;white-space:nowrap;transition:color .2s;font-family:inherit}
.lp-ftab-btn::after{content:'';position:absolute;left:18px;right:18px;bottom:0;height:1px;background:transparent;transition:background .2s}
.lp-ftab-btn:hover{color:var(--text)}
.lp-ftab-btn.active{color:var(--white)}
.lp-ftab-btn.active::after{background:var(--white)}

/* TAB CONTENT */
.lp-ftab-panel{animation:lp-fade-tab .3s ease}
.lp-tab-content{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.lp-tab-content-canvas{align-items:stretch}
.lp-tab-text{}
.lp-tab-h3{font-family:'Inter Display',sans-serif;font-size:22px;font-weight:600;letter-spacing:-0.03em;color:var(--white);margin-bottom:12px}
.lp-tab-p{font-size:14.5px;color:var(--muted);line-height:1.7}
.lp-feature-list{margin-top:20px;display:flex;flex-direction:column;gap:8px;list-style:none}
.lp-feature-list li{font-size:13.5px;color:var(--muted);display:flex;align-items:center;gap:8px}
.lp-feature-list li::before{content:'';display:inline-block;width:4px;height:4px;border-radius:50%;background:var(--dim);flex-shrink:0}
.lp-tab-visual{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r16);padding:24px;min-height:220px}

/* URL INPUT DEMO */
.lp-url-input-demo{display:flex;flex-direction:column;gap:12px}
.lp-uid-label{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.lp-uid-field{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r6);padding:9px 12px}
.lp-uid-status{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--dim)}
.lp-uid-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 5px #4ade80;flex-shrink:0;animation:lp-pulse 1.4s ease infinite}
.lp-uid-preview{display:flex;gap:10px;background:var(--bg3);border-radius:var(--r8);padding:10px;border:1px solid var(--border)}
.lp-uid-thumb{width:52px;height:40px;border-radius:5px;flex-shrink:0}
.lp-uid-metatitle{font-size:12px;color:var(--text);font-weight:500}
.lp-uid-metaurl{font-size:11px;color:var(--dim);margin-top:2px}

/* MOBILE SHARE */
.lp-mobile-share{display:flex;justify-content:center;align-items:center;min-height:180px}
.lp-share-sheet{background:var(--bg3);border-radius:var(--r16);padding:20px;width:100%;max-width:280px}
.lp-share-handle{width:32px;height:3px;background:var(--bg4);border-radius:2px;margin:0 auto 16px}
.lp-share-title{font-size:12px;color:var(--muted);text-align:center;margin-bottom:14px}
.lp-share-row{display:flex;gap:16px;justify-content:center}
.lp-share-app{display:flex;flex-direction:column;align-items:center;gap:5px}
.lp-share-app-icon{width:44px;height:44px;background:var(--bg4);border-radius:11px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border)}
.lp-share-app-icon-dim{background:var(--bg2)}
.lp-share-nyabag .lp-share-app-icon{background:#1a1a2e;border-color:rgba(88,101,242,0.3)}
.lp-share-app-label{font-size:10px;color:var(--dim)}
.lp-share-confirm{margin-top:14px;text-align:center;font-size:12px;color:#4ade80;background:rgba(74,222,128,.08);border-radius:var(--r6);padding:7px}

/* IMPORT DEMO */
.lp-import-demo{display:flex;flex-direction:column;gap:12px}
.lp-import-header{font-size:12px;color:var(--muted);font-weight:500}
.lp-import-drop{border:1px dashed var(--border2);border-radius:var(--r8);padding:24px;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--dim)}
.lp-import-progress{display:flex;flex-direction:column;gap:6px}
.lp-import-prog-label{font-size:11.5px;color:var(--dim)}
.lp-import-bar{height:3px;background:var(--bg4);border-radius:2px;overflow:hidden}
.lp-import-fill{height:100%;width:62%;background:var(--white);border-radius:2px;animation:lp-fill-grow 2s ease infinite alternate}

/* SCREENSHOT DEMO */
.lp-screenshot-demo{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.lp-sd-before,.lp-sd-after{flex:1;min-width:140px}
.lp-sd-label{font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.lp-sd-arrow{font-size:18px;color:var(--dim);flex-shrink:0}
.lp-sd-bookmark-row{display:flex;flex-direction:column;gap:5px}
.lp-sd-plain-bookmark{display:flex;align-items:center;gap:7px;background:var(--bg3);border-radius:5px;padding:7px 9px;font-size:10.5px;color:var(--dim)}
.lp-sd-favicon{width:12px;height:12px;border-radius:2px;background:var(--bg4);flex-shrink:0}

/* PALETTE DEMO */
.lp-palette-demo{display:flex;flex-direction:column;gap:10px}
.lp-pd-row{display:flex;align-items:center;gap:12px}
.lp-pd-name{font-size:11.5px;color:var(--muted);min-width:52px}
.lp-pd-swatches{display:flex;gap:4px;flex:1}
.lp-pd-swatch{flex:1;height:22px;border-radius:4px;transition:transform .15s}
.lp-pd-swatch:hover{transform:scaleY(1.15)}

/* METADATA DEMO */
.lp-metadata-demo{display:flex;flex-direction:column;gap:12px}
.lp-meta-field{display:flex;flex-direction:column;gap:5px}
.lp-meta-label{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.lp-meta-value{font-size:12.5px;color:var(--muted)}

/* FONT DEMO */
.lp-font-demo{display:flex;flex-direction:column;gap:8px}
.lp-font-row{display:flex;align-items:center;gap:10px;padding:9px 10px;background:var(--bg3);border-radius:var(--r6)}
.lp-font-site{font-size:11px;color:var(--dim);min-width:80px}
.lp-font-name{font-size:12.5px;color:var(--text);flex:1}
.lp-font-cat{font-size:10.5px;color:var(--dim)}

/* SEARCH DEMO */
.lp-search-demo{display:flex;flex-direction:column;gap:12px}
.lp-search-results{display:flex;flex-direction:column;gap:6px}
.lp-search-label{font-size:10.5px;color:var(--dim);padding:2px 0 6px}
.lp-sr-item{display:flex;gap:10px;align-items:flex-start;padding:9px;background:var(--bg3);border-radius:var(--r8)}
.lp-sr-thumb{width:40px;height:30px;border-radius:5px;flex-shrink:0}
.lp-sr-title{font-size:12px;color:var(--text);font-weight:500}
.lp-sr-domain{font-size:10.5px;color:var(--dim);margin-top:2px}

/* DETAIL DEMO */
.lp-detail-demo{display:flex;flex-direction:column;gap:14px}
.lp-detail-thumb{height:100px;border-radius:var(--r8)}
.lp-detail-body{display:flex;flex-direction:column;gap:8px}
.lp-detail-title{font-size:13px;color:var(--text);font-weight:500;line-height:1.4}
.lp-detail-domain{font-size:11px;color:var(--dim)}
.lp-detail-section-label{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-top:4px}
.lp-detail-note{font-size:12px;color:var(--muted);font-style:italic;line-height:1.5;padding:8px 10px;background:var(--bg3);border-radius:var(--r6);border-left:2px solid var(--bg4)}

/* CANVAS MOCK */
.lp-canvas-mock{position:relative;height:340px;background:var(--bg2);border-radius:var(--r16);border:1px solid var(--border);overflow:hidden}
.lp-canvas-dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px);background-size:22px 22px;pointer-events:none}
.lp-cnote{position:absolute;background:#111;border:1px solid var(--border);border-radius:var(--r8);padding:12px 14px;font-size:12px;transition:border-color .2s,transform .2s;cursor:default}
.lp-cnote-hover{border-color:var(--border2);transform:translateY(-2px)}
.lp-cnote-label{font-size:9.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.lp-cnote-content{color:var(--muted);line-height:1.5;font-size:11.5px}
.lp-cnote-link{color:#4a9eff}
.lp-csection{position:absolute;border:1px dashed rgba(255,255,255,0.1);border-radius:var(--r8);padding:10px;display:flex;flex-direction:column;gap:5px}
.lp-csection-cards{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.lp-csection-card{background:var(--bg3);border-radius:4px;padding:5px 8px;font-size:10.5px;color:var(--dim)}
.lp-cpalette-row{display:flex;gap:4px;margin-top:6px}
.lp-cpalette-chip{flex:1;height:18px;border-radius:3px}

/* NOTE TYPES */
.lp-note-types{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.lp-note-type-card{display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--bg3);border-radius:var(--r8);border:1px solid var(--border)}
.lp-nt-icon{width:28px;height:28px;background:var(--bg4);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);flex-shrink:0}
.lp-nt-label{font-size:12px;color:var(--text);font-weight:500}
.lp-nt-desc{font-size:10.5px;color:var(--dim);margin-top:2px}

/* DIFFERENTIATION */
.lp-diff-section{padding:100px 0;border-top:1px solid var(--border)}
.lp-diff-h2{font-family:'Inter Display',sans-serif;font-size:clamp(28px,3.5vw,44px);font-weight:600;letter-spacing:-0.035em;color:var(--white);margin-bottom:14px}
.lp-diff-sub{font-size:16px;color:var(--muted);max-width:480px;margin-bottom:60px;line-height:1.7}
.lp-diff-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--r12);overflow:hidden}
.lp-diff-item{background:var(--bg1);padding:36px 32px}
.lp-diff-old{font-size:12px;color:var(--dim);text-decoration:line-through;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.lp-diff-new{font-family:'Inter Display',sans-serif;font-size:20px;font-weight:600;color:var(--white);letter-spacing:-0.03em;margin-bottom:12px}
.lp-diff-body{font-size:13.5px;color:var(--muted);line-height:1.65}

/* CTA */
.lp-cta-section{padding:140px 0;border-top:1px solid var(--border);text-align:center;position:relative;overflow:hidden}
.lp-cta-inner{position:relative}
.lp-cta-glow{position:absolute;top:-300px;left:50%;transform:translateX(-50%);width:700px;height:700px;background:radial-gradient(ellipse,rgba(255,255,255,.04) 0%,transparent 65%);pointer-events:none}
.lp-cta-h2{font-family:'Inter Display',sans-serif;font-size:clamp(32px,5vw,60px);font-weight:700;letter-spacing:-0.04em;color:var(--white);margin-bottom:18px;line-height:1.05}
.lp-cta-body{font-size:16px;color:var(--muted);max-width:460px;margin:0 auto 44px;line-height:1.7}
.lp-cta-actions{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}

/* ANIMATIONS */
@keyframes lp-fade-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes lp-card-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes lp-fade-tab{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes lp-blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes lp-pulse{0%,100%{opacity:1;box-shadow:0 0 5px #4ade80}50%{opacity:.6;box-shadow:0 0 2px #4ade80}}
@keyframes lp-fill-grow{from{width:40%}to{width:80%}}
@keyframes lp-skeleton-shimmer{0%,54%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@property --rainbow-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
@keyframes lp-rainbow-spin{to{--rainbow-angle:360deg}}

/* ── RESPONSIVE ── */
@media(max-width:1024px){
  .lp-hero{padding:120px 24px 0}
  .lp-dashboard-mockup{grid-template-columns:154px 1fr;height:500px}
  .lp-dash-main{padding:72px 22px 40px}
  .lp-dash-title{font-size:clamp(30px,4vw,48px)}
  .lp-bookmark-shelf{padding:100px 18px}
  .lp-skeleton-row{gap:10px}
  .lp-skeleton-card{min-height:270px;padding:10px}
  .lp-dash-folder{font-size:10.5px;padding-inline:8px}
  .lp-dash-subfolder{font-size:10px}
  .lp-mockup-body{grid-template-columns:1fr}
  .lp-mockup-sidebar{display:none}
  .lp-mockup-grid{grid-template-columns:1fr 1fr}
  .lp-section-intro,.lp-section-label,.lp-ftabs{padding:0 24px}
  .lp-container{padding:0 24px}
}

@media(max-width:768px){
  .lp-hero-h1{letter-spacing:-0.03em}
  .lp-dashboard-mockup{grid-template-columns:1fr;min-height:620px}
  .lp-dash-sidebar{display:none}
  .lp-dash-main{min-height:560px;padding:64px 18px 38px}
  .lp-dash-title{margin-top:24px;font-size:clamp(28px,7vw,42px)}
  .lp-dash-actions{margin-bottom:40px}
  .lp-bookmark-shelf{width:min(620px,100%);padding:0 22px}
  .lp-skeleton-row{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lp-skeleton-row .lp-skeleton-card:last-child{grid-column:1 / -1;justify-self:center;width:min(280px,100%)}
  .lp-mockup-grid{grid-template-columns:1fr 1fr}
  .lp-tab-content{grid-template-columns:1fr;gap:24px}
  .lp-tab-content-canvas{grid-template-columns:1fr}
  .lp-diff-grid{grid-template-columns:1fr}
  .lp-note-types{grid-template-columns:1fr}
  .lp-progress-dots{display:none}
  .lp-screenshot-demo{flex-direction:column}
}

@media(max-width:540px){
  .lp-ea-row{flex-direction:column;align-items:stretch;padding:7px}
  .lp-ea-input{width:100%;height:46px;text-align:center;padding:0 16px}
  .lp-ea-submit{width:100%;height:46px}
  .lp-ea-status{text-align:center}
  .lp-dashboard-mockup{margin-top:42px;border-radius:var(--r16);min-height:560px}
  .lp-dash-topbar{height:52px}
  .lp-dash-switch{height:28px;padding:0 12px;font-size:11.5px}
  .lp-dash-main{padding:50px 14px 34px}
  .lp-dash-title{margin:18px 0 40px;font-size:31px;line-height:1.03}
  .lp-dash-actions{flex-direction:column;gap:10px;margin-bottom:30px}
  .lp-rainbow-button,.lp-import-button{width:min(250px,100%);height:42px}
  .lp-bookmark-shelf{padding:0;width:100%}
  .lp-skeleton-row{grid-template-columns:1fr;gap:12px}
  .lp-skeleton-row .lp-skeleton-card:last-child{grid-column:auto;width:100%}
  .lp-skeleton-card{min-height:238px}
  .lp-skeleton-mobile{padding-inline:18px}
  .lp-mockup-main{padding:14px;gap:12px}
  .lp-mockup-grid{grid-template-columns:1fr}
  .lp-hero-actions{flex-direction:column;align-items:center}
  .lp-cta-actions{flex-direction:column}
  .lp-pd-swatches{flex-wrap:wrap}
  .lp-section-h2{font-size:26px}
}
`;
