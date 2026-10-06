/** Escape + render a small markdown subset for dialogs and the guide dock. */

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(raw: string): string {
  let t = escapeHtml(raw);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  return t;
}

function isListItem(line: string): boolean {
  return /^\s*[-*+]\s+\S/.test(line) || /^\s*\d+\.\s+\S/.test(line);
}

function renderListItem(line: string): string {
  const s = line.trim().replace(/^([-*+]|\d+\.)\s+/, '');
  return `<li>${renderInline(s)}</li>`;
}

function renderProse(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${para.map(renderInline).join('<br/>')}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    out.push(`<ul>${list.join('')}</ul>`);
    list = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (isListItem(line)) {
      flushPara();
      list.push(renderListItem(line));
      continue;
    }
    flushList();
    para.push(line);
  }
  flushAll();
  return out.join('');
}

/** Markdown subset: ``` fences, lists, bold, inline code, links. */
export function renderMarkdown(md: string): string {
  const blocks = md.split(/```/);
  let html = '';
  blocks.forEach((block, i) => {
    if (i % 2 === 1) {
      html += `<pre>${escapeHtml(block.replace(/^\w*\n/, ''))}</pre>`;
      return;
    }
    html += renderProse(block);
  });
  return html;
}

export interface ModalAction {
  label: string;
  className?: string;
  onClick: () => void;
}

export interface Modal {
  close: () => void;
  el: HTMLElement;
}

export function showModal(opts: {
  title: string;
  bodyHtml: string;
  actions?: ModalAction[];
  onClose?: () => void;
  variant?: 'default' | 'celebrate';
}): Modal {
  const overlay = document.createElement('div');
  overlay.className = `overlay${opts.variant === 'celebrate' ? ' overlay-celebrate' : ''}`;
  overlay.innerHTML = `
    <div class="modal${opts.variant === 'celebrate' ? ' modal-celebrate' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(opts.title)}">
      <h2>${escapeHtml(opts.title)}</h2>
      <div class="markdown">${opts.bodyHtml}</div>
      <div class="modal-actions"></div>
    </div>
  `;
  const actionsEl = overlay.querySelector('.modal-actions') as HTMLElement;
  const close = () => {
    overlay.remove();
    opts.onClose?.();
  };

  const actions = opts.actions?.length ? opts.actions : [{ label: 'Close', onClick: () => close() }];
  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = action.className ?? '';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      if (document.body.contains(overlay)) overlay.remove();
    });
    actionsEl.appendChild(btn);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
  const modalEl = overlay.querySelector<HTMLElement>('.modal');
  if (modalEl) {
    modalEl.tabIndex = -1;
    requestAnimationFrame(() => modalEl.focus());
  }
  return { close, el: overlay };
}
