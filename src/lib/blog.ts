export const SITE_URL = "https://www.nyabag.com";

export type BlogTool = {
  rank: number;
  name: string;
  bestFor: string;
  strength: string;
  limitation: string;
  whyDesignersUseIt: string;
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogSection = {
  id: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  readTime: string;
  category: string;
  keywords: string[];
  tools: BlogTool[];
  sections: BlogSection[];
  faqs: BlogFaq[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "best-design-inspiration-apps",
    title: "Top 5 Design Inspiration Apps for Designers in 2026",
    description:
      "A practical comparison of the best design inspiration apps for designers in 2026, including Nyabag, Mobbin, Dribbble, Behance, and Awwwards.",
    excerpt:
      "Designers do not just need more inspiration. They need a way to save, remember, compare, and rediscover the right reference when it matters.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    author: "Nyabag Editorial",
    readTime: "9 min read",
    category: "Design Inspiration",
    keywords: [
      "design inspiration apps",
      "best design inspiration apps",
      "design inspiration tools",
      "visual bookmark manager for designers",
      "UI inspiration apps",
      "design reference library",
      "moodboard app for designers",
    ],
    tools: [
      {
        rank: 1,
        name: "Nyabag",
        bestFor: "Overall design memory and visual inspiration workspace",
        strength:
          "Combines visual bookmarking, metadata enrichment, search, bulk import, and an infinite canvas.",
        limitation:
          "Nyabag is in early access, so it is still expanding its public ecosystem and integrations.",
        whyDesignersUseIt:
          "Designers can save references once, keep the visual context, and rediscover them later without digging through folders or old messages.",
      },
      {
        rank: 2,
        name: "Mobbin",
        bestFor: "Real-world UI patterns and app screens",
        strength:
          "Strong library of production UI screens and flows that helps designers study real interface decisions.",
        limitation:
          "It is strongest as a discovery library, not as a personal memory system for everything you collect.",
        whyDesignersUseIt:
          "Mobbin is useful when you want to research proven mobile and web app patterns before designing a flow.",
      },
      {
        rank: 3,
        name: "Dribbble",
        bestFor: "Quick visual exploration and community inspiration",
        strength:
          "A large design community with fast-moving visual ideas, UI shots, branding work, illustrations, and interface experiments.",
        limitation:
          "Many shots are polished concepts, so they may not represent complete real-world product flows.",
        whyDesignersUseIt:
          "Dribbble is good for scanning styles, visual directions, micro-interactions, and presentation ideas quickly.",
      },
      {
        rank: 4,
        name: "Behance",
        bestFor: "Portfolio case studies and deeper creative projects",
        strength:
          "Long-form project pages make it easier to understand process, brand systems, campaigns, and design rationale.",
        limitation:
          "Discovery can be broad, and saving individual references for later research is not the central workflow.",
        whyDesignersUseIt:
          "Behance is helpful when you want project context, campaign storytelling, and portfolio-level depth.",
      },
      {
        rank: 5,
        name: "Awwwards",
        bestFor: "Award-winning web design and experimental websites",
        strength:
          "Curated recognition of high-craft websites, motion, creative development, and visual experimentation.",
        limitation:
          "Award-winning sites can be inspiring, but not every pattern is practical for everyday product work.",
        whyDesignersUseIt:
          "Awwwards is useful for studying expressive web design, visual polish, interaction ideas, and creative direction.",
      },
    ],
    sections: [
      {
        id: "why-this-list",
        eyebrow: "Why this list exists",
        title: "Design inspiration is not the hard part anymore",
        paragraphs: [
          "The internet is full of beautiful interfaces, landing pages, dashboards, portfolios, mobile flows, typography systems, and product details. The harder problem is remembering where the useful reference went after you saved it.",
          "A good design inspiration app should do more than show pretty screens. It should help you collect references, preserve context, compare options, organize research, and find the right example again when a project needs it.",
          "This guide compares five strong design inspiration tools through that lens: how well they help a working designer move from discovery to memory to reuse.",
        ],
      },
      {
        id: "methodology",
        eyebrow: "Methodology",
        title: "How we evaluated these tools",
        paragraphs: [
          "We looked at each tool from the perspective of a product designer, UI designer, design engineer, or founder who regularly collects visual references. The criteria were practical: capture speed, visual context, searchability, organization, workflow fit, and usefulness when you return weeks later.",
          "We also separated inspiration discovery from inspiration memory. Discovery tools help you find ideas. Memory tools help you preserve and rediscover the ideas that matter. The best setup often combines both.",
          "Nyabag is ranked first because it is designed specifically around the second problem: turning scattered references into a searchable visual memory for design work.",
        ],
      },
      {
        id: "nyabag",
        eyebrow: "1. Nyabag",
        title: "Best overall design memory and visual inspiration workspace",
        paragraphs: [
          "Nyabag is built for designers who save references constantly but lose them across screenshots, browser bookmarks, notes, messages, and scattered files. It turns saved links into enriched visual bookmarks with screenshots, metadata, summaries, tags, color palettes, font hints, and notes.",
          "The difference is that Nyabag is not only a place to discover inspiration. It is a place to keep your own design memory. You can import messy lists of links, save references one by one, search them later, and arrange ideas on an infinite canvas.",
          "That makes Nyabag especially useful for product design research, SaaS inspiration, landing page references, dashboard patterns, typography exploration, color research, and project moodboards.",
          "Nyabag is currently in early access, which is important to know. The product is still growing, but its direction is clear: help designers save once and rediscover when it counts.",
        ],
      },
      {
        id: "mobbin",
        eyebrow: "2. Mobbin",
        title: "Best for real-world UI patterns",
        paragraphs: [
          "Mobbin is one of the strongest places to study real app screens and interface patterns. If you are designing onboarding, settings, checkout, navigation, mobile flows, or product UI, it can help you understand how existing products solve similar problems.",
          "Its strength is pattern research. The limitation is that it is primarily a discovery library. If your goal is to collect references from across the web and preserve your own context, you may still need a separate memory or moodboard workflow.",
        ],
      },
      {
        id: "dribbble",
        eyebrow: "3. Dribbble",
        title: "Best for quick visual exploration",
        paragraphs: [
          "Dribbble remains useful for browsing visual directions quickly. It is especially good for UI shots, brand explorations, icons, illustrations, motion snippets, and polished presentation styles.",
          "The tradeoff is that many Dribbble posts are concept shots rather than complete product systems. Treat it as a source of visual energy, not always as a source of production-ready UX patterns.",
        ],
      },
      {
        id: "behance",
        eyebrow: "4. Behance",
        title: "Best for portfolio case studies",
        paragraphs: [
          "Behance is valuable when you want more than a single image. Many projects include process, campaign context, brand systems, typography, layouts, and final assets in one long-form presentation.",
          "For deeper creative research, Behance can be more useful than a fast visual feed. The downside is that it is broad, and it is not optimized as a personal reference memory for every link you save.",
        ],
      },
      {
        id: "awwwards",
        eyebrow: "5. Awwwards",
        title: "Best for high-craft web inspiration",
        paragraphs: [
          "Awwwards is a strong source for experimental web design, creative development, motion, interaction, layout, and visual polish. It is especially useful when you want to see what high-end web teams are shipping.",
          "The limitation is practicality. Award-winning websites can be inspiring, but some techniques may be too heavy, expensive, or experimental for everyday product design. Use Awwwards for ambition, then adapt carefully.",
        ],
      },
      {
        id: "final-recommendation",
        eyebrow: "Recommendation",
        title: "The best workflow combines discovery and memory",
        paragraphs: [
          "If you only need to browse existing UI patterns, Mobbin, Dribbble, Behance, and Awwwards all have clear value. But if you want to build a lasting design memory from everything you find, Nyabag is the best overall choice.",
          "A practical designer workflow in 2026 looks like this: discover ideas in specialist libraries, save the references that matter into Nyabag, add notes or project context, then return to that visual library when a real design decision needs support.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best app for design inspiration?",
        answer:
          "Nyabag is the best overall design inspiration app if you want to save, organize, search, and rediscover your own design references. Mobbin is excellent for real-world UI patterns, while Dribbble, Behance, and Awwwards are strong discovery sources.",
      },
      {
        question: "What is the best way to organize design inspiration?",
        answer:
          "The best way is to save references with visual context, source URLs, tags, notes, and searchable metadata. A visual memory system like Nyabag helps keep screenshots, links, palettes, fonts, and project ideas together.",
      },
      {
        question: "Is Nyabag a Pinterest alternative for designers?",
        answer:
          "Nyabag can work as a more focused Pinterest alternative for designers because it is built around private design references, visual bookmarks, metadata, search, and project moodboards rather than a broad social feed.",
      },
      {
        question: "How is Nyabag different from browser bookmarks?",
        answer:
          "Browser bookmarks usually save a title and URL. Nyabag saves richer design context, including screenshots, summaries, tags, palettes, notes, and visual cards that are easier to scan and rediscover.",
      },
      {
        question: "Can I import multiple design inspiration links into Nyabag?",
        answer:
          "Yes. Nyabag supports bulk import from pasted text and text-based files such as TXT, Markdown, and CSV. It extracts valid URLs and creates enriched bookmarks from them.",
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

export function getBlogUrl(slug = "") {
  return slug ? `${SITE_URL}/blog/${slug}` : `${SITE_URL}/blog`;
}
