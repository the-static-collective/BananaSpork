export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue | undefined };

export function canonicalJson(v: CanonicalValue): string {
  if (v === null || v === undefined) {
    return 'null';
  }

  const type = typeof v;

  if (type === 'boolean') {
    return v ? 'true' : 'false';
  }

  if (type === 'number') {
    return String(v);
  }

  if (type === 'string') {
    return JSON.stringify(v);
  }

  if (Array.isArray(v)) {
    const items = v.map((item) => canonicalJson(item ?? null));
    return `[${items.join(',')}]`;
  }

  if (type === 'object') {
    const keys = Object.keys(v as object).sort();
    const parts: string[] = [];

    for (const key of keys) {
      const val = (v as Record<string, CanonicalValue | undefined>)[key];
      if (val !== undefined) {
        parts.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
      }
    }

    return `{${parts.join(',')}}`;
  }

  throw new Error(`canonicalJson: unsupported value type ${type}`);
}
