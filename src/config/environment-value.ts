export type EnvironmentSource = Readonly<Record<string, unknown>>;

const BOOLEAN_VALUES = new Map<string, boolean>([
  ['false', false],
  ['true', true],
]);

export function readRequiredString(
  source: EnvironmentSource,
  key: string,
): string {
  const raw = source[key];

  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${key} must be a non-empty string`);
  }

  return raw.trim();
}

export function readString(
  source: EnvironmentSource,
  key: string,
  fallback: string,
): string {
  const raw = source[key];

  return raw === undefined ? fallback : readRequiredString(source, key);
}

export function readBoolean(
  source: EnvironmentSource,
  key: string,
  fallback: boolean,
): boolean {
  const raw = source[key];

  if (raw === undefined) {
    return fallback;
  }

  if (typeof raw !== 'string' && typeof raw !== 'boolean') {
    throw new Error(`${key} must be either true or false`);
  }

  const value = BOOLEAN_VALUES.get(String(raw).trim().toLowerCase());

  if (value === undefined) {
    throw new Error(`${key} must be either true or false`);
  }

  return value;
}

function readInteger(
  source: EnvironmentSource,
  key: string,
  fallback: number,
  minimum: number,
  requirement: string,
): number {
  const raw = source[key];
  let value: number;

  if (raw === undefined) {
    value = fallback;
  } else if (typeof raw === 'number') {
    value = raw;
  } else if (typeof raw === 'string' && raw.trim() !== '') {
    value = Number(raw);
  } else {
    value = Number.NaN;
  }

  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${key} must be ${requirement}`);
  }

  return value;
}

export function readNonNegativeInteger(
  source: EnvironmentSource,
  key: string,
  fallback: number,
): number {
  return readInteger(source, key, fallback, 0, 'a non-negative integer');
}

export function readPositiveInteger(
  source: EnvironmentSource,
  key: string,
  fallback: number,
): number {
  return readInteger(source, key, fallback, 1, 'a positive integer');
}
