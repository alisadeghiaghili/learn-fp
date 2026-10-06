import type { Expr, MatchCase } from './types';

type TokKind = 'num' | 'str' | 'ident' | 'op' | 'lparen' | 'rparen' | 'lbracket' | 'rbracket' | 'lbrace' | 'rbrace' | 'comma' | 'arrow' | 'eq' | 'semi' | 'kw';

interface Token {
  kind: TokKind;
  text: string;
  /** True when whitespace separated this token from the previous one. */
  ws?: boolean;
}

const KEYWORDS = new Set(['let', 'fn', 'in', 'match', 'if', 'then', 'else', 'true', 'false', 'def', 'type']);

const OPS = new Set(['+', '-', '*', '/', '==', '!=', '>', '<', '>=', '<=', 'and', 'or', 'not']);

export function tokenize(input: string): Token[] {
  const src = input.replace(/;(?=;)/g, '; '); // avoid ;; edge
  const toks: Token[] = [];
  let i = 0;
  let prevWs = false;
  const push = (kind: TokKind, text: string) => {
    toks.push({ kind, text, ws: prevWs || undefined });
    prevWs = false;
  };
  while (i < src.length) {
    const c = src[i] as string;
    if (c === '\n' || c === '\t' || c === ' ' || c === '\r') {
      prevWs = true;
      i++;
      continue;
    }
    if (c === '#') {
      // line comment
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '"') {
      i++;
      let s = '';
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) {
          const n = src[i + 1] as string;
          s += n === 'n' ? '\n' : n;
          i += 2;
        } else {
          s += src[i] as string;
          i++;
        }
      }
      i++; // closing quote
      push('str', s);
      continue;
    }
    if (c >= '0' && c <= '9' || (c === '-' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      let num = '';
      if (c === '-') num += '-', i++;
      while (i < src.length && (src[i] >= '0' && src[i] <= '9' || src[i] === '.')) {
        num += src[i] as string;
        i++;
      }
      push('num', num);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let id = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i] as string)) {
        id += src[i] as string;
        i++;
      }
      if (KEYWORDS.has(id)) push('kw', id);
      else if (OPS.has(id)) push('kw', id);
      else push('ident', id);
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '=>' || two === '->') { push('arrow', two); i += 2; continue; }
    if (two === '==' || two === '!=' || two === '>=' || two === '<=') { push('op', two); i += 2; continue; }
    if (c === '(') { push('lparen', c); i++; continue; }
    if (c === ')') { push('rparen', c); i++; continue; }
    if (c === '[') { push('lbracket', c); i++; continue; }
    if (c === ']') { push('rbracket', c); i++; continue; }
    if (c === '{') { push('lbrace', c); i++; continue; }
    if (c === '}') { push('rbrace', c); i++; continue; }
    if (c === ',') { push('comma', c); i++; continue; }
    if (c === '=' && src[i + 1] !== '>') { push('eq', '='); i++; continue; }
    if (c === ';') { push('semi', c); i++; continue; }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%' || c === '>' || c === '<') { push('op', c); i++; continue; }
    throw new Error(`Unexpected character '${c}'`);
  }
  return toks;
}

export class ParseError extends Error {}

export function parseExpr(src: string): Expr {
  const toks = tokenize(src);
  let pos = 0;
  const peek = (): Token | null => toks[pos] ?? null;
  const next = (): Token | undefined => toks[pos++] as Token | undefined;
  const at = (kind: TokKind, text?: string): boolean => {
    const t = peek();
    return !!t && t.kind === kind && (text === undefined || t.text === text);
  };
  // True when a `(` immediately follows (no intervening whitespace) — the marker
  // that `Name(...)` is a constructor/call, not `name <space> (...)`.
  const atParen = (): boolean => {
    const t = peek();
    return !!t && t.kind === 'lparen' && !t.ws;
  };
  const expect = (kind: TokKind, text?: string): Token => {
    const t = next();
    if (!t || t.kind !== kind || (text !== undefined && t.text !== text)) {
      throw new ParseError(`Expected ${text ?? kind}, got ${t ? t.text : 'end'}`);
    }
    return t;
  };

  function expr(): Expr {
    return infix(0);
  }

  const PREC: Record<string, number> = { '==': 1, '!=': 1, '>': 2, '<': 2, '>=': 2, '<=': 2, '+': 3, '-': 3, '*': 4, '/': 4, '%': 4, 'and': 0, 'or': 0 };

  // A token that can start the right side of a (space) application: a literal,
  // identifier/constructor, paren-group, or list. `->`/`=>`, `then`/`else`/`in`
  // and the bare operators never do.
  const isArgStart = (t: Token): boolean =>
    t.kind === 'num' ||
    t.kind === 'str' ||
    t.kind === 'lparen' ||
    t.kind === 'lbracket' ||
    t.kind === 'ident' ||
    (t.kind === 'kw' && !['then', 'else', 'in', 'and', 'or', 'not', 'if', 'match', 'fn', 'let'].includes(t.text));

  function infix(minPrec: number): Expr {
    let lhs = prefix();
    for (;;) {
      const t = peek();
      if (!t) break;
      const isOp = t.kind === 'op' || (t.kind === 'kw' && (t.text === 'and' || t.text === 'or'));
      if (isOp) {
        const prec = PREC[t.text];
        if (prec === undefined || prec < minPrec) break;
        next();
        const rhs = infix(prec + 1);
        lhs = { t: 'bin', op: t.text, l: lhs, r: rhs };
        continue;
      }
      // Function application: `f a b` => ((f a) b) (left-associative, tightest).
      // The argument is a tight `prefix()` so binary operators bind outside it
      // (e.g. `f x + y` parses as `(f x) + y`).
      if (isArgStart(t)) {
        const arg = prefix();
        lhs = { t: 'app', fn: lhs, args: [arg] };
        continue;
      }
      break;
    }
    return lhs;
  }

  function prefix(): Expr {
    const t = peek();
    if (!t) throw new ParseError('Unexpected end of expression');
    if (t.kind === 'num') { next(); return { t: 'num', v: Number(t.text) }; }
    if (t.kind === 'str') { next(); return { t: 'str', v: t.text }; }
    if (t.kind === 'kw') {
      if (t.text === 'true') { next(); return { t: 'bool', v: true }; }
      if (t.text === 'false') { next(); return { t: 'bool', v: false }; }
      if (t.text === 'not') { next(); return { t: 'un', op: 'not', e: prefix() }; }
      if (t.text === 'if') return parseIf();
      if (t.text === 'match') return parseMatch();
      if (t.text === 'fn') return parseLambda();
      if (t.text === 'let') return parseLet();
    }
    if (t.kind === 'op' && t.text === '-') {
      next();
      return { t: 'un', op: '-', e: prefix() };
    }
    if (t.kind === 'lparen') {
      next();
      const e = expr();
      expect('rparen');
      return e;
    }
    if (t.kind === 'lbracket') return parseList();
    if (t.kind === 'ident' || (t.kind === 'kw' && KEYWORDS.has(t.text) && !['let', 'fn', 'in', 'match', 'if', 'then', 'else', 'true', 'false'].includes(t.text))) {
      next();
      // `Name(...)` — only when the `(` is glued (no space). A constructor when
      // capitalized (`Circle(3)`), a function call otherwise (`bump()`, `f(1,2)`).
      // With a space before the `(`, it is *not* a call — space application in
      // `infix` will treat `( ... )` as the argument instead.
      if (atParen()) {
        next();
        const args: Expr[] = [];
        if (!at('rparen')) {
          args.push(expr());
          while (at('comma')) { next(); args.push(expr()); }
        }
        expect('rparen');
        return /^[A-Z]/.test(t.text)
          ? { t: 'cons', name: t.text, args }
          : { t: 'app', fn: { t: 'ident', name: t.text }, args };
      }
      return { t: 'ident', name: t.text };
    }
    throw new ParseError(`Unexpected token '${t.text}'`);
  }

  function parseLambda(): Expr {
    expect('kw', 'fn');
    expect('lparen');
    const params: string[] = [];
    if (!at('rparen')) {
      params.push(expect('ident').text);
      while (at('comma')) { next(); params.push(expect('ident').text); }
    }
    expect('rparen');
    expect('arrow');
    const body = expr();
    return { t: 'fn', params, body };
  }

  function parseLet(): Expr {
    expect('kw', 'let');
    const name = expect('ident').text;
    expect('eq');
    const value = expr();
    // trailing `in expr`
    if (at('kw', 'in')) {
      next();
      const body = expr();
      return { t: 'let', name, value, in: body };
    }
    // statement form: just the value (name bound externally by caller)
    return { t: 'let', name, value, in: value };
  }

  function parseIf(): Expr {
    expect('kw', 'if');
    const cond = expr();
    expect('kw', 'then');
    const then = expr();
    expect('kw', 'else');
    const elseE = expr();
    return { t: 'if', cond, then, else: elseE };
  }

  function parseMatch(): Expr {
    expect('kw', 'match');
    const scrutinee = expr();
    expect('lbrace');
    const cases: MatchCase[] = [];
    while (!at('rbrace')) {
      // pattern
      const t = next();
      if (!t) throw new ParseError('Unexpected end of match');
      if (t.kind === 'ident') {
        // Cons(h, t) or Nil
        const name = t.text;
        const vars: string[] = [];
        if (at('lparen')) {
          next();
          if (!at('rparen')) {
            vars.push(expect('ident').text);
            while (at('comma')) { next(); vars.push(expect('ident').text); }
          }
          expect('rparen');
        }
        expect('arrow');
        cases.push({ pattern: name, vars, body: expr() });
      } else if (t.kind === 'op' && t.text === '_') {
        expect('arrow');
        cases.push({ pattern: '_', vars: [], body: expr() });
      } else {
        throw new ParseError(`Bad pattern '${t.text}' in match`);
      }
      if (!at('rbrace') && !at('semi') && !at('comma')) break;
      if (at('semi') || at('comma')) next();
    }
    expect('rbrace');
    return { t: 'match', scrutinee, cases };
  }

  function parseList(): Expr {
    expect('lbracket');
    const items: Expr[] = [];
    if (!at('rbracket')) {
      items.push(prefix());
      for (;;) {
        if (at('comma')) { next(); items.push(expr()); continue; }
        // Space-separated items: keep collecting while another list element can
        // follow. Stop at the closing bracket or once the current `expr` has
        // already absorbed everything (e.g. a full `map f xs` call).
        const p = peek();
        if (p && p.kind !== 'rbracket' && isArgStart(p)) items.push(prefix());
        else break;
      }
    }
    expect('rbracket');
    return { t: 'list', items };
  }

  const result = expr();
  if (pos < toks.length) {
    throw new ParseError(`Unexpected trailing '${(peek() as Token).text}'`);
  }
  return result;
}
