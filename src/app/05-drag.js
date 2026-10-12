// ── Auto-scroll during drag ──
let _autoScrollRAF = null;
function startAutoScroll(clientX, clientY) {
	cancelAnimationFrame(_autoScrollRAF);
	const EDGE = 40;
	const SPEED = 8;

	// Check inbox list first
	const inboxList = $('inbox-list');
	if (inboxList) {
		const ir = inboxList.getBoundingClientRect();
		if (clientX >= ir.left && clientX <= ir.right && clientY >= ir.top && clientY <= ir.bottom) {
			let idy = 0;
			if (clientY < ir.top + EDGE) idy = -SPEED;
			else if (clientY > ir.bottom - EDGE) idy = SPEED;
			if (idy) {
				(function scroll() {
					inboxList.scrollBy(0, idy);
					_autoScrollRAF = requestAnimationFrame(scroll);
				})();
				return;
			}
		}
	}

	// Board scroll
	const scrollEl = $('board-scroll');
	if (!scrollEl) return;
	const rect = scrollEl.getBoundingClientRect();
	let dx = 0, dy = 0;
	if (clientX < rect.left + EDGE) dx = -SPEED;
	else if (clientX > rect.right - EDGE) dx = SPEED;
	if (clientY < rect.top + EDGE) dy = -SPEED;
	else if (clientY > rect.bottom - EDGE) dy = SPEED;
	if (dx || dy) {
		(function scroll() {
			scrollEl.scrollBy(dx, dy);
			_autoScrollRAF = requestAnimationFrame(scroll);
		})();
	}
}
function stopAutoScroll() {
	cancelAnimationFrame(_autoScrollRAF);
	_autoScrollRAF = null;
}


function _makeDragDot() {
	const size = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2;
	const c = document.createElement('canvas');
	c.width = size; c.height = size;
	c.style.cssText = `position:fixed;top:-9999px;`;
	const ctx = c.getContext('2d');
	const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
	ctx.fillStyle = accent;
	ctx.fill();
	document.body.appendChild(c);
	return c;
}

// Create a swimlane / stage on the fly (drop or double-click on the "+" zones).
function addSwimlane() {
	const id = 'p' + Date.now().toString(36);
	projects.update(all => [...all, { id, name: 'New swimlane', color: SWATCH_COLORS[all.length % SWATCH_COLORS.length], collapsed: false }]);
	return id;
}

function addStage() {
	const id = 'stage-' + Date.now().toString(36);
	stages.update(all => [...all, { id, name: 'New stage', color: '#7a5040', done: false }]);
	return id;
}

function dropIntoNewSwimlane(cardIds, stageId) {
	pushUndo('new swimlane');
	const projId = addSwimlane();
	const target = stageId || stages.peek()[0]?.id;
	if (target) for (const id of cardIds) moveCard(id, `col-${projId}-${target}`, null, true);
	showToast('Created new swimlane');
}

function dropIntoNewStage(cardIds, rowProjId) {
	pushUndo('new stage');
	const stageId = addStage();
	for (const id of cardIds) {
		const c = cardMap.peek().get(id);
		const projId = rowProjId || (c?.projectId && c.projectId !== 'inbox' ? c.projectId : projects.peek()[0]?.id);
		if (projId) moveCard(id, `col-${projId}-${stageId}`, null, true);
	}
	showToast('Created new stage');
}

function initDragAndDrop() {
	// Keep native DnD for mouse on desktop
	document.addEventListener('dragstart', (e) => {
		const card = e.target.closest('.card[data-card-id]');
		if (!card) return;
		// Right edge dead zone in inbox
		const inInbox = card.closest('.inbox-list');
		if (inInbox) {
			const cardRect = card.getBoundingClientRect();
			if (e.clientX > cardRect.right - 30) { e.preventDefault(); return; }
		}
		const cardId = card.dataset.cardId;
		// If card is part of selection, drag all; otherwise drag just this one
		if (!selectedCards.has(cardId)) clearSelection();
		if (selectedCards.size > 0) {
			e.dataTransfer.setData('text/plain', [...selectedCards].join(','));
		} else {
			e.dataTransfer.setData('text/plain', cardId);
		}
		e.dataTransfer.effectAllowed = 'move';
		const count = Math.max(selectedCards.size, 1);

		// Apply rotation directly to the visible card for reliable setDragImage capture
		const origContain = card.style.contain;
		const origTransition = card.style.transition;
		card.style.contain = 'none';
		card.style.transition = 'none';
		card.style.transform = 'rotate(2deg)';

		let tempBadge = null;
		if (count > 1) {
			tempBadge = document.createElement('div');
			tempBadge.className = 'drag-count';
			tempBadge.textContent = count;
			card.style.overflow = 'visible';
			card.appendChild(tempBadge);
		}

		card.offsetHeight; // force reflow with all styles applied
		e.dataTransfer.setDragImage(card, e.clientX - card.getBoundingClientRect().left, e.clientY - card.getBoundingClientRect().top);

		requestAnimationFrame(() => {
			card.style.transform = '';
			card.style.overflow = '';
			card.style.contain = origContain || '';
			card.style.transition = origTransition || '';
			if (tempBadge) tempBadge.remove();
			card.classList.add('dragging');
			selectedCards.forEach(id => {
				const el = cardEl(id);
				if (el) el.classList.add('dragging');
			});
		});
		document.body.dataset.dragging = 'true';
	});

	document.addEventListener('dragend', () => {
		document.querySelectorAll('.card.dragging').forEach(c => { c.classList.remove('dragging'); c.classList.remove('shrink-delete'); });
		delete document.body.dataset.dragging;
		stopAutoScroll();
		clearHover();
		clearIndicator();
		document.querySelector('.inbox-toggle')?.classList.remove('drop-hover');
	});

	let _inboxDragTimer = null;
	let _dragoverPending = false;
	let _lastDragoverEvent = null;
	document.addEventListener('dragover', (e) => {
		if (_boardDragType) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		_lastDragoverEvent = e;
		if (_dragoverPending) return;
		_dragoverPending = true;
		requestAnimationFrame(() => {
			_dragoverPending = false;
			const ev = _lastDragoverEvent;
			if (!ev) return;
			_processDragover(ev);
		});
	});

	function _processDragover(e) {
		const bottomBarEl = document.querySelector('.bottom-bar');
		const bbRect = bottomBarEl?.getBoundingClientRect();
		const overBottom = bbRect && e.clientY > bbRect.top - 10;
		if (overBottom) {
			document.querySelector('.inbox-toggle')?.classList.add('drop-hover');
			if (!inboxOpen.peek() && !_inboxDragTimer) {
				_inboxDragTimer = setTimeout(() => { inboxOpen.set(true); _inboxDragTimer = null; }, 400);
			}
			return;
		} else {
			document.querySelector('.inbox-toggle')?.classList.remove('drop-hover');
			if (_inboxDragTimer) { clearTimeout(_inboxDragTimer); _inboxDragTimer = null; }
			const overInboxPanel = e.target.closest?.('.inbox-panel, .inbox-list');
			if (!overInboxPanel && inboxOpen.peek()) inboxOpen.set(false);
		}

		const cell = e.target.closest('.col-cell, .inbox-list');
		const projZone = e.target.closest('.proj-drop-zone-cell, .proj-drop-zone-label');
		const stageZone = e.target.closest('.stage-cell-add');
		const brandZone = e.target.closest('.brand');
		const target = cell || projZone || stageZone || brandZone;
		if (!target) {
			document.querySelectorAll('.card.shrink-delete').forEach(c => c.classList.remove('shrink-delete'));
			return;
		}
		setHover(target);
		document.querySelectorAll('.card.dragging').forEach(c => {
			c.classList.toggle('shrink-delete', !!brandZone);
		});
		if (cell) {
			if (cell.closest('.swimlane.collapsed')) {
				showCollapsedDropIndicator(cell);
			} else {
				const container = cell.classList.contains('inbox-list') ? cell : cell.querySelector('.col-cards');
				if (container) showDropIndicator(container, getInsertionPoint(e.clientY, container));
				else clearIndicator();
			}
		} else {
			clearIndicator();
		}
		startAutoScroll(e.clientX, e.clientY);
	}

	document.addEventListener('dragleave', (e) => {
		if (_boardDragType) return;
		const target = e.target.closest('.col-cell, .inbox-list, .proj-drop-zone-cell, .proj-drop-zone-label, .stage-cell-add, .brand');
		if (target && !target.contains(e.relatedTarget)) {
			if (target === _activeHover) clearHover();
			clearIndicator();
		}
	});

	document.addEventListener('drop', (e) => {
		e.preventDefault();
		if (_boardDragType) return;
		const rawIds = e.dataTransfer.getData('text/plain');
		if (!rawIds) return;
		const cardIds = rawIds.split(',').filter(Boolean);

		const cell = e.target.closest('.col-cell');
		const inbox = e.target.closest('.inbox-list');
		const projZone = e.target.closest('.proj-drop-zone-cell[data-proj-drop-stage], .proj-drop-zone-label');
		const stageZone = e.target.closest('.stage-cell-add');
		const brandZone = e.target.closest('.brand');

		if (brandZone) {
			pushUndo('delete card');
			batch(() => { cards.update(all => all.filter(c => !cardIds.includes(c.id))); });
			flashBrandDelete();
		} else if (cell) {
			const colId = cell.dataset.colId;
			const container = cell.querySelector('.col-cards');
			const after = container ? getInsertionPoint(e.clientY, container) : null;
			if (cardIds.length > 1) pushUndo('move cards');
			for (const id of cardIds) moveCard(id, colId, after, cardIds.length > 1);
		} else if (inbox) {
			if (cardIds.length > 1) pushUndo('move cards to inbox');
			for (const id of cardIds) moveCard(id, 'inbox-col', null, cardIds.length > 1);
		} else if (projZone) {
			dropIntoNewSwimlane(cardIds, projZone.dataset?.projDropStage);
		} else if (stageZone) {
			dropIntoNewStage(cardIds, stageZone.dataset?.projStageAdd);
		}
		clearSelection();
		clearHover();
		clearIndicator();
	});

	// ── Touch / Pointer-based drag for mobile ──
	document.addEventListener('pointerdown', onPointerDown, { passive: false });
}

function startMultiDrag(card, cardId, rect, offsetX, offsetY, startEvent) {
	if (!selectedCards.has(cardId)) {
		selectedCards.add(cardId);
		card.classList.add('card--selected');
	}
	card.classList.add('dragging');
	selectedCards.forEach(id => {
		const el = cardEl(id);
		if (el && el !== card) el.classList.add('dragging');
	});

	const dragIds = [...selectedCards];
	const ghost = card.cloneNode(true);
	ghost.classList.add('drag-ghost');
	Object.assign(ghost.style, {
		position: 'fixed', zIndex: '500', pointerEvents: 'none',
		width: rect.width + 'px',
		transform: 'rotate(2deg)',
		boxShadow: '3px 3px 0 var(--border), 6px 6px 0 var(--border2), 0 8px 24px rgba(0,0,0,0.18)',
		transition: 'none', overflow: 'visible', contain: 'none',
		left: (startEvent.clientX - offsetX) + 'px',
		top: (startEvent.clientY - offsetY) + 'px',
	});
	if (dragIds.length > 1) {
		const badge = document.createElement('div');
		badge.className = 'drag-count';
		badge.textContent = dragIds.length;
		
		ghost.appendChild(badge);
	}
	document.body.appendChild(ghost);
	document.body.dataset.dragging = 'true';

	let ghostShrunk = false;
	const onMove = (ev) => {
		ghost.style.left = `${ev.clientX - offsetX}px`;
		ghost.style.top = `${ev.clientY - offsetY}px`;

		const el = document.elementFromPoint(ev.clientX, ev.clientY);
		const cell = el?.closest('.col-cell');
		const inbox = el?.closest('.inbox-list');
		const projZone = el?.closest('.proj-drop-zone-cell, .proj-drop-zone-label');
		const stageZone = el?.closest('.stage-cell-add');
		const brandZone = el?.closest('.brand');
		const overInboxBar = el?.closest('.inbox-toggle, .bottom-bar');
		clearHover();

		const overInbox = inbox || el?.closest('.inbox-panel');
		if (overInboxBar || overInbox) {
			document.querySelector('.inbox-toggle')?.classList.add('drop-hover');
			if (!inboxOpen.peek()) inboxOpen.set(true);
		} else {
			document.querySelector('.inbox-toggle')?.classList.remove('drop-hover');
			if (inboxOpen.peek() && document.body.dataset.dragging) inboxOpen.set(false);
		}

		const target = cell || inbox || projZone || stageZone || brandZone;
		if (target) {
			setHover(target);
			if (cell?.closest('.swimlane.collapsed')) {
				showCollapsedDropIndicator(cell);
			} else if (cell || inbox) {
				const container = cell ? cell.querySelector('.col-cards') : inbox;
				if (container) showDropIndicator(container, getInsertionPoint(ev.clientY, container));
				else clearIndicator();
			} else {
				clearIndicator();
			}
		} else {
			clearIndicator();
		}
		if (ghost) {
			if (brandZone && !ghostShrunk) {
				ghostShrunk = true;
				ghost._origWidth = ghost.style.width;
				const size = Math.min(ghost.offsetWidth, ghost.offsetHeight) * 0.3;
				ghost.style.transition = 'width 0.15s, height 0.15s';
				ghost.style.width = size + 'px';
				ghost.style.height = size + 'px';
				ghost.style.overflow = 'hidden';
				ghost.style.outline = '2px solid var(--accent)';
			} else if (!brandZone && ghostShrunk) {
				ghostShrunk = false;
				ghost.style.width = ghost._origWidth || '';
				ghost.style.height = '';
				ghost.style.outline = '';
			}
		}
		startAutoScroll(ev.clientX, ev.clientY);
	};

	const onUp = (ev) => {
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
		document.removeEventListener('pointercancel', onUp);
		stopAutoScroll();
		ghost.remove();
		card.classList.remove('dragging');
		selectedCards.forEach(id => {
			const el = cardEl(id);
			if (el) el.classList.remove('dragging');
		});
		delete document.body.dataset.dragging;
		clearHover();
		clearIndicator();

		const el = document.elementFromPoint(ev.clientX, ev.clientY);
		const cell = el?.closest('.col-cell');
		const inbox = el?.closest('.inbox-list');
		const projZone = el?.closest('.proj-drop-zone-cell[data-proj-drop-stage], .proj-drop-zone-label');
		const stageZone = el?.closest('.stage-cell-add');
		const brandZone = el?.closest('.brand');

		if (brandZone) {
			pushUndo('delete cards');
			batch(() => { cards.update(all => all.filter(c => !dragIds.includes(c.id))); });
			flashBrandDelete();
			exitMultiSelect();
		} else if (cell) {
			const colId = cell.dataset.colId;
			const container = cell.querySelector('.col-cards');
			const after = container ? getInsertionPoint(ev.clientY, container) : null;
			pushUndo('move cards');
			for (const id of dragIds) moveCard(id, colId, after, true);
		} else if (inbox) {
			const after = getInsertionPoint(ev.clientY, inbox);
			pushUndo('move cards to inbox');
			for (const id of dragIds) moveCard(id, 'inbox-col', after, true);
		} else if (projZone) {
			dropIntoNewSwimlane(dragIds, projZone.dataset?.projDropStage);
		} else if (stageZone) {
			dropIntoNewStage(dragIds, stageZone.dataset?.projStageAdd);
		}
	};

	document.addEventListener('pointermove', onMove, { passive: false });
	document.addEventListener('pointerup', onUp);
	document.addEventListener('pointercancel', onUp);
}

function onPointerDown(e) {
	if (e.pointerType === 'mouse') return; // mouse uses native DnD
	const card = e.target.closest('.card[data-card-id]');
	if (!card) return;
	if (document.body.classList.contains('print-preview')) return;

	// Right edge dead zone in inbox — allow scrolling
	const inInbox = card.closest('.inbox-list');
	if (inInbox) {
		const cardRect = card.getBoundingClientRect();
		if (e.clientX > cardRect.right - 30) return;
	}

	const cardId = card.dataset.cardId;
	const rect = card.getBoundingClientRect();
	const offsetX = e.clientX - rect.left;
	const offsetY = e.clientY - rect.top;

	let moved = false;
	let longPressed = false;
	let startX = e.clientX, startY = e.clientY;
	const DRAG_THRESHOLD = 12;
	const LONG_PRESS_MS = 400;

	if (_multiSelectMode) {
		let msMoved = false;
		const msOnMove = (ev) => {
			if (msMoved) return;
			if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD && Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return;
			msMoved = true;
			document.removeEventListener('pointermove', msOnMove);
			document.removeEventListener('pointerup', msOnUp);
			document.removeEventListener('pointercancel', msOnUp);
			startMultiDrag(card, cardId, rect, offsetX, offsetY, ev);
		};
		const msOnUp = () => {
			document.removeEventListener('pointermove', msOnMove);
			document.removeEventListener('pointerup', msOnUp);
			document.removeEventListener('pointercancel', msOnUp);
			if (!msMoved) {
				_suppressNextClick = true;
				toggleCardSelection(cardId, true);
				if (navigator.vibrate) navigator.vibrate(50);
			}
		};
		document.addEventListener('pointermove', msOnMove, { passive: true });
		document.addEventListener('pointerup', msOnUp);
		document.addEventListener('pointercancel', msOnUp);
		return;
	}

	const longPressTimer = setTimeout(() => {
		if (!moved) {
			longPressed = true;
			_suppressNextClick = true;
			card.draggable = false;
			toggleCardSelection(cardId, true);
			if (navigator.vibrate) navigator.vibrate(50);
		}
	}, LONG_PRESS_MS);

	let ghost = null;
	let ghostShrunk = false;

	const onMove = (ev) => {
		if (longPressed) {
			ev.preventDefault();
			return;
		}
		if (!moved) {
			if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD && Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return;
			clearTimeout(longPressTimer);
			moved = true;
			card.classList.add('dragging');

			// Create ghost now that drag has started
			ghost = card.cloneNode(true);
			ghost.classList.add('drag-ghost');
			Object.assign(ghost.style, {
				position: 'fixed', zIndex: '500', pointerEvents: 'none',
				width: rect.width + 'px',
				transform: 'rotate(2deg)',
				boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
				transition: 'none', contain: 'none',
				left: rect.left + 'px',
				top: rect.top + 'px',
			});

			// If multi-selected, add stacked layers behind ghost
			const dragIds = selectedCards.has(cardId) && selectedCards.size > 1
				? [...selectedCards] : [cardId];
			if (dragIds.length > 1) {
				ghost.style.boxShadow = '3px 3px 0 var(--border), 6px 6px 0 var(--border2), 0 8px 24px rgba(0,0,0,0.18)';
				const badge = document.createElement('div');
				badge.className = 'drag-count';
				badge.textContent = dragIds.length;
				ghost.style.overflow = 'visible';
				ghost.appendChild(badge);
			}

			document.body.appendChild(ghost);
			document.body.dataset.dragging = 'true';
		}
		ghost.style.left = `${ev.clientX - offsetX}px`;
		ghost.style.top = `${ev.clientY - offsetY}px`;

		// Highlight drop target
		const el = document.elementFromPoint(ev.clientX, ev.clientY);
		const cell = el?.closest('.col-cell');
		const inbox = el?.closest('.inbox-list');
		const projZone = el?.closest('.proj-drop-zone-cell, .proj-drop-zone-label');
		const stageZone = el?.closest('.stage-cell-add');
		const brandZone = el?.closest('.brand');
		const overInboxBar = el?.closest('.inbox-toggle, .bottom-bar');
		clearHover();

		// Auto-open inbox on hover, auto-close when leaving
		const overInbox = inbox || el?.closest('.inbox-panel');
		if (overInboxBar || overInbox) {
			document.querySelector('.inbox-toggle')?.classList.add('drop-hover');
			if (!inboxOpen.peek()) inboxOpen.set(true);
		} else {
			document.querySelector('.inbox-toggle')?.classList.remove('drop-hover');
			if (inboxOpen.peek() && document.body.dataset.dragging) inboxOpen.set(false);
		}

		const target = cell || inbox || projZone || stageZone || brandZone;
		if (target) {
			setHover(target);
			if (cell?.closest('.swimlane.collapsed')) {
				showCollapsedDropIndicator(cell);
			} else if (cell || inbox) {
				const container = cell ? cell.querySelector('.col-cards') : inbox;
				if (container) showDropIndicator(container, getInsertionPoint(ev.clientY, container));
				else clearIndicator();
			} else {
				clearIndicator();
			}
		} else {
			clearIndicator();
		}
		// Ghost shrink over delete zone
		if (ghost) {
			if (brandZone && !ghostShrunk) {
				ghostShrunk = true;
				ghost._origWidth = ghost.style.width;
				ghost._origHeight = ghost.style.height;
				ghost._origOverflow = ghost.style.overflow;
				const size = Math.min(ghost.offsetWidth, ghost.offsetHeight) * 0.3;
				ghost.style.transition = 'width 0.15s, height 0.15s';
				ghost.style.width = size + 'px';
				ghost.style.height = size + 'px';
				ghost.style.overflow = 'hidden';
				ghost.style.outline = '2px solid var(--accent)';
				ghost.style.outlineOffset = '-2px';
				ghost.style.borderRadius = '4px';
			} else if (!brandZone && ghostShrunk) {
				ghostShrunk = false;
				ghost.style.transition = 'width 0.15s, height 0.15s';
				ghost.style.width = ghost._origWidth || '';
				ghost.style.height = ghost._origHeight || '';
				ghost.style.overflow = ghost._origOverflow || '';
				ghost.style.outline = '';
				ghost.style.outlineOffset = '';
			}
		}
		startAutoScroll(ev.clientX, ev.clientY);
	};

	const onUp = (ev) => {
		clearTimeout(longPressTimer);
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
		document.removeEventListener('pointercancel', onUp);
		stopAutoScroll();
		if (ghost) ghost.remove();
		card.classList.remove('dragging');
		card.draggable = true;
		delete document.body.dataset.dragging;
		clearHover();
		clearIndicator();

		if (!moved) return; // was a tap or long-press, not a drag

		const dragIds = selectedCards.has(cardId) && selectedCards.size > 1
			? [...selectedCards] : [cardId];
		const el = document.elementFromPoint(ev.clientX, ev.clientY);
		const cell = el?.closest('.col-cell');
		const inbox = el?.closest('.inbox-list');
		const projZone = el?.closest('.proj-drop-zone-cell[data-proj-drop-stage], .proj-drop-zone-label');
		const stageZone = el?.closest('.stage-cell-add');
		const brandZone = el?.closest('.brand');

		if (brandZone) {
			pushUndo('delete card');
			batch(() => { cards.update(all => all.filter(c => !dragIds.includes(c.id))); });
			flashBrandDelete();
		} else if (cell) {
			const colId = cell.dataset.colId;
			const container = cell.querySelector('.col-cards');
			const after = container ? getInsertionPoint(ev.clientY, container) : null;
			if (dragIds.length > 1) pushUndo('move cards');
			for (const id of dragIds) moveCard(id, colId, after, dragIds.length > 1);
		} else if (inbox) {
			const after = getInsertionPoint(ev.clientY, inbox);
			if (dragIds.length > 1) pushUndo('move cards to inbox');
			for (const id of dragIds) moveCard(id, 'inbox-col', after, dragIds.length > 1);
		} else if (projZone) {
			dropIntoNewSwimlane(dragIds, projZone.dataset?.projDropStage);
		} else if (stageZone) {
			dropIntoNewStage(dragIds, stageZone.dataset?.projStageAdd);
		}
		clearSelection();
	};

	document.addEventListener('pointermove', onMove, { passive: false });
	document.addEventListener('pointerup', onUp);
	document.addEventListener('pointercancel', onUp);
}

function getInsertionPoint(y, container) {
	for (const c of container.querySelectorAll('.card:not(.dragging)')) {
		const box = c.getBoundingClientRect();
		if (y < box.top + box.height / 2) return c;
	}
	return null;
}

// Show the drop line before `after` (null = end); reuses the existing line when it's
// already in place so dragover doesn't churn the DOM and force a relayout every frame.
function showDropIndicator(container, after) {
	if (_activeIndicator && _activeIndicator.parentNode === container && _activeIndicator.nextElementSibling === after) return;
	clearIndicator();
	if (!container.querySelector('.card:not(.dragging)')) return;
	const indicator = document.createElement('div');
	indicator.className = 'drop-indicator';
	container.insertBefore(indicator, after);
	_activeIndicator = indicator;
}

function showCollapsedDropIndicator(cell) {
	if (_activeIndicator && _activeIndicator.parentNode === cell) return;
	clearIndicator();
	const indicator = document.createElement('div');
	indicator.className = 'drop-indicator';
	indicator.style.cssText = 'margin:0 auto;width:60%;position:absolute;bottom:4px;left:20%;right:20%;';
	cell.appendChild(indicator);
	_activeIndicator = indicator;
}

function toggleCardDone(cardId) {
	const card = cardMap.peek().get(cardId);
	if (!card) return;
	const newDone = !card.done;
	batch(() => {
		cards.update(all => all.map(c => c.id !== cardId ? c : { ...c, done: newDone, _v: Date.now() }));
	});
	// Automove: if toggled done and an automove stage exists, move there
	if (newDone) {
		const automoveStage = stages.peek().find(s => s.automove && s.done);
		if (automoveStage && card.projectId !== 'inbox') {
			const targetCol = `col-${card.projectId}-${automoveStage.id}`;
			if (card.columnId !== targetCol) {
				moveCard(cardId, targetCol, null, true);
				showToast(`Moved to ${automoveStage.name}`);
			}
		}
	}
	return newDone;
}

function moveCard(cardId, newColId, beforeEl, skipUndo) {
	const currentCard = cardMap.peek().get(cardId);
	if (!currentCard) return;
	if (currentCard.columnId === newColId && !beforeEl) {
		const colCards = cardsByColumn.peek().get(newColId) ?? [];
		if (colCards.length <= 1) return;
	}
	if (!skipUndo) pushUndo('move card');
	if (currentCard.columnId !== newColId) _movedCards.add(cardId);

	const card = { ...currentCard, columnId: newColId, _v: Date.now() };
	const { projectId, stageId } = parseColId(newColId);
	card.projectId = projectId;
	// Only force done=true when moving to a done-column; otherwise keep existing state
	if (stageId && stages.peek().find(s => s.id === stageId)?.done) card.done = true;

	// Recalculate order within the target column
	const colCards = (cardsByColumn.peek().get(newColId) ?? []).filter(c => c.id !== cardId);
	const beforeIdx = beforeEl ? colCards.findIndex(c => c.id === beforeEl.dataset?.cardId) : -1;
	if (beforeIdx >= 0) colCards.splice(beforeIdx, 0, card);
	else colCards.push(card);
	const orderMap = new Map(colCards.map((c, i) => [c.id, i]));

	cards.set(cards.peek().map(c => {
		if (c.id === cardId) return { ...card, order: orderMap.get(cardId) };
		const order = orderMap.get(c.id);
		return order != null && order !== c.order ? { ...c, order } : c;
	}));
	if (navigator.vibrate) navigator.vibrate(50);
}


// ══════════════════════════════════════════════════════════════
//  Module 7: keyboard.js — Shortcut handler
// ══════════════════════════════════════════════════════════════

let _lastFocusedCardId = null;

// Track which card was last focused
document.addEventListener('focusin', (e) => {
	const card = e.target.closest?.('.card[data-card-id]');
	if (card) {
		_lastFocusedCardId = card.dataset.cardId;
		updateFilterNavState();
	}
});

// Build ordered list of navigation entries (data-driven)
// Collapsed rows: one entry per cell (grouped), expanded: one per card
function getNavigableEntries() {
	const vis = visibleIds.peek();
	if (!vis) return [];
	const stgs = stages.peek();
	const projs = projects.peek();
	const colCards = cardsByColumn.peek();
	const entries = [];
	for (const p of projs) {
		for (const s of stgs) {
			const colId = `col-${p.id}-${s.id}`;
			const cc = colCards.get(colId) ?? [];
			const matching = cc.filter(c => vis.has(c.id));
			if (matching.length === 0) continue;
			if (p.collapsed) {
				// One grouped entry per cell
				entries.push({
					cardIds: matching.map(c => c.id),
					cardId: matching[0].id,
					collapsed: true,
					projId: p.id,
					colId,
					count: matching.length,
					cellTotal: cc.length,
				});
			} else {
				for (const c of matching) {
					entries.push({ cardIds: [c.id], cardId: c.id, collapsed: false, projId: p.id, colId, count: 1 });
				}
			}
		}
	}
	// Inbox cards
	const inbox = colCards.get('inbox-col') ?? [];
	for (const c of inbox) {
		if (!vis.has(c.id)) continue;
		entries.push({ cardIds: [c.id], cardId: c.id, collapsed: false, projId: 'inbox', colId: 'inbox-col', count: 1 });
	}
	return entries;
}

function getFocusedEntry(entries) {
	// Check activeElement
	const active = document.activeElement?.closest?.('.card[data-card-id]');
	if (active) {
		const id = active.dataset.cardId;
		const idx = entries.findIndex(e => e.cardIds.includes(id));
		if (idx >= 0) return idx;
	}
	// Check highlighted count
	const highlighted = document.querySelector('.sw-col-count.count-highlight[data-nav-card]');
	if (highlighted) {
		const id = highlighted.dataset.navCard;
		const idx = entries.findIndex(e => e.cardIds.includes(id));
		if (idx >= 0) return idx;
	}
	// Fallback to last tracked
	if (_lastFocusedCardId) {
		const idx = entries.findIndex(e => e.cardIds.includes(_lastFocusedCardId));
		if (idx >= 0) return idx;
	}
	return -1;
}

function clearCountHighlights() {
	document.querySelectorAll('.sw-col-count.count-highlight').forEach(el => {
		el.classList.remove('count-highlight');
		if (el._origText != null) { el.textContent = el._origText; delete el._origText; }
		el.removeAttribute('data-nav-card');
		el.removeAttribute('data-nav-proj');
		el.removeAttribute('tabindex');
	});
	$('inbox-badge')?.classList.remove('badge-focused');
}

function highlightCollapsedCount(entry) {
	clearCountHighlights();
	const cell = document.querySelector(`.col-cell[data-col-id="${CSS.escape(entry.colId)}"]`);
	if (!cell) return;
	const count = cell.querySelector('.sw-col-count');
	if (!count) return;
	count._origText = count.textContent;
	count.classList.add('count-highlight');
	count.dataset.navCard = entry.cardIds.join(',');
	count.dataset.navProj = entry.projId;
	count.textContent = entry.count;
	count.tabIndex = 0;
	count.focus();
	count.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}

const ICON_PREV = '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><polyline points="15 18 9 12 15 6"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><polyline points="9 6 15 12 9 18"/></svg>';
const ICON_LOOP_START = '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><polyline points="13 18 7 12 13 6"/><polyline points="19 18 13 12 19 6"/></svg>';
const ICON_LOOP_END = '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><polyline points="11 6 17 12 11 18"/><polyline points="5 6 11 12 5 18"/></svg>';

function updateFilterNavState() {
	const prev = document.getElementById('filter-prev');
	const next = document.getElementById('filter-next');
	if (!prev || !next) return;
	const entries = getNavigableEntries();
	const total = entries.length;
	const idx = getFocusedEntry(entries);

	if (total <= 1) {
		// 0 or 1 card — nothing to navigate
		prev.disabled = true; prev.classList.add('disabled'); prev.innerHTML = ICON_PREV;
		next.disabled = true; next.classList.add('disabled'); next.innerHTML = ICON_NEXT;
		return;
	}

	const atFirst = idx === 0;
	const atLast = idx === total - 1;
	const noFocus = idx === -1;

	// Prev: disabled only when no focus; at first → loop icon; otherwise normal
	if (noFocus) {
		prev.disabled = true; prev.classList.add('disabled'); prev.innerHTML = ICON_PREV;
	} else if (atFirst) {
		prev.disabled = false; prev.classList.remove('disabled'); prev.innerHTML = ICON_LOOP_END;
		prev.title = 'Loop to last';
	} else {
		prev.disabled = false; prev.classList.remove('disabled'); prev.innerHTML = ICON_PREV;
		prev.title = 'Previous (Shift+Tab)';
	}

	// Next: at last → loop icon; otherwise normal
	if (atLast) {
		next.disabled = false; next.classList.remove('disabled'); next.innerHTML = ICON_LOOP_START;
		next.title = 'Loop to first';
	} else {
		next.disabled = false; next.classList.remove('disabled'); next.innerHTML = ICON_NEXT;
		next.title = 'Next (Tab)';
	}
}

function cycleFilteredCard(direction) {
	const entries = getNavigableEntries();
	if (entries.length === 0) return false;
	const idx = getFocusedEntry(entries);
	let nextIdx;
	if (idx === -1) {
		nextIdx = direction > 0 ? 0 : entries.length - 1;
	} else {
		nextIdx = idx + direction;
		// Loop at boundaries (only with 2+ entries)
		if (nextIdx < 0) nextIdx = entries.length - 1;
		if (nextIdx >= entries.length) nextIdx = 0;
	}
	const entry = entries[nextIdx];
	_lastFocusedCardId = entry.cardId;
	clearCountHighlights();

	if (entry.collapsed) {
		// Card is in collapsed row — highlight the count
		highlightCollapsedCount(entry);
		updateFilterNavState();
		return true;
	}

	// Inbox
	if (entry.projId === 'inbox') {
		if (!inboxOpen.peek()) inboxOpen.set(true);
		$('inbox-badge')?.classList.add('badge-focused');
	} else {
		$('inbox-badge')?.classList.remove('badge-focused');
		if (inboxOpen.peek()) inboxOpen.set(false);
	}

	requestAnimationFrame(() => {
		const el = cardEl(entry.cardId);
		if (el) {
			el.focus();
			el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}
		updateFilterNavState();
	});
	return true;
}

// Click highlighted count → expand row + focus first card
document.addEventListener('click', (e) => {
	const count = e.target.closest('.sw-col-count.count-highlight[data-nav-card]');
	if (!count) return;
	const cardIds = count.dataset.navCard.split(',');
	const projId = count.dataset.navProj;
	if (!projId || !cardIds.length) return;
	const firstCardId = cardIds[0];
	_lastFocusedCardId = firstCardId;
	clearCountHighlights();
	projects.update(all => all.map(p =>
		p.id === projId ? { ...p, collapsed: false } : p
	));
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const el = cardEl(firstCardId);
			if (el) {
				el.focus();
				el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			}
			updateFilterNavState();
		});
	});
});

function initKeyboard() {
	document.addEventListener('keydown', (e) => {
		const tag = e.target.tagName;
		const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

		// Esc chain
		if (e.key === 'Escape') {
			if (document.getElementById('help-backdrop').classList.contains('open')) {
				toggleHelp(); return;
			}
			if (document.getElementById('vault-modal').classList.contains('open')) {
				document.getElementById('vault-modal').classList.remove('open'); return;
			}
			if (document.getElementById('cpanel-backdrop').classList.contains('open')) {
				closeCardPanel(); return;
			}
			if (document.querySelector('.modal-backdrop.open')) {
				document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open')); return;
			}
			if (filterStr.peek() || (inInput && e.target.id === 'filter-input')) {
				filterStr.set('');
				const fi = $('filter-input');
				if (fi) { fi.value = ''; fi.blur(); }
				return;
			}
			if (inboxOpen.peek()) { inboxOpen.set(false); return; }
			if (inInput) { e.target.blur(); return; }
		}

		// Global shortcuts (not in inputs)
		if (inInput && e.target.id === 'filter-input' && e.key === 'Enter') {
			e.preventDefault();
			const vis = visibleIds.peek();
			if (!vis || vis.size === 0) {
				// No results — blur like Escape
				filterStr.set('');
				e.target.value = '';
				e.target.blur();
				return;
			}
			// Find first collapsed row with visible cards and uncollapse it
			const projs = projects.peek();
			const colCards = cardsByColumn.peek();
			for (const p of projs) {
				if (!p.collapsed) continue;
				const hasVisible = stages.peek().some(s => {
					const cc = colCards.get(`col-${p.id}-${s.id}`) ?? [];
					return cc.some(c => vis.has(c.id));
				});
				if (hasVisible) {
					pushUndo('expand swimlane');
					_lastNavFilter = null; // re-run filter navigation so focus lands on the revealed match
					projects.update(all => all.map(pr => pr.id === p.id ? { ...pr, collapsed: false } : pr));
					return;
				}
			}
			// No collapsed row with matches — blur
			e.target.blur();
			return;
		}
		if (!inInput) {
			if (e.key === '?' || e.key === 'F1') { e.preventDefault(); toggleHelp(); return; }
			if (e.key === 'i') { inboxOpen.update(v => !v); return; }
			if (e.key === '/' || (e.ctrlKey && !e.shiftKey && e.key === 'f')) {
				e.preventDefault();
				$('filter-input').focus();
				return;
			}
			// Ctrl+O → open import
			if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
				e.preventDefault();
				document.getElementById('vault-modal').classList.add('open');
				return;
			}
			// Ctrl+S → export markdown
			if (e.ctrlKey && !e.shiftKey && e.key === 's') {
				e.preventDefault();
				document.getElementById('vault-modal').classList.add('open');
				exportToObsidian();
				return;
			}
			// Ctrl+Shift+S → copy to clipboard
			if (e.ctrlKey && e.shiftKey && e.key === 'S') {
				e.preventDefault();
				exportToClipboard();
				return;
			}
			// Ctrl+Shift+O → paste from clipboard
			if (e.ctrlKey && e.shiftKey && e.key === 'O') {
				e.preventDefault();
				navigator.clipboard.readText().then(text => {
					if (text) {
						try {
							const data = JSON.parse(text);
							if (data.stages && data.cards) {
								applyBoard(data, 'paste JSON');
								showToast(`Pasted ${data.cards.length} cards`);
								return;
							}
						} catch (_) {}
						const parsed = parseBoardMd(text);
						if (parsed.cards.length) {
							applyBoard(parsed, 'paste markdown');
							showToast(`Pasted ${parsed.cards.length} cards`);
						}
					}
				}).catch(() => showToast('Paste failed'));
				return;
			}
			if (e.key === 'n') {
				e.preventDefault();
				const firstCol = document.querySelector('.col-cell');
				if (firstCol) addCardToCol(firstCol.dataset.colId);
				return;
			}
			if (e.key === 'e') {
				const focused = document.activeElement?.closest('.card[data-card-id]');
				if (focused) { e.preventDefault(); inlineEditCard(focused); return; }
			}
			if (e.key === 'Enter') {
				const focused = document.activeElement?.closest('.card[data-card-id]');
				if (focused) { openCardPanel(focused.dataset.cardId); return; }
			}
			// Delete key on focused card
			if (e.key === 'Delete' || e.key === 'Backspace') {
				if (document.getElementById('cpanel-backdrop').classList.contains('open')) {
					if (!document.activeElement || document.activeElement === document.body || document.activeElement.id === 'cpanel') {
						e.preventDefault();
						deleteCard();
						return;
					}
				}
				const focused = document.activeElement?.closest('.card[data-card-id]');
				if (focused) {
					e.preventDefault();
					pushUndo('delete card');
					const cardId = focused.dataset.cardId;
					batch(() => { cards.update(all => all.filter(c => c.id !== cardId)); });
					flashBrandDelete();
					return;
				}
			}

			// Shift+Arrow — select cards
			if (e.shiftKey && ['ArrowUp','ArrowDown'].includes(e.key)) {
				e.preventDefault();
				navigateCards(e.key);
				const focused = document.activeElement?.closest('.card[data-card-id]');
				if (focused) toggleCardSelection(focused.dataset.cardId, true);
				return;
			}

			// Tab — cycle through visible cards (when filter active)
			if (e.key === 'Tab') {
				e.preventDefault();
				// Tab order: quick-input → inbox → header buttons → cards → quick-input
				const qi = document.getElementById('quick-input');
				const ib = document.getElementById('inbox-toggle');
				const hbtns = [...document.querySelectorAll('.hbtns .hbtn')];
				const allCards = [...document.querySelectorAll('.col-cell .card:not(.card--filtered), .inbox-list .card:not(.card--filtered)')];
				const order = [qi, ib, ...hbtns, ...allCards];
				const cur = document.activeElement;
				let idx = order.indexOf(cur);
				if (idx === -1 && cur?.closest('.card')) idx = order.indexOf(cur.closest('.card'));
				if (idx === -1) idx = -1;
				const next = e.shiftKey
					? order[(idx - 1 + order.length) % order.length]
					: order[(idx + 1) % order.length];
				if (next) { next.focus(); if (next.closest?.('.card')) next.scrollIntoView({ block: 'nearest' }); }
				return;
			}

			// Alt+Arrow — move focused card between cells
			if (e.altKey && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
				e.preventDefault();
				const focused = document.activeElement?.closest('.card[data-card-id]');
				if (focused) moveCardByKey(focused, e.key);
				return;
			}

			// Arrow navigation
			if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
				e.preventDefault();
				navigateCards(e.key);
				return;
			}
		}

		// Ctrl shortcuts
		if (e.ctrlKey && e.shiftKey && e.key === 'N') {
			e.preventDefault();
			document.getElementById('quick-input').focus();
			return;
		}
		if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			undo();
			return;
		}
		if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
			e.preventDefault();
			redo();
			return;
		}

		// Space — toggle done on focused card (when not in input)
		if (e.key === ' ' && !inInput) {
			const focused = document.activeElement?.closest('.card[data-card-id]');
			if (focused) {
				e.preventDefault();
				const cardId = focused.dataset.cardId;
				pushUndo('toggle done');
				const newDone = toggleCardDone(cardId);
				showToast(newDone ? 'Marked done' : 'Unmarked');
				return;
			}
		}
	});
}

function navigateCards(key) {
	const focused = document.activeElement?.closest('.card[data-card-id]');
	const allCards = [...document.querySelectorAll('.board .card[data-card-id]:not(.card--filtered)')];
	if (!allCards.length) return;

	if (!focused) {
		allCards[0]?.focus();
		return;
	}

	const currentIdx = allCards.indexOf(focused);
	const currentCell = focused.closest('.col-cell');
	const cellCards = [...currentCell.querySelectorAll('.card[data-card-id]:not(.card--filtered)')];
	const posInCell = cellCards.indexOf(focused);

	if (key === 'ArrowDown' && posInCell < cellCards.length - 1) {
		cellCards[posInCell + 1]?.focus();
	} else if (key === 'ArrowUp' && posInCell > 0) {
		cellCards[posInCell - 1]?.focus();
	} else if (key === 'ArrowRight' || key === 'ArrowLeft') {
		const allCells = [...document.querySelectorAll('.col-cell')];
		const cellIdx = allCells.indexOf(currentCell);
		const nextCellIdx = key === 'ArrowRight' ? cellIdx + 1 : cellIdx - 1;
		if (nextCellIdx >= 0 && nextCellIdx < allCells.length) {
			const nextCards = [...allCells[nextCellIdx].querySelectorAll('.card[data-card-id]:not(.card--filtered)')];
			if (nextCards.length) nextCards[Math.min(posInCell, nextCards.length - 1)]?.focus();
		}
	}
}

function moveCardByKey(cardEl, key) {
	const cardId = cardEl.dataset.cardId;
	const currentCell = cardEl.closest('.col-cell');
	if (!currentCell) return;

	const currentColId = currentCell.dataset.colId;
	const cellCards = [...currentCell.querySelectorAll('.card[data-card-id]:not(.card--filtered)')];
	const posInCell = cellCards.indexOf(cardEl);

	if (key === 'ArrowUp' || key === 'ArrowDown') {
		// Reorder within same column
		const targetIdx = key === 'ArrowUp' ? posInCell - 1 : posInCell + 1;
		if (targetIdx < 0 || targetIdx >= cellCards.length) return;
		pushUndo('reorder card');
		// Build new order from DOM position, with the swap applied
		const orderedIds = cellCards.map(el => el.dataset.cardId);
		[orderedIds[posInCell], orderedIds[targetIdx]] = [orderedIds[targetIdx], orderedIds[posInCell]];
		const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
		batch(() => {
			cards.update(all => all.map(c => {
				const newOrder = orderMap.get(c.id);
				return newOrder != null ? { ...c, order: newOrder } : c;
			}));
		});
		// Re-focus after re-render
		requestAnimationFrame(() => {
			cardEl(cardId)?.focus();
		});
		announce(`Moved ${key === 'ArrowUp' ? 'up' : 'down'}`);
	} else if (key === 'ArrowLeft' || key === 'ArrowRight') {
		// Move to adjacent column
		const allCells = [...document.querySelectorAll('.col-cell')];
		const cellIdx = allCells.indexOf(currentCell);
		const nextCellIdx = key === 'ArrowRight' ? cellIdx + 1 : cellIdx - 1;
		if (nextCellIdx < 0 || nextCellIdx >= allCells.length) return;

		const nextCell = allCells[nextCellIdx];
		const nextColId = nextCell.dataset.colId;
		if (!nextColId) return;

		pushUndo('move card');
		moveCard(cardId, nextColId, null);
		requestAnimationFrame(() => {
			cardEl(cardId)?.focus();
		});
		announce(`Moved to ${nextCell.getAttribute('aria-label') || 'column'}`);
	}
}


// ══════════════════════════════════════════════════════════════
//  Module 8: panels.js — Card detail, modals, help overlay
// ══════════════════════════════════════════════════════════════

let _openCardId = null;
let _openCardSnapshot = null;
let _openCardUndoPushed = false;

function openCardPanel(cardId) {
	const card = cardMap.peek().get(cardId);
	if (!card) return;
	document.activeElement?.blur();
	_openCardId = cardId;
	_openCardSnapshot = structuredClone(card);

	const backdrop = document.getElementById('cpanel-backdrop');
	document.getElementById('cpanel-title').value = card.title;
	document.getElementById('cpanel-notes').value = card.notes || '';
	document.getElementById('cpanel-notes').style.display = 'none';
	document.getElementById('cpanel-notes-preview').style.display = '';
	updateNotesPreview();
	document.getElementById('cpanel-start').value = card.startDate || '';
	document.getElementById('cpanel-due').value = card.dueDate || '';

	// Type toggle
	document.querySelectorAll('#cpanel-type .type-toggle-btn').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.type === card.type);
	});

	// Change panel bg tint based on type
	const cpanel = document.getElementById('cpanel');
	cpanel.style.background = '';
	cpanel.style.setProperty('--panel-bg', 'var(--surface)');
	if (card.type === 'meeting') { cpanel.style.background = 'var(--blue-bg)'; cpanel.style.setProperty('--panel-bg', 'var(--blue-bg)'); }
	if (card.type === 'followup') { cpanel.style.background = 'var(--yellow-bg)'; cpanel.style.setProperty('--panel-bg', 'var(--yellow-bg)'); }

	// Project dropdown
	const projSelect = document.getElementById('cpanel-project');
	projSelect.innerHTML = '<option value="inbox">Inbox</option>' +
		projects.peek().map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');
	projSelect.value = card.projectId || 'inbox';

	// Stage dropdown
	const stageSelect = document.getElementById('cpanel-stage');
	const currentStageId = parseColId(card.columnId).stageId || '';
	function populateStages() {
		stageSelect.innerHTML = stages.peek().map(s =>
			`<option value="${escHtml(s.id)}">${escHtml(s.name)}${s.done ? ' ✓' : ''}</option>`
		).join('');
		stageSelect.value = currentStageId || stages.peek()[0]?.id || '';
		stageSelect.disabled = projSelect.value === 'inbox';
	}
	populateStages();
	projSelect.onchange = populateStages;

	// Assignees
	renderChips('cpanel-assignees', card.assignees, '@', 'cpanel-assignee-input');

	// Labels
	renderChips('cpanel-labels', card.labels, '#', 'cpanel-label-input');

	backdrop.classList.add('open');
	document.getElementById('cpanel-title').focus();
}

function renderChips(containerId, items, prefix, inputId) {
	const container = document.getElementById(containerId);
	const input = document.getElementById(inputId);
	// Remove old chips
	container.querySelectorAll('.chip').forEach(c => c.remove());
	for (const item of items) {
		const chip = document.createElement('span');
		chip.className = 'chip';
		chip.innerHTML = `${prefix}${escHtml(item)} <button class="chip-remove">&times;</button>`;
		container.insertBefore(chip, input);
	}
}

function closeCardPanel(autoSave = true) {
	if (_cellEditColId) {
		if (autoSave) saveCellEditor();
		closeCellEditor();
		document.getElementById('cpanel-backdrop').classList.remove('open');
		return;
	}
	// Flush any pending autosave timer
	clearTimeout(document._cpanelAutoSaveTimer);
	const id = _openCardId;
	if (id && autoSave) {
		saveCardPanel();
	} else if (id && !autoSave) {
		if (_openCardSnapshot) {
			if (!_openCardSnapshot.title) {
				cards.update(all => all.filter(c => c.id !== id));
			} else {
				cards.update(all => all.map(c => c.id === id ? { ..._openCardSnapshot } : c));
				showToast('Changes reverted');
			}
		}
	}
	document.getElementById('cpanel-backdrop').classList.remove('open');
	document.getElementById('cpanel').style.background = '';
	_openCardId = null;
	_openCardSnapshot = null;
	_openCardUndoPushed = false;
}

function saveCardPanel() {
	if (!_openCardId) return;
	const title = document.getElementById('cpanel-title').value.trim() || 'Untitled';
	if (!_openCardUndoPushed) { pushUndo('edit card'); _openCardUndoPushed = true; }

	const type = document.querySelector('#cpanel-type .type-toggle-btn.active')?.dataset.type || 'task';
	const notes = document.getElementById('cpanel-notes').value;
	const startDate = document.getElementById('cpanel-start').value || null;
	const dueDate = document.getElementById('cpanel-due').value || null;

	const assignees = [...document.querySelectorAll('#cpanel-assignees .chip')]
		.map(c => c.textContent.replace('×','').trim().replace(/^@/, ''));
	const labels = [...document.querySelectorAll('#cpanel-labels .chip')]
		.map(c => c.textContent.replace('×','').trim().replace(/^#/, ''));

	const newProjId = document.getElementById('cpanel-project').value;
	const newStageId = document.getElementById('cpanel-stage').value;

	const columnId = newProjId === 'inbox' ? 'inbox-col' : `col-${newProjId}-${newStageId}`;
	cards.update(all => all.map(c => {
		if (c.id !== _openCardId) return c;
		const next = { ...c, title, type, notes, startDate, dueDate, assignees, labels, columnId, projectId: newProjId, _v: Date.now() };
		if (columnId !== c.columnId) {
			// Moved via the dropdowns: append to the target column, like a drop would
			next.order = cardsByColumn.peek().get(columnId)?.length ?? 0;
			if (stages.peek().find(s => s.id === newStageId)?.done && newProjId !== 'inbox') next.done = true;
		}
		return next;
	}));
	showToast('Saved');
}

function deleteCard(cardId) {
	pushUndo('delete card');
	const idToDelete = cardId || _openCardId;
	cards.update(all => all.filter(c => c.id !== idToDelete));
	_openCardSnapshot = null; // nothing to revert — don't toast "Changes reverted"
	closeCardPanel(false);
	if (navigator.vibrate) navigator.vibrate(50);
	showToast('Card deleted');
}

function addCardToCol(colId, skipUndo) {
	if (!skipUndo) pushUndo('new card');
	const id = 'c' + Date.now().toString(36);
	const { projectId, stageId } = parseColId(colId);
	const existing = cardsByColumn.peek().get(colId) ?? [];
	const stg = stages.peek().find(s => s.id === stageId);

	const card = {
		id, title: '', columnId: colId, projectId,
		order: existing.length, done: stg?.done || false, type: 'task',
		assignees: [], labels: [], notes: '', startDate: null, dueDate: null,
		_v: Date.now(), _created: Date.now(),
	};

	batch(() => { cards.update(all => [...all, card]); });
	if (navigator.vibrate) navigator.vibrate(50);
	openCardPanel(id);
}

