import type { GoalCheck, ProgramState, FpFunction } from './types';
import { normValue, valueOf, fnOf } from './state';
import { isEither, isMaybe, isLazy } from './value';
import { reprOf } from './value';
import { parseExpr } from './parser';
import { evalExpr } from './eval';

export interface GoalStatus {
  met: boolean;
  label: string;
  detail: string;
  command?: string;
}

/** Normalize an expected-value literal into a comparable string by evaluating it. */
function normExpected(expected: string, state: ProgramState): string {
  try {
    const e = parseExpr(expected);
    const env = { values: { ...state.env.values }, fns: { ...state.env.fns }, adts: { ...state.env.adts } };
    return normValue(evalExpr(e, env, state));
  } catch {
    return expected.replace(/\s+/g, ' ').trim();
  }
}

export function checkOne(state: ProgramState, check: GoalCheck): GoalStatus {
  switch (check.kind) {
    case 'valueEquals': {
      const v = valueOf(state, check.name);
      const actual = v !== undefined ? normValue(v) : null;
      const expected = normExpected(check.value, state);
      const met = actual !== null && actual === expected;
      return { met, label: `${check.name} = ${check.value}`, detail: met ? 'ok' : v !== undefined ? `current = ${normValue(v)}` : `${check.name} not bound` };
    }
    case 'valueExists': {
      const met = check.name in state.env.values;
      return { met, label: `value ${check.name} exists`, detail: met ? `= ${state.values[check.name].repr}` : 'not defined yet' };
    }
    case 'functionDefined': {
      const met = check.name in state.env.fns;
      return { met, label: `function ${check.name} defined`, detail: met ? `pure = ${state.functions[check.name].pure}` : 'define it with `def`' };
    }
    case 'functionPure': {
      const f = fnOf(state, check.name);
      const met = !!f && f.pure;
      return { met, label: `${check.name} is pure`, detail: f ? (f.pure ? 'ok — no side effects' : 'has side effects') : 'not defined' };
    }
    case 'functionImpure': {
      const f = fnOf(state, check.name);
      const met = !!f && !f.pure;
      return { met, label: `${check.name} is impure`, detail: f ? (f.pure ? 'no side effects yet' : 'has side effects') : 'not defined' };
    }
    case 'composed': {
      const f = fnOf(state, check.name);
      const met = !!f && !!(f as FpFunction).composeChain;
      return { met, label: `composition ${check.name}`, detail: met ? 'ok' : 'build with `compose f g`' };
    }
    case 'resultEquals': {
      const actual = state.result ? state.result.repr : null;
      const expected = normExpected(check.value, state);
      const met = actual !== null && actual === expected;
      return { met, label: `result = ${check.value}`, detail: met ? 'ok' : state.result ? `current = ${state.result.repr}` : 'no result yet' };
    }
    case 'resultEffectful': {
      const met = !!state.result && state.result.effectful;
      return { met, label: 'result is effectful', detail: state.result ? (state.result.effectful ? 'ok — carries a side effect' : 'result is pure') : 'no result yet' };
    }
    case 'resultPure': {
      const met = !!state.result && !state.result.effectful;
      return { met, label: 'result is pure', detail: state.result ? (state.result.effectful ? 'result is effectful' : 'ok — pure value') : 'no result yet' };
    }
    case 'eitherRight': {
      const v = valueOf(state, check.name);
      const met = !!v && isEither(v) && v.side === 'Right';
      return { met, label: `${check.name} is a Right`, detail: v && isEither(v) ? v.side : 'not an Either' };
    }
    case 'eitherLeft': {
      const v = valueOf(state, check.name);
      const met = !!v && isEither(v) && v.side === 'Left';
      return { met, label: `${check.name} is a Left`, detail: v && isEither(v) ? v.side : 'not an Either' };
    }
    case 'maybeJust': {
      const v = valueOf(state, check.name);
      const met = !!v && isMaybe(v) && v.just;
      return { met, label: `${check.name} is a Just`, detail: v && isMaybe(v) ? (v.just ? 'Just' : 'None') : 'not a Maybe' };
    }
    case 'maybeNone': {
      const v = valueOf(state, check.name);
      const met = !!v && isMaybe(v) && !v.just;
      return { met, label: `${check.name} is a None`, detail: v && isMaybe(v) ? (v.just ? 'Just' : 'None') : 'not a Maybe' };
    }
    case 'lazyValue': {
      const v = valueOf(state, check.name);
      const met = !!v && isLazy(v);
      return { met, label: `${check.name} is lazy`, detail: v && isLazy(v) ? v.name : 'not a lazy stream' };
    }
    case 'effectHandled': {
      const met = state.effects.length > 0;
      return { met, label: 'an effect was executed', detail: state.effects.length ? state.effects[0]!.action : 'run an IO action with `run`' };
    }
    case 'adtDefined': {
      const met = check.name in state.env.adts;
      return { met, label: `type ${check.name} defined`, detail: met ? state.env.adts[check.name].join(' | ') : 'define with `type`' };
    }
    case 'valueCount': {
      const met = state.valueOrder.length >= check.min;
      return { met, label: `at least ${check.min} value(s)`, detail: `current = ${state.valueOrder.length}` };
    }
    case 'pureFnCount': {
      const n = Object.values(state.env.fns).filter((f) => f.pure).length;
      const met = n >= check.min;
      return { met, label: `at least ${check.min} pure function(s)`, detail: `current = ${n}` };
    }
    case 'notEffectful': {
      const v = valueOf(state, check.name);
      const met = !!v && !isLazy(v) && !(v as { __io?: boolean }).__io;
      return { met, label: `${check.name} is a plain value`, detail: met ? 'ok' : 'carries an effect' };
    }
    case 'allOf': {
      const results = check.checks.map((c) => checkOne(state, c));
      return {
        met: results.every((r) => r.met),
        label: results.map((r) => r.label).join(' · '),
        detail: results.filter((r) => !r.met).map((r) => r.detail).join('; ') || 'ok',
      };
    }
    default:
      return { met: false, label: 'Unknown goal', detail: 'unknown check' };
  }
}

export function evaluateGoal(state: ProgramState, goal: GoalCheck): { solved: boolean; statuses: GoalStatus[] } {
  if (goal.kind === 'allOf') {
    const statuses = goal.checks.map((c) => checkOne(state, c));
    return { solved: statuses.every((s) => s.met), statuses };
  }
  const single = checkOne(state, goal);
  return { solved: single.met, statuses: [single] };
}

export function flattenGoal(goal: GoalCheck): GoalCheck[] {
  return goal.kind === 'allOf' ? goal.checks : [goal];
}

export { reprOf };
