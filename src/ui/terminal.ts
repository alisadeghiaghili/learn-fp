export type LogKind = 'cmd' | 'out' | 'err' | 'meta' | 'ok';

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export interface LogLine {
  kind: LogKind;
  text: string;
}

const BASE_COMMANDS = [
  'let x = 1 + 2',
  'def double = fn (n) -> n * 2',
  'type Shape = Circle(r) | Rect(w, h)',
  'compose dd double inc',
  'run double 5',
  'run map double xs',
  'run fold 0 add xs',
  'run match s { Circle(r) -> r; _ -> 0 }',
  'let m = just 5',
  'run bind m inc',
  'let a = io "read config"',
  'let nats = from 0',
  'run take 5 nats',
  'show all',
  'show functions',
  'show result',
  'show effects',
  'show code pure',
  'concepts',
  'levels',
  'hint',
  'steps',
  'show goal',
  'show solution',
  'reset',
  'undo',
  'sandbox',
  'clear',
  'help',
];

interface WordState {
  head: string[];
  current: string;
  afterSpace: boolean;
}

function parseLine(value: string): WordState {
  const endsWithSpace = /\s$/.test(value);
  const trimmed = value.replace(/\s+$/, '');
  if (!trimmed) return { head: [], current: '', afterSpace: endsWithSpace };
  const parts = trimmed.split(/\s+/);
  if (endsWithSpace) return { head: parts, current: '', afterSpace: true };
  return { head: parts.slice(0, -1), current: parts[parts.length - 1]!, afterSpace: false };
}

export class TerminalView {
  private logEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private ghostEl: HTMLElement;
  private hintEl: HTMLElement;
  private lines: LogLine[] = [];
  private history: string[] = [];
  private historyIdx = -1;
  private draft = '';
  private hint = '';
  private extraCompletions: string[] = [];
  private wordCycle: string[] = [];
  private wordIdx = 0;
  private wordKey = '';
  private measureCtx: CanvasRenderingContext2D | null = null;
  private onSubmit: (cmd: string) => void;

  constructor(root: HTMLElement, onSubmit: (cmd: string) => void) {
    this.onSubmit = onSubmit;
    root.innerHTML = `
      <div class="term-log" role="log" aria-live="polite" dir="ltr"></div>
      <div class="term-hint" hidden dir="ltr"></div>
      <div class="term-input-row" dir="ltr">
        <label class="prompt">λ</label>
        <div class="term-input-wrap">
          <div class="term-ghost" aria-hidden="true"></div>
          <input class="term-input" autocomplete="off" spellcheck="false" placeholder="" dir="ltr"
            aria-label="FP command input" />
        </div>
      </div>
    `;
    this.logEl = root.querySelector('.term-log')!;
    this.inputEl = root.querySelector('.term-input')!;
    this.ghostEl = root.querySelector('.term-ghost')!;
    this.hintEl = root.querySelector('.term-hint')!;
    this.inputEl.addEventListener('keydown', (e) => this.onKey(e));
    this.inputEl.addEventListener('input', () => this.syncGhost());
  }

  focus(): void {
    if (document.querySelector('.overlay .modal')) return;
    this.inputEl.focus();
    const len = this.inputEl.value.length;
    try {
      this.inputEl.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
  }

  setLog(lines: LogLine[]): void {
    this.lines = lines;
    this.render();
  }

  clear(): void {
    this.lines = [];
    this.render();
  }

  private render(): void {
    this.logEl.innerHTML = this.lines
      .map((l) => {
        const prefix = l.kind === 'cmd' ? 'λ ' : '';
        return `<div class="${l.kind}">${prefix}${escapeHtml(l.text)}</div>`;
      })
      .join('');
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  setHint(command: string | null): void {
    this.hint = command ?? '';
    this.inputEl.placeholder = this.hint
      ? `try: ${this.hint}`
      : 'type a command — help · levels · hint · steps';
    this.hintEl.hidden = !this.hint;
    if (this.hint) {
      this.hintEl.innerHTML = `next: <code>${escapeHtml(this.hint)}</code>`;
    } else {
      this.hintEl.textContent = '';
    }
    this.syncGhost();
  }

  setExtraCompletions(commands: string[]): void {
    this.extraCompletions = commands.filter(Boolean);
  }

  private allCompletions(): string[] {
    return [...new Set([...this.extraCompletions, ...BASE_COMMANDS, ...this.history.slice().reverse()])];
  }

  private matchingCommands(head: string[], current: string): string[] {
    const cur = current.toLowerCase();
    return this.allCompletions().filter((cmd) => {
      const words = cmd.split(/\s+/);
      if (words.length <= head.length) return false;
      for (let i = 0; i < head.length; i++) if (words[i] !== head[i]) return false;
      if (!cur) return true;
      return (words[head.length] ?? '').toLowerCase().startsWith(cur);
    });
  }

  private nextWords(head: string[], current: string): string[] {
    const matches = this.matchingCommands(head, current);
    const words: string[] = [];
    const push = (w: string | undefined) => {
      if (!w || words.includes(w)) return;
      words.push(w);
    };
    if (this.hint) {
      const hw = this.hint.split(/\s+/);
      if (head.every((h, i) => hw[i] === h)) push(hw[head.length]);
    }
    for (const cmd of matches) push(cmd.split(/\s+/)[head.length]);
    return words.filter((w) => !current || w.toLowerCase().startsWith(current.toLowerCase()));
  }

  private measureText(text: string): number {
    if (!this.measureCtx) this.measureCtx = document.createElement('canvas').getContext('2d');
    const ctx = this.measureCtx;
    if (!ctx) return text.length * 7.2;
    const font = getComputedStyle(this.inputEl).font;
    ctx.font = font || '13px Consolas, monospace';
    return ctx.measureText(text).width;
  }

  private syncGhost(): void {
    const value = this.inputEl.value;
    this.ghostEl.textContent = '';
    this.ghostEl.dataset.visible = '0';
    if (!value) return;

    const { head, current, afterSpace } = parseLine(value);
    const first = this.nextWords(head, afterSpace ? '' : current)[0];
    if (!first) return;

    if (afterSpace) {
      this.ghostEl.textContent = first;
      this.ghostEl.style.left = `${this.measureText(value)}px`;
      this.ghostEl.dataset.visible = '1';
      return;
    }
    if (!first.toLowerCase().startsWith(current.toLowerCase()) || first.length <= current.length) return;
    this.ghostEl.textContent = first.slice(current.length);
    this.ghostEl.style.left = `${this.measureText(value)}px`;
    this.ghostEl.dataset.visible = '1';
  }

  private applyTab(e: KeyboardEvent): void {
    e.preventDefault();
    const value = this.inputEl.value;
    const { head, current, afterSpace } = parseLine(value);
    const cycleKey = `${head.join(' ')}|${afterSpace ? '' : current}`;

    if (!value && this.hint) {
      const firstWord = this.hint.split(/\s+/)[0]!;
      this.inputEl.value = firstWord;
      this.wordCycle = [firstWord];
      this.wordIdx = 0;
      this.wordKey = firstWord;
      this.focus();
      this.syncGhost();
      return;
    }

    const options = this.nextWords(head, afterSpace ? '' : current);
    if (!options.length) return;

    if (cycleKey !== this.wordKey || !this.wordCycle.length) {
      this.wordKey = cycleKey;
      this.wordCycle = options;
      this.wordIdx = 0;
    } else {
      this.wordIdx = (this.wordIdx + 1) % this.wordCycle.length;
    }
    const chosen = this.wordCycle[this.wordIdx] ?? options[0]!;
    const headText = head.length ? `${head.join(' ')} ` : '';
    this.inputEl.value = `${headText}${chosen}`;
    this.focus();
    this.syncGhost();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      this.applyTab(e);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.inputEl.value = '';
      this.wordCycle = [];
      this.wordKey = '';
      this.syncGhost();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (document.querySelector('.overlay .modal')) return;
      const value = this.inputEl.value;
      this.inputEl.value = '';
      const trimmed = value.trim();
      if (trimmed) {
        this.history.push(trimmed);
        this.historyIdx = this.history.length;
      }
      this.wordCycle = [];
      this.wordKey = '';
      this.onSubmit(value);
      this.focus();
      this.syncGhost();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.history.length) return;
      if (this.historyIdx === this.history.length) this.draft = this.inputEl.value;
      this.historyIdx = Math.max(0, this.historyIdx - 1);
      this.inputEl.value = this.history[this.historyIdx] ?? '';
      this.wordCycle = [];
      this.syncGhost();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.history.length) return;
      this.historyIdx = Math.min(this.history.length, this.historyIdx + 1);
      this.inputEl.value =
        this.historyIdx >= this.history.length ? this.draft : (this.history[this.historyIdx] ?? '');
      this.wordCycle = [];
      this.syncGhost();
    }
  }
}
