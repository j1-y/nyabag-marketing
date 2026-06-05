"use client";

import { useState, useTransition } from "react";
import { FileArrowDownIcon, PrinterIcon, SpinnerIcon } from "@phosphor-icons/react";
import { exportDesignDnaMarkdown } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function DesignDnaExportButtons({ designDnaId }: { designDnaId: string }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function downloadMarkdown() {
    setError("");
    startTransition(async () => {
      const result = await exportDesignDnaMarkdown(designDnaId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const blob = new Blob([result.data.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="design-dna-export-actions">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <PrinterIcon />
        Export PDF
      </Button>
      <Button type="button" variant="outline" onClick={downloadMarkdown} disabled={isPending}>
        {isPending ? <SpinnerIcon className="animate-spin" /> : <FileArrowDownIcon />}
        Export Design.md
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
