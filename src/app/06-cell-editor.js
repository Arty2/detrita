// ── Cell Markdown Editor ──

let _cellEditColId = null;

// One card as an Obsidian-style list item, with notes as indented continuation lines.
function cardToMd(c) {
	let line = `- [${c.done ? 'x' : ' '}] ${c.title}`;
	for (const a of c.assignees) line += ` @${a}`;
	for (const l of c.labels) line += ` #${l}`;
	if (c.type === 'meeting') line += ' $meeting';
	if (c.type === 'followup') line += ' $followup';
	if (c.startDate) line += ` start:${c.startDate}`;
	if (c.dueDate) line += ` due:${c.dueDate}`;
	line += ` ^${c.id}\n`;
	if (c.notes) for (const nl of c.notes.split('\n')) line += `  ${nl}\n`;
	return line;
}

// Parse a markdown list item ("- [x] Title @who #tag due:… ^id" or a bare "- Title").
// Returns null for non-list lines.
function parseCardLine(line) {
	const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)/);
	const bareMatch = !taskMatch && line.match(/^-\s+(.+)/);
	if (!taskMatch && !bareMatch) return null;
	const done = taskMatch ? taskMatch[1] !== ' ' : false;
	let rest = taskMatch ? taskMatch[2] : bareMatch[1];
	const assignees = [], labels = [];
	let dueDate = null, startDate = null, blockId = null, type = 'task';

	const idMatch = rest.match(/\s*\^(\S+)\s*$/);
	if (idMatch) { blockId = idMatch[1]; rest = rest.replace(idMatch[0], ''); }
	const dueMatch = rest.match(/(?:📅\s*|due:)(\d{4}-\d{2}-\d{2})/);
	if (dueMatch) { dueDate = dueMatch[1]; rest = rest.replace(dueMatch[0], ''); }
	const startMatch = rest.match(/(?:⏳\s*|start:)(\d{4}-\d{2}-\d{2})/);
	if (startMatch) { startDate = startMatch[1]; rest = rest.replace(startMatch[0], ''); }
	if (/\$meeting/.test(rest)) { type = 'meeting'; rest = rest.replace(/\$meeting/g, ''); }
	if (/\$followup/.test(rest)) { type = 'followup'; rest = rest.replace(/\$followup/g, ''); }
	rest = rest.replace(/@(\w+)/g, (_, name) => { assignees.push(name); return ''; });
	rest = rest.replace(/#(\w+)/g, (_, label) => { labels.push(label); return ''; });

	return { blockId, title: rest.trim(), done, type, assignees, labels, startDate, dueDate };
}

function newCardId() {
	return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function serializeCellMd(colId) {
	return (cardsByColumn.peek().get(colId) ?? []).map(cardToMd).join('');
}

function parseCellCards(text, colId) {
	const { projectId } = parseColId(colId);
	const result = [];
	let lastCard = null;
	let order = 0;

	for (const line of text.split('\n')) {
		const p = parseCardLine(line);
		if (p) {
			const { blockId, ...fields } = p;
			lastCard = {
				id: blockId || newCardId(),
				...fields, columnId: colId, projectId,
				order: order++, notes: '',
				_v: Date.now(), _created: Date.now(),
				_existingId: blockId,
			};
			result.push(lastCard);
			continue;
		}

		if (lastCard && /^\s{2,}/.test(line)) {
			const noteLine = line.replace(/^\s{2,}/, '');
			lastCard.notes += (lastCard.notes ? '\n' : '') + noteLine;
			continue;
		}

		if (line.trim() === '') lastCard = null;
	}
	return result;
}

function openCellEditor(colId) {
	_cellEditColId = colId;
	_openCardId = null;

	const md = serializeCellMd(colId);
	document.getElementById('cpanel-cell-md').value = md || '- [ ] \n';

	// Switch panel mode
	document.getElementById('cpanel-card-body').style.display = 'none';
	document.getElementById('cpanel-cell-body').style.display = '';
	document.querySelector('.cpanel-header').style.display = 'none';
	document.getElementById('cpanel-delete').style.display = 'none';
	document.querySelectorAll('.cpanel-cell-only').forEach(el => el.style.display = '');
	document.getElementById('cpanel').style.background = '';

	document.getElementById('cpanel-backdrop').classList.add('open');
	const cellMd = document.getElementById('cpanel-cell-md');
	cellMd.focus();

	// Auto-insert list prefix on Enter
	cellMd.onkeydown = (e) => {
		if (e.key !== 'Enter') return;
		const ta = e.target;
		const pos = ta.selectionStart;
		const text = ta.value;
		const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
		const currentLine = text.slice(lineStart, pos);
		const leadingWs = currentLine.match(/^(\s*)/)[1];
		let prefix;
		if (leadingWs.length > 0 && !currentLine.trim().startsWith('-')) {
			prefix = leadingWs;
		} else {
			prefix = '- [ ] ';
		}
		e.preventDefault();
		const before = text.slice(0, pos);
		const after = text.slice(ta.selectionEnd);
		ta.value = before + '\n' + prefix + after;
		ta.selectionStart = ta.selectionEnd = pos + 1 + prefix.length;
	};
}

function saveCellEditor() {
	if (!_cellEditColId) return;
	const text = document.getElementById('cpanel-cell-md').value;
	const newCards = parseCellCards(text, _cellEditColId);
	const oldCards = cardsByColumn.peek().get(_cellEditColId) ?? [];
	const oldMap = new Map(oldCards.map(c => [c.id, c]));

	pushUndo('edit cell');
	batch(() => {
		// Remove all old cards from this cell
		const oldIds = new Set(oldCards.map(c => c.id));
		cards.update(all => {
			const kept = all.filter(c => !oldIds.has(c.id));
			// Add parsed cards, preserving existing data where blockId matches
			for (const { _existingId, ...nc } of newCards) {
				const existing = _existingId ? oldMap.get(_existingId) : null;
				kept.push(existing ? { ...existing, ...nc, id: existing.id, _created: existing._created } : nc);
			}
			return kept;
		});
	});
	_cellEditColId = null;
}

function closeCellEditor() {
	document.getElementById('cpanel-card-body').style.display = '';
	document.getElementById('cpanel-cell-body').style.display = 'none';
	document.querySelector('.cpanel-header').style.display = '';
	document.getElementById('cpanel-delete').style.display = '';
	document.querySelectorAll('.cpanel-cell-only').forEach(el => el.style.display = 'none');
	_cellEditColId = null;
}

function inlineEditCard(cardEl) {
	const cardId = cardEl.dataset.cardId;
	const card = cardMap.peek().get(cardId);
	if (!card) return;

	const titleEl = cardEl.querySelector('.card__title');
	if (!titleEl) return;

	const input = document.createElement('input');
	input.type = 'text';
	input.value = card.title;
	input.className = 'card__title';
	input.style.cssText = 'width:100%;border:none;background:transparent;outline:none;font:inherit;padding:0;';
	titleEl.replaceWith(input);
	input.focus();
	input.select();

	let cancelled = false;
	const finish = () => {
		const newTitle = input.value.trim() || card.title;
		if (cancelled || newTitle === card.title) { input.replaceWith(titleEl); return; }
		pushUndo('rename card');
		cards.update(all => all.map(c => c.id === cardId ? { ...c, title: newTitle, _v: Date.now() } : c));
	};

	input.addEventListener('blur', finish, { once: true });
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation(); // keep Escape from also clearing the filter / closing panels
			cancelled = e.key === 'Escape';
			input.blur();
		}
	});
}

function toggleHelp() {
	document.activeElement?.blur();
	document.getElementById('help-backdrop').classList.toggle('open');
}

function showToast(msg) {
	const container = document.getElementById('toast-container');
	const toast = document.createElement('div');
	toast.className = 'toast';
	toast.textContent = msg;
	toast.addEventListener('click', () => toast.remove());
	container.appendChild(toast);
	setTimeout(() => toast.remove(), 3000);
}

function announce(msg) {
	const el = document.getElementById('announce');
	if (el) el.textContent = msg;
}

function flashBrandDelete() {
	if (navigator.vibrate) navigator.vibrate([40,43,40,43,40,43,40,43,40,43,40]);
	flashBrandAnim();
	if (_multiSelectMode) exitMultiSelect();
	showToast('Card deleted');
}

function flashBrandAnim() {
	const brand = document.querySelector('.brand');
	const main = brand?.querySelector('.brand-svg--main');
	const alt = brand?.querySelector('.brand-svg--alt');
	if (!main || !alt) return;
	let step = 0;
	const interval = setInterval(() => {
		const useAlt = step % 2 === 0;
		main.style.display = useAlt ? 'none' : '';
		alt.style.display = useAlt ? '' : 'none';
		if (brand) brand.style.color = useAlt ? 'var(--red)' : '';
		step++;
		if (step >= 6) {
			clearInterval(interval);
			main.style.display = '';
			alt.style.display = 'none';
			if (brand) brand.style.color = '';
		}
	}, 83);
}


// ══════════════════════════════════════════════════════════════
//  Module 13: persistence.js — OPFS/IDB storage layer
// ══════════════════════════════════════════════════════════════

class PersistenceLayer {
	#dbPromise = null;
	#worker = null;

	async init() {
		if (navigator.storage?.getDirectory) {
			try {
				this._opfsRoot = await navigator.storage.getDirectory();
			} catch (_) {}
		}
		if (!this._opfsRoot && typeof indexedDB !== 'undefined') {
			try {
				this.#dbPromise = new Promise((resolve, reject) => {
					const req = indexedDB.open('detrita', 1);
					req.onupgradeneeded = (e) => {
						const db = e.target.result;
						if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
					};
					req.onsuccess = () => resolve(req.result);
					req.onerror = () => reject(req.error);
				});
			} catch (_) {}
		}
		try { this.#worker = this._createWorker(); } catch (_) {}
	}

	_createWorker() {
		const code = `
			let opfsRoot = null, db = null;
			// Every message runs on one promise chain: a save can't start before init has
			// finished, and two saves never write the file concurrently (last one wins).
			let queue = Promise.resolve();
			self.onmessage = ({ data }) => { queue = queue.then(() => handle(data)).catch(() => {}); };
			async function handle(data) {
				if (data.type === 'init') {
					if (data.opfs) {
						try { opfsRoot = await self.navigator.storage.getDirectory(); } catch (_) {}
					} else {
						db = await new Promise((resolve) => {
							const req = indexedDB.open('detrita', 1);
							req.onupgradeneeded = (e) => {
								const d = e.target.result;
								if (!d.objectStoreNames.contains('state')) d.createObjectStore('state');
							};
							req.onsuccess = () => resolve(req.result);
							req.onerror = () => resolve(null);
						});
					}
					return;
				}
				if (data.type === 'save') {
					if (opfsRoot) {
						const h = await opfsRoot.getFileHandle('board.json', { create: true });
						if (h.createSyncAccessHandle) {
							// Worker-only API; the one Safari < 26 has (it lacks createWritable)
							const ah = await h.createSyncAccessHandle();
							try {
								const bytes = new TextEncoder().encode(data.payload);
								ah.truncate(0);
								ah.write(bytes, { at: 0 });
								ah.flush();
							} finally { ah.close(); }
						} else {
							const w = await h.createWritable();
							await w.write(data.payload);
							await w.close();
						}
					} else if (db) {
						db.transaction('state', 'readwrite').objectStore('state').put(data.payload, 'board');
					}
				}
			}
		`;
		const blob = new Blob([code], { type: 'application/javascript' });
		const url = URL.createObjectURL(blob);
		const w = new Worker(url);
		// Use the same backend as the main thread, so load() reads what the worker wrote.
		w.postMessage({ type: 'init', opfs: !!this._opfsRoot });
		return w;
	}

	saveRaw(json) {
		if (this.#worker) {
			this.#worker.postMessage({ type: 'save', payload: json });
		} else {
			this._saveMain(json);
		}
	}

	save(data) {
		this.saveRaw(JSON.stringify(data));
	}

	async _saveMain(json) {
		try {
			if (this._opfsRoot) {
				const handle = await this._opfsRoot.getFileHandle('board.json', { create: true });
				const writable = await handle.createWritable();
				await writable.write(json);
				await writable.close();
			} else if (this.#dbPromise) {
				const db = await this.#dbPromise;
				const tx = db.transaction('state', 'readwrite');
				tx.objectStore('state').put(json, 'board');
			}
		} catch (_) {}
	}

	async load() {
		try {
			if (this._opfsRoot) {
				const handle = await this._opfsRoot.getFileHandle('board.json');
				const file = await handle.getFile();
				const text = await file.text();
				return text ? JSON.parse(text) : null;
			} else if (this.#dbPromise) {
				const db = await this.#dbPromise;
				const tx = db.transaction('state', 'readonly');
				return new Promise((resolve) => {
					const req = tx.objectStore('state').get('board');
					req.onsuccess = () => resolve(req.result ? JSON.parse(req.result) : null);
					req.onerror = () => resolve(null);
				});
			}
		} catch (_) { return null; }
	}

	async reset() {
		try {
			if (this._opfsRoot) {
				try { await this._opfsRoot.removeEntry('board.json'); } catch (_) {}
			}
			if (this.#dbPromise) {
				const db = await this.#dbPromise;
				const tx = db.transaction('state', 'readwrite');
				tx.objectStore('state').delete('board');
			}
			try { indexedDB.deleteDatabase('detrita'); } catch (_) {}
		} catch (_) {}
	}
}



// ══════════════════════════════════════════════════════════════
//  Module 14: app.js — Init, routing, theme, demo cursors
// ══════════════════════════════════════════════════════════════

const persistence = new PersistenceLayer();
let _bootReady = Promise.resolve(); // settles once the saved board (or the demo) is in place
const LOCAL_MODIFIED_KEY = 'detrita-local-modified';

function initApp() {

	// Restore saved theme
	try {
		const savedTheme = localStorage.getItem('detrita-theme');
		if (savedTheme === 'dark' || savedTheme === 'light') {
			document.documentElement.dataset.theme = savedTheme;
			document.getElementById('icon-moon').style.display = savedTheme === 'dark' ? 'none' : '';
			document.getElementById('icon-sun').style.display = savedTheme === 'dark' ? '' : 'none';
			document.querySelector('meta[name="theme-color"]').content = savedTheme === 'dark' ? '#2b0000' : '#e3dedb';
		}
	} catch (_) {}

	// Initialize persistence and load saved state
	_bootReady = persistence.init().then(() => persistence.load()).then(saved => {
		if (saved) {
			applyBoard(saved);
		} else {
			// First visit — load tutorial demo and show help
			const demo = getDemoData();
			batch(() => {
				stages.set(demo.stages);
				projects.set(demo.projects);
				cards.set(demo.cards);
			});
			setTimeout(() => toggleHelp(), 300);
		}
	}).catch(() => {});

	// Render
	let _boardRenderPending = false;
	let _inboxRenderPending = false;
	// Subscribe to the raw signals, not the computed indexes: reading a computed here would
	// rebuild it synchronously on every mutation. The frame callback builds it once instead.
	effect(() => {
		stages.get(); projects.get(); cards.get(); filterStr.get();
		if (!_boardRenderPending) {
			_boardRenderPending = true;
			requestAnimationFrame(() => { _boardRenderPending = false; updateColumnWidth(); renderBoard(); });
		}
	});
	effect(() => {
		cards.get(); filterStr.get();
		if (!_inboxRenderPending) {
			_inboxRenderPending = true;
			requestAnimationFrame(() => { _inboxRenderPending = false; renderInbox(); });
		}
	});
	window.addEventListener('resize', () => { updateColumnWidth(); });
	// Keep "today" current when the app is left open overnight (PWA / pinned tab).
	document.addEventListener('visibilitychange', () => {
		if (document.hidden || NOW_STR === localDateStr()) return;
		NOW_STR = localDateStr();
		cards.set([...cards.peek()]); // re-render due/overdue badges
	});
	effect(() => {
		cards.get(); filterStr.get();
		if ($('stats-bar')?.classList.contains('open')) renderStats();
	});
	effect(() => {
		const open = inboxOpen.get();
		const panel = $('inbox-panel');
		panel.classList.toggle('open', open);
		document.querySelector('.bottom-bar').classList.toggle('inbox-open', open);
	});

	// Board events — once, uses delegation on persistent #board element
	wireUpBoardEvents();

	// Drag and drop — init once, uses event delegation
	initDragAndDrop();

	// Inbox card clicks → open detail panel (delayed for dblclick)
	let _inboxClickTimer = null;
	const inboxList = $('inbox-list');
	inboxList.addEventListener('click', (e) => {
		if (_suppressNextClick) { _suppressNextClick = false; return; }
		const card = e.target.closest('.card[data-card-id]');
		if (!card) {
			if (_multiSelectMode) { exitMultiSelect(); }
			return;
		}
		if (_multiSelectMode) {
			if (!_selectionJustToggled) toggleCardSelection(card.dataset.cardId, true);
			return;
		}
		clearTimeout(_inboxClickTimer);
		const cardId = card.dataset.cardId;
		_inboxClickTimer = setTimeout(() => openCardPanel(cardId), 250);
	});
	inboxList.addEventListener('dblclick', (e) => {
		if (document.body.classList.contains('print-preview')) return;
		if (_multiSelectMode) return;
		const card = e.target.closest('.card[data-card-id]');
		if (!card) return;
		clearTimeout(_inboxClickTimer);
		const cardId = card.dataset.cardId;
		pushUndo('toggle done');
		toggleCardDone(cardId);
	});
	inboxList.addEventListener('scroll', updateInboxShadows, { passive: true });
	$('inbox-shadow-top')?.addEventListener('click', () => {
		inboxList.scrollBy({ top: -inboxList.clientHeight * 0.8, behavior: 'smooth' });
	});
	$('inbox-shadow-bottom')?.addEventListener('click', () => {
		inboxList.scrollBy({ top: inboxList.clientHeight * 0.8, behavior: 'smooth' });
	});

	// Persistence — auto-save (debounced, skip if unchanged)
	let saveTimer = null;
	let lastSavedHash = '';
	let pendingSave = null;
	const flushSave = () => {
		clearTimeout(saveTimer);
		const data = pendingSave;
		pendingSave = null;
		if (!data) return;
		const json = JSON.stringify(data);
		if (json === lastSavedHash) return;
		lastSavedHash = json;
		persistence.saveRaw(json);
		try { localStorage.setItem(LOCAL_MODIFIED_KEY, String(Date.now())); } catch (_) {}
		fileSync.scheduleSave();
	};
	effect(() => {
		pendingSave = { stages: stages.get(), projects: projects.get(), cards: cards.get() };
		clearTimeout(saveTimer);
		saveTimer = setTimeout(flushSave, 1000);
	});
	// Don't lose the last second of edits (or a pending file sync) when the tab is hidden or closed
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) return;
		flushSave();
		if (fileSync._dirty) fileSync.saveNow();
	});

	// Keyboard
	initKeyboard();

	// Wire up UI
	wireUpGlobalEvents();
}

let _boardDragType = null; // 'stage' | 'project' | null

// Move item `fromId` next to `toId` (after it when `after`, else before) — matching the
// side the drop indicator showed — and toast where it landed.
function reorderSignal(sig, fromId, toId, after, action) {
	const arr = [...sig.peek()];
	const fromIdx = arr.findIndex(x => x.id === fromId);
	if (fromIdx < 0) return;
	const [moved] = arr.splice(fromIdx, 1);
	const toIdx = arr.findIndex(x => x.id === toId);
	if (toIdx < 0) return;
	const newIdx = toIdx + (after ? 1 : 0);
	if (newIdx === fromIdx) return; // dropped back where it was
	pushUndo(action);
	arr.splice(newIdx, 0, moved);
	sig.set(arr);
	const rel = arr[newIdx - 1] ? `after ${arr[newIdx - 1].name}` : `before ${arr[newIdx + 1]?.name || ''}`;
	showToast(`${moved.name} → ${rel}`);
}

function wireUpBoardEvents() {
	const board = document.getElementById('board');

	// Long-press on + button → open cell markdown editor
	let _colAddLongPressed = false;
	let _colAddTimer = null;
	board.addEventListener('pointerdown', (e) => {
		const addBtn = e.target.closest('.col-add[data-add-col]');
		if (!addBtn) return;
		_colAddLongPressed = false;
		_colAddTimer = setTimeout(() => {
			_colAddLongPressed = true;
			if (navigator.vibrate) navigator.vibrate(50);
			openCellEditor(addBtn.dataset.addCol);
		}, 400);
	});
	board.addEventListener('pointerup', () => clearTimeout(_colAddTimer));
	board.addEventListener('pointercancel', () => clearTimeout(_colAddTimer));
	board.addEventListener('pointermove', (e) => {
		if (_colAddTimer && (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)) {
			clearTimeout(_colAddTimer);
			_colAddTimer = null;
		}
	});

	// Card click → open detail panel (delayed to allow dblclick)
	let _cardClickTimer = null;
	let _cardClickId = null;
	board.addEventListener('click', (e) => {
		if (_suppressNextClick) { _suppressNextClick = false; return; }
		const card = e.target.closest('.card[data-card-id]');
		if (card && !e.target.closest('.sw-reorder-btn') && !e.target.closest('input')) {
			if (e.shiftKey || _multiSelectMode) {
				if (!_selectionJustToggled) toggleCardSelection(card.dataset.cardId, true);
				return;
			}
			clearSelection();
			// Delay open to allow dblclick to cancel
			clearTimeout(_cardClickTimer);
			_cardClickId = card.dataset.cardId;
			_cardClickTimer = setTimeout(() => {
				openCardPanel(_cardClickId);
				_cardClickId = null;
			}, 250);
			return;
		}

		// Click outside cards exits multi-select
		if (_multiSelectMode) { exitMultiSelect(); return; }

		const addBtn = e.target.closest('.col-add[data-add-col]');
		if (addBtn) {
			if (_colAddLongPressed) { _colAddLongPressed = false; return; }
			addCardToCol(addBtn.dataset.addCol); return;
		}

		const collapseBtn = e.target.closest('.sw-collapse[data-collapse]');
		if (collapseBtn) {
			pushUndo('collapse swimlane');
			const projId = collapseBtn.dataset.collapse;
			projects.update(all => all.map(p =>
				p.id === projId ? { ...p, collapsed: !p.collapsed } : p
			));
			return;
		}

		const addProj = e.target.closest('#add-project-btn');
		if (addProj) {
			openAddProjectModal();
			return;
		}

		const stageAdd = e.target.closest('.stage-cell-add');
		if (stageAdd) {
			openAddColumnModal();
			return;
		}

		// Collapse/expand all toggle
		const collapseAll = e.target.closest('#collapse-all-btn');
		if (collapseAll) {
			pushUndo('collapse all');
			const allCollapsed = projects.peek().every(p => p.collapsed);
			projects.update(all => all.map(p => ({ ...p, collapsed: !allCollapsed })));
			return;
		}

		// Done toggle on stage column
		const doneToggle = e.target.closest('.done-toggle[data-done-stage]');
		if (doneToggle) {
			const stageId = doneToggle.dataset.doneStage;
			const wasDone = stages.peek().find(s => s.id === stageId)?.done;
			pushUndo('toggle done column');
			batch(() => {
				stages.update(all => all.map(s =>
					s.id === stageId ? { ...s, done: !s.done } : s
				));
				// Mark/unmark all cards in this stage
				cards.update(all => all.map(c =>
					parseColId(c.columnId).stageId === stageId ? { ...c, done: !wasDone, _v: Date.now() } : c
				));
			});
			return;
		}
	});

	// ── Stage & Project drag reorder ──
	// Mousedown on drag handle → set draggable on parent
	board.addEventListener('pointerdown', (e) => {
		const stageDrag = e.target.closest('.stage-drag');
		if (stageDrag) {
			const cell = stageDrag.closest('.stage-cell[data-stage-id]');
			if (cell) { cell.draggable = true; cell._dragHandle = true; }
			return;
		}
		const projDrag = e.target.closest('.proj-drag[data-proj-drag]');
		if (projDrag) {
			const swimlane = projDrag.closest('.swimlane[data-project]');
			if (swimlane) { swimlane.draggable = true; swimlane._dragHandle = true; }
			return;
		}
	});

	board.addEventListener('dragstart', (e) => {
		const stageCell = e.target.closest('.stage-cell[data-stage-id]');
		if (stageCell && stageCell._dragHandle) {
			e.dataTransfer.setData('text/x-stage', stageCell.dataset.stageId);
			e.dataTransfer.effectAllowed = 'move';
			_boardDragType = 'stage';
			const dot = _makeDragDot();
			e.dataTransfer.setDragImage(dot, dot.width / 2, dot.height / 2);
			requestAnimationFrame(() => { stageCell.style.opacity = '0.4'; dot.remove(); });
			e.stopPropagation();
			return;
		}
		const swimlane = e.target.closest('.swimlane[data-project]');
		if (swimlane && swimlane._dragHandle) {
			e.dataTransfer.setData('text/x-project', swimlane.dataset.project);
			e.dataTransfer.effectAllowed = 'move';
			_boardDragType = 'project';
			const dot = _makeDragDot();
			e.dataTransfer.setDragImage(dot, dot.width / 2, dot.height / 2);
			requestAnimationFrame(() => { swimlane.style.opacity = '0.4'; dot.remove(); });
			e.stopPropagation();
			return;
		}
	});

	board.addEventListener('dragend', (e) => {
		board.querySelectorAll('.stage-cell[draggable]').forEach(c => {
			c.draggable = false; delete c._dragHandle; c.style.opacity = '';
		});
		board.querySelectorAll('.swimlane[draggable]').forEach(c => {
			c.draggable = false; delete c._dragHandle; c.style.opacity = '';
		});
		clearReorderIndicator();
		stopAutoScroll();
		_boardDragType = null;
	});

	let _reorderDragPending = false;
	let _lastReorderEvent = null;
	board.addEventListener('dragover', (e) => {
		if (!_boardDragType) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		_lastReorderEvent = e;
		if (_reorderDragPending) return;
		_reorderDragPending = true;
		requestAnimationFrame(() => {
			_reorderDragPending = false;
			const ev = _lastReorderEvent;
			if (!ev) return;
			if (_boardDragType === 'stage') {
				const target = ev.target.closest('.stage-cell[data-stage-id]');
				clearReorderIndicator();
				if (target) {
					const rect = target.getBoundingClientRect();
					const boardRect = $('board-scroll').getBoundingClientRect();
					const onLeft = ev.clientX < rect.left + rect.width / 2;
					const ind = document.createElement('div');
					ind.className = 'reorder-indicator reorder-indicator--v';
					ind.style.cssText = `top:${boardRect.top}px;height:${boardRect.height}px;left:${onLeft ? rect.left - 1 : rect.right - 1}px;`;
					setReorderIndicator(ind);
				}
				startAutoScroll(ev.clientX, ev.clientY);
			} else if (_boardDragType === 'project') {
				const target = ev.target.closest('.swimlane[data-project]');
				clearReorderIndicator();
				if (target) {
					const rect = target.getBoundingClientRect();
					const boardRect = $('board-scroll').getBoundingClientRect();
					const onTop = ev.clientY < rect.top + rect.height / 2;
					const ind = document.createElement('div');
					ind.className = 'reorder-indicator reorder-indicator--h';
					ind.style.cssText = `left:${boardRect.left}px;width:${boardRect.width}px;top:${onTop ? rect.top - 1 : rect.bottom - 1}px;`;
					setReorderIndicator(ind);
				}
				startAutoScroll(ev.clientX, ev.clientY);
			}
		});
	});

	board.addEventListener('dragleave', (e) => {
		if (_boardDragType === 'stage') {
			const target = e.target.closest('.stage-cell');
			if (target && !target.contains(e.relatedTarget)) target.classList.remove('drop-hover');
		}
		if (_boardDragType === 'project') {
			const target = e.target.closest('.swimlane');
			if (target && !target.contains(e.relatedTarget)) target.classList.remove('drop-hover');
		}
	});

	board.addEventListener('drop', (e) => {
		if (_boardDragType === 'stage') {
			const fromId = e.dataTransfer.getData('text/x-stage');
			const target = e.target.closest('.stage-cell[data-stage-id]');
			if (target && fromId) {
				const toId = target.dataset.stageId;
				if (fromId !== toId) {
					const rect = target.getBoundingClientRect();
					reorderSignal(stages, fromId, toId, e.clientX >= rect.left + rect.width / 2, 'reorder stages');
				}
			}
			clearReorderIndicator();
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if (_boardDragType === 'project') {
			const fromId = e.dataTransfer.getData('text/x-project');
			const target = e.target.closest('.swimlane[data-project]');
			if (target && fromId) {
				const toId = target.dataset.project;
				if (fromId !== toId) {
					const rect = target.getBoundingClientRect();
					reorderSignal(projects, fromId, toId, e.clientY >= rect.top + rect.height / 2, 'reorder swimlanes');
				}
			}
			clearReorderIndicator();
			e.preventDefault();
			e.stopPropagation();
			return;
		}
	});

	// Double-click: toggle done on card, edit stage/project, new card in cell
	board.addEventListener('dblclick', (e) => {
		if (document.body.classList.contains('print-preview')) return;
		if (_multiSelectMode) return;
		const card = e.target.closest('.card[data-card-id]');
		if (card) {
			// Cancel pending single-click open
			clearTimeout(_cardClickTimer);
			_cardClickId = null;
			// Don't toggle done in done-columns
			const colCell = card.closest('.col-cell[data-col-id]');
			if (colCell) {
				const { stageId } = parseColId(colCell.dataset.colId);
				if (stages.peek().find(s => s.id === stageId)?.done) return;
			}
			const cardId = card.dataset.cardId;
			pushUndo('toggle done');
			toggleCardDone(cardId);
			return;
		}

		const stageName = e.target.closest('.stage-name');
		if (stageName) {
			const stageCell = stageName.closest('.stage-cell[data-stage-id]');
			if (stageCell) openEditColumnModal(stageCell.dataset.stageId);
			return;
		}

		const projName = e.target.closest('[data-proj-name]');
		if (projName) {
			openEditProjectModal(projName.dataset.projName);
			return;
		}

		const cell = e.target.closest('.col-cell[data-col-id]');
		if (cell && !e.target.closest('.card')) {
			// Check if this is the rightmost (last stage) cell — create new stage + card
			const swCols = cell.closest('.sw-cols');
			const allCells = swCols ? [...swCols.querySelectorAll('.col-cell')] : [];
			const isLast = allCells.length > 0 && cell === allCells[allCells.length - 1];
			const isEmpty = (cell.querySelector('.col-cards')?.children.length ?? 0) === 0;

			if (isLast && isEmpty) {
				const swimlane = cell.closest('.swimlane[data-project]');
				const projId = swimlane?.dataset.project;
				pushUndo('new stage + card');
				const stageId = addStage();
				if (projId) addCardToCol(`col-${projId}-${stageId}`, true);
			} else {
				addCardToCol(cell.dataset.colId);
			}
			return;
		}

		// Double-click new project row → create project + card
		const projDropCell = e.target.closest('.proj-drop-zone-cell[data-proj-drop-stage]');
		const projDropLabel = e.target.closest('.proj-drop-zone-label');
		if (projDropCell || projDropLabel) {
			const stageId = projDropCell?.dataset.projDropStage || stages.peek()[0]?.id;
			pushUndo('new swimlane + card');
			const projId = addSwimlane();
			if (stageId) addCardToCol(`col-${projId}-${stageId}`, true);
			return;
		}

		// Double-click stage-cell-add → create column + card
		const stageAddDbl = e.target.closest('.stage-cell-add');
		if (stageAddDbl) {
			const projId = stageAddDbl.dataset.projStageAdd || projects.peek()[0]?.id;
			pushUndo('new stage + card');
			const stageId = addStage();
			if (projId) addCardToCol(`col-${projId}-${stageId}`, true);
			return;
		}
	});

	// ── Touch-based reorder for mobile ──
	board.addEventListener('pointerdown', (e) => {
		if (e.pointerType === 'mouse') return; // mouse uses native DnD above

		const stageDrag = e.target.closest('.stage-drag');
		const projDrag = e.target.closest('.proj-drag[data-proj-drag]');
		if (!stageDrag && !projDrag) return;

		e.preventDefault();
		const isStage = !!stageDrag;
		const sourceEl = isStage
			? stageDrag.closest('.stage-cell[data-stage-id]')
			: projDrag.closest('.swimlane[data-project]');
		if (!sourceEl) return;

		const sourceId = isStage ? sourceEl.dataset.stageId : sourceEl.dataset.project;
		const startY = e.clientY, startX = e.clientX;
		let moved = false;
		const boardScroll = $('board-scroll');

		sourceEl.style.opacity = '0.4';

		const onMove = (ev) => {
			if (!moved && Math.abs(ev.clientX - startX) < 6 && Math.abs(ev.clientY - startY) < 6) return;
			moved = true;
			clearReorderIndicator();
			startAutoScroll(ev.clientX, ev.clientY);
			const el = document.elementFromPoint(ev.clientX, ev.clientY);
			const target = isStage
				? el?.closest('.stage-cell[data-stage-id]')
				: el?.closest('.swimlane[data-project]');
			if (target && target !== sourceEl) {
				const rect = target.getBoundingClientRect();
				const boardRect = boardScroll.getBoundingClientRect();
				const ind = document.createElement('div');
				if (isStage) {
					const onLeft = ev.clientX < rect.left + rect.width / 2;
					ind.className = 'reorder-indicator reorder-indicator--v';
					ind.style.cssText = `top:${boardRect.top}px;height:${boardRect.height}px;left:${onLeft ? rect.left - 1 : rect.right - 1}px;`;
				} else {
					const onTop = ev.clientY < rect.top + rect.height / 2;
					ind.className = 'reorder-indicator reorder-indicator--h';
					ind.style.cssText = `left:${boardRect.left}px;width:${boardRect.width}px;top:${onTop ? rect.top - 1 : rect.bottom - 1}px;`;
				}
				setReorderIndicator(ind);
			}
		};

		const onUp = (ev) => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			document.removeEventListener('pointercancel', onUp);
			sourceEl.style.opacity = '';
			clearReorderIndicator();
			stopAutoScroll();

			if (!moved) return;

			const el = document.elementFromPoint(ev.clientX, ev.clientY);
			const target = isStage
				? el?.closest('.stage-cell[data-stage-id]')
				: el?.closest('.swimlane[data-project]');
			if (!target) return;
			const toId = isStage ? target.dataset.stageId : target.dataset.project;
			if (toId === sourceId) return;

			const rect = target.getBoundingClientRect();
			if (isStage) reorderSignal(stages, sourceId, toId, ev.clientX >= rect.left + rect.width / 2, 'reorder stages');
			else reorderSignal(projects, sourceId, toId, ev.clientY >= rect.top + rect.height / 2, 'reorder swimlanes');
		};

		document.addEventListener('pointermove', onMove, { passive: false });
		document.addEventListener('pointerup', onUp);
		document.addEventListener('pointercancel', onUp);
	});
}

