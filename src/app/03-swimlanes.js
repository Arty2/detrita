// ── Swimlane rows ──

function createSwimlane(d) {
	const el = document.createElement('div');
	el.setAttribute('role', 'row');
	d.patch(el, d);
	return el;
}

function patchSwimlane(el, d) {
	const { project: p, stgs, colCards, vis } = d;
	el.dataset.project = p.id;
	setCls(el, `swimlane${p.collapsed ? ' collapsed' : ''}`);
	setAttr(el, 'aria-label', `${p.name} swimlane`);

	const projTotal = stgs.reduce((n, s) => {
		const cc = colCards.get(`col-${p.id}-${s.id}`) ?? [];
		return n + (vis ? cc.filter(c => vis.has(c.id)).length : cc.length);
	}, 0);

	// Label
	let labelEl = el.querySelector(':scope > .sw-label');
	const pid = escHtml(p.id), color = escHtml(p.color);
	const labelHtml = `<div class="sw-colorbar" style="background:${color}"></div><button class="sw-collapse" data-collapse="${pid}" aria-label="${p.collapsed ? 'Expand' : 'Collapse'} ${escHtml(p.name)}">${ICON_CHEVRON}</button><span class="sw-name" style="color:${color}" data-proj-name="${pid}">${escHtml(p.name)}</span><span class="sw-reorder-btn proj-drag" data-proj-drag="${pid}" title="Drag to reorder">${ICON_DRAG}</span><span class="sw-total sw-total--expanded${projTotal === 0 ? ' count-hidden' : ''}">${projTotal}</span><span class="sw-total sw-total--collapsed${projTotal === 0 ? ' count-hidden' : ''}">(${projTotal})</span>`;
	if (!labelEl) {
		labelEl = document.createElement('div');
		labelEl.className = 'sw-label';
		el.prepend(labelEl);
	}
	if (labelEl._sig !== labelHtml) { labelEl.innerHTML = labelHtml; labelEl._sig = labelHtml; }

	// Cols container
	let colsEl = el.querySelector(':scope > .sw-cols');
	if (!colsEl) {
		colsEl = document.createElement('div');
		colsEl.className = 'sw-cols';
		el.appendChild(colsEl);
	}

	// Cell descriptors
	const cellDescs = [];
	for (const s of stgs) {
		const colId = `col-${p.id}-${s.id}`;
		cellDescs.push({
			key: colId,
			create: createCell,
			patch: patchCell,
			colId, colData: colCards.get(colId) ?? [], stage: s, project: p, vis,
		});
	}
	// Add-stage cell
	cellDescs.push({
		key: `__add-${p.id}`,
		create(d) {
			const el = document.createElement('div');
			el.className = 'stage-cell-add';
			el.dataset.projStageAdd = d.projId;
			el.title = 'New stage';
			return el;
		},
		patch(el, d) { el.dataset.projStageAdd = d.projId; },
		projId: p.id,
	});

	reconcileChildren(colsEl, cellDescs, el => el.dataset.colId || (el.dataset.projStageAdd ? `__add-${el.dataset.projStageAdd}` : null));
}

