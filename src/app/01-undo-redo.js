// ── Undo / Redo stack ──
const MAX_UNDO = 50;
const _undoStack = [];
const _redoStack = [];
let _undoLock = false;
const _movedCards = new Set(); // session-only: tracks recently moved cards

function snapshotState() {
	return {
		cards: structuredClone(cards.peek()),
		stages: structuredClone(stages.peek()),
		projects: structuredClone(projects.peek()),
	};
}

function pushUndo(action) {
	if (_undoLock) return;
	const snap = snapshotState();
	snap._action = action || '';
	snap._movedCards = new Set(_movedCards);
	_undoStack.push(snap);
	if (_undoStack.length > MAX_UNDO) _undoStack.shift();
	_redoStack.length = 0;
}

function undo() {
	if (!_undoStack.length) return;
	const current = snapshotState();
	current._action = _undoStack[_undoStack.length - 1]?._action || '';
	current._movedCards = new Set(_movedCards);
	_redoStack.push(current);
	const snap = _undoStack.pop();
	_undoLock = true;
	batch(() => {
		cards.set(snap.cards);
		stages.set(snap.stages);
		projects.set(snap.projects);
	});
	_movedCards.clear();
	if (snap._movedCards) snap._movedCards.forEach(id => _movedCards.add(id));
	_undoLock = false;
	showToast(snap._action ? `Undo: ${snap._action}` : 'Undo');
}

function redo() {
	if (!_redoStack.length) return;
	const current = snapshotState();
	current._action = _redoStack[_redoStack.length - 1]?._action || '';
	current._movedCards = new Set(_movedCards);
	_undoStack.push(current);
	const snap = _redoStack.pop();
	_undoLock = true;
	batch(() => {
		cards.set(snap.cards);
		stages.set(snap.stages);
		projects.set(snap.projects);
	});
	_movedCards.clear();
	if (snap._movedCards) snap._movedCards.forEach(id => _movedCards.add(id));
	_undoLock = false;
	showToast(snap._action ? `Redo: ${snap._action}` : 'Redo');
}

// Computed indexes
const cardMap = computed(() => new Map(cards.get().map(c => [c.id, c])));

const cardsByColumn = computed(() => {
	const map = new Map();
	for (const c of cards.get()) {
		if (!map.has(c.columnId)) map.set(c.columnId, []);
		map.get(c.columnId).push(c);
	}
	for (const [, arr] of map) arr.sort((a, b) => a.order - b.order);
	return map;
});

const visibleIds = computed(() => {
	const f = filterStr.get().toLowerCase().trim();
	if (!f) return null;
	const set = new Set();
	for (const c of cards.get()) {
		if (matchesFilter(c, f)) set.add(c.id);
	}
	return set;
});

function matchesFilter(card, f) {
	if (f.startsWith('@')) {
		const name = f.slice(1);
		return card.assignees.some(a => a.toLowerCase().includes(name));
	}
	if (f.startsWith('#')) {
		const label = f.slice(1);
		return card.labels.some(l => l.toLowerCase().includes(label));
	}
	if (f === '$overdue') {
		return isOverdue(card) && !card.done;
	}
	if (f === '$done') {
		return card.done;
	}
	if (f.startsWith('$')) {
		const type = f.slice(1);
		return card.type.toLowerCase().includes(type);
	}
	return card.title.toLowerCase().includes(f)
		|| card.assignees.some(a => a.toLowerCase().includes(f));
}


// ══════════════════════════════════════════════════════════════
//  Module 5: render.js — Board rendering
// ══════════════════════════════════════════════════════════════

const ICON_DRAG = `<svg width="12" height="12" fill="currentColor"><use href="#i-drag"/></svg>`;
const ICON_CHEVRON = `<svg width="13" height="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><use href="#i-chevron"/></svg>`;
const ICON_PLUS = `<svg width="13" height="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><use href="#i-plus"/></svg>`;
const ICON_TRASH = `<svg width="14" height="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-trash"/></svg>`;
const ICON_CHECK_SQUARE = `<svg width="14" height="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-check-sq"/></svg>`;
const ICON_SQUARE = `<svg width="14" height="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-square"/></svg>`;
const ICON_X = `<svg width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><use href="#i-x"/></svg>`;

function escHtml(s) {
	return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// The rendered element for a card id (ids come from imported files, so escape them for the selector).
function cardEl(id) {
	return document.querySelector(`.card[data-card-id="${CSS.escape(id)}"]`);
}

// Stable per-name hue for assignee avatars and labels.
function nameColor(name) {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
	const hue = h % 360;
	const isDark = document.documentElement.dataset.theme === 'dark';
	return isDark ? `oklch(0.72 0.14 ${hue})` : `oklch(0.52 0.14 ${hue})`;
}

function isOverdue(card) {
	if (card.done || !card.dueDate) return false;
	return card.dueDate <= NOW_STR;
}

function relativeDue(dateStr) {
	if (!dateStr) return '';
	const d = new Date(dateStr + 'T00:00:00');
	const now = new Date(NOW_STR + 'T00:00:00');
	const diff = Math.round((d - now) / 86400000);
	if (diff === 0) return 'today';
	if (diff === 1) return 'tomorrow';
	if (diff === -1) return 'yesterday';
	if (diff < -1) return `${-diff}d overdue`;
	if (diff <= 7) return `in ${diff}d`;
	return dateStr;
}

function cardAgeDays(card) {
	if (!card._created) return 0;
	return Math.max(0, Math.round((Date.now() - card._created) / 86400000));
}

function cardAgeCls(card) {
	const d = cardAgeDays(card);
	if (d <= 3) return '';
	if (d <= 7) return 'age-warm';
	return 'age-stale';
}


// ══════════════════════════════════════════════════════════════
//  Keyed DOM Reconciler
// ══════════════════════════════════════════════════════════════

function reconcileChildren(parent, descs, keyFn) {
	const oldNodes = parent.children;
	const oldByKey = new Map();
	for (let i = oldNodes.length - 1; i >= 0; i--) {
		const el = oldNodes[i];
		const k = keyFn(el);
		if (k != null) oldByKey.set(k, el);
	}

	let cursor = parent.firstElementChild;
	for (let i = 0; i < descs.length; i++) {
		const d = descs[i];
		let el = oldByKey.get(d.key);
		if (el) {
			oldByKey.delete(d.key);
			d.patch(el, d);
			if (el !== cursor) parent.insertBefore(el, cursor);
			else cursor = cursor.nextElementSibling;
		} else {
			el = d.create(d);
			parent.insertBefore(el, cursor);
		}
	}

	for (const orphan of oldByKey.values()) {
		if (!orphan.classList.contains('drop-indicator') &&
			!orphan.classList.contains('reorder-indicator'))
			orphan.remove();
	}
}

function setAttr(el, k, v) {
	const cur = el.getAttribute(k);
	if (cur !== v) el.setAttribute(k, v);
}

function setCls(el, cls) {
	if (el.className !== cls) el.className = cls;
}

// ══════════════════════════════════════════════════════════════
//  Card signature — skip unchanged cards entirely
// ══════════════════════════════════════════════════════════════

const _cardHtmlCache = new Map();
const _CARD_CACHE_MAX = 500;

function cachedCardHtml(sig, c, stageDone, vis) {
	let html = _cardHtmlCache.get(sig);
	if (html) return html;
	html = cardInnerHTML(c, stageDone, vis);
	if (_cardHtmlCache.size > _CARD_CACHE_MAX) _cardHtmlCache.clear();
	_cardHtmlCache.set(sig, html);
	return html;
}

function cardTypeColor(type) {
	if (type === 'meeting') return 'var(--blue)';
	if (type === 'followup') return 'var(--yellow)';
	return 'var(--faint)';
}

function cardSig(c, stageDone, vis, projColor) {
	const filtered = vis && !vis.has(c.id) ? 1 : 0;
	const done = c.done || stageDone ? 1 : 0;
	const overdue = isOverdue(c) && !done ? 1 : 0;
	const moved = _movedCards.has(c.id) ? 1 : 0;
	const selected = selectedCards.has(c.id) ? 1 : 0;
	const future = !done && c.startDate && c.startDate > NOW_STR ? 1 : 0;
	const ageCls = cardAgeCls(c);
	return `${c.id}|${c.title}|${done}|${c.type}|${overdue}|${filtered}|${projColor}|${c.labels.join(',')}|${c.dueDate||''}|${c.startDate||''}|${(c.assignees||[]).join(',')}|${c.notes||''}|${moved}|${ageCls}|${c._created||0}|${selected}|${future}|${NOW_STR}`;
}

// ══════════════════════════════════════════════════════════════
//  Card rendering
// ══════════════════════════════════════════════════════════════

function cardClasses(c, stageDone, vis) {
	let cls = 'card';
	if (c.done || stageDone) cls += ' done-card';
	if (c.type === 'meeting') cls += ' type-meeting';
	if (c.type === 'followup') cls += ' type-followup';
	const done = c.done || stageDone;
	if (isOverdue(c) && !done) cls += ' overdue';
	if (!done && c.startDate && c.startDate > NOW_STR) cls += ' card--future';
	if (vis && !vis.has(c.id)) cls += ' card--filtered';
	if (selectedCards.has(c.id)) cls += ' card--selected';
	return cls;
}

function cardInnerHTML(c, stageDone, vis) {
	const done = c.done || stageDone;
	const ageCls = cardAgeCls(c);
	const moved = _movedCards.has(c.id);
	let h = '';
	if (c.dueDate) h += `<div class="card__due${isOverdue(c) && !done ? ' overdue-date' : ''}" title="${escHtml(c.dueDate)}">${relativeDue(c.dueDate)}</div>`;
	h += `<div class="card__title">${escHtml(c.title || 'Untitled')}</div>`;
	if (c.notes) {
		const imgMatch = c.notes.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
		if (imgMatch) {
			h += `<img class="card__img-preview" src="${escHtml(imgMatch[1])}" alt="" loading="lazy">`;
		}
		h += `<div class="card__notes-preview">${renderNotesPreview(c.notes)}</div>`;
	}
	if (c.labels.length) {
		h += '<div class="card__meta">';
		for (const l of c.labels) h += `<span class="card__label" style="color:${nameColor(l)}">${escHtml(l)}</span>`;
		h += '</div>';
	}
	if (moved) h += '<span class="card__age age-moved"></span>';
	else if (c._created && ageCls) h += `<span class="card__age ${ageCls}" title="${cardAgeDays(c)}d old"></span>`;
	if (c.assignees.length) {
		h += '<div class="card__assignees">';
		for (const a of c.assignees) {
			const col = nameColor(a);
			h += `<span class="card__avatar" style="color:${col};border:1.5px solid ${col}" title="${escHtml(a)}">${escHtml(a.charAt(0).toUpperCase())}</span>`;
		}
		h += '</div>';
	}
	return h;
}

function renderNotesPreview(notes) {
	let text = escHtml(notes.split('\n')[0]);
	text = text.replace(/!\[.*?\]\(https?:\/\/[^\s)]+\)/g, '[…]');
	text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
	text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
	text = text.replace(/\*(.+?)\*/g, '<i>$1</i>');
	text = text.replace(/^- \[x\]/gi, '☑');
	text = text.replace(/^- \[ \]/g, '☐');
	text = text.replace(/^- /g, '• ');
	text = text.replace(/^\d+\.\s/g, '');
	return text;
}

function renderMarkdown(src) {
	const lines = src.split('\n');
	let html = '';
	let inList = false;
	let listType = '';
	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const raw = lines[lineIdx];
		const line = escHtml(raw);
		if (/^- \[x\]/i.test(raw)) {
			if (inList && listType !== 'ul') { html += `</${listType}>`; inList = false; }
			if (!inList) { html += '<ul>'; inList = true; listType = 'ul'; }
			html += `<li><span class="md-check md-check--done" data-line="${lineIdx}"><svg width="14" height="14" stroke="var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-check-sq"/></svg></span> ${mdInline(line.replace(/^- \[x\]\s*/i, ''))}</li>`;
		} else if (/^- \[ \]/.test(raw)) {
			if (inList && listType !== 'ul') { html += `</${listType}>`; inList = false; }
			if (!inList) { html += '<ul>'; inList = true; listType = 'ul'; }
			html += `<li><span class="md-check" data-line="${lineIdx}"><svg width="14" height="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-square"/></svg></span> ${mdInline(line.replace(/^- \[ \]\s*/, ''))}</li>`;
		} else if (/^- /.test(raw)) {
			if (inList && listType !== 'ul') { html += `</${listType}>`; inList = false; }
			if (!inList) { html += '<ul>'; inList = true; listType = 'ul'; }
			html += `<li>${mdInline(line.replace(/^- /, ''))}</li>`;
		} else if (/^\d+\.\s/.test(raw)) {
			if (inList && listType !== 'ol') { html += `</${listType}>`; inList = false; }
			if (!inList) { html += '<ol>'; inList = true; listType = 'ol'; }
			html += `<li>${mdInline(line.replace(/^\d+\.\s*/, ''))}</li>`;
		} else {
			if (inList) { html += `</${listType}>`; inList = false; }
			if (line.trim()) html += `<p>${mdInline(line)}</p>`;
		}
	}
	if (inList) html += `</${listType}>`;
	return html;
}

function mdInline(s) {
	const safeUrl = u => /^https?:\/\/[^\s"'<>]+$/.test(u) ? u : '';
	s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_, alt, url) => {
		const u = safeUrl(url);
		return u ? `<img src="${u}" alt="${alt}" loading="lazy">` : alt;
	});
	s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
		const u = safeUrl(url);
		return u ? `<a href="${u}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
	});
	s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
	s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
	s = s.replace(/\*(.+?)\*/g, '<i>$1</i>');
	return s;
}

function updateNotesPreview() {
	const textarea = document.getElementById('cpanel-notes');
	const preview = document.getElementById('cpanel-notes-preview');
	preview.innerHTML = textarea.value ? renderMarkdown(textarea.value) : '';
}

function createCard(d) {
	const el = document.createElement('div');
	el.dataset.cardId = d.key;
	el.tabIndex = -1;
	el.setAttribute('role', 'option');
	el.setAttribute('aria-selected', 'false');
	d.patch(el, d);
	return el;
}

function patchCard(el, d) {
	if (el._sig === d.sig) return;
	el._sig = d.sig;
	setCls(el, d.cls);
	el.draggable = !d.cls.includes('card--filtered');
	el.innerHTML = d.html;
}

// ══════════════════════════════════════════════════════════════
//  renderBoard — keyed reconciliation
// ══════════════════════════════════════════════════════════════

function updateColumnWidth() {
	const scrollEl = document.querySelector('.board-scroll');
	if (!scrollEl) return;
	const stgCount = stages.peek().length;
	if (stgCount === 0) return;
	const sw = 48;
	const addCol = 44;
	const available = scrollEl.clientWidth - sw - addCol;
	const baseCw = window.innerWidth <= 768 ? 180 : 230;
	const optimalCw = Math.max(baseCw, Math.floor(available / stgCount));
	document.documentElement.style.setProperty('--cw', optimalCw + 'px');
}

let _lastNavFilter = '';

function renderBoard() {
	const board = $('board');
	const stgs = stages.get();
	const projs = projects.get();
	const colCards = cardsByColumn.get();
	const vis = visibleIds.get();
	const allCollapsed = projs.every(p => p.collapsed);

	// Build descriptors
	const boardDescs = [];

	// Stage header row
	boardDescs.push({
		key: '__stage-row',
		create: createStageRow,
		patch: patchStageRow,
		stgs, projs, colCards, vis, allCollapsed,
	});

	// Swimlane rows
	for (const p of projs) {
		boardDescs.push({
			key: p.id,
			create: createSwimlane,
			patch: patchSwimlane,
			project: p, stgs, colCards, vis,
		});
	}

	// New swimlane drop zone
	boardDescs.push({
		key: '__drop-zone',
		create(d) {
			const el = document.createElement('div');
			el.className = 'proj-drop-zone-row';
			d.patch(el, d);
			return el;
		},
		patch(el, d) {
			const stgs = d.stgs;
			let h = `<div class="proj-drop-zone-label" id="add-project-btn" title="Add swimlane">${ICON_PLUS}</div><div class="proj-drop-zone-cols">`;
			for (const s of stgs) h += `<div class="proj-drop-zone-cell" data-proj-drop-stage="${escHtml(s.id)}"></div>`;
			h += '<div class="proj-drop-zone-col-end"></div></div>';
			if (el.innerHTML !== h) el.innerHTML = h;
		},
		stgs,
	});

	reconcileChildren(board, boardDescs, el => {
		if (el.dataset.project) return el.dataset.project;
		if (el.classList.contains('stage-row')) return '__stage-row';
		if (el.classList.contains('proj-drop-zone-row')) return '__drop-zone';
		return null;
	});

	// No results message
	let msg = document.getElementById('no-results-msg');
	if (vis && vis.size === 0 && filterStr.peek()) {
		if (!msg) {
			msg = document.createElement('div');
			msg.id = 'no-results-msg';
			msg.style.cssText = 'text-align:center;padding:32px 16px;color:var(--muted);font-family:var(--sans);font-size:13px;';
			board.appendChild(msg);
		}
		msg.textContent = `No cards match "${filterStr.peek()}"`;
	} else if (msg) {
		msg.remove();
	}

	// Filter navigation — jump to the first match only when the filter itself changes,
	// not on every re-render (otherwise edits made while filtering steal focus).
	const filterChanged = filterStr.peek() !== _lastNavFilter;
	_lastNavFilter = filterStr.peek();
	if (!filterChanged) {
		updateFilterNavState();
	} else if (vis && vis.size > 0) {
		clearCountHighlights();
		requestAnimationFrame(() => {
			const entries = getNavigableEntries();
			if (entries.length === 0) { updateFilterNavState(); return; }
			const first = entries[0];
			_lastFocusedCardId = first.cardId;
			if (first.collapsed) {
				highlightCollapsedCount(first);
			} else if (first.projId === 'inbox') {
				if (!inboxOpen.peek()) inboxOpen.set(true);
				requestAnimationFrame(() => {
					const el = cardEl(first.cardId);
					if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); }
				});
			} else {
				const el = cardEl(first.cardId);
				if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); }
			}
			updateFilterNavState();
		});
	} else {
		clearCountHighlights();
		updateFilterNavState();
	}
}

