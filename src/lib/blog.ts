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
  blocks?: BlogContentBlock[];
};

export type BlogInline =
  | string
  | {
      text: string;
      href: string;
      external?: boolean;
    };

export type BlogContentBlock =
  | {
      type: "paragraph";
      content: BlogInline[];
    }
  | {
      type: "list";
      items: BlogInline[][];
    };

export type BlogComparison = {
  eyebrow: string;
  title: string;
  columns: string[];
  rows: string[][];
};

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle?: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  authorBio?: string;
  authorSameAs?: string;
  includeFaqSchema?: boolean;
  readTime: string;
  category: string;
  keywords: string[];
  tools: BlogTool[];
  comparison?: BlogComparison;
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
  {
    slug: "how-to-organize-design-inspiration",
    title: "How to Organize Design Inspiration So You Can Actually Find It Later",
    metaTitle: "How to Organize Design Inspiration the Right Way | Nyabag",
    description:
      "Learn how to organize design inspiration with a practical workflow for saving websites, screenshots, UI references, notes, colors, and fonts.",
    ogTitle: "How to Organize Design Inspiration So You Can Actually Find It Later",
    ogDescription:
      "A practical workflow for organizing websites, screenshots, UI references, notes, colors, and fonts so your saved inspiration stays reusable.",
    excerpt:
      "Designers do not need more saved references. They need a system that makes screenshots, websites, UI patterns, notes, colors, and fonts easy to find again when the work begins.",
    publishedAt: "2026-06-02",
    updatedAt: "2026-06-02",
    author: "Jayanth Kumar",
    authorBio:
      "Jayanth Kumar is the founder of Nyabag, a visual memory system for designers. He writes about design inspiration workflows, visual bookmarking, UI research, and building systems that make references reusable.",
    authorSameAs: "https://www.linkedin.com/in/jayanzth",
    includeFaqSchema: false,
    readTime: "8 min read",
    category: "Design Inspiration",
    keywords: [
      "how to organize design inspiration",
      "organize design references",
      "design inspiration organizer",
      "design reference library",
      "visual bookmark manager for designers",
      "save design inspiration",
      "organize design bookmarks",
      "screenshots",
      "bookmarks",
      "UI references",
      "mood board",
      "notes",
      "tags",
      "color palettes",
      "fonts",
      "website inspiration",
    ],
    tools: [],
    comparison: {
      eyebrow: "Comparison",
      title: "Which tools work best for different jobs",
      columns: ["Tool", "Visual capture", "Search", "Tags", "Notes", "Team", "Pricing"],
      rows: [
        ["Notion", "Good", "Strong", "Strong", "Strong", "Strong", "Free + paid"],
        ["Pinterest", "Good", "Medium", "Weak", "Limited", "Medium", "Free"],
        ["Eagle", "Strong", "Strong", "Strong", "Medium", "Weak", "One-time paid"],
        ["Milanote", "Strong", "Strong", "Medium", "Strong", "Strong", "Free + paid"],
        ["Nyabag", "Strong", "Strong", "Strong", "Strong", "Not public yet", "Early access / pricing not public"],
      ],
    },
    sections: [
      {
        id: "intro",
        eyebrow: "Guide",
        title: "Designers do not need more saved references",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Knowing how to organize design inspiration matters more than collecting more of it. Most designers already save plenty: screenshots, website links, UI patterns, onboarding flows, landing pages, typography ideas, color references, and random details that feel worth keeping for later. The real problem starts when later finally arrives. One designer described inspiration as scattered everywhere across screenshots, notes, bookmarks, and a messy Notion page; another said saved screenshots eventually become a real pain to find. That is the problem this guide solves.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "A good system should make the right reference easier to recognise, not harder to remember. NN/g's heuristic of ",
              {
                text: "recognition rather than recall",
                href: "https://www.nngroup.com/articles/recognition-and-recall/",
                external: true,
              },
              " is useful here: people should not have to rely on memory when the interface can keep useful cues visible. NN/g also notes that people tend to ",
              {
                text: "remember pictures better than words",
                href: "https://www.nngroup.com/articles/picture-superiority-effect/",
                external: true,
              },
              ", which is exactly why screenshot previews usually outperform plain bookmark titles when you are searching for a saved idea weeks later.",
            ],
          },
        ],
      },
      {
        id: "why-finding-is-hard",
        title: "Why saving inspiration is easy but finding it is hard",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Saving is frictionless now. You can take a screenshot, hit Save in Pinterest, clip a page into Notion, drop an image into Milanote, or throw a link into a WhatsApp chat in seconds. Most modern tools are good at capture. The failure happens during retrieval, because the saved item often loses the context that made it useful in the first place.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "A filename like Screenshot 2026-06-02 at 11.14.png tells you almost nothing. A bookmark title like Stripe - Payments tells you even less if what you actually wanted was the layout, the card hierarchy, or the way the page handled contrast. Without visual cues, notes, tags, or source context, future-you has to guess why past-you saved it.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "That guesswork creates cognitive load. NN/g describes ",
              {
                text: "working memory as a limited resource",
                href: "https://www.nngroup.com/articles/working-memory-external-memory/",
                external: true,
              },
              " and explains that tasks feel harder when they overload it. If your reference system forces you to remember where something was saved, what it looked like, and why it mattered, the system is already too expensive to use.",
            ],
          },
        ],
      },
      {
        id: "why-systems-break",
        title: "Why most inspiration systems break after a few weeks",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: ["Most systems fail for one of four reasons."],
          },
          {
            type: "paragraph",
            content: [
              "First, they are too scattered. You save websites in bookmarks, app screens in screenshots, long-form projects in Behance saves, random links in chats, and polished ideas in Pinterest boards. Each tool holds a different piece of the picture, so the collection stops behaving like a library and starts behaving like loose memory.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "Second, they store the asset but not the reason. A screenshot without a note is just a picture. A link without a preview is just a URL. A board without clear grouping turns into a big visual attic.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "Third, the structure is either too loose or too rigid. If everything goes into one giant dump, search quality drops. If you create twenty deeply nested folders on day one, the system becomes slow to maintain. Designers in community threads also point out another problem: some organisation tools eventually feel like more work to organize and label stuff. That is a crucial warning. A system that demands too much housekeeping will be abandoned, even if it looks smart on paper.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "Fourth, there is no review habit. Inspiration libraries decay when nothing gets renamed, regrouped, or revisited. The answer is not more complexity. It is a lighter workflow.",
            ],
          },
        ],
      },
      {
        id: "usable-system-needs",
        title: "What a usable design inspiration system actually needs",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: ["A usable design inspiration system should do five things well."],
          },
          {
            type: "paragraph",
            content: [
              "It should keep a visual preview. This matters because ",
              {
                text: "pictures are easier to recognise than text alone",
                href: "https://www.nngroup.com/articles/picture-superiority-effect/",
                external: true,
              },
              ". If you save a pricing page because of its spacing, or a dashboard because of its card rhythm, a preview helps you spot it instantly later.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "It should keep the source URL. Screenshots often lose provenance. When you finally want to inspect a live interaction, revisit the full page, or credit the source, you need the original link, not just an image.",
            ],
          },
          {
            type: "paragraph",
            content: ["It should capture lightweight context. A one-line reason is often enough:"],
          },
          {
            type: "list",
            items: [
              ["Saved for dark SaaS sidebar treatment"],
              ["Good onboarding progress indicator"],
              ["Interesting use of serif + sans pairing"],
              ["Like the way this pricing table reduces noise"],
            ],
          },
          {
            type: "paragraph",
            content: [
              "It should support simple tags or facets, not taxonomy theatre. Tags like landing-page, dashboard, mobile, typography, navigation, checkout, or editorial are usually enough. The goal is to narrow retrieval, not to build a museum archive.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "And it should make search and browse work together. Sometimes you know what you want and can search for dark navigation. Sometimes you need to scan visually and let recognition do the work. The best systems support both.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "That is also why purely text-based lists age badly. ",
              {
                text: "Nyabag's positioning",
                href: `${SITE_URL}/`,
              },
              " is strong here: the live product pages emphasise full-page screenshot capture, metadata and tags, visual cards, smart search, source URLs, notes, and a canvas for grouping references into structured ideas. In other words, the product is being built around the exact cues that make rediscovery easier.",
            ],
          },
        ],
      },
      {
        id: "workflow",
        title: "A simple workflow that works: Capture, Context, Categorize, Review, Rediscover",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: ["Use this five-step workflow."],
          },
          {
            type: "paragraph",
            content: [
              "Capture. Save the reference as close to discovery as possible. If it is a website, save the URL and generate a preview. If it is an app screen, save the screenshot. If it is a motion or interaction pattern, save the best available entry point and not just a cropped fragment. The goal at this stage is speed.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "Context. Add one sentence immediately. Not later. Right now. Answer one question: Why did I save this?",
            ],
          },
          {
            type: "list",
            items: [
              ["Saved for compact card layout on mobile"],
              ["Helpful empty-state copy tone"],
              ["Good hero hierarchy for AI landing pages"],
              ["Strong muted palette for fintech UI"],
            ],
          },
          {
            type: "paragraph",
            content: ["This is the single highest-leverage habit in the whole system."],
          },
          {
            type: "paragraph",
            content: [
              "Categorize. Add just enough structure to make future search easier. A practical approach is to use three tag layers:",
            ],
          },
          {
            type: "list",
            items: [
              ["Asset type: website, screenshot, flow, pattern, typography, color"],
              ["Use case: onboarding, pricing, dashboard, auth, checkout, settings"],
              ["Style or quality: minimal, dark, editorial, playful, dense, premium"],
            ],
          },
          {
            type: "paragraph",
            content: [
              "If the reference belongs to a live project, add a project tag too. That gives you two ways back in later: by pattern and by project.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "Review. Set a ten-minute weekly review. Archive junk. Merge duplicates. Rename vague items. Add missing notes to anything that still looks useful. If you save a lot, this matters more than perfect folder design. Review is what keeps a reference library alive.",
            ],
          },
          {
            type: "paragraph",
            content: ["Rediscover. When a new project starts, do not browse the entire collection. Start with the job:"],
          },
          {
            type: "list",
            items: [
              ["Show me navigation patterns"],
              ["Find warm minimal landing pages"],
              ["Find dashboards with restrained color use"],
              ["Find pricing pages with strong comparison blocks"],
            ],
          },
          {
            type: "paragraph",
            content: [
              "Then switch to visual scanning. This combination of search plus recognition is what makes a library feel usable instead of exhausting.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "If you need a tool to support that workflow, choose based on the shape of the work. Notion is flexible when you are happy building your own database; Pinterest is strong for fast discovery boards; Eagle is strong for local asset organisation; Milanote is strong for collaborative moodboards; and Nyabag is promising when you want a private, visual-first design memory built around saved websites, screenshots, metadata, notes, and a freeform canvas.",
            ],
          },
        ],
      },
      {
        id: "tool-comparison",
        title: "Which tools work best for different jobs",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: [
              "This table is a qualitative editorial comparison based on current public documentation and Nyabag's live product positioning. Notion supports web clipping, databases, gallery views, multi-select tags, search, sharing, and a free tier. Pinterest supports board-based saving, browser saving, board search, collaborators, and free accounts. Eagle focuses on image arrangement, tagging, search, and notes, but its own support docs say it does not offer dedicated team or enterprise permission management. Milanote combines visual boards, notes, clipping, search across boards, and collaboration, with both free and paid plans. Nyabag presents itself as a visual memory system with URL capture, screenshots, tags, source URLs, notes, smart search, and a canvas, but public team features and pricing are not yet published.",
            ],
          },
        ],
      },
      {
        id: "build-system",
        title: "Build a system you will actually use",
        paragraphs: [],
        blocks: [
          {
            type: "paragraph",
            content: [
              "The best design inspiration system is not the most elaborate one. It is the one you will still trust three months from now.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "Keep it visual. Keep the source. Add one sentence of context. Use a handful of tags. Review once a week. That is enough to turn random saves into a design reference library.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "And if you are looking for a tool built specifically around that workflow, that is the space ",
              {
                text: "Nyabag",
                href: `${SITE_URL}/#early-access`,
              },
              " is trying to own: not another bookmark graveyard, but a searchable visual memory for the references designers actually reuse.",
            ],
          },
          {
            type: "paragraph",
            content: [
              "For a broader comparison of tools designers use for discovery and memory, read our guide to the ",
              {
                text: "best design inspiration apps",
                href: `${SITE_URL}/blog/best-design-inspiration-apps`,
              },
              ".",
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best way to organize design inspiration?",
        answer:
          "The best way is to save each reference with a visual preview, the original source, a short note explaining why you saved it, and a few reusable tags. That combination makes it possible to search when you know what you want and browse visually when you do not.",
      },
      {
        question: "Should I organize design inspiration by project or by pattern?",
        answer:
          "Use both, but keep it lightweight. Project tags help when work is tied to a live brief. Pattern tags help when you want to reuse ideas across projects, such as onboarding, navigation, pricing, dashboards, or typography.",
      },
      {
        question: "Are browser bookmarks enough for design inspiration?",
        answer:
          "Browser bookmarks are good for quick saving, but they are weak for long-term rediscovery because they usually store a title and URL with very little visual or contextual information. Designers often need previews, notes, and tags as well.",
      },
      {
        question: "How many tags should I use?",
        answer:
          "Start with five to ten tags that cover asset type, use case, and style. Too many tags create maintenance overhead. The goal is not perfect classification. The goal is faster retrieval.",
      },
      {
        question: "What is the difference between a mood board and a design reference library?",
        answer:
          "A mood board is usually project-specific and helps explore direction, feeling, and style. A design reference library is broader and long-lived. It stores reusable screenshots, websites, UI patterns, notes, and ideas that you may return to across many projects.",
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
