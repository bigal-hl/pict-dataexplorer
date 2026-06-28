/*
	Unit tests for the two host-facing extensions added for master/detail editors:
	  - RowMeters: an entity's host hook that decorates each record row with a normalized strip of
	    progress bars + status pills (the explorer clamps/normalizes; a throwing hook degrades to none).
	  - OnNodeSelect: opt-in record selection — a record-row click sets a SelectedKey, fires the host
	    hook with the selected node, and flags the descriptor so the row highlights. Folders never select.
	A browser-env DOM backs ContentAssignment; the DataProvider is stubbed with canned responses.
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
		Book: { IDField: 'IDBook', Lite: [ 'Title' ], Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~}' }, Children:
			[ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ] },
		Review: { IDField: 'IDReview', Lite: [ 'Rating' ], Display: { Title: 'Rating' } },
	},
};

const newExplorer = (pConfig) =>
{
	const tmpPict = new libPict({ LogStreams: [ { loggertype: 'console', streamtype: 'console', level: 'error' } ] });
	const tmpProvider = tmpPict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
	if (typeof document !== 'undefined') { document.body.innerHTML = '<div id="TestExplorer"></div>'; }
	const tmpView = tmpProvider.createExplorer('TestExplorer', pConfig || CONFIG);
	const tmpDataProvider = tmpPict.providers['Pict-DataExplorer-DataProvider'];
	tmpDataProvider.resolveList = (pEntityConfig, pFilter, pBegin, pCount, fCallback) =>
		fCallback(null, [ { IDBook: 1, Title: 'A', Genre: 'eng', Done: 3, Total: 4 }, { IDBook: 2, Title: 'B', Genre: 'fre', Done: 1, Total: 4 } ]);
	tmpDataProvider.resolveChildCount = (pP, pR, pCR, pCC, fCallback) => fCallback(null, 5);
	tmpDataProvider.resolveChildren = (pP, pR, pCR, pCC, pB, pC, fCallback) => fCallback(null, [ { IDReview: 7, Rating: 5 } ], { hasMore: false });
	return { Pict: tmpPict, Provider: tmpProvider, View: tmpView, DataProvider: tmpDataProvider };
};

suite
(
	'Pict-DataExplorer RowMeters + Selection',
	() =>
	{
		test('RowMeters: the record descriptor normalizes a host meter strip (bar clamps Percent, pill keeps Text, junk dropped)', () =>
		{
			const tmpConfig =
			{
				Roots: [ { Entity: 'Book' } ],
				Entities:
				{
					Book: { IDField: 'IDBook', Lite: [ 'Title' ], Display: { Title: 'Title' },
						RowMeters: (pRecord) => [ { Kind: 'bar', Percent: 150, Tone: 'ok', Label: `${pRecord.Done}/${pRecord.Total}` }, { Kind: 'pill', Text: 'CD', Tone: 'warn' }, { Kind: 'junk' } ] },
				},
			};
			const tmp = newExplorer(tmpConfig);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			const tmpMeters = tmp.View._recordDescriptor('root:Book/rec:1', tmp.View._node('root:Book/rec:1')).MetersSlot;
			Expect(tmpMeters.length).to.equal(2);   // the unknown 'junk' kind is dropped
			Expect(tmpMeters[0]).to.deep.equal({ Kind: 'bar', Tone: 'ok', Text: '', Label: '3/4', Title: '', Percent: 100 });   // Percent clamped to 100
			Expect(tmpMeters[1]).to.deep.equal({ Kind: 'pill', Tone: 'warn', Text: 'CD', Label: '', Title: '', Percent: 0 });
		});

		test('RowMeters: a throwing hook degrades to no meters; an absent hook → empty slot', () =>
		{
			const tmpThrow = { Roots: [ { Entity: 'Book' } ], Entities: { Book: { IDField: 'IDBook', Lite: [ 'Title' ], Display: { Title: 'Title' }, RowMeters: () => { throw new Error('boom'); } } } };
			const tmp = newExplorer(tmpThrow);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			Expect(tmp.View._recordDescriptor('root:Book/rec:1', tmp.View._node('root:Book/rec:1')).MetersSlot).to.deep.equal([]);
			const tmp2 = newExplorer();   // default CONFIG has no RowMeters
			tmp2.View.renderExplorer();
			tmp2.View.toggleNode('root:Book');
			Expect(tmp2.View._recordDescriptor('root:Book/rec:1', tmp2.View._node('root:Book/rec:1')).MetersSlot).to.deep.equal([]);
		});

		test('OnNodeSelect: a record click selects (SelectedKey + hook + descriptor flag); a folder click does not', () =>
		{
			let tmpSelected = null;
			const tmpConfig = Object.assign({ OnNodeSelect: (pSelection) => { tmpSelected = pSelection; } }, CONFIG);
			const tmp = newExplorer(tmpConfig);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');                  // a folder → must NOT select
			Expect(tmp.View._state().SelectedKey).to.equal(undefined);
			Expect(tmpSelected).to.equal(null);
			tmp.View.toggleNode('root:Book/rec:1');            // a record → selects + fires the hook
			Expect(tmp.View._state().SelectedKey).to.equal('root:Book/rec:1');
			Expect(tmpSelected).to.be.an('object');
			Expect(tmpSelected.Entity).to.equal('Book');
			Expect(tmpSelected.Key).to.equal('root:Book/rec:1');
			Expect(tmpSelected.Record.Title).to.equal('A');
			Expect(tmp.View._recordDescriptor('root:Book/rec:1', tmp.View._node('root:Book/rec:1')).Selected).to.equal(true);
			Expect(tmp.View._recordDescriptor('root:Book/rec:2', tmp.View._node('root:Book/rec:2')).Selected).to.equal(false);
			tmp.View.toggleNode('root:Book/rec:2');            // selection moves to the new record
			Expect(tmp.View._state().SelectedKey).to.equal('root:Book/rec:2');
			Expect(tmpSelected.Key).to.equal('root:Book/rec:2');
		});

		test('without OnNodeSelect, a record click never sets a SelectedKey (selection is opt-in)', () =>
		{
			const tmp = newExplorer();   // default CONFIG, no OnNodeSelect
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:1');
			Expect(tmp.View._state().SelectedKey).to.equal(undefined);
			Expect(tmp.View._recordDescriptor('root:Book/rec:1', tmp.View._node('root:Book/rec:1')).Selected).to.equal(false);
		});
	}
);
