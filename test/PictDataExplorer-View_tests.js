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
	}
);
