/**
 * Short deadline helper for readiness pings (ADR-112).
 */

export class ProbeTimeoutError extends Error {
  readonly code = "timeout" as const;

  constructor(label: string) {
    super(`${label}_timeout`);
    this.name = "ProbeTimeoutError";
  }
}

/** Race a promise against a millisecond budget. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ProbeTimeoutError(label));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
