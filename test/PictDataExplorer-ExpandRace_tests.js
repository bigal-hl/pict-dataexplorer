/*
	Regression test for the first-expand render race: when a folder's members load fast (e.g. an in-memory
	Resolver) but the column-chooser's schema fetch for a real entity lands LATER, the schema-arrival repaint
	(_renderInner, which resets the child container) used to blank the freshly-rendered members — they only
	reappeared on a collapse + re-expand. The fix re-renders the loaded members after the toolbar repaint.
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
		Book: { IDField: 'IDBook', Lite: [ 'Title' ], Display: { Title: 'Title' } },
	},
};

suite
(
	'Pict-DataExplorer first-expand schema race',
	() =>
	{
		test('a schema-columns repaint that lands AFTER the members does not blank the children', () =>
		{
			const tmpPict = new libPict({ LogStreams: [ { loggertype: 'console', streamtype: 'console', level: 'error' } ] });
			const tmpProvider = tmpPict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
			document.body.innerHTML = '<div id="TestExplorer"></div>';
			const tmpView = tmpProvider.createExplorer('TestExplorer', CONFIG);
			// Members resolve synchronously (stands in for a fast / in-memory source).
			tmpPict.providers['Pict-DataExplorer-DataProvider'].resolveList = (pE, pF, pB, pC, fCb) =>
				fCb(null, [ { IDBook: 1, Title: 'A' }, { IDBook: 2, Title: 'B' } ]);
			// The schema fetch is SLOW: capture its callback and fire it later, after the members are in the DOM.
			let tmpSchemaCallback = null;
			tmpView.SchemaSource = (pEntity, fCB) => { tmpSchemaCallback = fCB; };

			tmpView.renderExplorer();
			tmpView.toggleNode('root:Book');
			const tmpBefore = document.querySelectorAll('.pdex-row-record').length;
			Expect(tmpBefore, 'members render on first expand').to.equal(2);

			// The slow schema fetch lands now — the toolbar repaints; the members must survive.
			Expect(tmpSchemaCallback, 'schema fetch was kicked off').to.be.a('function');
			tmpSchemaCallback(null, { properties: { Title: {}, Author: {} } });
			Expect(document.querySelectorAll('.pdex-row-record').length, 'children survive the post-load schema repaint').to.equal(tmpBefore);
		});
	}
);
