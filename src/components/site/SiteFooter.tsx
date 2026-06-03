"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./site-chrome.module.css";

const productLinks = [
  { href: "/#save", label: "Save" },
  { href: "/#enrich", label: "Enrich" },
  { href: "/#organize", label: "Organize" },
  { href: "/#think", label: "Canvas" },
  { href: "/#early-access", label: "Early access" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.footerWatermark} aria-hidden="true" />
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.logoLink} aria-label="Nyabag home">
            <Image
              src="/assets/Nyabag-Dark-Logo.svg"
              alt="Nyabag"
              width={594}
              height={300}
              className={styles.logo}
            />
          </Link>
          <span className={styles.spacer}>
          &copy; {new Date().getFullYear()} Nyabag. Made with {"\u2764\uFE0F"} by{" "}
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

        <nav className={styles.footerNav} aria-label="Footer links">
          <div className={styles.footerCol}>
            <div className={styles.footerColTitle}>Product</div>
            {productLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.footerLink}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className={styles.footerCol}>
            <div className={styles.footerColTitle}>Legal</div>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.footerLink}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
