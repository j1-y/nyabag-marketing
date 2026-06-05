"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowSquareOutIcon,
  PaletteIcon,
  SpinnerIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { generateDesignDnaFromBookmark, regenerateDesignDna } from "@/lib/actions";
import type { DesignDna } from "@/lib/types";
import { Button } from "@/components/ui/button";

function TopSwatches({ colors }: { colors: DesignDna["colors"] }) {
  return (
    <div className="design-dna-mini-swatches" aria-label="Design DNA colors">
      {colors.slice(0, 3).map((color) => (
        <span key={color.hex} style={{ backgroundColor: color.hex }} title={color.hex} />
      ))}
    </div>
  );
}

export function DesignDnaBookmarkPanel({
  bookmarkId,
  initialDesignDna,
}: {
  bookmarkId: string;
  initialDesignDna: DesignDna | null;
}) {
  const router = useRouter();
  const [localDesignDna, setLocalDesignDna] = useState<DesignDna | null>(null);
  const designDna = localDesignDna ?? initialDesignDna;
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const status = isPending ? "pending" : designDna?.extraction_status;

  function generate() {
    setError("");
    startTransition(async () => {
      const result = await generateDesignDnaFromBookmark(bookmarkId);
      if (result.success) {
        setLocalDesignDna(result.data);
        router.refresh();
      } else {
        setLocalDesignDna(null);
        setError(result.error);
        router.refresh();
      }
    });
  }

  function regenerate() {
    if (!designDna) return generate();
    setError("");
    startTransition(async () => {
      const result = await regenerateDesignDna(designDna.id);
      if (result.success) {
        setLocalDesignDna(result.data);
        router.refresh();
      } else {
        setLocalDesignDna(null);
        setError(result.error);
        router.refresh();
      }
    });
  }

  return (
    <section className="design-dna-bookmark-panel">
      <div className="design-dna-bookmark-panel__header">
        <span className="design-dna-bookmark-panel__icon">
          <PaletteIcon size={16} />
        </span>
        <h2>{designDna?.extraction_status === "completed" ? "Design DNA saved" : "Design DNA"}</h2>
        <span className={`design-dna-bookmark-panel__status design-dna-bookmark-panel__status--${status || "missing"}`}>
          {status === "completed" ? "saved" : status === "failed" ? "failed" : status === "pending" ? "pending" : "missing"}
        </span>
      </div>

      {!designDna && !isPending ? (
        <div className="design-dna-bookmark-panel__state">
          <p>Extract typography, colors, components, and layout patterns from this bookmark.</p>
          <Button type="button" variant="outline" onClick={generate}>
            <PaletteIcon />
            Generate Design DNA
          </Button>
        </div>
      ) : status === "pending" ? (
        <div className="design-dna-bookmark-panel__state">
          <p>Extracting HTML/CSS styles...</p>
          <SpinnerIcon className="animate-spin" size={16} />
        </div>
      ) : designDna?.extraction_status === "failed" ? (
        <div className="design-dna-bookmark-panel__state">
          <p>Could not extract styles from this site.</p>
          <Button type="button" variant="outline" onClick={regenerate} disabled={isPending}>
            {isPending ? <SpinnerIcon className="animate-spin" /> : <ArrowsClockwiseIcon />}
            Try again
          </Button>
        </div>
      ) : designDna ? (
        <div className="design-dna-bookmark-panel__body">
          <div className="design-dna-bookmark-panel__summary">
            <TopSwatches colors={designDna.colors} />
            <span>{designDna.typography[0]?.fontFamily || "Font inferred"}</span>
            <span>{designDna.components.length} components</span>
            <span>{designDna.layout_patterns.length} patterns</span>
          </div>
          <div className="design-dna-bookmark-panel__actions">
            <Button asChild>
              <Link href={`/app/design-dna/${designDna.id}`}>
                <ArrowSquareOutIcon />
                Open Design DNA
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={regenerate} disabled={isPending}>
              {isPending ? <SpinnerIcon className="animate-spin" /> : <ArrowsClockwiseIcon />}
              Regenerate
            </Button>
          </div>
        </div>
      ) : null}

      {error && <p className="design-dna-bookmark-panel__error" role="alert">{error}</p>}
    </section>
  );
}
