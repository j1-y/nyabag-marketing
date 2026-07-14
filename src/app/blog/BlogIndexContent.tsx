"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./blog.module.css";

export type BlogCardPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  category: string;
  bannerImage?: string;
  bannerAlt?: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function BlogIndexContent({ posts }: { posts: BlogCardPost[] }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const categories = ["All", ...Array.from(new Set(posts.map((post) => post.category)))];

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === "All" || post.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, posts, query]);

  return (
    <>
      <div className={styles.blogToolbar}>
        <div className={styles.categoryTabs} aria-label="Filter blog posts by category">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.categoryTab} ${category === item ? styles.categoryTabActive : ""}`}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className={styles.searchField}>
          <span className={styles.srOnly}>Search Nyabag articles</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles…"
          />
        </label>
      </div>

      {filteredPosts.length > 0 ? (
        <div className={styles.editorialGrid}>
          {filteredPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.editorialCard}>
              {post.bannerImage && (
                <div className={styles.cardBanner}>
                  <Image
                    src={post.bannerImage}
                    alt={post.bannerAlt ?? ""}
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />
                </div>
              )}
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className={styles.editorialMeta}>
                <span>{post.author}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No articles match this search.</p>
          <button type="button" onClick={() => { setCategory("All"); setQuery(""); }}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
