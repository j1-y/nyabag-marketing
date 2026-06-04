type PerfFn<T> = () => T;

export function isPerfEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_PERF === "true";
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function logTiming(label: string, startedAt: number) {
  if (!isPerfEnabled()) return;
  const duration = Math.round((now() - startedAt) * 10) / 10;
  console.info(`[perf] ${label}: ${duration}ms`);
}

export async function timeAsync<T>(label: string, fn: PerfFn<Promise<T>>): Promise<T> {
  if (!isPerfEnabled()) return fn();
  const startedAt = now();
  try {
    return await fn();
  } finally {
    logTiming(label, startedAt);
  }
}

export function timeSync<T>(label: string, fn: PerfFn<T>): T {
  if (!isPerfEnabled()) return fn();
  const startedAt = now();
  try {
    return fn();
  } finally {
    logTiming(label, startedAt);
  }
}
