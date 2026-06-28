/*
	Unit tests for the AutoExpandSoleChild convenience: when the option is set and a just-expanded node has
	exactly ONE child collection (folder), the explorer expands that folder too, so a node whose only child is
	e.g. "Materials" does not force a second click. When the node has 0 or 2+ child folders, nothing auto-expands.
	The cascade is naturally one level here — the sole child's members are records (no further child folders), so
	it stops. The DataProvider is stubbed with synchronous canned responses (as in the View tests).
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libPictDataExplorer = require('../source/Pict-DataExplorer.js');

// Book has exactly ONE child collection (Reviews).
const CONFIG_SOLE =
{
	AutoExpandSoleChild: true,
	Roots: [ { Entity: 'Book' } ],
	Entities:
	{
		Book: { Lite: [ 'Title' ], Display: { Title: 'Title' }, Children:
			[ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ] },
		Review: { Lite: [ 'Rating' ], Display: { Title: 'Rating' } },
	},
};

// Same flag, but Book has TWO child collections (Reviews + Chapters).
const CONFIG_MULTI =
{
	AutoExpandSoleChild: true,
	Roots: [ { Entity: 'Book' } ],
	Entities:
	{
		Book: { Lite: [ 'Title' ], Display: { Title: 'Title' }, Children:
			[ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } },
				{ Label: 'Chapters', Entity: 'Chapter', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ] },
		Review: { Lite: [ 'Rating' ], Display: { Title: 'Rating' } },
		Chapter: { Lite: [ 'Name' ], Display: { Title: 'Name' } },
	},
};

// One child collection, but the option is OFF.
const CONFIG_SOLE_OFF =
{
	AutoExpandSoleChild: false,
	Roots: [ { Entity: 'Book' } ],
	Entities:
	{
		Book: { Lite: [ 'Title' ], Display: { Title: 'Title' }, Children:
			[ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ] },
		Review: { Lite: [ 'Rating' ], Display: { Title: 'Rating' } },
	},
};

const newExplorer = (pConfig) =>
{
	const tmpPict = new libPict({ LogStreams: [ { loggertype: 'console', streamtype: 'console', level: 'error' } ] });
	const tmpProvider = tmpPict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
	if (typeof document !== 'undefined') { document.body.innerHTML = '<div id="TestExplorer"></div>'; }
	const tmpView = tmpProvider.createExplorer('TestExplorer', pConfig);
	const tmpDataProvider = tmpPict.providers['Pict-DataExplorer-DataProvider'];
	tmpDataProvider.resolveList = (pEntityConfig, pFilter, pBegin, pCount, fCallback) =>
		fCallback(null, [ { IDBook: 1, Title: 'A' }, { IDBook: 2, Title: 'B' } ]);
	tmpDataProvider.resolveChildCount = (pParentConfig, pParentRecord, pChildRel, pChildConfig, fCallback) => fCallback(null, 5);
	tmpDataProvider.resolveChildren = (pParentConfig, pParentRecord, pChildRel, pChildConfig, pBegin, pCount, fCallback) =>
		fCallback(null, [ { IDReview: 7, Rating: 5 }, { IDReview: 8, Rating: 4 }, { IDReview: 9, Rating: 3 } ], { hasMore: false });
	return { Pict: tmpPict, Provider: tmpProvider, View: tmpView, DataProvider: tmpDataProvider };
};

suite
(
	'Pict-DataExplorer AutoExpandSoleChild',
	() =>
	{
		test('a node with exactly one child collection auto-expands it (no second click)', () =>
		{
			const tmp = newExplorer(CONFIG_SOLE);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:1');   // expands the record → its only child folder should open too
			const tmpFolder = tmp.View._node('root:Book/rec:1/fld:Reviews');
			Expect(tmpFolder.Expanded, 'the sole child folder auto-expands').to.equal(true);
			Expect(tmpFolder.MemberKeys.length, 'its members loaded without a manual toggle').to.equal(3);
		});

		test('a node with two child collections does NOT auto-expand either', () =>
		{
			const tmp = newExplorer(CONFIG_MULTI);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:1');
			Expect(tmp.View._node('root:Book/rec:1/fld:Reviews').Expanded, 'Reviews stays collapsed').to.equal(false);
			Expect(tmp.View._node('root:Book/rec:1/fld:Chapters').Expanded, 'Chapters stays collapsed').to.equal(false);
		});

		test('the sole child does NOT auto-expand when the option is off', () =>
		{
			const tmp = newExplorer(CONFIG_SOLE_OFF);
			tmp.View.renderExplorer();
			tmp.View.toggleNode('root:Book');
			tmp.View.toggleNode('root:Book/rec:1');
			Expect(tmp.View._node('root:Book/rec:1/fld:Reviews').Expanded, 'no auto-expand without the flag').to.equal(false);
		});
	}
);
