import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { blogPosts, getBlogUrl, SITE_URL } from "@/lib/blog";
import { BlogIndexContent } from "./BlogIndexContent";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Nyabag Blog - Design Inspiration, Visual Memory, and UI Research",
  description:
    "Guides for designers on saving, organizing, and rediscovering design inspiration, UI references, visual bookmarks, and creative research.",
  alternates: {
    canonical: getBlogUrl(),
  },
  openGraph: {
    title: "Nyabag Blog",
    description:
      "Design inspiration, visual memory, UI research, and creative reference workflows from Nyabag.",
    url: getBlogUrl(),
    siteName: "Nyabag",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nyabag Blog",
    description:
      "Design inspiration, visual memory, UI research, and creative reference workflows from Nyabag.",
  },
};

function BlogCta() {
  return (
    <section className={styles.fullCta} aria-labelledby="blog-cta-title">
      <div className={styles.fullCtaInner}>
        <p className={styles.eyebrow}>Early access</p>
        <h2 id="blog-cta-title">Build your second memory for design.</h2>
        <p>
          Join Nyabag early access and start turning scattered design references
          into a searchable visual library.
        </p>
        <Link href="/#early-access" className={styles.ctaLink}>Join early access</Link>
      </div>
    </section>
  );
}

export default function BlogIndexPage() {
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Nyabag Blog",
    url: getBlogUrl(),
    publisher: {
      "@type": "Organization",
      name: "Nyabag",
      url: SITE_URL,
      logo: `${SITE_URL}/assets/Nyabag-Dark-Logo.svg`,
    },
    blogPost: sortedPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: getBlogUrl(post.slug),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Organization",
        name: post.author,
      },
    })),
  };

  return (
    <div className={styles.root}>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.title}>Blog</h1>
        </div>
      </header>

      <main className={styles.section}>
        <div className={styles.container}>
          <BlogIndexContent
            posts={sortedPosts.map(({ slug, title, excerpt, publishedAt, author, category, bannerImage, bannerAlt }) => ({
              slug,
              title,
              excerpt,
              publishedAt,
              author,
              category,
              bannerImage,
              bannerAlt,
            }))}
          />
        </div>
      </main>
      <BlogCta />
      <SiteFooter />
    </div>
  );
}
