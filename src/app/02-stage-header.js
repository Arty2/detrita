// ── Stage header row ──

function createStageRow(d) {
	const el = document.createElement('div');
	el.className = 'stage-row';
	el.setAttribute('role', 'row');
	el.setAttribute('aria-label', 'Stage headers');
	d.patch(el, d);
	return el;
}

const COLLAPSE_ALL_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><polyline points="4 7 9 12 4 17"/><polyline points="20 7 15 12 20 17"/></svg>`;
const EXPAND_ALL_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><polyline points="9 7 4 12 9 17"/><polyline points="15 7 20 12 15 17"/></svg>`;

function patchStageRow(el, d) {
	const { stgs, projs, colCards, vis, allCollapsed } = d;
	let h = `<div class="stage-proj-cell" role="columnheader"><button class="collapse-all-btn" id="collapse-all-btn" title="${allCollapsed ? 'Expand all' : 'Collapse all'}">${allCollapsed ? EXPAND_ALL_SVG : COLLAPSE_ALL_SVG}</button></div><div class="stage-cells">`;
	for (const s of stgs) {
		const total = projs.reduce((n, p) => n + (colCards.get(`col-${p.id}-${s.id}`)?.length ?? 0), 0);
		const visCount = vis ? projs.reduce((n, p) => n + (colCards.get(`col-${p.id}-${s.id}`) ?? []).filter(c => vis.has(c.id)).length, 0) : total;
		const count = vis ? visCount : total;
		const doneIcon = s.done
			? `<svg width="12" height="12" stroke="var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-check-sq"/></svg>`
			: `<svg width="12" height="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"><use href="#i-square"/></svg>`;
		const autoIcon = s.automove ? ' →' : '';
		h += `<div class="stage-cell" role="columnheader" data-stage-id="${escHtml(s.id)}"><button class="done-toggle" data-done-stage="${escHtml(s.id)}" title="${s.done ? 'Unmark as done column' : 'Mark as done column'}">${doneIcon}</button><span class="stage-name">${escHtml(s.name)}${autoIcon}</span><span class="stage-count${count === 0 ? ' count-hidden' : ''}">${count}</span><span class="sw-reorder-btn stage-drag" title="Drag to reorder">${ICON_DRAG}</span></div>`;
	}
	h += `<div class="stage-cell-add stage-cell-add--header" title="Add stage">${ICON_PLUS}</div></div>`;
	if (el._sig !== h) { el.innerHTML = h; el._sig = h; }
}

