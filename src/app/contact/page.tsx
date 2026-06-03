import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE_URL } from "@/lib/blog";
import styles from "./contact.module.css";

const CONTACT_URL = `${SITE_URL}/contact`;
const CONTACT_EMAIL = "privacy@nyabag.com";

const contactCards = [
  {
    label: "General questions",
    title: "Ask about Nyabag",
    body: "For product questions, brand questions, or anything about Nyabag as a visual memory system for designers.",
    href: `mailto:${CONTACT_EMAIL}?subject=Nyabag%20question`,
    cta: CONTACT_EMAIL,
  },
  {
    label: "Privacy and data",
    title: "Data requests",
    body: "For privacy questions, account data requests, corrections, deletion, or other personal information requests.",
    href: `mailto:${CONTACT_EMAIL}?subject=Nyabag%20privacy%20or%20data%20request`,
    cta: CONTACT_EMAIL,
  },
  {
    label: "Feedback",
    title: "Shape the product",
    body: "Share design workflow pain points, early access feedback, feature ideas, or references you wish Nyabag handled better.",
    href: `mailto:${CONTACT_EMAIL}?subject=Nyabag%20feedback`,
    cta: "Send feedback",
  },
  {
    label: "Early access",
    title: "Join the waitlist",
    body: "If you want to try Nyabag early, the best path is the early access form on the homepage.",
    href: "/#early-access",
    cta: "Join early access",
  },
];

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Nyabag" },
  { href: "/#early-access", label: "Early access" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export const metadata: Metadata = {
  title: "Contact Nyabag",
  description:
    "Contact Nyabag for product questions, privacy and data requests, early access, and feedback about the visual memory system for designers.",
  alternates: {
    canonical: CONTACT_URL,
  },
  openGraph: {
    title: "Contact Nyabag",
    description:
      "Contact Nyabag for product questions, privacy and data requests, early access, and feedback.",
    url: CONTACT_URL,
    siteName: "Nyabag",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Contact Nyabag",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Nyabag",
    description:
      "Contact Nyabag for product questions, privacy and data requests, early access, and feedback.",
    images: ["/opengraph-image.png"],
  },
};

export default function ContactPage() {
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Nyabag",
    url: CONTACT_URL,
    about: {
      "@type": "SoftwareApplication",
      name: "Nyabag",
      url: SITE_URL,
      applicationCategory: "DesignApplication",
      description:
        "Nyabag is a visual memory system for designers to save, organize, and rediscover creative inspiration.",
      creator: {
        "@type": "Person",
        name: "Jayanth Kumar R V",
        alternateName: "Jayanth",
      },
    },
    email: CONTACT_EMAIL,
  };

  return (
    <div className={styles.root}>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Contact Nyabag</p>
          <h1 className={styles.title}>Have a question, idea, or request?</h1>
          <p className={styles.subtitle}>
            Reach out about Nyabag, early access, feedback, privacy, or data
            requests. Nyabag is a solo independent product, so clear context
            helps every message get handled better.
          </p>
          <div className={styles.heroActions}>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.primaryCta}>
              Email {CONTACT_EMAIL}
            </a>
            <Link href="/#early-access" className={styles.secondaryCta}>
              Join early access
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.section} aria-labelledby="contact-options">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Contact options</p>
            <h2 id="contact-options" className={styles.sectionTitle}>
              Choose the path that fits what you need.
            </h2>
            <div className={styles.cardGrid}>
              {contactCards.map((card) => (
                <article key={card.title} className={styles.contactCard}>
                  <p className={styles.cardKicker}>{card.label}</p>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <LinkOrAnchor href={card.href} className={styles.cardLink}>
                    {card.cta}
                  </LinkOrAnchor>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt} aria-labelledby="response-title">
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Response expectations</p>
              <h2 id="response-title" className={styles.sectionTitle}>
                Nyabag is built independently, so messages are handled directly.
              </h2>
              <p className={styles.copy}>
                The fastest way to get a useful reply is to include what you are
                trying to do, which page or feature your message is about, and any
                relevant account email or screenshot context.
              </p>
            </div>
            <aside className={styles.noteCard}>
              <p className={styles.cardKicker}>Helpful context</p>
              <ul>
                <li>What you were trying to do</li>
                <li>The page, feature, or workflow involved</li>
                <li>Your account email, if the request is account-specific</li>
                <li>Any screenshots or error messages that explain the issue</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="quick-links-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Quick links</p>
            <h2 id="quick-links-title" className={styles.sectionTitle}>
              Looking for something specific?
            </h2>
            <div className={styles.quickLinks}>
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function LinkOrAnchor({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
