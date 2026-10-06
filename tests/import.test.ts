import { describe, it, expect } from 'vitest';
import { parseLevelJson, buildLevelFromSpec } from '../src/levels/import';
import { executeCommand } from '../src/engine/commands';
import { evaluateGoal } from '../src/engine/compare';
import type { ProgramState } from '../src/engine/types';
import exampleRaw from '../examples/custom-level.json?raw';

const good = `{
  "id": "my-1",
  "series": "custom",
  "name": "My level",
  "difficulty": 2,
  "start": { "values": { "x": 3 }, "fns": { "double": "fn (n) -> n * 2" } },
  "goal": { "kind": "allOf", "checks": [ { "kind": "valueEquals", "name": "r", "value": "6" } ] },
  "solution": [ "let r = double x", "run r" ],
  "startDialog": [ { "title": "hi", "markdown": "do it" } ]
}`;

describe('parseLevelJson', () => {
  it('parses a valid level and builds a working LevelDef', () => {
    const res = parseLevelJson(good);
    expect(res.error).toBeUndefined();
    expect(res.spec).toBeDefined();
    expect(res.level!.id).toBe('my-1');
    expect(res.level!.startState.env.fns['double']).toBeTruthy();
  });

  it('rejects invalid JSON', () => {
    expect(parseLevelJson('{ nope').error).toMatch(/JSON/);
  });

  it('rejects missing required fields', () => {
    expect(parseLevelJson('{"id":"a","series":"s","name":"n"}').error).toMatch(/goal|solution/);
  });

  it('rejects a bad id', () => {
    expect(parseLevelJson('{"id":"Bad ID","series":"s","name":"n","goal":{},"solution":["run x"]}').error).toMatch(/id/);
  });

  it('rejects an empty solution', () => {
    expect(parseLevelJson('{"id":"a","series":"s","name":"n","goal":{},"solution":[]}').error).toMatch(/solution/);
  });
});

describe('imported level is playable', () => {
  it('its solution reaches its goal', () => {
    const res = parseLevelJson(good)!;
    const level = res.level!;
    let s: ProgramState = structuredClone(level.startState);
    for (const cmd of level.solution) {
      const r = executeCommand(s, cmd);
      expect(r.result.error, `cmd '${cmd}': ${r.result.error}`).toBeUndefined();
      s = r.state;
    }
    expect(evaluateGoal(s, level.goal).solved).toBe(true);
  });

  it('buildLevelFromSpec round-trips a parsed spec', () => {
    const spec = parseLevelJson(good).spec!;
    const level = buildLevelFromSpec(spec);
    expect(level.id).toBe(spec.id);
    expect(level.startState.env.values.x).toBe(3);
  });

  it('the bundled example level parses and solves', () => {
    const res = parseLevelJson(exampleRaw);
    expect(res.error).toBeUndefined();
    const level = res.level!;
    let s: ProgramState = structuredClone(level.startState);
    for (const cmd of level.solution) {
      const r = executeCommand(s, cmd);
      expect(r.result.error, `cmd '${cmd}': ${r.result.error}`).toBeUndefined();
      s = r.state;
    }
    expect(evaluateGoal(s, level.goal).solved).toBe(true);
  });
});
