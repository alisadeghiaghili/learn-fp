import type { LevelDef, ProgramState } from '../engine/types';
import { cloneState, sandboxState } from '../engine/state';
import { commandCountsForGolf, executeCommand } from '../engine/commands';
import { solutionComplete, solutionProgress, nextSteps } from '../engine/solution';
import { evaluateGoal } from '../engine/compare';
import { coachLine } from '../engine/coach';
import { levelById, levelAfter, seriesOrder, seriesTitle, levelsInSeries, addCustomLevel } from '../levels';
import { parseLevelJson } from '../levels/import';
import { renderBoardHtml } from './board';
import { TerminalView, type LogLine } from './terminal';
import { renderMarkdown, showModal, escapeHtml as esc2 } from './dialog';
import { loadProgress, saveProgress, summarizeCurriculum } from './progress';
import { ui } from '../i18n';
import { launchConfetti, playFanfare } from './confetti';

function renderDiffDots(difficulty: number): string {
  const n = Math.max(0, Math.min(5, difficulty));
  return Array.from({ length: 5 }, (_, i) => `<i class="diff-dot${i < n ? ' on' : ''}"></i>`).join('');
}

export class App {
  private root: HTMLElement;
  private state: ProgramState;
  private level: LevelDef | null = null;
  private startSnapshot: ProgramState;
  private golf: string[] = [];
  private log: LogLine[] = [];
  private solvedFlash = false;
  private progress = loadProgress();
  private terminal!: TerminalView;
  private boardEl!: HTMLElement;
  private dockEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private undoStack: ProgramState[] = [];
  private lastWasMeta = false;
  private lastWasSolution = false;
  private offered = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = sandboxState();
    this.startSnapshot = cloneState(this.state);
    this.mount();
    this.renderAll();
    this.pushMeta(ui().appWelcome);
    const summary = summarizeCurriculum(this.progress);
    if (summary.solvedCount > 0) {
      this.pushOut(`Welcome back — ${summary.solvedCount}/${summary.total} levels solved. Type \`levels\` to resume.`);
    } else {
      this.pushMeta(ui().sandboxSeeded);
    }
  }

  private mount(): void {
    const u = ui();
    this.root.innerHTML = `
      <div class="app-main">
        <header class="toolbar">
          <div class="brand">λ<span>${esc2(u.brand)}</span></div>
          <div class="level-title" id="level-title"></div>
          <div class="toolbar-actions">
            <button type="button" class="nav-toggle" data-action="nav-toggle" aria-label="${esc2(u.menu)}" aria-expanded="false" aria-controls="nav-drawer">
              <span class="nav-bars" aria-hidden="true"></span>
            </button>
            <div class="nav-drawer" id="nav-drawer" hidden>
              <button type="button" data-action="levels">${esc2(u.levels)}</button>
              <button type="button" data-action="guide">${esc2(u.guide)}</button>
              <button type="button" data-action="undo" title="${esc2(u.undo)}">${esc2(u.undo)}</button>
              <button type="button" data-action="reset" title="${esc2(u.reset)}">${esc2(u.reset)}</button>
              <button type="button" data-action="sandbox" class="ghost">${esc2(u.sandbox)}</button>
            </div>
            <a class="tb-link gh" href="https://github.com/alisadeghiaghili/learn-fp" target="_blank" rel="noopener noreferrer" title="${esc2(u.github)}" aria-label="${esc2(u.github)}"><svg class="gh-mark" viewBox="0 0 16 16" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
          </div>
        </header>
        <div class="board-wrap" id="board-wrap"></div>
        <div class="terminal" id="terminal"></div>
      </div>
      <aside class="dock" id="dock" aria-label="${esc2(u.guide)}"></aside>
    `;
    this.boardEl = this.root.querySelector('#board-wrap')!;
    this.dockEl = this.root.querySelector('#dock')!;
    this.titleEl = this.root.querySelector('#level-title')!;
    this.terminal = new TerminalView(this.root.querySelector('#terminal')!, (cmd) => this.handleCommand(cmd));
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'nav-toggle') {
          this.toggleNav();
          return;
        }
        this.closeNav();
        if (action === 'levels') this.openLevels();
        if (action === 'guide') this.focusGuide();
        if (action === 'undo') this.handleCommand('undo');
        if (action === 'reset') this.handleCommand('reset');
        if (action === 'sandbox') this.handleCommand('sandbox');
        this.terminal.focus();
      });
    });
    // Close the nav drawer when clicking anywhere outside it (mobile).
    document.addEventListener('click', (e) => {
      if (!this.navOpen()) return;
      const t = e.target as HTMLElement;
      if (t.closest('#nav-drawer') || t.closest('[data-action="nav-toggle"]')) return;
      this.closeNav();
    });
  }

  private toggleNav(): void {
    const drawer = this.root.querySelector<HTMLElement>('#nav-drawer');
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]');
    if (!drawer || !btn) return;
    const open = drawer.classList.toggle('is-open');
    drawer.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }

  private closeNav(): void {
    const drawer = this.root.querySelector<HTMLElement>('#nav-drawer');
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]');
    if (!drawer || !btn) return;
    drawer.classList.remove('is-open');
    drawer.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  private navOpen(): boolean {
    return !!this.root.querySelector<HTMLElement>('#nav-drawer')?.classList.contains('is-open');
  }

  private pushMeta(text: string): void {
    this.log.push({ kind: 'meta', text });
    this.terminal.setLog(this.log);
  }
  private pushOut(text: string): void {
    if (!text) return;
    this.log.push({ kind: 'out', text });
    this.terminal.setLog(this.log);
  }
  private pushErr(text: string): void {
    this.log.push({ kind: 'err', text });
    this.terminal.setLog(this.log);
  }

  private focusGuide(): void {
    this.dockEl.classList.remove('dock-pulse');
    void this.dockEl.offsetWidth;
    this.dockEl.classList.add('dock-pulse');
    this.dockEl.scrollTop = 0;
  }

  private renderAll(): void {
    this.boardEl.innerHTML = renderBoardHtml(this.state);
    this.titleEl.textContent = this.level
      ? ui().titleLine(this.level.id, this.level.name, this.level.par)
      : ui().sandboxTitle;
    this.renderDock();
    this.syncTerminalHints();
  }

  private syncTerminalHints(): void {
    if (!this.level) {
      this.terminal.setHint(null);
      this.terminal.setExtraCompletions([]);
      return;
    }
    const steps = solutionProgress(this.state, this.level.solution);
    const next = steps.find((s) => !s.done && !s.optional);
    this.terminal.setHint(next?.command ?? null);
    this.terminal.setExtraCompletions([...this.level.solution, ...this.level.hint.split(';').map((s) => s.trim()).filter(Boolean)]);
  }

  private renderDock(): void {
    if (!this.level) {
      const u = ui();
      this.dockEl.innerHTML = `
        <h2>${esc2(u.guideIntro)}</h2>
        <div class="learning-box">
          <div class="next-title">${esc2(u.startHere)}</div>
          <ul>${u.startHereItems.map((item) => `<li>${renderMarkdown(item)}</li>`).join('')}</ul>
        </div>
        <div class="learning-box">
          <div class="next-title">${esc2(u.sandboxTip)}</div>
          <ul>${u.sandboxTipItems.map((item) => `<li>${esc2(item)}</li>`).join('')}</ul>
        </div>
        <ul class="goal-list">
          <li class="met"><div class="g-label">${esc2(u.noActiveLevel)}</div><div class="g-detail">${esc2(u.noActiveLevelDetail)}</div></li>
        </ul>
      `;
      return;
    }
    const u = ui();
    const level = this.level;
    const steps = solutionProgress(this.state, level.solution);
    const solved = solutionComplete(this.state, level.solution);
    const currentId = steps.findIndex((s) => !s.done && !s.optional);
    const items = steps
      .map((s, i) => {
        const isCurrent = !solved && !s.done && !s.optional && i === currentId;
        return `<li class="${s.done ? 'met' : ''}${s.optional ? ' optional' : ''}${isCurrent ? ' current' : ''}">
          <div class="g-label" dir="ltr">${s.done ? '✓' : isCurrent ? '▶' : '○'} <code>${esc2(s.command)}</code>${
            s.optional ? ` <span class="chip">${esc2(u.optionalChip)}</span>` : ''
          }${isCurrent ? ` <span class="chip current-chip">${esc2(u.nowChip)}</span>` : ''}</div>
          <div class="g-detail" dir="ltr">${esc2(s.note)}</div>
        </li>`;
      })
      .join('');
    const remaining = nextSteps(this.state, level.goal, level);
    const firstNext = remaining[0]?.command;
    const nextBlock = solved
      ? `<div class="next-box met">${esc2(u.allSolutionMet)}</div>`
      : `<div class="next-box">
          <div class="next-title">${esc2(u.typeNextTitle)}</div>
          <div class="next-row"><span class="g-label">${esc2(u.remainingLabel)}</span>${firstNext ? `<code class="g-cmd">${esc2(firstNext)}</code>` : ''}</div>
        </div>`;
    const prog = this.progress[level.id];
    const golfNote =
      prog?.bestCommands !== undefined ? u.bestSoFar(prog.bestCommands, level.par) : u.idealSolution(level.par);
    this.dockEl.innerHTML = `
      <h2>${esc2(level.name)}</h2>
      <p class="objective">${esc2(level.objective)}</p>
      ${
        level.learning?.length
          ? `<div class="learning-box"><div class="next-title">${esc2(u.youWillLearn)}</div><ul>${level.learning
              .map((l) => `<li>${esc2(l)}</li>`)
              .join('')}</ul></div>`
          : ''
      }
      ${
        level.fieldNotes?.length
          ? `<div class="field-box"><div class="next-title">${esc2(u.fieldNotesTitle)}</div><ul>${level.fieldNotes
              .map((l) => `<li>${esc2(l)}</li>`)
              .join('')}</ul></div>`
          : ''
      }
      <div class="par-note">${esc2(golfNote)}</div>
      ${this.solvedFlash ? `<div class="solved-banner">${esc2(u.solvedBanner(this.golf.length || null))}</div>` : ''}
      ${nextBlock}
      <ul class="goal-list">${items}</ul>
    `;
  }

  private openLevels(): void {
    const u = ui();
    const body = seriesOrder()
      .map((s) => {
        const rows = levelsInSeries(s)
          .map((l) => {
            const p = this.progress[l.id];
            return `<button type="button" class="level-row ${p?.solved ? 'solved' : ''}" data-level="${l.id}">
            <span class="id">${l.id}</span>
            <span class="name">${esc2(l.name)}</span>
            <span class="par-note">par ${l.par}</span>
            <span class="chip ${p?.solved ? 'ok' : ''}" title="${esc2(u.difficultyOf(l.difficulty))}">
              ${p?.solved ? `${esc2(u.solved)} ${p.bestCommands ?? ''}` : `<span class="diff-dots" aria-label="${esc2(u.difficultyOf(l.difficulty))}">${renderDiffDots(l.difficulty)}</span>`}
            </span>
          </button>`;
          })
          .join('');
        return `<div class="series-block"><h3>${esc2(seriesTitle(s))}</h3><div class="level-list">${rows}</div></div>`;
      })
      .join('');

    const modal = showModal({
      title: u.levelPicker,
      bodyHtml: `<p>${esc2(u.pickChallenge)}</p>${body}`,
      actions: [{ label: u.close, className: 'ghost', onClick: () => modal.close() }],
    });
    modal.el.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.level!;
        modal.close();
        this.startLevel(id);
      });
    });
  }

  private startLevel(id: string): void {
    const level = levelById(id);
    if (!level) {
      this.pushErr(ui().unknownLevel(id));
      return;
    }
    this.level = level;
    this.state = cloneState(level.startState);
    this.startSnapshot = cloneState(level.startState);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.offered = false;
    this.log = [];
    this.pushMeta(ui().levelMeta(level.id, level.name));
    this.pushOut(level.objective);
    const coach = coachLine(this.state, level);
    if (coach) this.pushMeta(coach);
    this.renderAll();
    this.showIntro(level);
    this.terminal.focus();
  }

  private showIntro(level: LevelDef): void {
    if (!level.startDialog.length) return;
    let idx = 0;
    const show = () => {
      const slide = level.startDialog[idx];
      const u = ui();
      const actions: { label: string; className?: string; onClick: () => void }[] = [];
      const modalRef: { close: () => void } = { close: () => undefined };
      if (idx > 0) {
        actions.push({
          label: u.back,
          className: 'ghost',
          onClick: () => {
            idx -= 1;
            modalRef.close();
            show();
          },
        });
      }
      if (idx < level.startDialog.length - 1) {
        actions.push({
          label: u.next,
          className: 'primary',
          onClick: () => {
            idx += 1;
            modalRef.close();
            show();
          },
        });
      } else {
        actions.push({
          label: u.start,
          className: 'primary',
          onClick: () => {
            modalRef.close();
            this.terminal.focus();
          },
        });
      }
      const m = showModal({
        title: slide.title ?? level.id,
        bodyHtml: renderMarkdown(slide.markdown),
        actions,
        onClose: () => this.terminal.focus(),
      });
      modalRef.close = m.close;
    };
    show();
  }

  private enterSandbox(): void {
    this.level = null;
    this.state = sandboxState();
    this.startSnapshot = cloneState(this.state);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.offered = false;
    this.log = [];
    this.pushMeta(ui().sandboxMode);
    this.renderAll();
    this.terminal.focus();
  }

  private importLevel(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        const res = parseLevelJson(text);
        if (res.error || !res.spec) {
          this.pushErr(`Import failed: ${res.error ?? 'no level produced'}`);
          return;
        }
        const { spec } = res;
        if (levelById(spec.id)) {
          this.pushErr(`A level named '${spec.id}' already exists.`);
          return;
        }
        addCustomLevel(spec);
        this.pushMeta(`Imported level ${spec.id} (${spec.name}). Pick it from Levels.`);
        this.renderAll();
      });
    };
    input.click();
  }

  private resetLevel(): void {
    this.state = cloneState(this.startSnapshot);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.pushMeta(this.level ? ui().resetLevel(this.level.id) : ui().resetSandbox);
    if (this.level) {
      const coach = coachLine(this.state, this.level);
      if (coach) this.pushMeta(coach);
    }
    this.renderAll();
    this.terminal.focus();
  }

  private showSolution(): void {
    const u = ui();
    if (!this.level) {
      this.pushMeta(u.noSolutionSandbox);
      return;
    }
    const cmds = this.level.solution;
    showModal({
      title: u.solutionTitle(this.level.id),
      bodyHtml: renderMarkdown([u.solutionCommands, '', '```', cmds.join('\n'), '```', '', u.solutionWarn].join('\n')),
      actions: [
        { label: u.cancel, className: 'ghost', onClick: () => this.terminal.focus() },
        {
          label: u.runSolution,
          className: 'primary',
          onClick: () => {
            this.resetLevel();
            for (const c of cmds) this.runCommand(c, { fromSolution: true });
            this.terminal.focus();
          },
        },
      ],
    });
  }

  private handleCommand(raw: string): void {
    const cmd = raw.trim();
    if (!cmd) return;
    this.lastWasMeta = true;
    this.log.push({ kind: 'cmd', text: cmd });
    this.terminal.setLog(this.log);

    const lower = cmd.toLowerCase();
    if (lower === 'levels' || lower === 'level') return void this.openLevels();
    if (lower === 'sandbox' || lower === 'exit level') return void this.enterSandbox();
    if (lower === 'hint') {
      this.pushOut(this.level?.hint ?? ui().noHintSandbox);
      if (this.level) {
        const coach = coachLine(this.state, this.level);
        if (coach) this.pushMeta(coach);
      }
      return;
    }
    if (lower === 'steps' || lower === 'next') {
      if (!this.level) return void this.pushMeta(ui().noGoalSandbox);
      const coach = coachLine(this.state, this.level);
      this.pushOut(coach ?? ui().allStepsMet);
      this.renderAll();
      return;
    }
    if (lower === 'show goal' || lower === 'goal' || lower === 'hide goal') {
      this.pushMeta(ui().guideIntro);
      this.focusGuide();
      return;
    }
    if (lower === 'show solution' || lower === 'solution') return void this.showSolution();
    if (lower === 'reset') return void this.resetLevel();
    if (lower === 'undo') {
      if (!this.undoStack.length) return void this.pushErr(ui().nothingToUndo);
      this.state = this.undoStack.pop()!;
      if (this.golf.length) this.golf.pop();
      this.pushMeta(ui().undoMeta);
      this.afterStateChange();
      return;
    }
    if (lower === 'clear') {
      this.log = [];
      this.terminal.clear();
      return;
    }
    if (lower === 'import' || lower === 'import level' || lower === 'import levels') return void this.importLevel();

    this.runCommand(cmd, { fromSolution: false });
  }

  private runCommand(cmd: string, opts: { fromSolution: boolean }): void {
    this.lastWasMeta = false;
    this.lastWasSolution = opts.fromSolution;
    const prev = cloneState(this.state);
    const { state, result } = executeCommand(this.state, cmd);

    if (result.error) {
      this.state = prev;
      this.pushErr(result.error);
      if (this.level) {
        const steps = solutionProgress(this.state, this.level.solution);
        const next = steps.find((s) => !s.done && !s.optional);
        if (next?.command) this.pushMeta(`${ui().wrongCommandNote} Next: ${next.command}`);
      }
    } else {
      this.state = state;
      if (result.output) this.pushOut(result.output);
    }

    const counts = commandCountsForGolf(cmd) && !result.error;
    if (counts) this.undoStack.push(prev);
    if (counts && !opts.fromSolution) this.golf.push(cmd);

    this.afterStateChange();
    if (!document.querySelector('.overlay .modal')) this.terminal.focus();
  }

  private afterStateChange(): void {
    if (this.level) {
      // A level is solved when its *goal* is met — not when the solution
      // commands have been typed. Gating on the goal means a wrong answer
      // (right-shaped command, wrong value) is not celebrated as solved.
      const solved = evaluateGoal(this.state, this.level.goal).solved;
      if (solved && !this.solvedFlash) {
        this.solvedFlash = true;
        const num = this.golf.length;
        const best = this.progress[this.level.id]?.bestCommands;
        this.progress[this.level.id] = { solved: true, bestCommands: best === undefined ? num : Math.min(best, num) };
        saveProgress(this.progress);
        this.pushOut('');
        this.pushOut(ui().levelSolvedBanner + this.level.name);
        this.pushOut(num > 0 ? ui().commandsUsed(num, this.level.par) : ui().idealCommands(this.level.par));
        this.pushOut(ui().partyMode);
      } else if (!solved && this.solvedFlash) {
        this.solvedFlash = false;
      }
      if (this.level && !solved && !this.lastWasMeta && !this.lastWasSolution) {
        const first = nextSteps(this.state, this.level.goal, this.level)[0];
        if (first?.command) this.pushMeta(ui().nextMeta(first.command));
      }
    }
    this.renderAll();
    if (this.solvedFlash && this.level) this.maybeOfferNext();
  }

  private maybeOfferNext(): void {
    if (!this.level || this.offered) return;
    this.offered = true;
    const u = ui();
    const level = this.level;
    const next = levelAfter(level.id);
    const cmds = this.golf.length || null;
    const curriculum = summarizeCurriculum(this.progress);
    const underPar = cmds !== null && cmds <= level.par;
    const golfLine =
      cmds === null
        ? u.idealForLevel(level.par)
        : underPar
          ? `**${cmds}** ${u.idealForLevel(level.par).toLowerCase()}`
          : `**${cmds}** command${cmds === 1 ? '' : 's'} — par is ${level.par}.`;
    const cheer = u.cheers[Math.floor(Math.random() * u.cheers.length)]!;

    const bodyHtml = `
      <div class="celebrate">
        <div class="celebrate-visual" aria-hidden="true"><div class="celebrate-ring"></div><div class="celebrate-star">★</div></div>
        <div class="celebrate-badge">LEVEL CLEARED</div>
        <h3 class="celebrate-title">${esc2(level.name)}</h3>
        <p class="celebrate-sub">${esc2(level.seriesTitle)} · <code>${esc2(level.id)}</code></p>
        <p class="celebrate-cheer">${esc2(cheer)}</p>
        <div class="celebrate-stats">${renderMarkdown(golfLine)}</div>
        <div class="celebrate-progress">
          <div class="prog-track"><div class="prog-fill" style="width:${curriculum.percent}%"></div></div>
          <div class="par-note">${curriculum.solvedCount} / ${curriculum.total} levels solved</div>
        </div>
        ${
          next
            ? `<div class="celebrate-next">${renderMarkdown(u.nextCelebration(next.id, next.name))}</div>`
            : `<div class="celebrate-next">${renderMarkdown(u.lastInPack)}</div>`
        }
      </div>
    `;

    const confetti = launchConfetti(4200);
    playFanfare();
    const modal = showModal({
      title: u.levelComplete,
      bodyHtml,
      variant: 'celebrate',
      actions: [
        {
          label: u.baskInIt,
          className: 'ghost',
          onClick: () => {
            confetti?.stop();
            modal.close();
            this.offered = false;
            this.terminal.focus();
          },
        },
        next
          ? {
              label: u.celebrateOn(next.id),
              className: 'primary',
              onClick: () => {
                confetti?.stop();
                modal.close();
                this.startLevel(next.id);
              },
            }
          : {
              label: u.browseLevels,
              className: 'primary',
              onClick: () => {
                confetti?.stop();
                modal.close();
                this.openLevels();
              },
            },
      ],
      onClose: () => {
        confetti?.stop();
        this.offered = false;
        this.terminal.focus();
      },
    });
  }
}
