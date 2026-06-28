/*
	Unit tests for the data explorer view (PictView-DataExplorer) — the recursive expand/load/render state
	machine. The DataProvider is stubbed with synchronous canned responses so we can assert the node tree it
	builds: a root folder's members become record nodes, a record's expand materializes its child folders +
	pre-fetched counts, a child folder's expand loads its members, the card affordance degrades without a
	RecordSetCardManager, and MaxDepth caps the caret. A browser-env DOM backs ContentAssignment.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libPictDataExplorer = require('../source/Pict-DataExplorer.js');

const CONFIG =
{
	Roots: [ { Entity: 'Book' } ],
	Entities:
	{
		Book: { Lite: [ 'Title' ], Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~}' }, Children:
			[ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ] },
		Review: { Lite: [ 'Rating' ], Display: { Title: 'Rating' } },
	},
};

const newExplorer = (pConfig) =>
{
	const tmpPict = new libPict({ LogStreams: [ { loggertype: 'console', streamtype: 'console', level: 'error' } ] });
	const tmpProvider = tmpPict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
	if (typeof document !== 'undefined') { document.body.innerHTML = '<div id="TestExplorer"></div>'; }
	const tmpView = tmpProvider.createExplorer('TestExplorer', pConfig || CONFIG);
	// Stub the resolution layer with synchronous canned responses.
	const tmpDataProvider = tmpPict.providers['Pict-DataExplorer-DataProvider'];
	tmpDataProvider.resolveList = (pEntityConfig, pFilter, pBegin, pCount, fCallback) =>
		fCallback(null, [ { IDBook: 1, Title: 'A', Genre: 'eng' }, { IDBook: 2, Title: 'B', Genre: 'fre' } ]);
	tmpDataProvider.resolveChildCount = (pParentConfig, pParentRecord, pChildRel, pChildConfig, fCallback) => fCallback(null, 5);
	tmpDataProvider.resolveChildren = (pParentConfig, pParentRecord, pChildRel, pChildConfig, pBegin, pCount, fCallback) =>
		fCallback(null, [ { IDReview: 7, Rating: 5 }, { IDReview: 8, Rating: 4 }, { IDReview: 9, Rating: 3 } ], { hasMore: false });
	return { Pict: tmpPict, Provider: tmpProvider, View: tmpView, DataProvider: tmpDataProvider };
};

suite
(
	'Pict-DataExplorer View',
	() =>
	{
		test('renderExplorer creates the configured root folder nodes', () =>
		{
			const tmp = newExplorer();
			tmp.View.renderExplorer();
			const tmpRoot = tmp.View._node('root:Book');
			Expect(tmpRoot).to.be.an('object');
			Expect(tmpRoot.Kind).to.equal('folder');
			Expect(tmpRoot.IsRoot).to.equal(true);
			Expect(tmpRoot.Expanded).to.equal(false);
		});

		test('expanding a root folder loads its members as record nodes', () =>
		{
			const tmp = newExplorer();
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			const tmpRoot = tmp.View._node('root:Book');
			Expect(tmpRoot.Expanded).to.equal(true);
			Expect(tmpRoot.MemberKeys).to.deep.equal([ 'root:Book/rec:1', 'root:Book/rec:2' ]);
			const tmpRecord = tmp.View._node('root:Book/rec:1');
			Expect(tmpRecord.Kind).to.equal('record');
			Expect(tmpRecord.Record.Title).to.equal('A');
			Expect(tmpRecord.HasChildren).to.equal(true);   // Book has a Reviews child within MaxDepth
		});

		test('expanding a record materializes its child folders and pre-fetches the count badge', () =>
		{
			const tmp = newExplorer();
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:1');
			const tmpRecord = tmp.View._node('root:Book/rec:1');
			Expect(tmpRecord.FolderKeys).to.deep.equal([ 'root:Book/rec:1/fld:Reviews' ]);
			const tmpFolder = tmp.View._node('root:Book/rec:1/fld:Reviews');
			Expect(tmpFolder.Kind).to.equal('folder');
			Expect(tmpFolder.Count).to.equal(5);   // Resolve:'count' pre-fetched the badge
		});

		test('expanding a child folder loads its member records', () =>
		{
			const tmp = newExplorer();
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:1');
			tmp.View.toggleNode('root:Book/rec:1/fld:Reviews');
			const tmpFolder = tmp.View._node('root:Book/rec:1/fld:Reviews');
			Expect(tmpFolder.MemberKeys.length).to.equal(3);
			Expect(tmp.View._node('root:Book/rec:1/fld:Reviews/rec:7').Record.Rating).to.equal(5);
		});

		test('the record descriptor degrades (no card slot) when no RecordSetCardManager is present', () =>
		{
			const tmp = newExplorer();
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			const tmpDescriptor = tmp.View._recordDescriptor('root:Book/rec:1', tmp.View._node('root:Book/rec:1'));
			Expect(tmpDescriptor.CardSlot).to.deep.equal([]);
			Expect(tmpDescriptor.Title).to.equal('A');
			Expect(tmpDescriptor.Subtitle).to.equal('eng');   // the {~D:Record.Genre~} display template resolved
		});

		test('the card descriptor lights up when a (faked) RecordSetCardManager has a card', () =>
		{
			const tmp = newExplorer();
			tmp.Pict.providers.RecordSetCardManager = { hasCard: (pEntity) => (pEntity === 'Book'), openCard: () => {} };
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			const tmpDescriptor = tmp.View._recordDescriptor('root:Book/rec:1', tmp.View._node('root:Book/rec:1'));
			Expect(tmpDescriptor.CardSlot.length).to.equal(1);
			Expect(tmpDescriptor.CardSlot[0].NodeKey).to.equal('root:Book/rec:1');
		});

		test('MaxDepth caps the caret — record nodes at the limit report no children', () =>
		{
			const tmpConfig = Object.assign({ MaxDepth: 1 }, CONFIG);
			const tmp = newExplorer(tmpConfig);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			Expect(tmp.View._node('root:Book/rec:1').HasChildren).to.equal(false);   // depth 1 == MaxDepth
		});

		test('an expanded folder gets a filter + sort toolbar; a collapsed one does not', () =>
		{
			const tmp = newExplorer();
			tmp.View.renderExplorer();
			Expect(tmp.View._folderDescriptor('root:Book', tmp.View._node('root:Book')).ToolbarSlot).to.deep.equal([]);
			tmp.View.toggleNode('root:Book');
			const tmpToolbar = tmp.View._folderDescriptor('root:Book', tmp.View._node('root:Book')).ToolbarSlot[0];
			Expect(tmpToolbar, 'toolbar present once expanded').to.be.an('object');
			Expect(tmpToolbar.FilterSlot.length, 'Book has a Title search field').to.equal(1);
			Expect(tmpToolbar.SortSlot.length).to.equal(1);
			const tmpSelected = tmpToolbar.SortSlot[0].Columns.find((pColumn) => pColumn.IsSelected);
			Expect(tmpSelected.Name, 'default-selected to the title/search field').to.equal('Title');
		});

		test('setTierFilter pushes a server-side LK clause on the search field and reloads from page 0', () =>
		{
			const tmp = newExplorer();
			let tmpCapturedFilter = null;
			tmp.DataProvider.resolveList = (pEntityConfig, pFilter, pBegin, pCount, fCallback) =>
			{
				tmpCapturedFilter = pFilter;
				fCallback(null, [ { IDBook: 3, Title: 'Filtered', Genre: 'eng' } ]);
			};
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.setTierFilter('root:Book', 'war');
			Expect(tmp.View._node('root:Book').UserFilter).to.equal('war');
			Expect(tmpCapturedFilter).to.equal('FBV~Title~LK~%war%');   // raw % — the EntityProvider encodes the URL
			Expect(tmp.View._node('root:Book').MemberKeys).to.deep.equal([ 'root:Book/rec:3' ]);
		});

		test('setTierSort + toggleTierSortDir drive the resolved entity Sort / SortDirection', () =>
		{
			const tmp = newExplorer();
			let tmpCapturedConfig = null;
			tmp.DataProvider.resolveList = (pEntityConfig, pFilter, pBegin, pCount, fCallback) =>
			{
				tmpCapturedConfig = pEntityConfig;
				fCallback(null, [ { IDBook: 1, Title: 'A', Genre: 'eng' } ]);
			};
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.setTierSort('root:Book', 'Genre');
			Expect(tmpCapturedConfig.Sort).to.equal('Genre');
			Expect(tmpCapturedConfig.SortDirection).to.equal('ASC');
			tmp.View.toggleTierSortDir('root:Book');
			Expect(tmpCapturedConfig.SortDirection).to.equal('DESC');
			Expect(tmp.View._node('root:Book').UserSort).to.equal('Genre');
		});

		test('_sortOptions drops GUID columns; _effectiveSortField defaults to the derived search field', () =>
		{
			const tmpConfig =
			{
				Roots: [ { Entity: 'Widget' } ],
				Entities: { Widget: { Lite: [ 'Name', 'Code', 'GUIDWidget' ], Display: { Title: 'Name' } } },
			};
			const tmp = newExplorer(tmpConfig);
			tmp.View.renderExplorer();
			const tmpNode = tmp.View._node('root:Widget');
			Expect(tmp.View._sortOptions(tmpNode.EntityConfig)).to.deep.equal([ 'Name', 'Code' ]);
			Expect(tmp.View._effectiveSortField(tmpNode)).to.equal('Name');
		});

		test('toggling a column persists it (localStorage) + lights up a chip on the entity records', () =>
		{
			const tmpConfig =
			{
				Roots: [ { Entity: 'Widget' } ],
				Entities: { Widget: { Lite: [ 'Name', 'Code', 'GUIDWidget' ], Display: { Title: 'Name' } } },
			};
			const tmp = newExplorer(tmpConfig);
			tmp.DataProvider.resolveList = (pE, pF, pB, pC, fCb) => fCb(null, [ { IDWidget: 1, Name: 'W1', Code: 'ABC', GUIDWidget: 'g1' } ]);
			tmp.View._setChosenColumns('Widget', []);   // clean slate (localStorage persists across tests)
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Widget');
			// chip-eligible = Lite minus GUID minus the Title field → just 'Code'
			const tmpToolbar = tmp.View._folderDescriptor('root:Widget', tmp.View._node('root:Widget')).ToolbarSlot[0];
			Expect(tmpToolbar.ColumnsSlot[0].Columns.map((pColumn) => pColumn.Column)).to.deep.equal([ 'Code' ]);
			Expect(tmp.View._recordDescriptor('root:Widget/rec:1', tmp.View._node('root:Widget/rec:1')).ChipsSlot).to.deep.equal([]);
			tmp.View.toggleColumn('Widget', 'Code');
			Expect(tmp.View._chosenColumns('Widget')).to.deep.equal([ 'Code' ]);
			Expect(tmp.View._recordDescriptor('root:Widget/rec:1', tmp.View._node('root:Widget/rec:1')).ChipsSlot).to.deep.equal([ { Column: 'Code', Value: 'ABC' } ]);
			tmp.View._setChosenColumns('Widget', []);   // leave storage clean for re-runs
		});

		test('_filterExpression: one field → a plain FBV LK; many fields → a FOP/FCP OR group', () =>
		{
			const tmp = newExplorer();
			Expect(tmp.View._filterExpression({ UserFilter: 'x', EntityConfig: { SearchFields: [ 'Name' ] } }))
				.to.equal('FBV~Name~LK~%x%');
			Expect(tmp.View._filterExpression({ UserFilter: '350', EntityConfig: { SearchFields: [ 'Name', 'MaterialCode', 'MixID' ] } }))
				.to.equal('FOP~~(~~FBV~Name~LK~%350%~FBVOR~MaterialCode~LK~%350%~FBVOR~MixID~LK~%350%~FCP~~)~');
		});

		test('multi-Lite entities get multi-field SearchFields (name first), single-Lite stays single', () =>
		{
			const tmpConfig =
			{
				Roots: [ { Entity: 'MixDesign' } ],
				Entities: { MixDesign: { Lite: [ 'Name', 'MaterialCode', 'MixID', 'GUIDMixDesign', 'IDCustomer' ], Display: { Title: 'Name' } } },
			};
			const tmp = newExplorer(tmpConfig);
			Expect(tmp.View.explorerConfig.Entities.MixDesign.SearchFields).to.deep.equal([ 'Name', 'MaterialCode', 'MixID' ]);
		});

		test('_recordDescriptor falls back to "Entity #id" (muted) when the title field is empty', () =>
		{
			const tmp = newExplorer();
			const tmpEntityConfig = { Entity: 'PayItem', IDField: 'IDPayItem', Display: { Title: 'Description' }, Lite: [] };
			const tmpBlank = tmp.View._recordDescriptor('k1', { Kind: 'record', Entity: 'PayItem', Record: { IDPayItem: 51090, Description: '' }, EntityConfig: tmpEntityConfig });
			Expect(tmpBlank.Title).to.equal('PayItem #51090');
			Expect(tmpBlank.TitleClass).to.equal('pdex-title-fallback');
			const tmpNamed = tmp.View._recordDescriptor('k2', { Kind: 'record', Entity: 'PayItem', Record: { IDPayItem: 1, Description: 'Water Main' }, EntityConfig: tmpEntityConfig });
			Expect(tmpNamed.Title).to.equal('Water Main');
			Expect(tmpNamed.TitleClass).to.equal('');
		});

		test('schema-aware chooser offers the FULL column set (minus keys/system/title); _effectiveLite adds chosen extras', () =>
		{
			const tmp = newExplorer();
			// A stubbed schema source (JSON-schema shape) standing in for the host's `<Entity>/Schema`.
			tmp.View.SchemaSource = (pEntity, fCB) => fCB(null, { properties: { IDPayItem: {}, GUIDPayItem: {}, CreateDate: {}, Deleted: {}, Description: {}, Name: {}, Units: {}, ItemCode: {} } });
			const tmpConfig = { Entity: 'PayItem', IDField: 'IDPayItem', Display: { Title: 'Description' }, Lite: [ 'Description', 'ItemCode' ] };
			// Before the schema loads the chooser shows only the Lite columns (minus title).
			Expect(tmp.View._chipEligibleColumns(tmpConfig, 'PayItem')).to.deep.equal([ 'ItemCode' ]);
			let tmpLoaded = null;
			tmp.View._ensureSchemaColumns('PayItem', (pDidLoad) => { tmpLoaded = pDidLoad; });
			Expect(tmpLoaded).to.equal(true);
			// After: every schema column except ID*/GUID*, the system/audit columns, and the title (Description).
			Expect(tmp.View._chipEligibleColumns(tmpConfig, 'PayItem')).to.deep.equal([ 'Name', 'Units', 'ItemCode' ]);
			// A chosen non-Lite column is added to the fetch projection.
			tmp.View._setChosenColumns('PayItem', [ 'Name' ]);
			Expect(tmp.View._effectiveLite({ Entity: 'PayItem', EntityConfig: tmpConfig })).to.include.members([ 'Description', 'ItemCode', 'Name' ]);
			tmp.View._setChosenColumns('PayItem', []);
		});

		test('ColumnBlacklist (per-entity + global) removes columns from the chooser', () =>
		{
			const tmp = newExplorer();
			tmp.View._schemaColumnCache = { PayItem: [ 'IDPayItem', 'Description', 'Name', 'Units', 'ItemCode', 'ExtendedJSON' ] };
			const tmpConfig = { Entity: 'PayItem', Display: { Title: 'Description' }, Lite: [], ColumnBlacklist: [ 'ExtendedJSON' ] };
			Expect(tmp.View._chipEligibleColumns(tmpConfig, 'PayItem')).to.deep.equal([ 'Name', 'Units', 'ItemCode' ]);
			tmp.View.explorerConfig.ColumnBlacklist = [ 'Units' ];   // global blacklist stacks on the per-entity one
			Expect(tmp.View._chipEligibleColumns(tmpConfig, 'PayItem')).to.deep.equal([ 'Name', 'ItemCode' ]);
		});

		test('_contextFilter builds ancestor AND-clauses from the node context (missing keys dropped)', () =>
		{
			const tmp = newExplorer();
			Expect(tmp.View._contextFilter({ ChildRel: { Relationship: { ContextKeys: [ 'IDAuthor', 'IDBook' ] } }, Context: { IDAuthor: 7, IDBook: 42 } }))
				.to.equal('FBV~IDAuthor~EQ~7~FBV~IDBook~EQ~42');
			Expect(tmp.View._contextFilter({ ChildRel: { Relationship: { ContextKeys: [ 'IDAuthor' ] } }, Context: {} })).to.equal('');   // missing key dropped
			Expect(tmp.View._contextFilter({ ChildRel: { Relationship: {} }, Context: { IDAuthor: 7 } })).to.equal('');                    // no ContextKeys
		});

		test('contextual relationships: a tier filters by an ANCESTOR id (ContextKeys) and is gated by RequireContext', () =>
		{
			const tmpConfig =
			{
				URLPrefix: '/x/', PageSize: 25, MaxDepth: 8,
				Roots: [ { Label: 'Authors', Entity: 'Author' }, { Label: 'Books', Entity: 'Book' } ],
				Entities:
				{
					Author: { IDField: 'IDAuthor', Lite: [ 'Name' ], Display: { Title: 'Name' }, Children: [ { Label: 'Books', Entity: 'Book', Relationship: { Type: 'Filter', Key: 'IDAuthor' } } ] },
					Book: { IDField: 'IDBook', Lite: [ 'Name' ], Display: { Title: 'Name' }, Children:
						[
							{ Label: 'Signed Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook', ContextKeys: [ 'IDAuthor' ], RequireContext: [ 'IDAuthor' ] } },
							{ Label: 'All Reviews', Entity: 'Review', Relationship: { Type: 'Filter', Key: 'IDBook' } },
						] },
					Review: { IDField: 'IDReview', Lite: [ 'Name' ], Display: { Title: 'Name' } },
				},
			};
			const tmp = newExplorer(tmpConfig);
			const tmpSeen = {};
			tmp.DataProvider.resolveList = (pEntityConfig, pFilter, pBegin, pCount, fCallback) =>
				fCallback(null, (pEntityConfig.Entity === 'Book') ? [ { IDBook: 50, Name: 'Bk' } ] : [ { IDAuthor: 100, Name: 'P' } ]);
			tmp.DataProvider.resolveChildren = (pParentConfig, pParentRecord, pChildRel, pChildConfig, pBegin, pCount, fCallback) =>
			{
				tmpSeen[pChildRel.Label] = pChildConfig.Filter;
				fCallback(null, (pChildRel.Entity === 'Book') ? [ { IDBook: 50, Name: 'Bk' } ] : [ { IDReview: 9, Name: 'T' } ], { hasMore: false });
			};
			tmp.DataProvider.resolveChildCount = (pP, pR, pChildRel, pChildConfig, fCallback) => { tmpSeen[`count:${pChildRel.Label}`] = pChildConfig.Filter; fCallback(null, 1); };
			tmp.View.renderExplorer();

			tmp.View.toggleNode('root:Author');
			tmp.View.toggleNode('root:Author/rec:100');
			tmp.View.toggleNode('root:Author/rec:100/fld:Books');
			tmp.View.toggleNode('root:Author/rec:100/fld:Books/rec:50');
			tmp.View.toggleNode('root:Author/rec:100/fld:Books/rec:50/fld:Signed Reviews');
			Expect(tmpSeen['Signed Reviews']).to.contain('FBV~IDAuthor~EQ~100');         // list scoped to the ancestor Author
			Expect(tmpSeen['count:Signed Reviews']).to.contain('FBV~IDAuthor~EQ~100');   // badge scoped to match

			// Browsed as a root, Book has no Author ancestor → the RequireContext tier is gated out.
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:50');
			const tmpRootBook = tmp.View._node('root:Book/rec:50');
			Expect(tmpRootBook.FolderKeys.some((pKey) => pKey.indexOf('fld:Signed Reviews') >= 0)).to.equal(false);
			Expect(tmpRootBook.FolderKeys.some((pKey) => pKey.indexOf('fld:All Reviews') >= 0)).to.equal(true);
		});
	}
);
