import { SpinnerIcon } from "@phosphor-icons/react/dist/ssr";

export default function CanvasLoading() {
  return (
    <div className="canvas-loading-overlay" role="status" aria-live="polite">
      <div className="canvas-loading-pill">
        <SpinnerIcon size={16} />
        <span>Loading canvas...</span>
      </div>
    </div>
  );
}
