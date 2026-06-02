import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts, getBlogUrl, SITE_URL } from "@/lib/blog";
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
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Nyabag Blog",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nyabag Blog",
    description:
      "Design inspiration, visual memory, UI research, and creative reference workflows from Nyabag.",
    images: ["/opengraph-image.png"],
  },
};

function BlogNav() {
  return (
    <nav className={styles.nav} aria-label="Blog navigation">
      <Link href="/" className={styles.navLogo} aria-label="Nyabag home">
        <img src="/assets/Nyabag-Dark-Logo.svg" alt="Nyabag" />
      </Link>
      <div className={styles.navLinks}>
        <Link href="/blog" className={styles.navLink}>Blog</Link>
        <Link href="/" className={styles.navLink}>Home</Link>
        <Link href="/#features" className={styles.navLink}>Features</Link>
        <Link href="/#early-access" className={styles.navLink}>Early access</Link>
      </div>
      <Link href="/#early-access" className={styles.navCta}>Join early access</Link>
    </nav>
  );
}

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

function BlogFooter() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.navLogo} aria-label="Nyabag home">
            <img src="/assets/Nyabag-Dark-Logo.svg" alt="Nyabag" />
          </Link>
          <p className={styles.footerTagline}>Your second memory for design.</p>
        </div>

        <nav className={styles.footerNav} aria-label="Footer links">
          <div className={styles.footerCol}>
            <div className={styles.footerColTitle}>Product</div>
            {[["/#save","Save"],["/#enrich","Enrich"],["/#organize","Organize"],["/#think","Canvas"],["/#early-access","Early access"],["/blog","Blog"]].map(([href, label]) => (
              <Link key={label} href={href} className={styles.footerLink}>{label}</Link>
            ))}
          </div>
          <div className={styles.footerCol}>
            <div className={styles.footerColTitle}>Legal</div>
            {[["/privacy","Privacy"],["/terms","Terms"],["/contact","Contact"]].map(([href, label]) => (
              <Link key={label} href={href} className={styles.footerLink}>{label}</Link>
            ))}
          </div>
        </nav>
      </div>
      <div className={styles.footerBottom}>
        <span>
          © {new Date().getFullYear()} Nyabag. Made with ❤️ by{" "}
          <a
            href="https://www.linkedin.com/in/jayanzth"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerCreditLink}
          >
            Jayanth
          </a>
        </span>
      </div>
    </footer>
  );
}

export default function BlogIndexPage() {
  const [featuredPost, ...otherPosts] = blogPosts;

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
    blogPost: blogPosts.map((post) => ({
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
      <BlogNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Nyabag Blog</p>
          <h1 className={styles.title}>Design inspiration that stays useful.</h1>
          <p className={styles.subtitle}>
            Practical guides on visual memory, UI research, moodboards, reference libraries,
            and the workflows designers use to find the right idea again.
          </p>
        </div>
      </header>

      <main className={styles.section}>
        <div className={styles.container}>
          <div className={styles.postGrid}>
            <Link href={`/blog/${featuredPost.slug}`} className={styles.postCard}>
              <div>
                <p className={styles.cardCategory}>{featuredPost.category}</p>
                <h2 className={styles.cardTitle}>{featuredPost.title}</h2>
                <p className={styles.cardExcerpt}>{featuredPost.excerpt}</p>
              </div>
              <div className={styles.cardFooter}>
                <span>{featuredPost.author}</span>
                <span>{featuredPost.readTime}</span>
              </div>
            </Link>

            <aside className={styles.sideCard}>
              <h2>For designers building a visual memory</h2>
              <p>
                The Nyabag blog covers design inspiration apps, UI research workflows,
                visual bookmarking, reference organization, and clean systems for remembering
                what inspired you.
              </p>
              <div className={styles.tagList}>
                {featuredPost.keywords.slice(0, 7).map((keyword) => (
                  <span key={keyword} className={styles.tag}>{keyword}</span>
                ))}
              </div>
            </aside>
          </div>

          {otherPosts.length > 0 && (
            <div className={styles.morePosts}>
              {otherPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.postCard}>
                  <div>
                    <p className={styles.cardCategory}>{post.category}</p>
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>{post.author}</span>
                    <span>{post.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <BlogCta />
      <BlogFooter />
    </div>
  );
}
