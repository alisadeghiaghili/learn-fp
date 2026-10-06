import type { FpValue, FpFunction, FpString, FpList, FpAdt, FpEither, FpMaybe, FpLazyList, FpIo } from './types';

// ── Type guards ───────────────────────────────────────────────────────────────

export function isStr(v: FpValue): v is FpString {
  return (v as FpString).__str === true;
}
export function isList(v: FpValue): v is FpList {
  return (v as FpList).__list === true;
}
export function isFn(v: FpValue): v is FpFunction {
  return (v as FpFunction).__fn === true;
}
export function isAdt(v: FpValue): v is FpAdt {
  return (v as FpAdt).__adt === true;
}
export function isEither(v: FpValue): v is FpEither {
  return (v as FpEither).__either === true;
}
export function isMaybe(v: FpValue): v is FpMaybe {
  return (v as FpMaybe).__maybe === true;
}
export function isLazy(v: FpValue): v is FpLazyList {
  return (v as FpLazyList).__lazy === true;
}
export function isIo(v: FpValue): v is FpIo {
  return (v as FpIo).__io === true;
}

/** Read the inner string of a string value, or null. */
export function strOf(v: FpValue): string | null {
  if (typeof v === 'string') return v;
  if (isStr(v)) return v.v;
  return null;
}

/** Short readable representation for the board and terminal. */
export function reprOf(v: FpValue, depth = 0): string {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return JSON.stringify(v);
  if (isStr(v)) return JSON.stringify(v.v);
  if (isFn(v)) return `⟨fn ${v.name}⟩`;
  if (isList(v)) {
    if (v.items.length === 0) return '[]';
    if (depth > 3) return '[…]';
    return `[${v.items.map((i) => reprOf(i, depth + 1)).join(' ')}]`;
  }
  if (isAdt(v)) return v.args.length ? `${v.cons}(${v.args.map((a) => reprOf(a, depth + 1)).join(', ')})` : v.cons;
  if (isEither(v)) return `${v.side}(${reprOf(v.v, depth + 1)})`;
  if (isMaybe(v)) return v.just ? `Just(${reprOf(v.v, depth + 1)})` : 'None';
  if (isLazy(v)) return `⟨lazy ${v.name}⟩`;
  if (isIo(v)) return `⟨io ${v.action}⟩`;
  return '?';
}

/** Compact one-word type label for a value. */
export function typeOf(v: FpValue): string {
  if (typeof v === 'number') return 'num';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string' || isStr(v)) return 'str';
  if (isFn(v)) return 'fn';
  if (isList(v)) return `list(${v.items.length ? typeOf(v.items[0] as FpValue) : 'a'})`;
  if (isAdt(v)) return v.cons;
  if (isEither(v)) return 'Either';
  if (isMaybe(v)) return 'Maybe';
  if (isLazy(v)) return 'stream';
  if (isIo(v)) return 'IO';
  return '?';
}

/** True when the value carries an observable side effect. */
export function effectfulOf(v: FpValue): boolean {
  if (isIo(v)) return true;
  if (isFn(v)) return !v.pure;
  return false;
}

/** Produce (and consume) the next element of a lazy stream recipe. */
export function lazyNext(l: FpLazyList): FpValue {
  switch (l.kind) {
    case 'from': {
      const val = (l.n ?? 0) + l.cursor;
      l.cursor += 1;
      return val;
    }
    case 'repeat': {
      l.cursor += 1;
      return l.item as FpValue;
    }
    case 'drop': {
      l.cursor += 1;
      return l.inner ? lazyNext(l.inner) : 0;
    }
  }
}

