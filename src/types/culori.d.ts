declare module "culori" {
  export type CuloriColor = Record<string, unknown>;

  export function parse(value: string): CuloriColor | undefined;
  export function formatHex(color: CuloriColor): string | undefined;
  export function formatRgb(color: CuloriColor): string | undefined;
}
