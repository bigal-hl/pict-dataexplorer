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
			Template: /*html*/`<div class="pdex-row pdex-row-folder" onclick="_Pict.views['{~D:Record.ViewHash~}'].toggleNode('{~D:Record.NodeKey~}')">{~TS:PDEX-Caret-Down:Record.ExpandedSlot~}{~TS:PDEX-Caret-Right:Record.CollapsedSlot~}{~TS:PDEX-Caret-None:Record.NoCaretSlot~}<span class="pdex-folder-ic">{~I:Folder~}</span><span class="pdex-label">{~D:Record.Label~}</span>{~TS:PDEX-Count:Record.CountSlot~}</div><div class="pdex-children" id="{~D:Record.ChildrenDOMID~}"></div>`,
		},
		{
			// A record node WRAPPER.
			Hash: 'PDEX-Record-Node',
			Template: /*html*/`<div class="pdex-node pdex-record" id="{~D:Record.NodeDOMID~}">{~TS:PDEX-Record-Inner:Record.SelfSlot~}</div>`,
		},
		{
			Hash: 'PDEX-Record-Inner',
			Template: /*html*/`<div class="pdex-row pdex-row-record" onclick="_Pict.views['{~D:Record.ViewHash~}'].toggleNode('{~D:Record.NodeKey~}')">{~TS:PDEX-Caret-Down:Record.ExpandedSlot~}{~TS:PDEX-Caret-Right:Record.CollapsedSlot~}{~TS:PDEX-Caret-None:Record.NoCaretSlot~}<span class="pdex-title">{~D:Record.Title~}</span>{~TS:PDEX-Card-Trigger:Record.CardSlot~}<span class="pdex-subtitle">{~D:Record.Subtitle~}</span></div><div class="pdex-children" id="{~D:Record.ChildrenDOMID~}"></div>`,
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

	openCardForNode(pKey, pAnchorElement)
	{
		const tmpNode = this._node(pKey);
		const tmpManager = this.pict.providers.RecordSetCardManager;
		if (!tmpNode || !tmpManager || (typeof tmpManager.openCard !== 'function')) { return; }
		tmpManager.openCard(tmpNode.Entity, tmpNode.Record, pAnchorElement);
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
			const tmpRootConfig = Object.assign({}, pNode.EntityConfig, { Filter: pNode.RootFilter || pNode.EntityConfig.Filter, Sort: pNode.RootSort || pNode.EntityConfig.Sort });
			return this.dataProvider.resolveList(tmpRootConfig, '', pNode.Cursor, pNode.PageSize, fReceive);
		}
		return this.dataProvider.resolveChildren(pNode.ParentEntityConfig, pNode.ParentRecord, pNode.ChildRel, pNode.EntityConfig, pNode.Cursor, pNode.PageSize, (pError, pRecords, pMeta) =>
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
			},
			this._caretSlots(true, pNode.Expanded));
		tmpDescriptor.SelfSlot = [ tmpDescriptor ];
		return tmpDescriptor;
	}

	_recordDescriptor(pKey, pNode)
	{
		const tmpHasCard = this._hasCard(pNode.Entity);
		const tmpDescriptor = Object.assign(
			{
				ViewHash: this.Hash, NodeKey: pKey,
				NodeDOMID: this._domID('PDEX-Node', pKey), ChildrenDOMID: this._domID('PDEX-Children', pKey),
				Title: this._resolveDisplay(pNode.EntityConfig.Display && pNode.EntityConfig.Display.Title, pNode.Record),
				Subtitle: this._resolveDisplay(pNode.EntityConfig.Display && pNode.EntityConfig.Display.Subtitle, pNode.Record),
				CardSlot: tmpHasCard ? [ { ViewHash: this.Hash, NodeKey: pKey } ] : [],
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
}

module.exports = PictViewDataExplorer;
module.exports.default_configuration = _DEFAULT_CONFIGURATION;
