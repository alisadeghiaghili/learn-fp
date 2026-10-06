import './style.css';
import { App } from './ui/app';
import { TOTAL_LEVELS } from './levels';
import { showModal, renderMarkdown } from './ui/dialog';
import { ui } from './i18n';

const root = document.querySelector('#app');
if (!root) throw new Error('#app root missing');

new App(root as HTMLElement);

const u = ui();
showModal({
  title: `${u.brand} — ${u.tagline}`,
  bodyHtml: renderMarkdown(
    [
      `**LearnFP** turns the *concepts* of functional programming into a hands-on sandbox: a terminal you type into, and a **material board** where values flow through pure functions into a typed result.`,
      '',
      `The core course is **language-agnostic** — it teaches the ideas (purity, composition, pattern matching, higher-order functions, monads, laziness). Concrete **R** and **Python** snippets appear in lessons and via \`show code\`.`,
      '',
      '**How it works**',
      '- `let`, `def`, `type`, `compose` — build values, functions, and types',
      '- `run` — evaluate an expression; watch it land in the Result slot',
      '- `map`, `filter`, `fold`, `match`, `bind`, `take` — the FP toolbox',
      `- Each level has a goal; the guide (right) tracks your progress. ${TOTAL_LEVELS} levels across 6 series.`,
      '',
      'No installs, no sign-up — progress is saved in this browser.',
    ].join('\n'),
  ),
  actions: [
    { label: u.trySandbox, className: 'ghost', onClick: () => document.querySelector<HTMLButtonElement>('[data-action="sandbox"]')?.click() },
    { label: u.levels, className: 'primary', onClick: () => document.querySelector<HTMLButtonElement>('[data-action="levels"]')?.click() },
  ],
});
