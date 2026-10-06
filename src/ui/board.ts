import type { ProgramState } from '../engine/types';
import { ui } from '../i18n';

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/** Inline markdown for board notes: `code` and **bold** only. */
function note(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function valuesZone(state: ProgramState): string {
  const u = ui();
  const names = state.valueOrder;
  if (!names.length) return `<div class="empty-note">${esc(u.noValues)}</div>`;
  const cards = names
    .map((n) => {
      const v = state.values[n];
      if (!v) return '';
      const chips: string[] = [`<span class="chip type">${esc(v.type)}</span>`];
      if (v.effectful) chips.push(`<span class="chip warn">${esc(u.effectful)}</span>`);
      return `<div class="card value-card${v.effectful ? ' effectful' : ''}">
        <div class="name">${esc(v.name)}</div>
        <div class="repr">${esc(v.repr)}</div>
        <div class="meta">${chips.join('')}</div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function functionsZone(state: ProgramState): string {
  const u = ui();
  const names = state.fnOrder;
  if (!names.length) return `<div class="empty-note">${esc(u.noFunctions)}</div>`;
  const cards = names
    .map((n) => {
      const f = state.functions[n];
      if (!f) return '';
      const tag = f.pure ? `<span class="chip ok">${esc(u.pure)}</span>` : `<span class="chip warn">${esc(u.impure)}</span>`;
      return `<div class="card fn-card${f.pure ? '' : ' impure'}">
        <div class="name">${esc(f.name)}</div>
        <div class="sig">${esc(f.sig)}</div>
        <div class="meta">${tag}</div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function typesZone(state: ProgramState): string {
  const u = ui();
  const names = state.adtOrder;
  if (!names.length) return `<div class="empty-note">${esc(u.noTypes)}</div>`;
  const cards = names
    .map((n) => {
      const variants = state.adts[n];
      return `<div class="card type-card">
        <div class="name">${esc(n)}</div>
        <div class="sig">${esc((variants ?? []).join(' | '))}</div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function pipelineZone(state: ProgramState): string {
  const u = ui();
  if (!state.pipeline.length) return '';
  const nodes = state.pipeline
    .map((name, i) => {
      const f = state.functions[name];
      const sep = i ? '<span class="arrow">→</span>' : '';
      const pure = f ? (f.pure ? '' : ' impure') : '';
      return `${sep}<div class="stage-node${pure}"><strong>${esc(name)}</strong></div>`;
    })
    .join('');
  return `<div class="pipeline" aria-label="${esc(u.pipeline)}"><h3>${esc(u.pipeline)}</h3><div class="stages">${nodes}</div></div>`;
}

function resultSlot(state: ProgramState): string {
  const u = ui();
  if (!state.result) return `<div class="result-slot empty"><span>${esc(u.noResult)}</span></div>`;
  const r = state.result;
  const chip = r.effectful
    ? `<span class="chip warn">${esc(u.effectful)}</span>`
    : `<span class="chip ok">${esc(u.pureValue)}</span>`;
  return `<div class="result-slot${r.effectful ? ' effectful' : ''}">
    <div class="result-type">${esc(r.type)}</div>
    <div class="result-repr">${esc(r.repr)}</div>
    <div class="meta">${chip}</div>
  </div>`;
}

function effectsZone(state: ProgramState): string {
  const u = ui();
  if (!state.effects.length) return `<div class="empty-note">${esc(u.noEffects)}</div>`;
  const rows = state.effects.map((e) => `<li class="effect-row">${esc(e.action)}</li>`).join('');
  return `<ul class="effect-list">${rows}</ul>`;
}

export function renderBoardHtml(state: ProgramState): string {
  const u = ui();
  return `
    <div class="board" dir="ltr">
      <section class="zone values" aria-label="${esc(u.values)}">
        <h2><span class="dot v"></span> ${esc(u.values)}</h2>
        ${valuesZone(state)}
      </section>
      <section class="zone functions" aria-label="${esc(u.functions)}">
        <h2><span class="dot f"></span> ${esc(u.functions)}</h2>
        ${functionsZone(state)}
      </section>
      <section class="zone types" aria-label="${esc(u.types)}">
        <h2><span class="dot t"></span> ${esc(u.types)}</h2>
        ${typesZone(state)}
      </section>
      <section class="zone result" aria-label="${esc(u.result)}">
        <h2><span class="dot r"></span> ${esc(u.result)}</h2>
        ${resultSlot(state)}
      </section>
      <section class="zone effects" aria-label="${esc(u.effects)}">
        <h2><span class="dot e"></span> ${esc(u.effects)}</h2>
        ${effectsZone(state)}
      </section>
    </div>
    <div class="board-flow" aria-hidden="true">${note(u.flowArrow)}</div>
    ${pipelineZone(state)}
  `;
}
