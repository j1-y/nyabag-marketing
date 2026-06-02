import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost, getBlogUrl, SITE_URL, type BlogContentBlock, type BlogInline } from "@/lib/blog";
import styles from "../blog.module.css";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Blog post not found - Nyabag",
    };
  }

  const url = getBlogUrl(post.slug);

  return {
    title: post.metaTitle ?? `${post.title} - Nyabag`,
    description: post.description,
    keywords: post.keywords,
    robots:
      post.slug === "how-to-organize-design-inspiration"
        ? {
            googleBot: {
              index: true,
              follow: true,
              "max-image-preview": "large",
              "max-snippet": -1,
              "max-video-preview": -1,
            },
          }
        : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.ogTitle ?? post.title,
      description: post.ogDescription ?? post.description,
      url,
      siteName: "Nyabag",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.ogTitle ?? post.title,
      description: post.ogDescription ?? post.description,
      images: ["/opengraph-image.png"],
    },
  };
}

function BlogNav() {
  return (
    <nav className={styles.nav} aria-label="Blog navigation">
      <Link href="/" className={styles.navLogo} aria-label="Nyabag home">
        <img src="/assets/Nyabag-Dark-Logo.svg" alt="Nyabag" />
      </Link>
      <div className={styles.navLinks}>
        <Link href="/blog" className={styles.navLink}>Blog</Link>
        <Link href="/" className={styles.navLink}>Home</Link>
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

function AuthorBio({ bio }: { bio: string }) {
  return (
    <section className={styles.authorSection} aria-labelledby="author-title">
      <div className={styles.articleContainer}>
        <div className={styles.authorBio}>
          <p className={styles.sectionEyebrow} id="author-title">Author</p>
          <p>{bio}</p>
        </div>
      </div>
    </section>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function renderInline(content: BlogInline[], keyPrefix: string) {
  return content.map((part, index) => {
    if (typeof part === "string") return part;

    return (
      <Link
        key={`${keyPrefix}-${index}`}
        href={part.href}
        className={styles.articleLink}
        target={part.external ? "_blank" : undefined}
        rel={part.external ? "noopener noreferrer" : undefined}
      >
        {part.text}
      </Link>
    );
  });
}

function renderBlock(block: BlogContentBlock, index: number) {
  if (block.type === "paragraph") {
    return <p key={`paragraph-${index}`}>{renderInline(block.content, `paragraph-${index}`)}</p>;
  }

  return (
    <ul key={`list-${index}`} className={styles.articleList}>
      {block.items.map((item, itemIndex) => (
        <li key={`list-${index}-${itemIndex}`}>{renderInline(item, `list-${index}-${itemIndex}`)}</li>
      ))}
    </ul>
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleUrl = getBlogUrl(post.slug);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${articleUrl}#article`,
      headline: post.title,
      description: post.description,
      image: [`${SITE_URL}/opengraph-image.png`],
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      inLanguage: "en-IN",
      articleSection: post.category,
      author: post.authorSameAs
        ? {
            "@type": "Person",
            name: post.author,
            sameAs: post.authorSameAs,
          }
        : {
            "@type": "Organization",
            name: post.author,
            url: SITE_URL,
          },
      publisher: {
        "@type": "Organization",
        name: "Nyabag",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/assets/Nyabag-Dark-Logo.svg`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      keywords: post.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: getBlogUrl(),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: articleUrl,
        },
      ],
    },
    ...(post.includeFaqSchema === false
      ? []
      : [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          },
        ]),
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Nyabag",
      url: SITE_URL,
      logo: `${SITE_URL}/assets/Nyabag-Dark-Logo.svg`,
      description:
        "Nyabag is a visual memory system for designers to save, organize, and rediscover design inspiration.",
    },
  ];

  return (
    <div className={styles.root}>
      <BlogNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className={styles.articleHero}>
        <div className={styles.articleContainer}>
          <Link href="/blog" className={styles.backLink}>Blog</Link>
          <p className={styles.eyebrow}>{post.category}</p>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          <p className={styles.articleDescription}>{post.description}</p>
          <div className={styles.metaRow}>
            <span>By {post.author}</span>
            <span className={styles.dot} aria-hidden="true" />
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span className={styles.dot} aria-hidden="true" />
            <span>Updated {formatDate(post.updatedAt)}</span>
            <span className={styles.dot} aria-hidden="true" />
            <span>{post.readTime}</span>
          </div>
        </div>
      </header>

      <main className={styles.articleShell}>
        <div className={styles.articleContainer}>
          <aside className={styles.toc} aria-label="Table of contents">
            <h2>In this guide</h2>
            <ol>
              {post.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
              <li><a href="#comparison">Comparison table</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ol>
          </aside>

          <article className={styles.article}>
            {post.sections.map((section) => (
              <section key={section.id} id={section.id}>
                {section.eyebrow && <p className={styles.sectionEyebrow}>{section.eyebrow}</p>}
                <h2>{section.title}</h2>
                {section.blocks
                  ? section.blocks.map((block, index) => renderBlock(block, index))
                  : section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}

            <section id="comparison">
              <p className={styles.sectionEyebrow}>{post.comparison?.eyebrow ?? "Comparison"}</p>
              <h2>{post.comparison?.title ?? "Top design inspiration apps compared"}</h2>
              <table className={styles.comparison}>
                <thead>
                  <tr>
                    {(post.comparison?.columns ?? ["Tool", "Best for", "Strength", "Limitation", "Why designers use it"]).map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {post.comparison
                    ? post.comparison.rows.map((row) => (
                        <tr key={row.join("-")}>
                          {row.map((cell, index) => (
                            <td key={`${cell}-${index}`}>{cell}</td>
                          ))}
                        </tr>
                      ))
                    : post.tools.map((tool) => (
                        <tr key={tool.name}>
                          <td>{tool.rank}. {tool.name}</td>
                          <td>{tool.bestFor}</td>
                          <td>{tool.strength}</td>
                          <td>{tool.limitation}</td>
                          <td>{tool.whyDesignersUseIt}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </section>

            <section id="faq">
              <p className={styles.sectionEyebrow}>FAQ</p>
              <h2>Design inspiration app questions</h2>
              <div className={styles.faqList}>
                {post.faqs.map((faq) => (
                  <div key={faq.question} className={styles.faq}>
                    <h3>{faq.question}</h3>
                    <p>{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

          </article>
        </div>
      </main>
      {post.authorBio && <AuthorBio bio={post.authorBio} />}
      <BlogCta />
      <BlogFooter />
    </div>
  );
}
