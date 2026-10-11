// ── Modal Wiring ──

let _selectedProjColor = SWATCH_COLORS[0];

let _editingProjId = null;

function openAddProjectModal() {
	document.activeElement?.blur();
	_editingProjId = null;
	document.getElementById('proj-modal-title').textContent = 'New Swimlane';
	document.getElementById('proj-modal-create').textContent = 'Create';
	document.getElementById('proj-modal-delete').style.display = 'none';
	document.getElementById('proj-name-input').value = '';
	_selectedProjColor = SWATCH_COLORS[projects.peek().length % SWATCH_COLORS.length];
	const swatches = document.getElementById('proj-color-swatches');
	swatches.innerHTML = '';
	for (const color of SWATCH_COLORS) {
		const swatch = document.createElement('div');
		swatch.className = 'color-swatch' + (color === _selectedProjColor ? ' selected' : '');
		swatch.style.background = color;
		swatch.addEventListener('click', () => {
			_selectedProjColor = color;
			swatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
			swatch.classList.add('selected');
		});
		swatches.appendChild(swatch);
	}
	document.getElementById('add-proj-modal').classList.add('open');
	document.getElementById('proj-name-input').focus();
}

function openEditProjectModal(projId) {
	document.activeElement?.blur();
	const proj = projects.peek().find(p => p.id === projId);
	if (!proj) return;
	_editingProjId = projId;
	document.getElementById('proj-modal-title').textContent = 'Edit Swimlane';
	document.getElementById('proj-modal-create').textContent = 'Save';
	document.getElementById('proj-modal-delete').style.display = '';
	document.getElementById('proj-name-input').value = proj.name;
	_selectedProjColor = proj.color;
	const swatches = document.getElementById('proj-color-swatches');
	swatches.innerHTML = '';
	for (const color of SWATCH_COLORS) {
		const swatch = document.createElement('div');
		swatch.className = 'color-swatch' + (color === _selectedProjColor ? ' selected' : '');
		swatch.style.background = color;
		swatch.addEventListener('click', () => {
			_selectedProjColor = color;
			swatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
			swatch.classList.add('selected');
		});
		swatches.appendChild(swatch);
	}
	document.getElementById('add-proj-modal').classList.add('open');
	document.getElementById('proj-name-input').focus();
}

let _editingStageId = null;

function openAddColumnModal() {
	document.activeElement?.blur();
	_editingStageId = null;
	document.getElementById('col-modal-title').textContent = 'New Stage';
	document.getElementById('col-modal-create').textContent = 'Create';
	document.getElementById('col-modal-delete').style.display = 'none';
	document.getElementById('col-done-toggle').checked = false;
	document.getElementById('col-automove-toggle').checked = false;
	document.getElementById('col-automove-toggle').disabled = true;
	document.getElementById('col-automove-label').style.color = 'var(--muted)';
	document.getElementById('add-col-modal').classList.add('open');
	document.getElementById('col-name-input').value = '';
	document.getElementById('col-name-input').focus();
}

function openEditColumnModal(stageId) {
	document.activeElement?.blur();
	const stage = stages.peek().find(s => s.id === stageId);
	if (!stage) return;
	_editingStageId = stageId;
	document.getElementById('col-modal-title').textContent = 'Edit Stage';
	document.getElementById('col-modal-create').textContent = 'Save';
	document.getElementById('col-modal-delete').style.display = '';
	document.getElementById('col-done-toggle').checked = stage.done;
	document.getElementById('col-automove-toggle').checked = !!stage.automove;
	document.getElementById('col-automove-toggle').disabled = !stage.done;
	document.getElementById('col-automove-label').style.color = stage.done ? 'var(--text)' : 'var(--muted)';
	document.getElementById('col-name-input').value = stage.name;
	document.getElementById('add-col-modal').classList.add('open');
	document.getElementById('col-name-input').focus();
}

function getDemoData() {
	const d = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
	const n = Date.now();
	return {
		stages: [
			{ id: 'backlog', name: 'BACKLOG', color: '#7a5040', done: false },
			{ id: 'active',  name: 'ACTIVE',  color: '#2b4abd', done: false },
			{ id: 'review',  name: 'REVIEW',  color: '#a07820', done: false },
			{ id: 'done',    name: 'DONE',    color: '#2a7a3e', done: true, automove: true },
		],
		projects: [
			{ id: 'p1', name: 'GETTING STARTED', color: '#2b4abd', collapsed: false },
			{ id: 'p2', name: 'POWER FEATURES',  color: '#2a7a3e', collapsed: false },
			{ id: 'p3', name: 'CARD TYPES',       color: '#a07820', collapsed: false },
		],
		cards: [
			{ id: 't1', title: 'Welcome', columnId: 'col-p1-backlog', projectId: 'p1', order: 0, done: false, type: 'task', assignees: [], labels: ['start'], notes: 'Your board. No account, no server.\n\nDelete these cards or **Reset & Clear** when ready.', startDate: null, dueDate: null, _v: n, _created: n - 10*86400000 },
			{ id: 't2', title: 'Add cards', columnId: 'col-p1-backlog', projectId: 'p1', order: 1, done: false, type: 'task', assignees: [], labels: [], notes: 'Bottom bar + Enter. Or double-click a cell.\nLong-press + to edit cell as markdown.', startDate: null, dueDate: null, _v: n, _created: n },
			{ id: 't3', title: 'Filter & search', columnId: 'col-p1-active', projectId: 'p1', order: 0, done: false, type: 'task', assignees: ['you'], labels: ['start', 'urgent'], notes: 'Try `@you` `#start` `$task` `$overdue` in the filter bar.\n\n- [ ] Try filtering by label\n- [ ] Try filtering by assignee\n- [x] Read this card', startDate: null, dueDate: d(-2), _v: n, _created: n - 5*86400000 },
			{ id: 't4', title: 'Edit cards', columnId: 'col-p1-active', projectId: 'p1', order: 1, done: false, type: 'task', assignees: ['you'], labels: ['start', 'editing'], notes: 'Click to open. Notes render **markdown**:\n- [ ] Checkboxes\n- [x] Done items\n- *Italic* and **bold**\n- [Links](https://example.com)\n\nClick a checkbox to toggle it.', startDate: null, dueDate: d(3), _v: n, _created: n },
			{ id: 't5', title: 'Done column', columnId: 'col-p1-done', projectId: 'p1', order: 0, done: true, type: 'task', assignees: [], labels: [], notes: 'Cards here auto-complete.\n\nWith **automove**, toggling done moves cards here automatically.\nDouble-click the stage header to configure.', startDate: null, dueDate: d(-5), _v: n, _created: n },
			{ id: 't6', title: 'Drag & drop', columnId: 'col-p2-backlog', projectId: 'p2', order: 0, done: false, type: 'task', assignees: [], labels: [], notes: 'Drag cards, columns, rows. Drag to /\u212D to delete.', startDate: null, dueDate: null, _v: n, _created: n - 5*86400000 },
			{ id: 't7', title: 'Multi-select', columnId: 'col-p2-backlog', projectId: 'p2', order: 1, done: false, type: 'task', assignees: [], labels: [], notes: 'Shift+click or long-press. Bulk move, done, or delete.', startDate: null, dueDate: null, _v: n, _created: n },
			{ id: 't8', title: 'Future task', columnId: 'col-p2-active', projectId: 'p2', order: 0, done: false, type: 'task', assignees: [], labels: ['later'], notes: 'Cards with a future start date appear dimmed.\nOverdue cards get a dashed border.', startDate: d(7), dueDate: d(14), _v: n, _created: n },
			{ id: 't9', title: 'Export & import', columnId: 'col-p2-review', projectId: 'p2', order: 0, done: false, type: 'task', assignees: [], labels: ['data'], notes: 'Markdown, CSV, JSON. Compatible with Obsidian.', startDate: null, dueDate: d(1), _v: n, _created: n },
			{ id: 't10', title: 'Keyboard: ? for help', columnId: 'col-p2-active', projectId: 'p2', order: 1, done: false, type: 'task', assignees: [], labels: [], notes: 'Arrows, Enter, Space, Alt+arrows, Ctrl+Z.', startDate: null, dueDate: null, _v: n, _created: n },
			{ id: 't11', title: 'Meeting type', columnId: 'col-p3-backlog', projectId: 'p3', order: 0, done: false, type: 'meeting', assignees: ['alice', 'bob'], labels: ['types'], notes: 'Blue left border and background.\n\nSet type in the card detail panel.', startDate: null, dueDate: d(0), _v: n, _created: n },
			{ id: 't12', title: 'Follow-up type', columnId: 'col-p3-backlog', projectId: 'p3', order: 1, done: false, type: 'followup', assignees: ['alice'], labels: ['types'], notes: 'Yellow left border and background.\n\nTypes help visual scanning.', startDate: null, dueDate: d(2), _v: n, _created: n },
			{ id: 't13', title: 'All features card', columnId: 'col-p3-active', projectId: 'p3', order: 0, done: false, type: 'task', assignees: ['you', 'alice'], labels: ['demo', 'full'], notes: 'This card has everything:\n- **Avatar** (bottom-right)\n- **Age dot** (top-right, this card is old)\n- **Dashed border** (overdue)\n- **Due date** and **tags**\n- **Notes** with markdown\n\n- [x] Completed task\n- [ ] Pending task', startDate: null, dueDate: d(-1), _v: n, _created: n - 12*86400000 },
			{ id: 't14', title: 'Inbox', columnId: 'inbox-col', projectId: 'inbox', order: 0, done: false, type: 'task', assignees: [], labels: ['start'], notes: 'Unsorted cards. Drag onto the board.', startDate: null, dueDate: null, _v: n, _created: n },
			{ id: 't15', title: 'Print preview', columnId: 'inbox-col', projectId: 'inbox', order: 1, done: false, type: 'followup', assignees: [], labels: [], notes: 'Long-press the theme button.', startDate: null, dueDate: null, _v: n, _created: n },
		],
	};
}

function wireUpGlobalEvents() {
	// Theme toggle — click for dark/light, long-press for print preview
	// In print preview: single click exits
	let _themeTimer = null;
	let _themeLongPressed = false;
	let _themeWasInPreview = false;
	const btnTheme = document.getElementById('btn-theme');
	btnTheme.addEventListener('pointerdown', () => {
		_themeWasInPreview = document.body.classList.contains('print-preview');
		_themeLongPressed = false;
		if (_themeWasInPreview) return; // pointerup will handle exit
		_themeTimer = setTimeout(() => {
			_themeLongPressed = true;
			document.body.classList.add('print-preview');
			renderInbox(); // ensure inbox cards are rendered for print
			showToast('Print preview on');
		}, 500);
	});
	btnTheme.addEventListener('pointerup', () => {
		clearTimeout(_themeTimer);
		if (_themeLongPressed) return; // just entered preview via long-press, don't exit
		if (_themeWasInPreview) {
			document.body.classList.remove('print-preview');
			showToast('Print preview off');
			return;
		}
		toggleTheme();
	});
	btnTheme.addEventListener('pointerleave', () => {
		clearTimeout(_themeTimer);
	});

	// Help
	document.getElementById('btn-help').addEventListener('click', toggleHelp);
	document.getElementById('brand').addEventListener('click', () => flashBrandAnim());
	document.getElementById('help-close').addEventListener('click', toggleHelp);

	// Filter
	const filterInput = $('filter-input');
	const filterClear = document.getElementById('filter-clear');
	const filterWrap = $('filter-wrap');
	let filterTimer = null;
	filterInput.addEventListener('input', () => {
		clearTimeout(filterTimer);
		filterTimer = setTimeout(() => {
			filterStr.set(filterInput.value);
		}, 1000);
	});
	filterInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			clearTimeout(filterTimer);
			filterStr.set(filterInput.value);
			// If no visible results, blur like Escape
			const vis = visibleIds.peek();
			if (vis && vis.size === 0) {
				filterInput.blur();
				return;
			}
		}
	});
	// Sync clear button and nav visibility with filterStr changes
	const filterPrev = document.getElementById('filter-prev');
	const filterNext = document.getElementById('filter-next');
	effect(() => {
		const f = filterStr.get();
		filterClear.classList.toggle('visible', !!f);
		filterPrev.classList.toggle('visible', !!f);
		filterNext.classList.toggle('visible', !!f);
		// Keep input in sync if set programmatically
		if (filterInput.value !== f) filterInput.value = f;
		// Auto-save to recent presets
		if (f) autoSaveFilterPreset(f);
	});
	filterClear.addEventListener('click', () => {
		filterInput.value = '';
		filterStr.set('');
		filterClear.classList.remove('visible');
		filterInput.blur();
		filterWrap.classList.remove('expanded');
	});
	filterPrev.addEventListener('click', () => cycleFilteredCard(-1));
	filterNext.addEventListener('click', () => cycleFilteredCard(1));

	// Filter expand on focus
	filterInput.addEventListener('focus', () => filterWrap.classList.add('expanded'));
	filterInput.addEventListener('blur', () => {
		if (!filterInput.value) filterWrap.classList.remove('expanded');
	});

	// Undo / Redo
	document.getElementById('btn-undo').addEventListener('click', undo);
	document.getElementById('btn-redo').addEventListener('click', redo);

	// Stats bar toggle
	document.getElementById('btn-stats').addEventListener('click', () => {
		const bar = $('stats-bar');
		const btn = document.getElementById('btn-stats');
		bar.classList.toggle('open');
		btn.classList.toggle('active', bar.classList.contains('open'));
		if (bar.classList.contains('open')) renderStats();
	});

	// Quick capture
	document.getElementById('quick-input').addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			let val = e.target.value.trim();
			if (!val) return;

			// Parse @assignees and #labels from input
			const assignees = [];
			const labels = [];
			val = val.replace(/@(\w+)/g, (_, name) => { assignees.push(name); return ''; });
			val = val.replace(/#(\w+)/g, (_, label) => { labels.push(label); return ''; });
			const title = val.trim() || 'Untitled';

			const id = 'c' + Date.now().toString(36);
			const card = {
				id, title, columnId: 'inbox-col', projectId: 'inbox',
				order: cards.peek().filter(c => c.columnId === 'inbox-col').length,
				done: false, type: 'task', assignees, labels,
				notes: '', startDate: null, dueDate: null,
				_v: Date.now(), _created: Date.now(),
			};
			batch(() => { cards.update(all => [...all, card]); });
			if (navigator.vibrate) navigator.vibrate(50);
			e.target.value = '';
			inboxOpen.set(true);
			showToast(`Added "${title}" to inbox`);
		}
	});

	// Inbox toggle
	let _inboxLongPress = null;
	let _inboxLongPressed = false;
	const inboxToggle = document.getElementById('inbox-toggle');
	inboxToggle.addEventListener('pointerdown', () => {
		_inboxLongPressed = false;
		_inboxLongPress = setTimeout(() => {
			_inboxLongPressed = true;
			if (navigator.vibrate) navigator.vibrate(50);
			openCellEditor('inbox-col');
		}, 400);
	});
	inboxToggle.addEventListener('pointerup', () => clearTimeout(_inboxLongPress));
	inboxToggle.addEventListener('pointercancel', () => clearTimeout(_inboxLongPress));
	inboxToggle.addEventListener('pointermove', (e) => {
		if (_inboxLongPress && (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)) {
			clearTimeout(_inboxLongPress);
		}
	});
	inboxToggle.addEventListener('click', (e) => {
		if (_inboxLongPressed) { _inboxLongPressed = false; return; }
		e.preventDefault();
		e.stopPropagation();
		inboxOpen.set(!inboxOpen.peek());
	});

	// Inbox swipe support — live gesture tracking
	const inboxPanel = $('inbox-panel');
	const bottomBar = document.querySelector('.bottom-bar');
	let _swipe = null;

	const isMobileInbox = () => window.innerWidth <= 768;

	bottomBar.addEventListener('touchstart', (e) => {
		if (document.body.dataset.dragging) return;
		_swipe = {
			startY: e.touches[0].clientY,
			lastY: e.touches[0].clientY,
			lastT: Date.now(),
			velY: 0,
			source: 'bar',
		};
	}, { passive: true });

	const inboxHandle = document.getElementById('inbox-handle');
	inboxHandle.addEventListener('touchstart', (e) => {
		if (document.body.dataset.dragging) return;
		if (!inboxOpen.peek()) return;
		_swipe = {
			startY: e.touches[0].clientY,
			lastY: e.touches[0].clientY,
			lastT: Date.now(),
			velY: 0,
			source: 'panel',
		};
		inboxPanel.style.transition = 'none';
	}, { passive: true });

	document.addEventListener('touchmove', (e) => {
		if (!_swipe) return;
		const y = e.touches[0].clientY;
		const now = Date.now();
		const dt = Math.max(1, now - _swipe.lastT);
		_swipe.velY = (y - _swipe.lastY) / dt;
		_swipe.lastY = y;
		_swipe.lastT = now;

		const dy = y - _swipe.startY;
		const isOpen = inboxOpen.peek();
		const mobile = isMobileInbox();

		// Live preview: partially translate the panel
		if (isOpen && _swipe.source === 'panel') {
			// Closing gesture: panel follows finger down (mobile) or right (desktop)
			const clampedDy = Math.max(0, dy);
			if (mobile) {
				inboxPanel.style.transform = `translateY(${clampedDy}px)`;
			} else {
				inboxPanel.style.transform = `translateX(${clampedDy}px)`;
			}
		} else if (!isOpen && _swipe.source === 'bar') {
			// Opening gesture: show panel peeking up
			const panelH = mobile ? window.innerHeight * 0.45 : inboxPanel.offsetHeight;
			const progress = Math.min(1, Math.max(0, -dy / panelH));
			// Instantly lighten the bottom bar border
			bottomBar.classList.add('inbox-open');
			if (mobile) {
				inboxPanel.style.transition = 'none';
				inboxPanel.style.transform = `translateY(${100 * (1 - progress)}%)`;
			} else {
				inboxPanel.style.transition = 'none';
				inboxPanel.style.transform = `translateX(${100 * (1 - progress)}%)`;
			}
		}
	}, { passive: true });

	document.addEventListener('touchend', () => {
		if (!_swipe) return;
		const dy = _swipe.lastY - _swipe.startY;
		const vel = _swipe.velY;
		const isOpen = inboxOpen.peek();
		const THRESHOLD = 40;
		const VEL_THRESHOLD = 0.3;

		// Re-enable transition for snap
		inboxPanel.style.transition = '';

		if (isOpen && _swipe.source === 'panel') {
			if (dy > THRESHOLD || vel > VEL_THRESHOLD) {
				inboxPanel.style.transform = '';
				inboxOpen.set(false);
			} else {
				// Snap back open
				inboxPanel.style.transform = '';
			}
		} else if (!isOpen && _swipe.source === 'bar') {
			if (dy < -THRESHOLD || vel < -VEL_THRESHOLD) {
				inboxPanel.style.transform = '';
				inboxOpen.set(true);
			} else {
				// Snap back closed — restore thick border
				inboxPanel.style.transform = '';
				bottomBar.classList.remove('inbox-open');
			}
		}
		_swipe = null;
	});

	// Card panel
	document.getElementById('cpanel-close').addEventListener('click', () => closeCardPanel());
	document.getElementById('cpanel-cancel').addEventListener('click', () => closeCardPanel(false));
	// Autosave on card panel changes
	let _autoSaveTimer = null;
	function triggerAutoSave() {
		clearTimeout(_autoSaveTimer);
		_autoSaveTimer = setTimeout(() => { saveCardPanel(); }, 600);
		document._cpanelAutoSaveTimer = _autoSaveTimer;
	}
	document.getElementById('cpanel-title').addEventListener('input', triggerAutoSave);
	document.getElementById('cpanel-notes').addEventListener('input', triggerAutoSave);
	document.getElementById('cpanel-notes').addEventListener('blur', () => {
		const textarea = document.getElementById('cpanel-notes');
		const preview = document.getElementById('cpanel-notes-preview');
		textarea.style.display = 'none';
		preview.style.display = '';
		updateNotesPreview();
		triggerAutoSave();
	});
	document.getElementById('cpanel-notes-preview').addEventListener('click', (e) => {
		const check = e.target.closest('.md-check');
		if (check) {
			const lineIdx = parseInt(check.dataset.line, 10);
			const textarea = document.getElementById('cpanel-notes');
			const lines = textarea.value.split('\n');
			if (lineIdx >= 0 && lineIdx < lines.length) {
				if (/^- \[x\]/i.test(lines[lineIdx])) {
					lines[lineIdx] = lines[lineIdx].replace(/^- \[x\]/i, '- [ ]');
				} else if (/^- \[ \]/.test(lines[lineIdx])) {
					lines[lineIdx] = lines[lineIdx].replace(/^- \[ \]/, '- [x]');
				}
				textarea.value = lines.join('\n');
				updateNotesPreview();
				triggerAutoSave();
			}
			return;
		}
		const textarea = document.getElementById('cpanel-notes');
		const preview = document.getElementById('cpanel-notes-preview');
		preview.style.display = 'none';
		textarea.style.display = '';
		textarea.focus();
	});
	document.getElementById('cpanel-start').addEventListener('change', triggerAutoSave);
	document.getElementById('cpanel-due').addEventListener('change', triggerAutoSave);
	document.getElementById('cpanel-project').addEventListener('change', triggerAutoSave);
	document.getElementById('cpanel-stage').addEventListener('change', triggerAutoSave);
	document.querySelectorAll('#cpanel-type .type-toggle-btn').forEach(btn => {
		btn.addEventListener('click', triggerAutoSave);
	});
	document.getElementById('cpanel-delete').addEventListener('click', () => deleteCard());
	document.getElementById('cpanel-cell-delete').addEventListener('click', () => {
		if (!_cellEditColId) return;
		document.getElementById('cpanel-cell-md').value = '';
	});
	document.getElementById('cpanel-cell-indent').addEventListener('click', () => {
		const ta = document.getElementById('cpanel-cell-md');
		const pos = ta.selectionStart;
		const text = ta.value;
		const indent = '    ';
		ta.value = text.slice(0, pos) + indent + text.slice(ta.selectionEnd);
		ta.selectionStart = ta.selectionEnd = pos + indent.length;
		ta.focus();
	});
	document.getElementById('cpanel-cell-unindent').addEventListener('click', () => {
		const ta = document.getElementById('cpanel-cell-md');
		const pos = ta.selectionStart;
		const text = ta.value;
		const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
		const line = text.slice(lineStart, pos);
		const leadingWs = line.match(/^(\s{1,4})/);
		if (leadingWs) {
			const removeLen = leadingWs[1].length;
			ta.value = text.slice(0, lineStart) + text.slice(lineStart + removeLen);
			ta.selectionStart = ta.selectionEnd = Math.max(lineStart, pos - removeLen);
		}
		ta.focus();
	});
	document.getElementById('cpanel-backdrop').addEventListener('click', (e) => {
		if (e.target === e.currentTarget) closeCardPanel();
	});

	// Type toggle in card panel
	document.getElementById('cpanel-type').addEventListener('click', (e) => {
		const btn = e.target.closest('.type-toggle-btn');
		if (!btn) return;
		document.querySelectorAll('#cpanel-type .type-toggle-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		const cpanel = document.getElementById('cpanel');
		cpanel.style.background = '';
		const bg = btn.dataset.type === 'meeting' ? 'var(--blue-bg)' : btn.dataset.type === 'followup' ? 'var(--yellow-bg)' : '';
		cpanel.style.background = bg;
		cpanel.style.setProperty('--panel-bg', bg || 'var(--surface)');
	});

	// Chip inputs
	setupChipInput('cpanel-assignee-input', 'cpanel-assignees', '@');
	setupChipInput('cpanel-label-input', 'cpanel-labels', '#');

	// Add project modal
	document.getElementById('proj-modal-cancel').addEventListener('click', () => {
		document.getElementById('add-proj-modal').classList.remove('open');
	});
	document.getElementById('proj-modal-create').addEventListener('click', () => {
		const name = document.getElementById('proj-name-input').value.trim();
		if (!name) return;
		pushUndo(_editingProjId ? 'edit project' : 'create project');
		if (_editingProjId) {
			// Edit existing
			batch(() => {
				projects.update(all => all.map(p =>
					p.id === _editingProjId ? { ...p, name, color: _selectedProjColor } : p
				));
			});
			showToast(`Swimlane "${name}" updated`);
		} else {
			// Create new
			const id = 'p' + Date.now().toString(36);
			projects.update(all => [...all, { id, name, color: _selectedProjColor, collapsed: false }]);
			showToast(`Swimlane "${name}" created`);
		}
		document.getElementById('add-proj-modal').classList.remove('open');
	});
	document.getElementById('proj-modal-delete').addEventListener('click', () => {
		if (!_editingProjId) return;
		pushUndo('delete project');
		batch(() => {
			moveCardsToInbox(c => c.projectId === _editingProjId);
			projects.update(all => all.filter(p => p.id !== _editingProjId));
		});
		document.getElementById('add-proj-modal').classList.remove('open');
		showToast('Swimlane deleted, cards moved to inbox');
	});
	document.getElementById('proj-name-input').addEventListener('keydown', (e) => {
		if (e.key === 'Enter') document.getElementById('proj-modal-create').click();
	});

	// Add column modal
	document.getElementById('col-modal-cancel').addEventListener('click', () => {
		document.getElementById('add-col-modal').classList.remove('open');
	});
	document.getElementById('col-modal-create').addEventListener('click', () => {
		const name = document.getElementById('col-name-input').value.trim();
		if (!name) return;
		const isDone = document.getElementById('col-done-toggle').checked;
		const isAutomove = document.getElementById('col-automove-toggle').checked && isDone;
		pushUndo(_editingStageId ? 'edit stage' : 'create stage');
		if (_editingStageId) {
			batch(() => {
				stages.update(all => all.map(s => {
					if (s.id === _editingStageId) return { ...s, name, done: isDone, automove: isAutomove };
					if (isAutomove && s.automove) return { ...s, automove: false };
					return s;
				}));
			});
			showToast(`Stage "${name}" updated`);
		} else {
			const id = uniqueStageId(name);
			stages.update(all => [
				...(isAutomove ? all.map(s => s.automove ? { ...s, automove: false } : s) : all),
				{ id, name, color: '#7a5040', done: isDone, automove: isAutomove },
			]);
			showToast(`Stage "${name}" added`);
		}
		document.getElementById('add-col-modal').classList.remove('open');
	});
	// Done toggle enables/disables automove
	document.getElementById('col-done-toggle').addEventListener('change', () => {
		const done = document.getElementById('col-done-toggle').checked;
		document.getElementById('col-automove-toggle').disabled = !done;
		document.getElementById('col-automove-label').style.color = done ? 'var(--text)' : 'var(--muted)';
		if (!done) document.getElementById('col-automove-toggle').checked = false;
	});
	document.getElementById('col-modal-delete').addEventListener('click', () => {
		if (!_editingStageId) return;
		pushUndo('delete stage');
		batch(() => {
			moveCardsToInbox(c => parseColId(c.columnId).stageId === _editingStageId);
			stages.update(all => all.filter(s => s.id !== _editingStageId));
		});
		document.getElementById('add-col-modal').classList.remove('open');
		showToast('Stage deleted, cards moved to inbox');
	});
	document.getElementById('col-name-input').addEventListener('keydown', (e) => {
		if (e.key === 'Enter') document.getElementById('col-modal-create').click();
	});

	// Export / Import panel (from header button)
	document.getElementById('btn-vault').addEventListener('click', () => {
		document.activeElement?.blur();
		document.getElementById('vault-modal').classList.add('open');
	});

	// Vault import/export
	document.getElementById('vault-modal-close').addEventListener('click', () => {
		document.getElementById('vault-modal').classList.remove('open');
	});

	// Sync panel controls
	// Auto-reconnect on load
	(async () => {
		const stored = await fileSync._loadHandle();
		if (stored) {
			fileSync._handle = stored;
			try {
				const perm = await stored.queryPermission({ mode: 'readwrite' });
				if (perm === 'granted') await fileSync.reconnect();
			} catch (_) {}
		}
		setTimeout(_updateSyncPanel, 200);
	})();
	if (!window.showSaveFilePicker) {
		const btn = document.getElementById('sync-connect-btn');
		btn.disabled = true;
		btn.style.opacity = '0.4';
		btn.style.cursor = 'default';
	}
	document.getElementById('sync-connect-btn').addEventListener('click', async () => {
		const stored = await fileSync._loadHandle();
		if (stored) {
			fileSync._handle = stored;
			await fileSync.reconnect();
		} else {
			await fileSync.connect();
		}
		_updateSyncPanel();
	});
	document.getElementById('sync-save-now').addEventListener('click', () => {
		fileSync.saveNow();
		showToast('Saved to file');
	});
	document.getElementById('sync-disconnect').addEventListener('click', () => {
		fileSync.disconnect();
		_updateSyncPanel();
	});
	document.querySelectorAll('.sync-iv').forEach(btn => {
		btn.addEventListener('click', () => {
			const ms = parseInt(btn.dataset.iv, 10);
			fileSync.setSaveInterval(ms);
			if (fileSync._enabled) fileSync._startPolling();
			document.querySelectorAll('.sync-iv').forEach(b => {
				b.classList.toggle('sync-iv--on', b === btn);
			});
		});
	});

	function _updateSyncPanel() {
		const connected = fileSync._enabled;
		const connectBtn = document.getElementById('sync-connect-btn');
		const status = document.getElementById('sync-status');
		const filename = document.getElementById('sync-filename');
		const vaultBtn = document.getElementById('btn-vault');
		if (connectBtn) connectBtn.style.display = connected ? 'none' : '';
		if (status) status.style.display = connected ? '' : 'none';
		if (connected && fileSync._handle && filename) {
			filename.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:4px;vertical-align:middle"></span>Connected: ${escHtml(fileSync._handle.name)}`;
		}
		if (vaultBtn) vaultBtn.classList.toggle('sync-dot', connected);
		document.querySelectorAll('.sync-iv').forEach(b => {
			b.classList.toggle('sync-iv--on', parseInt(b.dataset.iv, 10) === fileSync._saveInterval);
		});
	}
	setTimeout(_updateSyncPanel, 500);
	document.getElementById('vault-export').addEventListener('click', exportToObsidian);
	document.getElementById('vault-clipboard').addEventListener('click', () => {
		exportToClipboard();
	});
	document.getElementById('vault-import-file').addEventListener('change', (e) => {
		const file = e.target.files[0];
		if (file) importFromObsidian(file);
		e.target.value = '';
	});
	document.getElementById('vault-json-export').addEventListener('click', () => {
		const data = { stages: stages.peek(), projects: projects.peek(), cards: cards.peek(), _version: 1 };
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'detrita-backup.json';
		a.click();
		URL.revokeObjectURL(url);
		showToast('Exported backup');
	});
	document.getElementById('vault-json-import-file').addEventListener('change', (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const data = JSON.parse(ev.target.result);
				if (!data.cards || !data.stages || !data.projects) throw new Error('Invalid format');
				pushUndo('import backup');
				batch(() => {
					stages.set(data.stages);
					projects.set(data.projects);
					cards.set(data.cards);
				});
				document.getElementById('vault-modal').classList.remove('open');
				showToast(`Restored ${data.cards.length} cards`);
			} catch (err) {
				showToast('Import failed — invalid JSON');
			}
		};
		reader.readAsText(file);
		e.target.value = '';
	});
	document.getElementById('vault-csv-import-file').addEventListener('change', (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				importFromCsv(ev.target.result);
				document.getElementById('vault-modal').classList.remove('open');
			} catch (err) {
				showToast('CSV import failed — check format');
				console.error(err);
			}
		};
		reader.readAsText(file);
		e.target.value = '';
	});
	document.getElementById('vault-clipboard-paste').addEventListener('click', async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (!text?.trim()) { showToast('Clipboard is empty'); return; }
			// Try JSON first
			try {
				const data = JSON.parse(text);
				if (data.cards && data.stages && data.projects) {
					pushUndo('paste backup');
					batch(() => {
						stages.set(data.stages);
						projects.set(data.projects);
						cards.set(data.cards);
					});
					document.getElementById('vault-modal').classList.remove('open');
					showToast(`Pasted ${data.cards.length} cards from clipboard`);
					return;
				}
			} catch (_) { /* not JSON, try markdown */ }
			// Try Obsidian markdown
			const parsed = parseBoardMd(text);
			if (parsed.cards.length) {
				applyBoard(parsed, 'paste markdown');
				document.getElementById('vault-modal').classList.remove('open');
				showToast(`Pasted ${parsed.cards.length} cards`);
			} else {
				showToast('Could not parse clipboard content');
			}
		} catch (err) {
			showToast('Clipboard access denied');
		}
	});
	document.getElementById('vault-reset').addEventListener('click', async () => {
		if (fileSync._enabled) fileSync.disconnect();
		batch(() => {
			stages.set([]);
			projects.set([]);
			cards.set([]);
		});
		_undoStack.length = 0;
		_redoStack.length = 0;
		await persistence.reset();
		document.getElementById('vault-modal').classList.remove('open');
		showToast('Board cleared');
	});

	// CSV export
	document.getElementById('vault-csv-export').addEventListener('click', exportToCsv);

	// Board templates
	document.querySelectorAll('.btn-tpl[data-tpl]').forEach(btn => {
		btn.addEventListener('click', () => applyTemplate(btn.dataset.tpl));
	});

	// Card detail modal — threshold gate: horizontal = dismiss, vertical = scroll
	const cpanel = document.getElementById('cpanel');
	let _cpSwipe = null;
	const AXIS_THRESHOLD = 12;

	cpanel.addEventListener('touchstart', (e) => {
		// Don't start dismiss if touching an input/textarea
		if (e.target.closest('input, textarea, select, button')) return;
		_cpSwipe = {
			sx: e.touches[0].clientX, sy: e.touches[0].clientY,
			lx: e.touches[0].clientX, ly: e.touches[0].clientY,
			t: Date.now(), axis: null,
		};
	}, { passive: true });

	cpanel.addEventListener('touchmove', (e) => {
		if (!_cpSwipe) return;
		const x = e.touches[0].clientX;
		const y = e.touches[0].clientY;
		_cpSwipe.lx = x;
		_cpSwipe.ly = y;
		const dx = x - _cpSwipe.sx;
		const dy = y - _cpSwipe.sy;

		// Decide axis on first significant movement
		if (!_cpSwipe.axis) {
			if (Math.abs(dx) > AXIS_THRESHOLD || Math.abs(dy) > AXIS_THRESHOLD) {
				_cpSwipe.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
				if (_cpSwipe.axis === 'h') {
					cpanel.style.transition = 'none';
				}
			}
			return;
		}

		if (_cpSwipe.axis === 'v') { _cpSwipe = null; return; } // hand off to browser scroll

		// Horizontal dismiss — prevent scroll, follow finger
		e.preventDefault();
		cpanel.style.transform = `translateX(${dx}px)`;
		cpanel.style.opacity = Math.max(0.3, 1 - Math.abs(dx) / 300);
	}, { passive: false });

	const finishCpSwipe = () => {
		if (!_cpSwipe || _cpSwipe.axis !== 'h') { _cpSwipe = null; return; }
		cpanel.style.transition = '';
		const dx = _cpSwipe.lx - _cpSwipe.sx;
		const dist = Math.abs(dx);
		const dt = Math.max(1, Date.now() - _cpSwipe.t);
		const vel = dist / dt;
		if (dist > 70 || vel > 0.35) {
			cpanel.style.transform = `translateX(${dx > 0 ? 500 : -500}px)`;
			cpanel.style.opacity = '0';
			setTimeout(() => { closeCardPanel(); cpanel.style.transform = ''; cpanel.style.opacity = ''; }, 250);
		} else {
			cpanel.style.transform = '';
			cpanel.style.opacity = '';
		}
		_cpSwipe = null;
	};
	cpanel.addEventListener('touchend', finishCpSwipe);
	cpanel.addEventListener('touchcancel', finishCpSwipe);

	// Swipe-right dismiss helper for side panels
	function addSidePanelSwipe(panelEl, closeFn) {
		let _sw = null;
		const AXIS_THRESHOLD = 12;

		panelEl.addEventListener('touchstart', (e) => {
			if (e.target.closest('input, textarea, select, button')) return;
			_sw = {
				sx: e.touches[0].clientX, sy: e.touches[0].clientY,
				lx: e.touches[0].clientX, t: Date.now(), axis: null,
			};
		}, { passive: true });

		panelEl.addEventListener('touchmove', (e) => {
			if (!_sw) return;
			const x = e.touches[0].clientX;
			const y = e.touches[0].clientY;
			_sw.lx = x;
			const dx = x - _sw.sx;
			const dy = y - _sw.sy;

			if (!_sw.axis) {
				if (Math.abs(dx) > AXIS_THRESHOLD || Math.abs(dy) > AXIS_THRESHOLD) {
					_sw.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
					if (_sw.axis === 'h' && dx > 0) panelEl.style.transition = 'none';
				}
				return;
			}

			if (_sw.axis === 'v') { _sw = null; return; }

			// Only allow rightward dismiss
			const clampedDx = Math.max(0, dx);
			e.preventDefault();
			panelEl.style.transform = `translateX(${clampedDx}px)`;
			panelEl.style.opacity = Math.max(0.3, 1 - clampedDx / 250);
		}, { passive: false });

		const finish = () => {
			if (!_sw || _sw.axis !== 'h') { _sw = null; return; }
			panelEl.style.transition = '';
			const dx = _sw.lx - _sw.sx;
			const dt = Math.max(1, Date.now() - _sw.t);
			const vel = dx / dt;
			if (dx > 70 || vel > 0.35) {
				panelEl.style.transform = 'translateX(100%)';
				panelEl.style.opacity = '0';
				setTimeout(() => { closeFn(); panelEl.style.transform = ''; panelEl.style.opacity = ''; }, 250);
			} else {
				panelEl.style.transform = '';
				panelEl.style.opacity = '';
			}
			_sw = null;
		};
		panelEl.addEventListener('touchend', finish);
		panelEl.addEventListener('touchcancel', finish);
	}

	addSidePanelSwipe(document.querySelector('.help-panel'), toggleHelp);
	addSidePanelSwipe(document.getElementById('vault-panel'), () => {
		document.getElementById('vault-modal').classList.remove('open');
	});

	// Close modals and panels on backdrop click
	document.querySelectorAll('.modal-backdrop').forEach(modal => {
		modal.addEventListener('click', (e) => {
			if (e.target === e.currentTarget) modal.classList.remove('open');
		});
	});
	document.getElementById('vault-modal').addEventListener('click', (e) => {
		if (e.target === e.currentTarget) e.target.classList.remove('open');
	});
	document.getElementById('help-backdrop').addEventListener('click', (e) => {
		if (e.target === e.currentTarget) toggleHelp();
	});
}

function setupChipInput(inputId, containerId, prefix) {
	const input = document.getElementById(inputId);
	const commitChip = () => {
		// Split on commas to handle multiple entries
		const parts = input.value.split(',');
		for (const part of parts) {
			const val = part.trim().replace(/^[@#]/, '');
			if (!val) continue;
			const container = document.getElementById(containerId);
			// Avoid duplicates
			const existing = [...container.querySelectorAll('.chip')].map(c => c.textContent.replace('×','').trim().replace(/^[@#]/, ''));
			if (existing.includes(val)) continue;
			const chip = document.createElement('span');
			chip.className = 'chip';
			chip.innerHTML = `${prefix}${escHtml(val)} <button class="chip-remove">&times;</button>`;
			container.insertBefore(chip, input);
		}
		input.value = '';
	};
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commitChip();
		}
	});
	input.addEventListener('blur', commitChip);
	document.getElementById(containerId).addEventListener('click', (e) => {
		if (e.target.closest('.chip-remove')) {
			e.target.closest('.chip').remove();
		}
	});
}

// ══════════════════════════════════════════════════════════════
//  CSV Export
// ══════════════════════════════════════════════════════════════

function exportToCsv() {
	const stgs = stages.peek();
	const projs = projects.peek();
	const allCards = cards.peek();
	const header = ['Title','Swimlane','Stage','Done','Type','Assignees','Labels','Due Date','Start Date','Notes'];
	const rows = [header.join(',')];
	for (const c of allCards) {
		const proj = projs.find(p => p.id === c.projectId);
		const stageId = parseColId(c.columnId).stageId;
		const stg = stgs.find(s => s.id === stageId);
		const row = [
			`"${(c.title || '').replace(/"/g, '""')}"`,
			`"${(proj?.name || 'Inbox').replace(/"/g, '""')}"`,
			`"${(stg?.name || '').replace(/"/g, '""')}"`,
			c.done ? 'TRUE' : 'FALSE',
			c.type,
			`"${(c.assignees || []).join(', ')}"`,
			`"${(c.labels || []).join(', ')}"`,
			c.dueDate || '',
			c.startDate || '',
			`"${(c.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
		];
		rows.push(row.join(','));
	}
	const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'board.csv';
	a.click();
	URL.revokeObjectURL(url);
	showToast('Exported board.csv');
}

function importFromCsv(text) {
	const rows = parseCsvRows(text);
	if (rows.length < 2) throw new Error('No data rows');

	const headerRow = rows[0].map(h => h.trim().toLowerCase());
	const col = (name) => headerRow.indexOf(name);
	const titleIdx = Math.max(col('title'), 0);
	const swimIdx = Math.max(col('swimlane'), col('project'), -1);
	const stageIdx = col('stage');
	const doneIdx = col('done');
	const typeIdx = col('type');
	const assignIdx = col('assignees');
	const labelIdx = col('labels');
	const dueIdx = Math.max(col('due date'), col('due'), -1);
	const startIdx = Math.max(col('start date'), col('start'), -1);
	const notesIdx = col('notes');

	const swimlaneMap = new Map();
	const stageSet = new Map();
	const allCards = [];
	const defaultStages = stages.peek();

	for (let i = 1; i < rows.length; i++) {
		const r = rows[i];
		if (!r[titleIdx]?.trim()) continue;

		const title = r[titleIdx].trim();
		const swimName = swimIdx >= 0 ? (r[swimIdx]?.trim() || 'Inbox') : 'Inbox';
		const stageName = stageIdx >= 0 ? (r[stageIdx]?.trim() || '') : '';
		const done = doneIdx >= 0 ? /^(true|yes|1|x)$/i.test(r[doneIdx]?.trim()) : false;
		const type = typeIdx >= 0 ? (r[typeIdx]?.trim() || 'task') : 'task';
		const assignees = assignIdx >= 0 ? (r[assignIdx]?.trim() || '').split(/[,;]/).map(a => a.trim()).filter(Boolean) : [];
		const labels = labelIdx >= 0 ? (r[labelIdx]?.trim() || '').split(/[,;]/).map(l => l.trim()).filter(Boolean) : [];
		const dueDate = dueIdx >= 0 ? (r[dueIdx]?.trim() || null) : null;
		const startDate = startIdx >= 0 ? (r[startIdx]?.trim() || null) : null;
		const notes = notesIdx >= 0 ? (r[notesIdx]?.trim() || '') : '';

		const isInbox = swimName.toLowerCase() === 'inbox';

		if (!isInbox && !swimlaneMap.has(swimName)) {
			swimlaneMap.set(swimName, {
				id: 'p' + (swimlaneMap.size + 1),
				name: swimName,
				color: SWATCH_COLORS[swimlaneMap.size % SWATCH_COLORS.length],
				collapsed: false,
			});
		}

		if (stageName && !stageSet.has(stageName.toLowerCase())) {
			const sid = stageName.toLowerCase().replace(/\s+/g, '-');
			const isDone = /^(done|complete|finished)$/i.test(stageName);
			stageSet.set(stageName.toLowerCase(), {
				id: sid, name: stageName,
				color: isDone ? '#2a7a3e' : '#7a5040',
				done: isDone,
			});
		}

		const proj = isInbox ? null : swimlaneMap.get(swimName);
		const stageId = stageName ? stageName.toLowerCase().replace(/\s+/g, '-') : (defaultStages[0]?.id || 'backlog');
		const colId = isInbox ? 'inbox-col' : `col-${proj.id}-${stageId}`;
		const projId = isInbox ? 'inbox' : proj.id;

		allCards.push({
			id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
			title, columnId: colId, projectId: projId, order: i,
			done, type: ['task','meeting','followup'].includes(type) ? type : 'task',
			assignees, labels, notes,
			startDate: startDate && /\d{4}-\d{2}-\d{2}/.test(startDate) ? startDate : null,
			dueDate: dueDate && /\d{4}-\d{2}-\d{2}/.test(dueDate) ? dueDate : null,
			_v: Date.now(), _created: Date.now(),
		});
	}

	const newStages = stageSet.size > 0 ? [...stageSet.values()] : defaultStages;
	const newProjects = [...swimlaneMap.values()];

	pushUndo('import CSV');
	batch(() => {
		stages.set(newStages);
		projects.set(newProjects);
		cards.set(allCards);
	});
	showToast(`Imported ${allCards.length} cards from CSV`);
}

function parseCsvRows(text) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; }
				else inQuotes = false;
			} else {
				field += ch;
			}
		} else {
			if (ch === '"') { inQuotes = true; }
			else if (ch === ',') { row.push(field); field = ''; }
			else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
				if (ch === '\r') i++;
				row.push(field); field = '';
				rows.push(row); row = [];
			} else if (ch === '\r') {
				row.push(field); field = '';
				rows.push(row); row = [];
			} else {
				field += ch;
			}
		}
	}
	if (field || row.length > 0) { row.push(field); rows.push(row); }
	return rows;
}


// ══════════════════════════════════════════════════════════════
//  Board Templates
// ══════════════════════════════════════════════════════════════

const BOARD_TEMPLATES = {
	kanban: [
		{ id: 'backlog', name: 'Backlog', color: '#7a5040', done: false },
		{ id: 'active', name: 'In Progress', color: '#2b4abd', done: false },
		{ id: 'review', name: 'Review', color: '#a07820', done: false },
		{ id: 'done', name: 'Done', color: '#2a7a3e', done: true },
	],
	scrum: [
		{ id: 'backlog', name: 'Product Backlog', color: '#7a5040', done: false },
		{ id: 'sprint', name: 'Sprint Backlog', color: '#6a3ea1', done: false },
		{ id: 'progress', name: 'In Progress', color: '#2b4abd', done: false },
		{ id: 'testing', name: 'Testing', color: '#a07820', done: false },
		{ id: 'done', name: 'Done', color: '#2a7a3e', done: true },
	],
	gtd: [
		{ id: 'inbox', name: 'Capture', color: '#7a5040', done: false },
		{ id: 'next', name: 'Next Actions', color: '#2b4abd', done: false },
		{ id: 'waiting', name: 'Waiting For', color: '#a07820', done: false },
		{ id: 'someday', name: 'Someday', color: '#6a3ea1', done: false },
		{ id: 'done', name: 'Done', color: '#2a7a3e', done: true },
	],
	sales: [
		{ id: 'lead', name: 'Leads', color: '#7a5040', done: false },
		{ id: 'contact', name: 'Contacted', color: '#2b4abd', done: false },
		{ id: 'proposal', name: 'Proposal', color: '#a07820', done: false },
		{ id: 'negotiation', name: 'Negotiation', color: '#6a3ea1', done: false },
		{ id: 'won', name: 'Won', color: '#2a7a3e', done: true },
		{ id: 'lost', name: 'Lost', color: '#bd1e2e', done: false },
	],
	crm: [
		{ id: 'prospects', name: 'Prospects', color: '#7a5040', done: false },
		{ id: 'outreach', name: 'Outreach', color: '#2b4abd', done: false },
		{ id: 'followup', name: 'Follow-up', color: '#a07820', done: false },
		{ id: 'confirmed', name: 'Confirmed', color: '#6a3ea1', done: false },
		{ id: 'published', name: 'Published', color: '#2a7a3e', done: true },
		{ id: 'declined', name: 'Declined', color: '#bd1e2e', done: false },
	],
	content: [
		{ id: 'ideas', name: 'Ideas', color: '#7a5040', done: false },
		{ id: 'writing', name: 'Writing', color: '#2b4abd', done: false },
		{ id: 'editing', name: 'Editing', color: '#a07820', done: false },
		{ id: 'scheduled', name: 'Scheduled', color: '#6a3ea1', done: false },
		{ id: 'published', name: 'Published', color: '#2a7a3e', done: true },
	],
	support: [
		{ id: 'new', name: 'New', color: '#7a5040', done: false },
		{ id: 'triaged', name: 'Triaged', color: '#2b4abd', done: false },
		{ id: 'progress', name: 'In Progress', color: '#a07820', done: false },
		{ id: 'waiting', name: 'Waiting', color: '#6a3ea1', done: false },
		{ id: 'resolved', name: 'Resolved', color: '#2a7a3e', done: true },
	],
};

function applyTemplate(key) {
	if (key === 'demo') {
		pushUndo('restore demo');
		const demo = getDemoData();
		batch(() => {
			stages.set(demo.stages);
			projects.set(demo.projects);
			cards.set(demo.cards);
			filterStr.set('');
		});
		document.getElementById('vault-modal').classList.remove('open');
		showToast('Demo content restored — Ctrl+Z to undo');
		return;
	}
	const tpl = BOARD_TEMPLATES[key];
	if (!tpl) return;
	pushUndo('apply template');

	const oldStages = stages.peek();
	const stageMap = buildStageMap(oldStages, tpl);

	batch(() => {
		// Remap cards first — parseColId resolves against the old stages
		cards.update(all => all.map(c => {
			if (c.projectId === 'inbox') return c;
			const newStageId = stageMap.get(parseColId(c.columnId).stageId);
			if (newStageId) return { ...c, columnId: `col-${c.projectId}-${newStageId}` };
			// Unmatched → inbox
			return { ...c, columnId: 'inbox-col', projectId: 'inbox' };
		}));
		stages.set(structuredClone(tpl));
	});
	document.getElementById('vault-modal').classList.remove('open');
	showToast(`Applied "${key}" template — Ctrl+Z to undo`);
}

// Semantic stage matching: map old stage IDs → new stage IDs
function buildStageMap(oldStages, newStages) {
	const map = new Map();
	const used = new Set();

	// Semantic groups: stages that mean similar things across templates
	const SEMANTIC_GROUPS = [
		['backlog', 'inbox', 'capture', 'ideas', 'lead', 'leads', 'prospects', 'new'],
		['active', 'progress', 'sprint', 'next', 'writing', 'contact', 'contacted', 'outreach', 'triaged'],
		['review', 'testing', 'editing', 'waiting', 'proposal', 'negotiation', 'scheduled', 'followup', 'confirmed'],
		['done', 'won', 'published', 'resolved'],
	];

	function findGroup(id, name) {
		const lower = (id + ' ' + name).toLowerCase();
		return SEMANTIC_GROUPS.find(g => g.some(term => lower.includes(term)));
	}

	// Pass 1: exact ID match
	for (const old of oldStages) {
		const match = newStages.find(n => n.id === old.id && !used.has(n.id));
		if (match) { map.set(old.id, match.id); used.add(match.id); }
	}

	// Pass 2: exact name match (case-insensitive)
	for (const old of oldStages) {
		if (map.has(old.id)) continue;
		const match = newStages.find(n => !used.has(n.id) && n.name.toLowerCase() === old.name.toLowerCase());
		if (match) { map.set(old.id, match.id); used.add(match.id); }
	}

	// Pass 3: semantic group match
	for (const old of oldStages) {
		if (map.has(old.id)) continue;
		const oldGroup = findGroup(old.id, old.name);
		if (!oldGroup) continue;
		const match = newStages.find(n => !used.has(n.id) && findGroup(n.id, n.name) === oldGroup);
		if (match) { map.set(old.id, match.id); used.add(match.id); }
	}

	// Pass 4: done-flag match
	for (const old of oldStages) {
		if (map.has(old.id)) continue;
		if (old.done) {
			const match = newStages.find(n => !used.has(n.id) && n.done);
			if (match) { map.set(old.id, match.id); used.add(match.id); }
		}
	}

	return map; // unmatched old stages → not in map → cards go to inbox
}


// ══════════════════════════════════════════════════════════════
//  Filter Presets
// ══════════════════════════════════════════════════════════════

const MAX_PRESETS = 3;

function autoSaveFilterPreset(query) {
	if (!query || query.startsWith('$')) return; // don't save built-in filters
	const current = filterPresets.peek();
	// Already saved?
	if (current.some(p => p.query === query)) return;
	// Add to front, cap at MAX_PRESETS
	const next = [{ name: query, query }, ...current].slice(0, MAX_PRESETS);
	filterPresets.set(next);
	renderStats();
}


// ══════════════════════════════════════════════════════════════
//  Multi-select
// ══════════════════════════════════════════════════════════════

let _multiSelectMode = false;
let _suppressNextClick = false;
let _bulkBar = null;

function enterMultiSelect() {
	_multiSelectMode = true;
	if (selectedCards.size > 1) showBulkBar();
	else hideBulkBar();
}

function exitMultiSelect() {
	_multiSelectMode = false;
	clearSelection();
	hideBulkBar();
}

function showBulkBar() {
	if (_bulkBar) { updateBulkBar(); return; }
	_bulkBar = document.createElement('div');
	_bulkBar.className = 'bulk-bar';
	_bulkBar.innerHTML = `
		<span class="bulk-bar__count">${selectedCards.size}</span>
		<select id="bulk-move-project" title="Move to swimlane">
			<option value="">Swimlane…</option>
			${projects.peek().map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}
		</select>
		<select id="bulk-move-stage" title="Move to stage">
			<option value="">Stage…</option>
			${stages.peek().map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}
		</select>
		<button class="bulk-icon-btn bulk-icon-btn--danger" id="bulk-delete" title="Delete">${ICON_TRASH}</button>
		<button class="bulk-icon-btn" id="bulk-done" title="Mark done">${ICON_CHECK_SQUARE}</button>
		<button class="bulk-icon-btn" id="bulk-cancel" title="Cancel" style="margin-left:2px">${ICON_X}</button>
	`;
	document.body.appendChild(_bulkBar);

	_bulkBar.querySelector('#bulk-move-project').addEventListener('change', (e) => {
		const projId = e.target.value;
		if (!projId) return;
		pushUndo('bulk move swimlane');
		selectedCards.forEach(id => _movedCards.add(id));
		batch(() => {
			cards.update(all => all.map(c => {
				if (!selectedCards.has(c.id)) return c;
				const stageId = parseColId(c.columnId).stageId || stages.peek()[0]?.id; // inbox cards land in the first stage
				return { ...c, projectId: projId, columnId: `col-${projId}-${stageId}`, _v: Date.now() };
			}));
		});
		showToast(`Moved ${selectedCards.size} cards`);
		exitMultiSelect();
	});
	_bulkBar.querySelector('#bulk-move-stage').addEventListener('change', (e) => {
		const stageId = e.target.value;
		if (!stageId) return;
		pushUndo('bulk move');
		selectedCards.forEach(id => _movedCards.add(id));
		batch(() => {
			cards.update(all => all.map(c => {
				if (!selectedCards.has(c.id) || c.projectId === 'inbox') return c;
				return { ...c, columnId: `col-${c.projectId}-${stageId}`, _v: Date.now() };
			}));
		});
		showToast(`Moved ${selectedCards.size} cards`);
		exitMultiSelect();
	});
	_bulkBar.querySelector('#bulk-done').addEventListener('click', () => {
		pushUndo('bulk done');
		const ids = [...selectedCards];
		batch(() => {
			cards.update(all => all.map(c => {
				if (!selectedCards.has(c.id)) return c;
				return { ...c, done: true, _v: Date.now() };
			}));
		});
		// Automove each card
		const automoveStage = stages.peek().find(s => s.automove && s.done);
		let movedCount = 0;
		if (automoveStage) {
			for (const id of ids) {
				const card = cardMap.peek().get(id);
				if (card && card.projectId !== 'inbox') {
					const targetCol = `col-${card.projectId}-${automoveStage.id}`;
					if (card.columnId !== targetCol) { moveCard(id, targetCol, null, true); movedCount++; }
				}
			}
		}
		showToast(`Marked ${ids.length} done` + (movedCount ? ` → ${automoveStage.name}` : ''));
		exitMultiSelect();
	});
	_bulkBar.querySelector('#bulk-delete').addEventListener('click', () => {
		pushUndo('bulk delete');
		const count = selectedCards.size;
		batch(() => {
			cards.update(all => all.filter(c => !selectedCards.has(c.id)));
		});
		showToast(`Deleted ${count} cards`);
		exitMultiSelect();
	});
	_bulkBar.querySelector('#bulk-cancel').addEventListener('click', () => {
		exitMultiSelect();
	});
}

function updateBulkBar() {
	if (!_bulkBar) return;
	const countEl = _bulkBar.querySelector('.bulk-bar__count');
	if (countEl) countEl.textContent = selectedCards.size;
}

function hideBulkBar() {
	if (_bulkBar) { _bulkBar.remove(); _bulkBar = null; }
}

let _selectionJustToggled = false;

function toggleCardSelection(cardId, additive) {
	if (_selectionJustToggled) return;
	_selectionJustToggled = true;
	requestAnimationFrame(() => { _selectionJustToggled = false; });

	if (additive) {
		if (selectedCards.has(cardId)) {
			if (selectedCards.size <= 1) return; // keep at least 1 selected
			selectedCards.delete(cardId);
		}
		else selectedCards.add(cardId);
	} else {
		selectedCards.clear();
		selectedCards.add(cardId);
	}
	_syncSelectionDOM();
	if (selectedCards.size > 0) { enterMultiSelect(); updateBulkBar(); }
	else exitMultiSelect();
}

function _syncSelectionDOM() {
	document.querySelectorAll('.card[data-card-id]').forEach(el => {
		const want = selectedCards.has(el.dataset.cardId);
		if (el.classList.contains('card--selected') !== want) {
			el.classList.toggle('card--selected', want);
		}
	});
}

function clearSelection() {
	selectedCards.clear();
	document.querySelectorAll('.card--selected').forEach(el => el.classList.remove('card--selected'));
	const badge = document.getElementById('drag-count-badge');
	if (badge) { badge._cleanup?.(); badge.remove(); }
}


// ══════════════════════════════════════════════════════════════
//  Obsidian Kanban format serialiser/parser
// ══════════════════════════════════════════════════════════════

function exportToObsidian() {
	const md = serializeBoardMd();
	const blob = new Blob([md], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'board.md';
	a.click();
	URL.revokeObjectURL(url);
	showToast('Exported board.md');
}

function serializeBoardMd() {
	const stgs = stages.peek();
	const projs = projects.peek();
	const colCards = cardsByColumn.peek();

	// YAML frontmatter
	let md = '---\n';
	md += 'kanban-plugin: detrita\n';
	md += 'detrita: v1\n';
	md += 'stages:\n';
	for (const s of stgs) {
		md += `  - { id: "${s.id}", label: "${s.name}", color: "${s.color}"${s.done ? ', done: true' : ''}${s.automove ? ', automove: true' : ''} }\n`;
	}
	md += 'swimlanes:\n';
	for (const p of projs) {
		md += `  - { id: "${p.id}", label: "${p.name}", color: "${p.color}"${p.collapsed ? ', collapsed: true' : ''} }\n`;
	}
	md += '---\n\n';

	// Markdown body: stages as ##, swimlanes as ###
	for (const s of stgs) {
		md += `## ${s.done ? '✓ ' : ''}${s.name}\n\n`;
		for (const p of projs) {
			const cc = colCards.get(`col-${p.id}-${s.id}`) ?? [];
			if (cc.length === 0 && projs.length > 1) continue;
			md += `### ${p.name}\n\n${cc.map(cardToMd).join('')}\n`;
		}
	}

	// Inbox
	const inboxCards = colCards.get('inbox-col') ?? [];
	if (inboxCards.length > 0) md += `## Inbox\n\n${inboxCards.map(cardToMd).join('')}`;

	return md;
}

function parseBoardMd(text) {
	const lines = text.split('\n');

	// Parse YAML frontmatter
	let fmStages = [], fmSwimlanes = [];
	let fmEnd = 0;
	if (lines[0]?.trim() === '---') {
		for (let i = 1; i < lines.length; i++) {
			if (lines[i].trim() === '---') { fmEnd = i + 1; break; }
		}
		const fmText = lines.slice(1, fmEnd - 1).join('\n');
		const stagesBlock = fmText.match(/stages:\n((?:\s+-[^\n]+\n?)*)/);
		if (stagesBlock) {
			for (const m of stagesBlock[1].matchAll(/id:\s*"?([^",}]+)"?,\s*label:\s*"?([^",}]+)"?,\s*color:\s*"?([^",}]+)"?(?:,\s*done:\s*(true))?(?:,\s*automove:\s*(true))?(?:,\s*collapsed:\s*(true))?/g)) {
				fmStages.push({ id: m[1].trim(), name: m[2].trim(), color: m[3].trim(), done: !!m[4], automove: !!m[5] });
			}
		}
		const swimBlock = fmText.match(/swimlanes:\n((?:\s+-[^\n]+\n?)*)/);
		if (swimBlock) {
			for (const m of swimBlock[1].matchAll(/id:\s*"?([^",}]+)"?,\s*label:\s*"?([^",}]+)"?,\s*color:\s*"?([^",}]+)"?(?:,\s*done:\s*(true))?(?:,\s*collapsed:\s*(true))?/g)) {
				fmSwimlanes.push({ id: m[1].trim(), name: m[2].trim(), color: m[3].trim(), collapsed: !!m[5] });
			}
		}
	}

	// Parse markdown body
	const stageMap = new Map(fmStages.map(s => [s.name.replace(/^✓\s*/, ''), s]));
	const swimMap = new Map(fmSwimlanes.map(s => [s.name, s]));
	const allCards = [];
	let currentStage = null;
	let inInbox = false;
	let currentSwim = null;
	let lastCard = null;
	let cardOrder = 0;

	for (let i = fmEnd; i < lines.length; i++) {
		const line = lines[i];

		const h2 = line.match(/^##\s+(.+)/);
		if (h2) {
			const name = h2[1].trim().replace(/^✓\s*/, '');
			// "## Inbox" is the inbox, not a stage — unless the board really has a stage by that name
			inInbox = name.toLowerCase() === 'inbox' && !stageMap.has(name);
			currentStage = inInbox ? null : stageMap.get(name)?.id;
			if (!inInbox && !currentStage) {
				const sid = name.toLowerCase().replace(/\s+/g, '-');
				currentStage = fmStages.some(s => s.id === sid) ? `${sid}-${fmStages.length + 1}` : sid;
				fmStages.push({ id: currentStage, name, color: '#7a5040', done: name.toLowerCase() === 'done' });
				stageMap.set(name, fmStages[fmStages.length - 1]);
			}
			currentSwim = null;
			lastCard = null;
			cardOrder = 0;
			continue;
		}

		const h3 = line.match(/^###\s+(.+)/);
		if (h3) {
			const name = h3[1].trim();
			if (swimMap.has(name)) {
				currentSwim = swimMap.get(name);
			} else {
				const id = 'p' + (swimMap.size + 1);
				const swim = { id, name, color: SWATCH_COLORS[swimMap.size % SWATCH_COLORS.length], collapsed: false };
				fmSwimlanes.push(swim);
				swimMap.set(name, swim);
				currentSwim = swim;
			}
			lastCard = null;
			cardOrder = 0;
			continue;
		}

		// Card line (task or bare list item)
		const parsed = (currentStage || inInbox) && parseCardLine(line);
		if (parsed) {
			const { blockId, ...fields } = parsed;
			const projId = inInbox ? 'inbox' : (currentSwim?.id || fmSwimlanes[0]?.id || 'p1');
			lastCard = {
				id: blockId || newCardId(), ...fields,
				columnId: inInbox ? 'inbox-col' : `col-${projId}-${currentStage}`, projectId: projId,
				order: cardOrder++, notes: '', _v: Date.now(), _created: Date.now(),
			};
			allCards.push(lastCard);
			continue;
		}

		// Indented continuation = notes for last card
		if (lastCard && /^\s{2,}/.test(line)) {
			const noteLine = line.replace(/^\s{2,}/, '');
			lastCard.notes += (lastCard.notes ? '\n' : '') + noteLine;
			continue;
		}

		// Blank or other line resets lastCard
		if (line.trim() === '') { lastCard = null; }
	}

	// Defaults
	if (fmStages.length === 0) {
		fmStages = [
			{ id: 'backlog', name: 'Backlog', color: '#7a5040', done: false },
			{ id: 'active', name: 'Active', color: '#2b4abd', done: false },
			{ id: 'review', name: 'Review', color: '#a07820', done: false },
			{ id: 'done', name: 'Done', color: '#2a7a3e', done: true },
		];
	}
	if (fmSwimlanes.length === 0) {
		fmSwimlanes = [{ id: 'p1', name: 'Default', color: '#2b4abd', collapsed: false }];
	}

	return { stages: fmStages, projects: fmSwimlanes, cards: allCards };
}

// Replace the board with parsed/imported data. Cards that already exist keep their
// creation time, so a sync or re-import doesn't reset every card's age.
function applyBoard(data, action) {
	if (action) pushUndo(action);
	const prev = cardMap.peek();
	batch(() => {
		if (data.stages?.length) stages.set(data.stages);
		if (data.projects?.length) projects.set(data.projects);
		cards.set(data.cards.map(c => {
			const old = prev.get(c.id);
			return old?._created ? { ...c, _created: old._created } : c;
		}));
	});
}

// Move matching cards to the end of the inbox, keeping their relative order.
function moveCardsToInbox(pred) {
	let order = cardsByColumn.peek().get('inbox-col')?.length ?? 0;
	cards.update(all => all.map(c => pred(c) ? { ...c, columnId: 'inbox-col', projectId: 'inbox', order: order++ } : c));
}

// ══════════════════════════════════════════════════════════════
//  FileSync — File System Access API + change detection
// ══════════════════════════════════════════════════════════════

class FileSync {
	_handle = null;
	_lastHash = '';
	_lastModTime = 0;
	_pollTimer = null;
	_saveTimer = null;
	_dirty = false;
	_saving = false;
	_enabled = false;
	_saveInterval = 60000; // 1 minute default

	async connect() {
		if (!window.showSaveFilePicker) {
			showToast('File sync requires Chrome or Edge');
			return false;
		}
		this._loadSaveInterval();
		try {
			this._handle = await window.showSaveFilePicker({
				suggestedName: 'board.md',
				types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
			});
			await this._readFromFile();
			this._enabled = true;
			this._startPolling();
			this._persistHandle();
			this._updateUI(true);
			showToast('Syncing to ' + this._handle.name);
			return true;
		} catch (e) {
			if (e.name !== 'AbortError') showToast('File sync failed');
			return false;
		}
	}

	async reconnect() {
		if (!this._handle) {
			const stored = await this._loadHandle();
			if (!stored) return false;
			this._handle = stored;
		}
		this._loadSaveInterval();
		try {
			const perm = await this._handle.requestPermission({ mode: 'readwrite' });
			if (perm !== 'granted') { showToast('Permission denied'); return false; }
			await this._readFromFile();
			this._enabled = true;
			this._startPolling();
			this._updateUI(true);
			showToast('Reconnected to ' + this._handle.name);
			return true;
		} catch (e) {
			showToast('Reconnect failed');
			return false;
		}
	}

	disconnect() {
		this._enabled = false;
		this._handle = null;
		clearInterval(this._pollTimer);
		this._pollTimer = null;
		this._updateUI(false);
		showToast('File sync disconnected');
	}

	async _readFromFile() {
		const file = await this._handle.getFile();
		const text = await file.text();
		this._lastModTime = file.lastModified;
		this._lastHash = await this._hash(text);

		if (text.trim()) {
			applyBoard(parseBoardMd(text), 'load from file');
		} else {
			// New/empty file — write current board to it
			await this.save();
		}
	}

	async save() {
		if (!this._enabled || !this._handle || this._saving) return;
		this._saving = true;
		try {
			const md = serializeBoardMd();
			const hash = await this._hash(md);
			if (hash === this._lastHash) { this._saving = false; return; }

			const writable = await this._handle.createWritable();
			await writable.write(md);
			await writable.close();
			this._lastHash = hash;
			this._lastModTime = Date.now();
			this._dirty = false;
		} catch (e) {
			console.warn('File sync save failed:', e);
			showToast('Sync save failed');
		}
		this._saving = false;
	}

	scheduleSave() {
		if (!this._enabled) return;
		this._dirty = true;
		clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(() => this.save(), this._saveInterval);
	}

	saveNow() {
		if (!this._enabled) return;
		clearTimeout(this._saveTimer);
		this.save();
	}

	setSaveInterval(ms) {
		this._saveInterval = ms;
		try { localStorage.setItem('detrita-sync-interval', ms); } catch (_) {}
		if (this._dirty) this.scheduleSave();
	}

	_loadSaveInterval() {
		try {
			const v = localStorage.getItem('detrita-sync-interval');
			if (v) this._saveInterval = parseInt(v, 10) || 60000;
		} catch (_) {}
	}

	_startPolling() {
		clearInterval(this._pollTimer);
		this._pollTimer = setInterval(() => this._poll(), Math.max(this._saveInterval, 10000));
	}

	async _poll() {
		if (!this._enabled || !this._handle || this._saving || this._dirty) return;
		try {
			const file = await this._handle.getFile();
			if (file.lastModified <= this._lastModTime) return;

			const text = await file.text();
			const hash = await this._hash(text);
			if (hash === this._lastHash) return;

			// External change detected
			applyBoard(parseBoardMd(text), 'sync from disk');
			this._lastHash = hash;
			this._lastModTime = file.lastModified;
			showToast('Board updated from disk');
		} catch (e) {
			// Permission lost or file moved
		}
	}

	async _hash(text) {
		const buf = new TextEncoder().encode(text);
		const hash = await crypto.subtle.digest('SHA-256', buf);
		return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	async _persistHandle() {
		try {
			const db = await new Promise((res, rej) => {
				const req = indexedDB.open('detrita-sync', 1);
				req.onupgradeneeded = (e) => e.target.result.createObjectStore('handles');
				req.onsuccess = () => res(req.result);
				req.onerror = () => rej(req.error);
			});
			const tx = db.transaction('handles', 'readwrite');
			tx.objectStore('handles').put(this._handle, 'file');
		} catch (_) {}
	}

	async _loadHandle() {
		try {
			const db = await new Promise((res, rej) => {
				const req = indexedDB.open('detrita-sync', 1);
				req.onupgradeneeded = (e) => e.target.result.createObjectStore('handles');
				req.onsuccess = () => res(req.result);
				req.onerror = () => rej(req.error);
			});
			return new Promise((res) => {
				const tx = db.transaction('handles', 'readonly');
				const req = tx.objectStore('handles').get('file');
				req.onsuccess = () => res(req.result || null);
				req.onerror = () => res(null);
			});
		} catch (_) { return null; }
	}

	_updateUI(connected) {
		const connectBtn = document.getElementById('sync-connect-btn');
		const status = document.getElementById('sync-status');
		const filename = document.getElementById('sync-filename');
		const vaultBtn = document.getElementById('btn-vault');
		if (connectBtn) connectBtn.style.display = connected ? 'none' : '';
		if (status) status.style.display = connected ? '' : 'none';
		if (filename && connected && this._handle) filename.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:4px;vertical-align:middle"></span>Connected: ${escHtml(this._handle.name)}`;
		if (vaultBtn) vaultBtn.classList.toggle('sync-dot', connected);
	}
}

const fileSync = new FileSync();

function exportToClipboard() {
	const md = serializeBoardMd();
	navigator.clipboard.writeText(md).then(() => {
		showToast('Board copied to clipboard');
	}).catch(() => {
		showToast('Copy failed — try Export instead');
	});
}

function importFromObsidian(file) {
	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const text = e.target.result;
			const parsed = parseBoardMd(text);
			applyBoard(parsed, 'import markdown');
			document.getElementById('vault-modal').classList.remove('open');
			showToast(`Imported ${parsed.cards.length} cards`);
		} catch (err) {
			showToast('Import failed — check file format');
			console.error(err);
		}
	};
	reader.readAsText(file);
}

function toggleTheme() {
	if (document.body.classList.contains('print-preview')) return;
	const html = document.documentElement;
	const s = document.createElement('style');
	s.textContent = '*,*::before,*::after{transition:none!important}';
	document.head.appendChild(s);
	const isDark = html.dataset.theme === 'dark';
	html.dataset.theme = isDark ? 'light' : 'dark';
	document.getElementById('icon-moon').style.display = isDark ? '' : 'none';
	document.getElementById('icon-sun').style.display = isDark ? 'none' : '';
	document.querySelector('meta[name="theme-color"]').content = isDark ? '#e3dedb' : '#2b0000';
	try { localStorage.setItem('detrita-theme', html.dataset.theme); } catch (_) {}
	// Avatar/label colours depend on the theme but aren't part of the card signature,
	// so drop the cached HTML and each card's signature to force a repaint.
	_cardHtmlCache.clear();
	document.querySelectorAll('.card[data-card-id]').forEach(el => { el._sig = null; });
	renderBoard();
	renderInbox();
	requestAnimationFrame(() => s.remove());
}

