const libPictView = require('pict-view');

const _ExplorerCSS = /*css*/`
.pdex { font-size: 0.92rem; color: var(--theme-color-text-primary, #1f2733); }
.pdex *, .pdex *::before, .pdex *::after { box-sizing: border-box; }
.pdex-children { padding-left: 1.15rem; border-left: 1px solid var(--theme-color-border-light, #eef1f5); margin-left: 0.45rem; }
.pdex > .pdex-node > .pdex-children, .pdex-root > .pdex-children { border-left: none; margin-left: 0; padding-left: 0; }
.pdex-row { display: flex; align-items: center; gap: 0.4rem; padding: 0.28rem 0.4rem; border-radius: 7px; cursor: pointer; min-width: 0; }
.pdex-row:hover { background: var(--theme-color-background-tertiary, #eef1f5); }
.pdex-caret { flex: 0 0 auto; display: inline-flex; width: 1em; color: var(--theme-color-text-muted, #6b7686); font-size: 0.8rem; }
.pdex-caret-empty { visibility: hidden; }
.pdex-folder-ic { flex: 0 0 auto; display: inline-flex; color: var(--theme-color-brand-primary, #156dd1); }
.pdex-label { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pdex-count { flex: 0 0 auto; font-size: 0.76rem; font-weight: 600; color: var(--theme-color-text-muted, #6b7686);
	background: var(--theme-color-background-tertiary, #eef1f5); border-radius: 10px; padding: 0.02rem 0.45rem; }
.pdex-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pdex-subtitle { flex: 1 1 auto; min-width: 0; font-size: 0.82rem; color: var(--theme-color-text-muted, #6b7686); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pdex-loadmore { display: inline-block; margin: 0.2rem 0.4rem; padding: 0.25rem 0.6rem; font-size: 0.82rem; cursor: pointer; border-radius: 6px;
	color: var(--theme-color-brand-primary, #156dd1); }
.pdex-loadmore:hover { background: var(--theme-color-background-tertiary, #eef1f5); }
.pdex-empty, .pdex-loading { padding: 0.3rem 0.5rem; font-size: 0.82rem; color: var(--theme-color-text-muted, #6b7686); font-style: italic; }
/* The preview-card ⓘ trigger — reuses pict-section-recordset's class names for visual parity. */
.pdex-row .psrs-card-trigger { flex: 0 0 auto; display: inline-flex; align-items: center; cursor: pointer; opacity: 0.5; color: var(--theme-color-text-muted, #6b7686); }
.pdex-row .psrs-card-trigger:hover { opacity: 1; color: var(--theme-color-brand-primary, #156dd1); }
/* Per-tier toolbar — a filter box + a sort selector, shown under a folder row while it is expanded. */
.pdex-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0.15rem 0.4rem 0.35rem 1.5rem; }
.pdex-filter { display: inline-flex; align-items: center; gap: 0.3rem; flex: 1 1 12rem; min-width: 9rem; max-width: 22rem;
	background: var(--theme-color-background-secondary, #fff); border: 1px solid var(--theme-color-border-light, #d9e0e8); border-radius: 7px; padding: 0.1rem 0.45rem; }
.pdex-filter:focus-within { border-color: var(--theme-color-brand-primary, #156dd1); }
.pdex-filter-ic { flex: 0 0 auto; display: inline-flex; color: var(--theme-color-text-muted, #6b7686); font-size: 0.8rem; }
.pdex-filter-input { flex: 1 1 auto; min-width: 0; border: none; outline: none; background: transparent; font: inherit; font-size: 0.84rem; color: inherit; padding: 0.15rem 0; }
.pdex-sort { display: inline-flex; align-items: center; gap: 0.3rem; flex: 0 0 auto; }
.pdex-sort-label { font-size: 0.76rem; font-weight: 600; color: var(--theme-color-text-muted, #6b7686); }
.pdex-sort-select { font: inherit; font-size: 0.82rem; color: inherit; background: var(--theme-color-background-secondary, #fff);
	border: 1px solid var(--theme-color-border-light, #d9e0e8); border-radius: 7px; padding: 0.12rem 1.3rem 0.12rem 0.45rem; cursor: pointer; }
.pdex-sort-dir { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 1.7rem; height: 1.55rem; cursor: pointer;
	border: 1px solid var(--theme-color-border-light, #d9e0e8); border-radius: 7px; color: var(--theme-color-text-muted, #6b7686); }
.pdex-sort-dir:hover { border-color: var(--theme-color-brand-primary, #156dd1); color: var(--theme-color-brand-primary, #156dd1); }
/* Per-entity column chooser (toolbar) + the chips it lights up next to each record. */
.pdex-columns { flex: 0 0 auto; position: relative; font-size: 0.8rem; }
.pdex-columns-summary { cursor: pointer; list-style: none; display: inline-flex; align-items: center; gap: 0.3rem; color: var(--theme-color-text-muted, #6b7686);
	border: 1px solid var(--theme-color-border-light, #d9e0e8); border-radius: 7px; padding: 0.18rem 0.5rem; }
.pdex-columns-summary::-webkit-details-marker { display: none; }
.pdex-columns[open] .pdex-columns-summary { border-color: var(--theme-color-brand-primary, #156dd1); color: var(--theme-color-brand-primary, #156dd1); }
.pdex-columns-list { position: absolute; z-index: 50; margin-top: 0.25rem; min-width: 10rem; max-height: 16rem; overflow: auto; padding: 0.35rem;
	background: var(--theme-color-background-secondary, #fff); border: 1px solid var(--theme-color-border-light, #d9e0e8); border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
.pdex-column-opt { display: flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.3rem; white-space: nowrap; cursor: pointer; border-radius: 5px; }
.pdex-column-opt:hover { background: var(--theme-color-background-tertiary, #eef1f5); }
.pdex-chips { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
.pdex-chip { display: inline-flex; align-items: center; gap: 0.28rem; flex: 0 0 auto; font-size: 0.72rem; max-width: 18rem;
	background: var(--theme-color-background-tertiary, #eef1f5); border-radius: 10px; padding: 0.02rem 0.5rem; }
.pdex-chip-key { font-weight: 600; color: var(--theme-color-text-muted, #6b7686); }
.pdex-chip-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

/** @type {Record<string, any>} */
const _DEFAULT_CONFIGURATION =
{
	ViewIdentifier: 'Pict-DataExplorer',

	DefaultDestinationAddress: '#Pict-DataExplorer-Container',

	AutoRender: false,

	CSS: _ExplorerCSS,

	Templates:
	[
		{
			// The outer shell — a list of root folder nodes.
			Hash: 'PDEX-Root-Container',
			Template: /*html*/`<div class="pdex pdex-root">{~TS:PDEX-Folder-Node:Record.RootFolders~}</div>`,
		},
		{
			// A folder node WRAPPER (stable DOM id); its inner is re-rendered on toggle.
			Hash: 'PDEX-Folder-Node',
			Template: /*html*/`<div class="pdex-node pdex-folder" id="{~D:Record.NodeDOMID~}">{~TS:PDEX-Folder-Inner:Record.SelfSlot~}</div>`,
		},
		{
			Hash: 'PDEX-Folder-Inner',
			Template: /*html*/`<div class="pdex-row pdex-row-folder" onclick="_Pict.views['{~D:Record.ViewHash~}'].toggleNode('{~D:Record.NodeKey~}')">{~TS:PDEX-Caret-Down:Record.ExpandedSlot~}{~TS:PDEX-Caret-Right:Record.CollapsedSlot~}{~TS:PDEX-Caret-None:Record.NoCaretSlot~}<span class="pdex-folder-ic">{~I:Folder~}</span><span class="pdex-label">{~D:Record.Label~}</span>{~TS:PDEX-Count:Record.CountSlot~}</div>{~TS:PDEX-Folder-Toolbar:Record.ToolbarSlot~}<div class="pdex-children" id="{~D:Record.ChildrenDOMID~}"></div>`,
		},
		{
			// A record node WRAPPER.
			Hash: 'PDEX-Record-Node',
			Template: /*html*/`<div class="pdex-node pdex-record" id="{~D:Record.NodeDOMID~}">{~TS:PDEX-Record-Inner:Record.SelfSlot~}</div>`,
		},
		{
			Hash: 'PDEX-Record-Inner',
			Template: /*html*/`<div class="pdex-row pdex-row-record" onclick="_Pict.views['{~D:Record.ViewHash~}'].toggleNode('{~D:Record.NodeKey~}')">{~TS:PDEX-Caret-Down:Record.ExpandedSlot~}{~TS:PDEX-Caret-Right:Record.CollapsedSlot~}{~TS:PDEX-Caret-None:Record.NoCaretSlot~}<span class="pdex-title">{~D:Record.Title~}</span>{~TS:PDEX-Card-Trigger:Record.CardSlot~}<span class="pdex-chips">{~TS:PDEX-Chip:Record.ChipsSlot~}</span><span class="pdex-subtitle">{~D:Record.Subtitle~}</span></div><div class="pdex-children" id="{~D:Record.ChildrenDOMID~}"></div>`,
		},
		{
			// A folder's member list (record nodes) + a "Load more" + an empty-state.
			Hash: 'PDEX-Members',
			Template: /*html*/`{~TS:PDEX-Record-Node:Record.Members~}{~TS:PDEX-LoadMore:Record.LoadMoreSlot~}{~TS:PDEX-Empty:Record.EmptySlot~}`,
		},
		{
			// A record's child folders.
			Hash: 'PDEX-Folders',
			Template: /*html*/`{~TS:PDEX-Folder-Node:Record.Folders~}`,
		},
		{ Hash: 'PDEX-Caret-Down', Template: /*html*/`<span class="pdex-caret">{~I:ChevronDown~}</span>` },
		{ Hash: 'PDEX-Caret-Right', Template: /*html*/`<span class="pdex-caret">{~I:ChevronRight~}</span>` },
		{ Hash: 'PDEX-Caret-None', Template: /*html*/`<span class="pdex-caret pdex-caret-empty"></span>` },
		{ Hash: 'PDEX-Count', Template: /*html*/`<span class="pdex-count">{~D:Record.CountText~}</span>` },
		{ Hash: 'PDEX-Card-Trigger', Template: /*html*/`<span class="psrs-card-trigger" onclick="event.stopPropagation(); _Pict.views['{~D:Record.ViewHash~}'].openCardForNode('{~D:Record.NodeKey~}', this)"><span class="psrs-card-trigger-icon">{~I:Info~}</span></span>` },
		{ Hash: 'PDEX-LoadMore', Template: /*html*/`<div class="pdex-loadmore" onclick="_Pict.views['{~D:Record.ViewHash~}'].loadMore('{~D:Record.NodeKey~}')">Load more…</div>` },
		{ Hash: 'PDEX-Empty', Template: /*html*/`<div class="pdex-empty">{~D:Record.EmptyText~}</div>` },
		{
			// The per-tier toolbar: a filter box + a sort selector, shown only while a folder is expanded.
			Hash: 'PDEX-Folder-Toolbar',
			Template: /*html*/`<div class="pdex-toolbar" onclick="event.stopPropagation()">{~TS:PDEX-Filter-Box:Record.FilterSlot~}{~TS:PDEX-Sort-Box:Record.SortSlot~}{~TS:PDEX-Columns:Record.ColumnsSlot~}</div>`,
		},
		{
			Hash: 'PDEX-Filter-Box',
			Template: /*html*/`<span class="pdex-filter"><span class="pdex-filter-ic">{~I:Search~}</span><input type="text" class="pdex-filter-input" placeholder="Filter {~D:Record.Label~}…" value="{~D:Record.FilterValue~}" oninput="_Pict.views['{~D:Record.ViewHash~}'].onTierFilterInput('{~D:Record.NodeKey~}', this.value)" onkeydown="if (event.key === 'Enter') { event.preventDefault(); _Pict.views['{~D:Record.ViewHash~}'].setTierFilter('{~D:Record.NodeKey~}', this.value); } else if (event.key === 'Escape') { this.value = ''; _Pict.views['{~D:Record.ViewHash~}'].setTierFilter('{~D:Record.NodeKey~}', ''); }" /></span>`,
		},
		{
			Hash: 'PDEX-Sort-Box',
			Template: /*html*/`<span class="pdex-sort"><span class="pdex-sort-label">Sort</span><select class="pdex-sort-select" onchange="_Pict.views['{~D:Record.ViewHash~}'].setTierSort('{~D:Record.NodeKey~}', this.value)">{~TS:PDEX-Sort-Option:Record.Columns~}</select><span class="pdex-sort-dir" title="Toggle sort direction" onclick="_Pict.views['{~D:Record.ViewHash~}'].toggleTierSortDir('{~D:Record.NodeKey~}')">{~TS:PDEX-SortDir-Asc:Record.DirAscSlot~}{~TS:PDEX-SortDir-Desc:Record.DirDescSlot~}</span></span>`,
		},
		{ Hash: 'PDEX-Sort-Option', Template: /*html*/`<option value="{~D:Record.Name~}" {~NE:Record.IsSelected^selected~}>{~D:Record.Label~}</option>` },
		{ Hash: 'PDEX-SortDir-Asc', Template: /*html*/`{~I:ArrowUp~}` },
		{ Hash: 'PDEX-SortDir-Desc', Template: /*html*/`{~I:ArrowDown~}` },
		{
			// A per-entity column chooser — toggled columns light up as chips on every record of the entity.
			Hash: 'PDEX-Columns',
			Template: /*html*/`<details class="pdex-columns"><summary class="pdex-columns-summary"><span>Columns</span>{~I:ChevronDown~}</summary><div class="pdex-columns-list">{~TS:PDEX-Column-Option:Record.Columns~}</div></details>`,
		},
		{ Hash: 'PDEX-Column-Option', Template: /*html*/`<label class="pdex-column-opt"><input type="checkbox" {~NE:Record.Checked^checked~} onchange="_Pict.views['{~D:Record.ViewHash~}'].toggleColumn('{~D:Record.Entity~}', '{~D:Record.Column~}')" /><span>{~D:Record.Column~}</span></label>` },
		{ Hash: 'PDEX-Chip', Template: /*html*/`<span class="pdex-chip"><span class="pdex-chip-key">{~D:Record.Column~}</span><span class="pdex-chip-val">{~D:Record.Value~}</span></span>` },
	],

	Renderables: [],
};

/**
 * The data explorer "folders" view — an expandable tree of record / folder nodes.
 *
 * Rendering strategy: the recursion crosses record↔folder tiers in JS (pict templates cannot self-recurse
 * to unbounded depth), so each node's children are rendered with `parseTemplateByHash()` and assigned into
 * that node's stable child container on expand. AppData holds only node DATA + flags — never HTML. A node's
 * inner is re-rendered on toggle (to flip its caret) into its stable wrapper; its child container is then
 * filled (or cleared). Siblings are never touched.
 */
class PictViewDataExplorer extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	/** @return {any} the resolution DataProvider. */
	get dataProvider()
	{
		return this.pict.providers['Pict-DataExplorer-DataProvider'];
	}

	/** @return {Record<string, any>} the normalized explorer config graph. */
	get explorerConfig()
	{
		return this.options.ExplorerConfig || { Entities: {}, Roots: [], PageSize: 25, MaxDepth: 6 };
	}

	/** @return {Record<string, any>} the per-explorer node store (created on first use). */
	_state()
	{
		if (!this.pict.AppData.PictDataExplorer) { this.pict.AppData.PictDataExplorer = {}; }
		if (!this.pict.AppData.PictDataExplorer[this.Hash]) { this.pict.AppData.PictDataExplorer[this.Hash] = { Nodes: {} }; }
		return this.pict.AppData.PictDataExplorer[this.Hash];
	}

	_node(pKey)
	{
		return this._state().Nodes[pKey];
	}

	/** A DOM-safe id from a logical node key (which contains `:` and `/`). */
	_domID(pPrefix, pKey)
	{
		return `${pPrefix}-${this.Hash}-${String(pKey).replace(/[^A-Za-z0-9]/g, '_')}`;
	}

	_entityConfig(pEntityName)
	{
		return this.explorerConfig.Entities[pEntityName] || { Entity: pEntityName, IDField: `ID${pEntityName}`, Lite: [], Display: { Title: `ID${pEntityName}` }, Children: [] };
	}

	// --- entry point ---------------------------------------------------------------------------------

	/** Render the root folder list into the destination. Call once after the destination exists in the DOM. */
	renderExplorer()
	{
		const tmpState = this._state();
		tmpState.Nodes = {};
		const tmpRootFolders = [];
		(this.explorerConfig.Roots || []).forEach((pRoot) =>
		{
			const tmpEntityConfig = this._entityConfig(pRoot.Entity);
			const tmpKey = `root:${pRoot.Entity}`;
			const tmpNode =
			{
				Kind: 'folder', IsRoot: true, Entity: pRoot.Entity, EntityConfig: tmpEntityConfig,
				Label: pRoot.Label || pRoot.Entity, RootFilter: pRoot.Filter || '', RootSort: pRoot.Sort,
				Expanded: false, Loaded: false, Loading: false, Count: null,
				MemberKeys: [], Cursor: 0, HasMore: true, PageSize: pRoot.PageSize || this.explorerConfig.PageSize, Depth: 0,
			};
			tmpState.Nodes[tmpKey] = tmpNode;
			tmpRootFolders.push(this._folderDescriptor(tmpKey, tmpNode));
		});
		const tmpHTML = this.pict.parseTemplateByHash('PDEX-Root-Container', { RootFolders: tmpRootFolders });
		this.pict.ContentAssignment.assignContent(this.options.DestinationAddress || this.options.DefaultDestinationAddress, tmpHTML);
		this.pict.CSSMap.injectCSS();
		return this;
	}

	// --- interactions --------------------------------------------------------------------------------

	toggleNode(pKey)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode) { return; }
		tmpNode.Expanded = !tmpNode.Expanded;
		this._renderInner(pKey);
		if (!tmpNode.Expanded) { return; }

		if (tmpNode.Loaded) { return this.renderChildren(pKey); }

		// First expand → load this node's children, showing a transient "Loading…".
		this.pict.ContentAssignment.assignContent(`#${this._domID('PDEX-Children', pKey)}`, '<div class="pdex-loading">Loading…</div>');
		tmpNode.Loading = true;
		const fComplete = () =>
		{
			tmpNode.Loading = false;
			tmpNode.Loaded = true;
			if (tmpNode.Expanded) { this.renderChildren(pKey); }
		};
		if (tmpNode.Kind === 'folder') { this._loadFolderMembers(pKey, tmpNode, fComplete); }
		else { this._loadRecordFolders(pKey, tmpNode, fComplete); }
	}

	loadMore(pKey)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode || (tmpNode.Kind !== 'folder') || tmpNode.Loading) { return; }
		tmpNode.Loading = true;
		this._loadFolderMembers(pKey, tmpNode, () => { tmpNode.Loading = false; this.renderChildren(pKey); });
	}

	// --- per-tier filter + sort ----------------------------------------------------------------------

	/** Debounced live filtering as the user types in a tier's filter box. */
	onTierFilterInput(pKey, pValue)
	{
		if (!this._filterDebounce) { this._filterDebounce = {}; }
		if (this._filterDebounce[pKey]) { clearTimeout(this._filterDebounce[pKey]); }
		this._filterDebounce[pKey] = setTimeout(() => { delete this._filterDebounce[pKey]; this.setTierFilter(pKey, pValue); }, 250);
	}

	/** Apply a tier's filter text (server-side substring on the search field) and reload its first page. */
	setTierFilter(pKey, pValue)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode || (tmpNode.Kind !== 'folder')) { return; }
		if (this._filterDebounce && this._filterDebounce[pKey]) { clearTimeout(this._filterDebounce[pKey]); delete this._filterDebounce[pKey]; }
		const tmpNew = String((pValue === undefined || pValue === null) ? '' : pValue);
		if ((tmpNode.UserFilter || '') === tmpNew) { return; }
		tmpNode.UserFilter = tmpNew;
		this._reloadFolderMembers(pKey, tmpNode);
	}

	/** Apply a tier's sort column and reload its first page. */
	setTierSort(pKey, pField)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode || (tmpNode.Kind !== 'folder')) { return; }
		tmpNode.UserSort = String((pField === undefined || pField === null) ? '' : pField);
		this._reloadFolderMembers(pKey, tmpNode);
	}

	/** Flip a tier's sort direction (ASC ⇄ DESC), repaint the arrow, and reload its first page. */
	toggleTierSortDir(pKey)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode || (tmpNode.Kind !== 'folder')) { return; }
		tmpNode.UserSortDirection = (this._effectiveSortDir(tmpNode) === 'DESC') ? 'ASC' : 'DESC';
		this._renderInner(pKey); // repaint the toolbar so the direction arrow reflects the new state
		this._reloadFolderMembers(pKey, tmpNode);
	}

	/** Reset a folder's loaded members + pagination and re-fetch its first page (leaves the toolbar in place). */
	_reloadFolderMembers(pKey, pNode)
	{
		// Drop the previously-loaded member nodes (and their descendants) — the load path dedupes by node key,
		// so without this a reload of the same records would skip them and render an empty list.
		const tmpNodes = this._state().Nodes;
		const tmpPrefix = `${pKey}/`;
		Object.keys(tmpNodes).forEach((pNodeKey) => { if (pNodeKey.indexOf(tmpPrefix) === 0) { delete tmpNodes[pNodeKey]; } });
		pNode.MemberKeys = [];
		pNode.Cursor = 0;
		pNode.HasMore = true;
		pNode.Loaded = false;
		pNode.Loading = true;
		this.pict.ContentAssignment.assignContent(`#${this._domID('PDEX-Children', pKey)}`, '<div class="pdex-loading">Loading…</div>');
		this._loadFolderMembers(pKey, pNode, () =>
		{
			pNode.Loading = false;
			pNode.Loaded = true;
			this.renderChildren(pKey);
		});
	}

	openCardForNode(pKey, pAnchorElement)
	{
		const tmpNode = this._node(pKey);
		const tmpManager = this.pict.providers.RecordSetCardManager;
		if (!tmpNode || !tmpManager || (typeof tmpManager.openCard !== 'function')) { return; }
		// Rich mode: the manager fetches the full record (the node holds only Lite columns), shows every
		// column, synthesizes a default card when the entity has none, and offers the audit stripe.
		tmpManager.openCard(tmpNode.Entity, tmpNode.Record, pAnchorElement, { Rich: true, Audit: true, EntityConfig: tmpNode.EntityConfig });
	}

	// --- loading -------------------------------------------------------------------------------------

	/** Fetch a page of a folder's members (root list, or a parent record's children) and create record nodes. */
	_loadFolderMembers(pKey, pNode, fComplete)
	{
		const fReceive = (pError, pRecords) =>
		{
			if (pError) { this.log.error(`Pict-DataExplorer: error loading [${pNode.Entity}] members: ${pError.message || pError}`); return fComplete(); }
			const tmpRecords = pRecords || [];
			const tmpIDField = pNode.EntityConfig.IDField;
			tmpRecords.forEach((pRecord) =>
			{
				const tmpChildKey = `${pKey}/rec:${pRecord[tmpIDField]}`;
				if (this._node(tmpChildKey)) { return; } // dedupe across pages
				this._state().Nodes[tmpChildKey] =
				{
					Kind: 'record', Entity: pNode.Entity, EntityConfig: pNode.EntityConfig, Record: pRecord,
					Expanded: false, Loaded: false, FolderKeys: [], Depth: pNode.Depth + 1,
					HasChildren: ((pNode.EntityConfig.Children || []).length > 0) && ((pNode.Depth + 1) < this.explorerConfig.MaxDepth),
				};
				pNode.MemberKeys.push(tmpChildKey);
			});
			pNode.Cursor += tmpRecords.length;
			pNode.HasMore = (tmpRecords.length >= pNode.PageSize);
			return fComplete();
		};

		if (pNode.IsRoot)
		{
			const tmpRootConfig = Object.assign({}, pNode.EntityConfig,
				{
					Filter: pNode.RootFilter || pNode.EntityConfig.Filter,
					Sort: this._effectiveSortField(pNode) || undefined,
					SortDirection: this._effectiveSortDir(pNode),
				});
			return this.dataProvider.resolveList(tmpRootConfig, this._filterExpression(pNode), pNode.Cursor, pNode.PageSize, fReceive);
		}
		// Child folder: overlay the user's filter/sort onto the child entity config so the DataProvider ANDs the
		// substring clause with the relationship FK + base filters, and sorts the page.
		const tmpChildConfig = Object.assign({}, pNode.EntityConfig,
			{
				Filter: [ pNode.EntityConfig.Filter, this._filterExpression(pNode) ].filter((pPart) => (pPart && String(pPart).length > 0)).join('~') || undefined,
				Sort: this._effectiveSortField(pNode) || undefined,
				SortDirection: this._effectiveSortDir(pNode),
			});
		return this.dataProvider.resolveChildren(pNode.ParentEntityConfig, pNode.ParentRecord, pNode.ChildRel, tmpChildConfig, pNode.Cursor, pNode.PageSize, (pError, pRecords, pMeta) =>
		{
			if (pMeta && (typeof pMeta.hasMore === 'boolean')) { pNode._metaHasMore = pMeta.hasMore; }
			fReceive(pError, pRecords);
			if (pNode._metaHasMore !== undefined) { pNode.HasMore = pNode._metaHasMore; delete pNode._metaHasMore; }
		});
	}

	/** Build a record's child folder nodes (one per ChildRel) and pre-fetch the badge counts that opt in. */
	_loadRecordFolders(pKey, pNode, fComplete)
	{
		const tmpChildren = pNode.EntityConfig.Children || [];
		const tmpCountQueue = [];
		tmpChildren.forEach((pChildRel) =>
		{
			const tmpChildEntityConfig = this._entityConfig(pChildRel.Entity);
			const tmpFolderKey = `${pKey}/fld:${pChildRel.Label}`;
			const tmpFolderNode =
			{
				Kind: 'folder', Entity: pChildRel.Entity, EntityConfig: tmpChildEntityConfig, Label: pChildRel.Label,
				ChildRel: pChildRel, ParentRecord: pNode.Record, ParentEntityConfig: pNode.EntityConfig,
				Expanded: false, Loaded: false, Loading: false, Count: null,
				MemberKeys: [], Cursor: 0, HasMore: true, PageSize: pChildRel.PageSize || this.explorerConfig.PageSize, Depth: pNode.Depth + 1,
			};
			this._state().Nodes[tmpFolderKey] = tmpFolderNode;
			pNode.FolderKeys.push(tmpFolderKey);
			if ((pChildRel.Resolve === 'count') || (pChildRel.Resolve === 'eager')) { tmpCountQueue.push({ Key: tmpFolderKey, Node: tmpFolderNode }); }
		});

		if (tmpCountQueue.length < 1) { return fComplete(); }
		let tmpPending = tmpCountQueue.length;
		const fOneDone = () => { tmpPending--; if (tmpPending <= 0) { fComplete(); } };
		tmpCountQueue.forEach((pEntry) =>
		{
			this.dataProvider.resolveChildCount(pNode.EntityConfig, pNode.Record, pEntry.Node.ChildRel, pEntry.Node.EntityConfig, (pError, pCount) =>
			{
				pEntry.Node.Count = pError ? null : pCount;
				fOneDone();
			});
		});
	}

	// --- rendering -----------------------------------------------------------------------------------

	/** Re-render a node's inner (row + empty child container) into its stable wrapper — flips the caret. */
	_renderInner(pKey)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode) { return; }
		const tmpTemplate = (tmpNode.Kind === 'folder') ? 'PDEX-Folder-Inner' : 'PDEX-Record-Inner';
		const tmpDescriptor = (tmpNode.Kind === 'folder') ? this._folderDescriptor(pKey, tmpNode) : this._recordDescriptor(pKey, tmpNode);
		this.pict.ContentAssignment.assignContent(`#${this._domID('PDEX-Node', pKey)}`, this.pict.parseTemplateByHash(tmpTemplate, tmpDescriptor));
		this.pict.CSSMap.injectCSS();
	}

	/** Fill a node's child container: a folder's member records, or a record's child folders. */
	renderChildren(pKey)
	{
		const tmpNode = this._node(pKey);
		if (!tmpNode) { return; }
		const tmpContainer = `#${this._domID('PDEX-Children', pKey)}`;
		if (tmpNode.Kind === 'folder')
		{
			const tmpMembers = tmpNode.MemberKeys.map((pMemberKey) => this._recordDescriptor(pMemberKey, this._node(pMemberKey)));
			const tmpData =
			{
				Members: tmpMembers,
				LoadMoreSlot: tmpNode.HasMore ? [ { ViewHash: this.Hash, NodeKey: pKey } ] : [],
				EmptySlot: (tmpMembers.length < 1) ? [ { EmptyText: `No ${tmpNode.Label}` } ] : [],
			};
			this.pict.ContentAssignment.assignContent(tmpContainer, this.pict.parseTemplateByHash('PDEX-Members', tmpData));
		}
		else
		{
			const tmpFolders = tmpNode.FolderKeys.map((pFolderKey) => this._folderDescriptor(pFolderKey, this._node(pFolderKey)));
			this.pict.ContentAssignment.assignContent(tmpContainer, this.pict.parseTemplateByHash('PDEX-Folders', { Folders: tmpFolders }));
		}
		this.pict.CSSMap.injectCSS();
	}

	// --- descriptors (data → template, no HTML in AppData) -------------------------------------------

	_caretSlots(pHasCaret, pExpanded)
	{
		return {
			ExpandedSlot: (pHasCaret && pExpanded) ? [ {} ] : [],
			CollapsedSlot: (pHasCaret && !pExpanded) ? [ {} ] : [],
			NoCaretSlot: pHasCaret ? [] : [ {} ],
		};
	}

	_folderDescriptor(pKey, pNode)
	{
		const tmpCountText = (pNode.Count != null) ? String(pNode.Count) : '';
		const tmpDescriptor = Object.assign(
			{
				ViewHash: this.Hash, NodeKey: pKey,
				NodeDOMID: this._domID('PDEX-Node', pKey), ChildrenDOMID: this._domID('PDEX-Children', pKey),
				Label: pNode.Label || pNode.Entity,
				CountText: tmpCountText, CountSlot: tmpCountText ? [ { CountText: tmpCountText } ] : [],
				ToolbarSlot: pNode.Expanded ? [ this._toolbarDescriptor(pKey, pNode) ] : [],
			},
			this._caretSlots(true, pNode.Expanded));
		tmpDescriptor.SelfSlot = [ tmpDescriptor ];
		return tmpDescriptor;
	}

	/** The filter-box + sort-selector + column-chooser descriptor for an expanded folder's toolbar. */
	_toolbarDescriptor(pKey, pNode)
	{
		const tmpEntityConfig = pNode.EntityConfig || {};
		const tmpSearchable = Array.isArray(tmpEntityConfig.SearchFields) && (tmpEntityConfig.SearchFields.length > 0);
		const tmpSortColumns = this._sortOptions(tmpEntityConfig);
		const tmpEffectiveSort = this._effectiveSortField(pNode);
		const tmpEffectiveDir = this._effectiveSortDir(pNode);
		const tmpChipColumns = this._chipEligibleColumns(tmpEntityConfig);
		const tmpChosenColumns = this._chosenColumns(pNode.Entity);
		return {
			ViewHash: this.Hash, NodeKey: pKey, Label: pNode.Label || pNode.Entity,
			FilterSlot: tmpSearchable ? [ { ViewHash: this.Hash, NodeKey: pKey, Label: pNode.Label || pNode.Entity, FilterValue: pNode.UserFilter || '' } ] : [],
			SortSlot: (tmpSortColumns.length > 0) ?
				[ {
					ViewHash: this.Hash, NodeKey: pKey,
					Columns: tmpSortColumns.map((pColumn) => ({ Name: pColumn, Label: pColumn, IsSelected: (pColumn === tmpEffectiveSort) })),
					DirAscSlot: (tmpEffectiveDir !== 'DESC') ? [ {} ] : [],
					DirDescSlot: (tmpEffectiveDir === 'DESC') ? [ {} ] : [],
				} ] : [],
			ColumnsSlot: (tmpChipColumns.length > 0) ?
				[ {
					ViewHash: this.Hash, Entity: pNode.Entity,
					Columns: tmpChipColumns.map((pColumn) => ({ ViewHash: this.Hash, Entity: pNode.Entity, Column: pColumn, Checked: (tmpChosenColumns.indexOf(pColumn) >= 0) })),
				} ] : [],
		};
	}

	/** The columns a tier can light up as chips — its Lite columns, minus the opaque ID / GUID keys + the title. */
	_chipEligibleColumns(pEntityConfig)
	{
		const tmpLite = (pEntityConfig && Array.isArray(pEntityConfig.Lite)) ? pEntityConfig.Lite : [];
		const tmpTitle = (pEntityConfig && pEntityConfig.Display && pEntityConfig.Display.Title) || '';
		return tmpLite.filter((pColumn) => !(/^(ID|GUID)/.test(pColumn)) && (pColumn !== tmpTitle));
	}

	/** localStorage key for an entity's chosen chip columns (per-entity, so it persists across visits). */
	_columnStorageKey(pEntity)
	{
		return `PictDataExplorer.Columns.${pEntity}`;
	}

	/** The columns the user has turned on as chips for an entity (localStorage, with an in-memory fallback). */
	_chosenColumns(pEntity)
	{
		try
		{
			if (typeof window !== 'undefined' && window.localStorage)
			{
				const tmpRaw = window.localStorage.getItem(this._columnStorageKey(pEntity));
				const tmpArray = tmpRaw ? JSON.parse(tmpRaw) : [];
				return Array.isArray(tmpArray) ? tmpArray : [];
			}
		}
		catch (pError) { /* fall through to the in-memory copy */ }
		return (this._columnMemory && this._columnMemory[pEntity]) ? this._columnMemory[pEntity].slice() : [];
	}

	_setChosenColumns(pEntity, pColumns)
	{
		if (!this._columnMemory) { this._columnMemory = {}; }
		this._columnMemory[pEntity] = (pColumns || []).slice();   // session fallback when storage is unavailable
		try
		{
			if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem(this._columnStorageKey(pEntity), JSON.stringify(pColumns)); }
		}
		catch (pError) { /* private mode / no storage — chips persist for the session only */ }
	}

	/** Toggle a chip column for an entity (persist) + repaint every loaded tier of that entity. */
	toggleColumn(pEntity, pColumn)
	{
		const tmpChosen = this._chosenColumns(pEntity);
		const tmpIndex = tmpChosen.indexOf(pColumn);
		if (tmpIndex >= 0) { tmpChosen.splice(tmpIndex, 1); }
		else { tmpChosen.push(pColumn); }
		this._setChosenColumns(pEntity, tmpChosen);
		const tmpNodes = this._state().Nodes;
		Object.keys(tmpNodes).forEach((pKey) =>
		{
			const tmpNode = tmpNodes[pKey];
			if (tmpNode && (tmpNode.Kind === 'folder') && (tmpNode.Entity === pEntity) && tmpNode.Expanded && tmpNode.Loaded) { this.renderChildren(pKey); }
		});
	}

	/** The columns offered in a tier's sort dropdown — its Lite columns, minus the opaque ID / GUID keys. */
	_sortOptions(pEntityConfig)
	{
		const tmpLite = (pEntityConfig && Array.isArray(pEntityConfig.Lite)) ? pEntityConfig.Lite : [];
		return tmpLite.filter((pColumn) => !(/^(ID|GUID)/.test(pColumn)));
	}

	/** The effective sort field for a folder: the user's pick, else the configured Sort, else the search key. */
	_effectiveSortField(pNode)
	{
		if (pNode.UserSort !== undefined) { return pNode.UserSort; }
		const tmpEntityConfig = pNode.EntityConfig || {};
		if (pNode.RootSort) { return pNode.RootSort; }
		if (tmpEntityConfig.Sort) { return tmpEntityConfig.Sort; }
		return (Array.isArray(tmpEntityConfig.SearchFields) && tmpEntityConfig.SearchFields[0]) || '';
	}

	_effectiveSortDir(pNode)
	{
		return (pNode.UserSortDirection === 'DESC') ? 'DESC' : 'ASC';
	}

	/** The runtime substring (LK) filter clause for a folder, from its filter-box text (or '' for none). */
	_filterExpression(pNode)
	{
		// Strip the structural `~` from the user's text so it can't break the filter stanza.
		const tmpText = String(pNode.UserFilter || '').replace(/~/g, '').trim();
		const tmpEntityConfig = pNode.EntityConfig || {};
		const tmpFields = Array.isArray(tmpEntityConfig.SearchFields) ? tmpEntityConfig.SearchFields : [];
		if ((tmpText.length < 1) || (tmpFields.length < 1)) { return ''; }
		// One LK clause on the primary search field — an FBV so it ANDs cleanly with relationship / base
		// filters. The `%` wildcards are RAW: the EntityProvider URL-encodes the whole filter when it builds
		// the request, so pre-encoding here would double-encode and the LIKE would match the literal `%25`.
		return `FBV~${tmpFields[0]}~LK~%${tmpText}%`;
	}

	_recordDescriptor(pKey, pNode)
	{
		// Show the preview ⓘ on EVERY record when a card manager is present — it synthesizes a default card
		// for entities that have none registered, so no entry is left without a preview.
		const tmpHasCard = this._cardManagerPresent();
		const tmpChosen = this._chosenColumns(pNode.Entity);
		const tmpChips = tmpChosen
			.filter((pColumn) => pNode.Record && (pNode.Record[pColumn] !== undefined) && (pNode.Record[pColumn] !== null) && (String(pNode.Record[pColumn]) !== ''))
			.map((pColumn) => ({ Column: pColumn, Value: String(pNode.Record[pColumn]) }));
		const tmpDescriptor = Object.assign(
			{
				ViewHash: this.Hash, NodeKey: pKey,
				NodeDOMID: this._domID('PDEX-Node', pKey), ChildrenDOMID: this._domID('PDEX-Children', pKey),
				Title: this._resolveDisplay(pNode.EntityConfig.Display && pNode.EntityConfig.Display.Title, pNode.Record),
				Subtitle: this._resolveDisplay(pNode.EntityConfig.Display && pNode.EntityConfig.Display.Subtitle, pNode.Record),
				CardSlot: tmpHasCard ? [ { ViewHash: this.Hash, NodeKey: pKey } ] : [],
				ChipsSlot: tmpChips,
			},
			this._caretSlots(!!pNode.HasChildren, pNode.Expanded));
		tmpDescriptor.SelfSlot = [ tmpDescriptor ];
		return tmpDescriptor;
	}

	/** Resolve a Display value (a field name OR a `{~…~}` template) against a record into a display string. */
	_resolveDisplay(pValue, pRecord)
	{
		if (!pValue) { return ''; }
		if (String(pValue).indexOf('{~') >= 0)
		{
			try { return this.pict.parseTemplate(pValue, pRecord); }
			catch (pError) { return ''; }
		}
		return (pRecord && (pRecord[pValue] != null)) ? String(pRecord[pValue]) : '';
	}

	_hasCard(pEntityName)
	{
		const tmpManager = this.pict.providers.RecordSetCardManager;
		return !!(tmpManager && (typeof tmpManager.hasCard === 'function') && tmpManager.hasCard(pEntityName));
	}

	/** True when a card manager is available to open ANY record's preview (a registered or a default card). */
	_cardManagerPresent()
	{
		const tmpManager = this.pict.providers.RecordSetCardManager;
		return !!(tmpManager && (typeof tmpManager.openCard === 'function'));
	}
}

module.exports = PictViewDataExplorer;
module.exports.default_configuration = _DEFAULT_CONFIGURATION;
