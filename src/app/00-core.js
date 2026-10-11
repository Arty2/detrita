// ══════════════════════════════════════════════════════════════
//  Module 1: signals.js — Reactive primitives (~120 lines)
// ══════════════════════════════════════════════════════════════
'use strict';

const _EMPTY = Symbol('empty');
let _currentEffect = null;
let _batchDepth = 0;
let _batchQueue = new Set();

function signal(initialValue) {
	let _value = initialValue;
	const _subs = new Set();

	const s = {
		get() {
			if (_currentEffect) _subs.add(_currentEffect);
			return _value;
		},
		peek() { return _value; },
		set(newValue) {
			if (Object.is(_value, newValue)) return;
			_value = newValue;
			_notify(_subs);
		},
		update(fn) {
			s.set(fn(_value));
		},
	};
	return s;
}

function computed(fn) {
	let _value = _EMPTY;
	let _dirty = true;
	const _subs = new Set();

	const innerEffect = {
		computed: true, // invalidate immediately, even inside batch(), so peek() is never stale
		run() {
			_dirty = true;
			_notify(_subs);
		},
	};

	const c = {
		get() {
			if (_currentEffect) _subs.add(_currentEffect);
			if (_dirty) {
				const prev = _currentEffect;
				_currentEffect = innerEffect;
				try { _value = fn(); }
				finally { _currentEffect = prev; }
				_dirty = false;
			}
			return _value;
		},
		peek() {
			if (_dirty) {
				// Track dependencies (so later writes invalidate us) without subscribing the caller
				const prev = _currentEffect;
				_currentEffect = innerEffect;
				try { _value = fn(); }
				finally { _currentEffect = prev; }
				_dirty = false;
			}
			return _value;
		},
	};
	return c;
}

function effect(fn) {
	const eff = {
		run() {
			if (_batchDepth > 0) { _batchQueue.add(eff); return; }
			const prev = _currentEffect;
			_currentEffect = eff;
			try { fn(); }
			finally { _currentEffect = prev; }
		},
	};
	eff.run();
}

function batch(fn) {
	_batchDepth++;
	try { fn(); }
	finally {
		_batchDepth--;
		if (_batchDepth === 0) {
			const queue = [..._batchQueue];
			_batchQueue.clear();
			for (const eff of queue) eff.run();
		}
	}
}

function _notify(subs) {
	for (const sub of subs) {
		if (typeof sub === 'object' && sub.run) {
			if (_batchDepth > 0 && !sub.computed) _batchQueue.add(sub);
			else sub.run();
		} else if (typeof sub === 'function') {
			sub();
		}
	}
}


// ══════════════════════════════════════════════════════════════
//  Module 3: state.js — All state signals + computed indexes
// ══════════════════════════════════════════════════════════════

const SWATCH_COLORS = ['#2b4abd','#2a7a3e','#a07820','#bd1e2e','#7a5040','#6a3ea1','#1a8a8a'];

const _domCache = new Map();
function $(id) {
	let el = _domCache.get(id);
	if (!el || !el.isConnected) {
		el = document.getElementById(id);
		if (el) _domCache.set(id, el);
	}
	return el;
}

let _activeHover = null;
let _activeIndicator = null;
let _activeReorderIndicator = null;

function clearHover() {
	if (_activeHover) { _activeHover.classList.remove('drop-hover'); _activeHover = null; }
}
function setHover(el) {
	if (el === _activeHover) return;
	clearHover();
	_activeHover = el;
	if (el) el.classList.add('drop-hover');
}
function clearIndicator() {
	if (_activeIndicator) { _activeIndicator.remove(); _activeIndicator = null; }
}
function clearReorderIndicator() {
	if (_activeReorderIndicator) { _activeReorderIndicator.remove(); _activeReorderIndicator = null; }
}
function setReorderIndicator(el) {
	clearReorderIndicator();
	_activeReorderIndicator = el;
	document.body.appendChild(el);
}

const stages = signal([]);
const projects = signal([]);
const cards = signal([]);

// Column ids are `col-${projectId}-${stageId}`; either id may itself contain dashes,
// so resolve them against the known stages instead of splitting on '-'.
function parseColId(colId) {
	if (!colId || colId === 'inbox-col') return { projectId: 'inbox', stageId: null };
	let best = null;
	for (const s of stages.peek()) {
		if (!colId.endsWith('-' + s.id) || colId.length <= s.id.length + 5) continue;
		const projectId = colId.slice(4, -(s.id.length + 1));
		if (projects.peek().some(p => p.id === projectId)) return { projectId, stageId: s.id };
		if (!best || s.id.length > best.stageId.length) best = { projectId, stageId: s.id };
	}
	if (best) return best;
	const parts = colId.split('-');
	return { projectId: parts.slice(1, -1).join('-') || 'inbox', stageId: parts[parts.length - 1] };
}

// Stage ids derived from names must stay unique on the board.
function uniqueStageId(name) {
	const base = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'stage';
	const taken = new Set(stages.peek().map(s => s.id));
	let id = base, n = 2;
	while (taken.has(id)) id = `${base}-${n++}`;
	return id;
}

// Local calendar date (YYYY-MM-DD) — date inputs are local, so don't use toISOString (UTC).
function localDateStr(d = new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let NOW_STR = localDateStr();

const filterStr = signal('');
const inboxOpen = signal(false);

const filterPresets = signal([]); // [{name, query}]
const selectedCards = new Set(); // for multi-select

