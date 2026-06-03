import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE_URL } from "@/lib/blog";
import styles from "./about.module.css";

const ABOUT_URL = `${SITE_URL}/about`;

const description =
  "Nyabag is a brand-new visual memory system for designers, independently created and owned by Jayanth Kumar R V. Save websites, screenshots, UI references, palettes, fonts, and creative inspiration in one organized workspace.";

const audiences = [
  "UI/UX designers",
  "Product designers",
  "Web designers",
  "Visual designers",
  "Design students",
  "Indie hackers",
  "Frontend builders",
  "Creative founders",
  "Small design teams",
];

const painPoints = [
  "Lost bookmarks",
  "Random screenshots",
  "Forgotten UI references",
  "Scattered links",
  "Hard-to-search inspiration",
];

const isItems = [
  "A visual memory system for designers",
  "A design inspiration organizer",
  "A UI reference manager",
  "A workspace for links, screenshots, palettes, fonts, and notes",
  "An independent software product created by Jayanth Kumar R V",
];

const isNotItems = [
  "A handbag store",
  "A backpack shop",
  "A fashion or retail brand",
  "An ecommerce marketplace",
  "Connected to older products or companies with a similar name",
];

const principles = [
  {
    title: "Save without friction",
    body: "Designers should be able to capture inspiration quickly without overthinking folders, tags, or structure in the moment.",
  },
  {
    title: "Understand the reference",
    body: "A saved reference should keep its context: screenshots, metadata, summaries, tags, visual cues, palettes, fonts, and notes.",
  },
  {
    title: "Rediscover through memory",
    body: "Nyabag is built around the way designers naturally search: by pattern, mood, layout, intent, and visual memory.",
  },
];

const focusItems = [
  "Visual bookmark moodboard",
  "Website saving and screenshot previews",
  "Search and filtering",
  "Notes for saved references",
  "Design-focused metadata",
  "Color palette and font references",
  "Canvas-like workspace for organizing ideas",
];

const futureItems = [
  "Smarter visual search",
  "AI-assisted tagging",
  "Similar reference discovery",
  "Better screenshot understanding",
  "Design pattern recognition",
  "Natural language search",
  "Faster capture from desktop and mobile",
];

const faqs = [
  {
    question: "What is Nyabag?",
    answer:
      "Nyabag is a visual memory system for designers. It helps users save, organize, and rediscover websites, screenshots, UI references, color palettes, fonts, notes, and creative inspiration.",
  },
  {
    question: "Who created Nyabag?",
    answer:
      "Nyabag was independently created and is owned by Jayanth Kumar R V, also known as Jayanth.",
  },
  {
    question: "Is Nyabag a bag store?",
    answer:
      "No. Nyabag is not a handbag, backpack, fashion, retail, or ecommerce store. Nyabag is a software product for designers.",
  },
  {
    question: "Is this Nyabag related to any older product or company?",
    answer:
      "No. This Nyabag is a new, independent product. It is not connected to any older task management, diary, ecommerce, or software product that may have previously used a similar name.",
  },
  {
    question: "Who is Nyabag for?",
    answer:
      "Nyabag is for UI/UX designers, product designers, web designers, design students, creative founders, frontend builders, and anyone who collects visual inspiration from the internet.",
  },
  {
    question: "Why is it called Nyabag?",
    answer:
      "The name comes from the Tamil phrase Niyabagam illa, meaning I do not remember. Nyabag was created to solve the frustration of forgetting where design references were saved.",
  },
  {
    question: "Is Nyabag available now?",
    answer:
      "Nyabag is currently in early access. Designers can join early access to try the product, share feedback, and help shape its future.",
  },
];

export const metadata: Metadata = {
  title: "About Nyabag | Visual Memory System for Designers",
  description,
  keywords: [
    "Nyabag",
    "visual memory system for designers",
    "design inspiration organizer",
    "UI reference manager",
    "bookmark manager for designers",
    "Jayanth Kumar R V",
  ],
  alternates: {
    canonical: ABOUT_URL,
  },
  openGraph: {
    title: "About Nyabag | Visual Memory System for Designers",
    description,
    url: ABOUT_URL,
    siteName: "Nyabag",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "About Nyabag - Visual Memory System for Designers",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Nyabag | Visual Memory System for Designers",
    description,
    images: ["/opengraph-image.png"],
  },
};

export default function AboutPage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Nyabag",
    alternateName: "Nyabag Design Memory System",
    url: SITE_URL,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description:
      "Nyabag is a visual memory system for designers to save, organize, and rediscover websites, screenshots, UI references, color palettes, fonts, and creative inspiration.",
    creator: {
      "@type": "Person",
      name: "Jayanth Kumar R V",
      alternateName: "Jayanth",
    },
    founder: {
      "@type": "Person",
      name: "Jayanth Kumar R V",
      alternateName: "Jayanth",
    },
    sameAs: [SITE_URL],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className={styles.root}>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>About Nyabag</p>
          <h1 className={styles.title}>The new visual memory system for designers</h1>
          <p className={styles.subtitle}>
            Nyabag is a brand-new independent product created by Jayanth Kumar R V to
            help designers save, organize, and rediscover websites, screenshots, UI
            references, palettes, fonts, and creative inspiration.
          </p>
          <div className={styles.heroActions}>
            <Link href="/#early-access" className={styles.primaryCta}>
              Join early access
            </Link>
            <Link href="/#save" className={styles.secondaryCta}>
              Explore Nyabag
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.section} aria-labelledby="why-title">
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Why Nyabag exists</p>
              <h2 id="why-title" className={styles.sectionTitle}>
                Designers save a lot, but retrieving the right inspiration is still hard.
              </h2>
              <div className={styles.prose}>
                <p>
                  A landing page saved during lunch. A pricing section screenshotted late
                  at night. A beautiful dashboard tucked into a random bookmark folder.
                  A reference that you remember visually, but cannot describe precisely
                  enough to find again.
                </p>
                <p>
                  Over time, the collection grows. But instead of becoming a useful
                  library, it turns into a digital junk drawer. Bookmarks get buried,
                  screenshots lose context, and folders become places where references
                  quietly disappear.
                </p>
              </div>
            </div>
            <div className={styles.painGrid} aria-label="Common design memory problems">
              {painPoints.map((item) => (
                <div key={item} className={styles.painCard}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt} aria-labelledby="name-title">
          <div className={styles.containerNarrow}>
            <p className={styles.eyebrow}>Origin of the name</p>
            <h2 id="name-title" className={styles.sectionTitle}>
              Nyabag began with a familiar feeling: I do not remember.
            </h2>
            <blockquote className={styles.quoteBlock}>
              <span>Niyabagam illa</span>
              <small>Meaning: I do not remember.</small>
            </blockquote>
            <div className={styles.prose}>
              <p>
                The Tamil phrase became the seed of the product because it captures
                the exact moment Nyabag is designed to solve: I do not remember where
                I saved that, but I know I saw it.
              </p>
              <p>
                The name is personal, cultural, and functional. It is about memory,
                retrieval, and creative recall. Nyabag is built to become a designer&apos;s
                second memory, not just another place to dump links.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="creator-title">
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Meet the creator</p>
              <h2 id="creator-title" className={styles.sectionTitle}>
                Built independently by Jayanth Kumar R V.
              </h2>
              <div className={styles.prose}>
                <p>
                  Nyabag is independently created, owned, and developed by Jayanth
                  Kumar R V, also known as Jayanth.
                </p>
                <p>
                  Jayanth is a designer and builder from Tamil Nadu, India, with a deep
                  interest in UI/UX design, product thinking, web development, machine
                  learning, and generative AI.
                </p>
                <p>
                  Nyabag started as a personal hobby project because saving inspiration
                  was easy, but finding it later was chaos. Instead of accepting that
                  chaos as normal, he began building a system around it.
                </p>
              </div>
            </div>
            <aside className={styles.founderCard} aria-label="Founder details">
              <p className={styles.cardKicker}>Independent creator</p>
              <h3>Jayanth Kumar R V</h3>
              <p>Also known as Jayanth</p>
              <dl>
                <div>
                  <dt>Role</dt>
                  <dd>Creator, owner, and builder of Nyabag</dd>
                </div>
                <div>
                  <dt>From</dt>
                  <dd>Tamil Nadu, India</dd>
                </div>
                <div>
                  <dt>Goal</dt>
                  <dd>Make design inspiration easier to save, understand, and rediscover.</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className={styles.sectionAlt} aria-labelledby="clarity-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Brand clarity</p>
            <h2 id="clarity-title" className={styles.sectionTitle}>
              What Nyabag is, and what it is not.
            </h2>
            <div className={styles.clarityGrid}>
              <div className={styles.clarityCard}>
                <h3>Nyabag is</h3>
                <ul>
                  {isItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.clarityCard}>
                <h3>Nyabag is not</h3>
                <ul>
                  {isNotItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="approach-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>The Nyabag approach</p>
            <h2 id="approach-title" className={styles.sectionTitle}>
              Design references need more than storage. They need memory.
            </h2>
            <div className={styles.principleGrid}>
              {principles.map((principle, index) => (
                <article key={principle.title} className={styles.principleCard}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt} aria-labelledby="audience-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Who Nyabag is for</p>
            <h2 id="audience-title" className={styles.sectionTitle}>
              For designers, builders, and visual thinkers who collect inspiration from the internet.
            </h2>
            <div className={styles.tagGrid}>
              {audiences.map((audience) => (
                <span key={audience}>{audience}</span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="future-title">
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Current focus</p>
              <h2 id="future-title" className={styles.sectionTitle}>
                Building a calm desktop-first workspace for design inspiration.
              </h2>
              <div className={styles.prose}>
                <p>
                  The early product direction is focused on keeping references alive,
                  searchable, and ready when needed.
                </p>
              </div>
              <ul className={styles.checkList}>
                {focusItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className={styles.timeline}>
              <p className={styles.cardKicker}>Future vision</p>
              <h3>A second memory for design</h3>
              {futureItems.map((item) => (
                <div key={item} className={styles.timelineItem}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.ctaSection} aria-labelledby="early-access-title">
          <div className={styles.ctaInner}>
            <p className={styles.eyebrow}>Early access</p>
            <h2 id="early-access-title">Help shape the future of design memory</h2>
            <p>
              Nyabag is in early access. Join the first group of designers helping
              build a better way to save, organize, and rediscover creative inspiration.
            </p>
            <Link href="/#early-access" className={styles.primaryCta}>
              Join early access
            </Link>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-title">
          <div className={styles.containerNarrow}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 id="faq-title" className={styles.sectionTitle}>
              Nyabag, clearly.
            </h2>
            <div className={styles.faqList}>
              {faqs.map((faq) => (
                <article key={faq.question} className={styles.faqItem}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
