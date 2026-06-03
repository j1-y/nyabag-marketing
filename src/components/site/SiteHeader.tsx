"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./site-chrome.module.css";

const navLinks = [
  { href: "/#save", label: "Save" },
  { href: "/#enrich", label: "Enrich" },
  { href: "/#organize", label: "Organize" },
  { href: "/#think", label: "Canvas" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader() {
  return (
    <nav className={styles.header} aria-label="Main navigation">
      <Link href="/" className={styles.logoLink} aria-label="Nyabag home">
        <Image
          src="/assets/Nyabag-Dark-Logo.svg"
          alt="Nyabag"
          width={594}
          height={118}
          priority
          className={styles.logo}
        />
      </Link>

      <div className={styles.headerLinks} role="list">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={styles.headerLink} role="listitem">
            {link.label}
          </Link>
        ))}
      </div>

      <Link href="/#early-access" className={styles.headerCta}>
        Join early access
      </Link>
    </nav>
  );
}
