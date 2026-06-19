/*
	Unit tests for the data explorer's resolution layer (Pict-DataExplorer-DataProvider).

	No network: the host `pict.EntityProvider.getEntitySetPage` / `getEntitySetRecordCount` are stubbed to
	(a) record exactly how they were called — entity, filter stanza, pagination, url prefix, Lite projection
	— and (b) return canned records. The tests pin the URL/filter contracts for the one-hop Filter, the
	two-hop Join (project the child key → dedupe → INN batch → reorder), counts, Lite projection, and the
	custom Resolver hook.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libDataExplorerDataProvider = require('../source/providers/Pict-DataExplorer-DataProvider.js');

/** A quiet Pict with a recording stub over the two EntityProvider read helpers. */
const newStubbedProvider = (pPageResponderByCallIndex, pCountResponse) =>
{
	const tmpPict = new libPict({ LogStreams: [ { loggertype: 'console', streamtype: 'console', level: 'error' } ] });
	const tmpProvider = tmpPict.addProvider('Pict-DataExplorer-DataProvider', {}, libDataExplorerDataProvider);
	const tmpCalls = { page: [], count: [] };

	tmpPict.EntityProvider.getEntitySetPage = function (pEntity, pFilter, pBegin, pCount, fCallback, pPostfix, pURLPrefix, pOptions)
	{
		tmpCalls.page.push({ Entity: pEntity, Filter: pFilter, Begin: pBegin, Count: pCount, URLPrefix: pURLPrefix, Options: pOptions });
		const tmpResponder = Array.isArray(pPageResponderByCallIndex) ? pPageResponderByCallIndex[tmpCalls.page.length - 1] : pPageResponderByCallIndex;
		const tmpRecords = (typeof tmpResponder === 'function') ? tmpResponder() : (tmpResponder || []);
		return fCallback(null, tmpRecords);
	};
	tmpPict.EntityProvider.getEntitySetRecordCount = function (pEntity, pFilter, fCallback, pPostfix, pURLPrefix)
	{
		tmpCalls.count.push({ Entity: pEntity, Filter: pFilter, URLPrefix: pURLPrefix });
		return fCallback(null, (typeof pCountResponse === 'number') ? pCountResponse : 0);
	};

	return { Pict: tmpPict, Provider: tmpProvider, Calls: tmpCalls };
};

const BOOK = { Entity: 'Book', IDField: 'IDBook', Lite: [ 'Title', 'Genre' ], Sort: 'Title' };
const REVIEW = { Entity: 'Review', IDField: 'IDReview', Lite: [ 'Rating', 'Text', 'IDBook' ] };
const AUTHOR = { Entity: 'Author', IDField: 'IDAuthor', Lite: [ 'Name' ] };

suite
(
	'Pict-DataExplorer DataProvider',
	() =>
	{
		test('resolveList composes the base filter + the explicit filter + the sort, and a LiteExtended projection', () =>
		{
			const tmp = newStubbedProvider([ [ { IDBook: 1 } ] ]);
			tmp.Provider.resolveList(Object.assign({ Filter: 'FBV~Deleted~EQ~0' }, BOOK), 'FBV~Genre~EQ~eng', 0, 25, () => {});
			const tmpCall = tmp.Calls.page[0];
			Expect(tmpCall.Entity).to.equal('Book');
			Expect(tmpCall.Filter).to.equal('FBV~Deleted~EQ~0~FBV~Genre~EQ~eng~FSF~Title~ASC~0');
			Expect(tmpCall.Begin).to.equal(0);
			Expect(tmpCall.Count).to.equal(25);
			Expect(tmpCall.Options.Projection).to.deep.equal({ Mode: 'LiteExtended', ExtraColumns: [ 'Title', 'Genre' ] });
		});

		test('resolveList without Lite columns sends no projection (full records)', () =>
		{
			const tmp = newStubbedProvider([ [] ]);
			tmp.Provider.resolveList({ Entity: 'Book', IDField: 'IDBook' }, '', 0, 10, () => {});
			Expect(tmp.Calls.page[0].Options.Projection).to.equal(undefined);
			Expect(tmp.Calls.page[0].Filter).to.equal('');
		});

		test('resolveCount filters but never sorts', () =>
		{
			const tmp = newStubbedProvider(null, 42);
			let tmpReturned = null;
			tmp.Provider.resolveCount(BOOK, 'FBV~Genre~EQ~eng', (pError, pCount) => { tmpReturned = pCount; });
			Expect(tmp.Calls.count[0].Entity).to.equal('Book');
			Expect(tmp.Calls.count[0].Filter).to.equal('FBV~Genre~EQ~eng');   // no FSF
			Expect(tmpReturned).to.equal(42);
		});

		test('resolveChildren Filter (1:N) reads the child filtered to the parent id', () =>
		{
			const tmp = newStubbedProvider([ [ { IDReview: 7 }, { IDReview: 8 } ] ]);
			const tmpRel = { Entity: 'Review', Relationship: { Type: 'Filter', Key: 'IDBook' } };
			let tmpMeta = null;
			let tmpRecords = null;
			tmp.Provider.resolveChildren(BOOK, { IDBook: 1042 }, tmpRel, REVIEW, 0, 25, (pError, pRecords, pMeta) => { tmpRecords = pRecords; tmpMeta = pMeta; });
			Expect(tmp.Calls.page[0].Entity).to.equal('Review');
			Expect(tmp.Calls.page[0].Filter).to.equal('FBV~IDBook~EQ~1042');
			Expect(tmp.Calls.page[0].Options.Projection.ExtraColumns).to.deep.equal([ 'Rating', 'Text', 'IDBook' ]);
			Expect(tmpRecords.length).to.equal(2);
			Expect(tmpMeta.hasMore).to.equal(false);
		});

		test('resolveChildren Join (M:N) pages the join projecting only the child key, then INN-reads + reorders the children', () =>
		{
			// Join page returns three rows (one duplicate id) → deduped to [55, 12] in join order.
			const tmpJoinRows = [ { IDAuthor: 55 }, { IDAuthor: 12 }, { IDAuthor: 55 } ];
			// The INN child read returns them OUT of order → the provider must reorder to join order.
			const tmpChildRows = [ { IDAuthor: 12, Name: 'B' }, { IDAuthor: 55, Name: 'A' } ];
			const tmp = newStubbedProvider([ tmpJoinRows, tmpChildRows ]);
			const tmpRel = { Entity: 'Author', Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' } };
			let tmpRecords = null;
			tmp.Provider.resolveChildren(BOOK, { IDBook: 1042 }, tmpRel, AUTHOR, 0, 25, (pError, pRecords) => { tmpRecords = pRecords; });

			// 1) the join page — projected to just the child key, filtered to the parent.
			Expect(tmp.Calls.page[0].Entity).to.equal('BookAuthorJoin');
			Expect(tmp.Calls.page[0].Filter).to.equal('FBV~IDBook~EQ~1042');
			Expect(tmp.Calls.page[0].Options.Projection.ExtraColumns).to.deep.equal([ 'IDAuthor' ]);
			// 2) the batched child read — deduped INN of [55,12], capped to the id count.
			Expect(tmp.Calls.page[1].Entity).to.equal('Author');
			Expect(tmp.Calls.page[1].Filter).to.equal('FBL~IDAuthor~INN~55,12');
			Expect(tmp.Calls.page[1].Count).to.equal(2);
			// reordered to join order [55, 12]:
			Expect(tmpRecords.map((pRecord) => pRecord.IDAuthor)).to.deep.equal([ 55, 12 ]);
		});

		test('resolveChildren Join with no links short-circuits (no child read)', () =>
		{
			const tmp = newStubbedProvider([ [] ]);
			const tmpRel = { Entity: 'Author', Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' } };
			let tmpRecords = null;
			tmp.Provider.resolveChildren(BOOK, { IDBook: 1042 }, tmpRel, AUTHOR, 0, 25, (pError, pRecords) => { tmpRecords = pRecords; });
			Expect(tmp.Calls.page.length).to.equal(1);   // only the join page, no INN read
			Expect(tmpRecords).to.deep.equal([]);
		});

		test('resolveChildCount Join counts the JOIN rows; Filter counts the child rows', () =>
		{
			const tmpJoin = newStubbedProvider(null, 9);
			tmpJoin.Provider.resolveChildCount(BOOK, { IDBook: 1042 },
				{ Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' } }, AUTHOR, () => {});
			Expect(tmpJoin.Calls.count[0].Entity).to.equal('BookAuthorJoin');
			Expect(tmpJoin.Calls.count[0].Filter).to.equal('FBV~IDBook~EQ~1042');

			const tmpFilter = newStubbedProvider(null, 3);
			tmpFilter.Provider.resolveChildCount(BOOK, { IDBook: 1042 }, { Relationship: { Type: 'Filter', Key: 'IDBook' } }, REVIEW, () => {});
			Expect(tmpFilter.Calls.count[0].Entity).to.equal('Review');
			Expect(tmpFilter.Calls.count[0].Filter).to.equal('FBV~IDBook~EQ~1042');
		});

		test('resolveChildren Reference (N:1) reads the one child the parent FK points at; the count is 0/1', () =>
		{
			const tmp = newStubbedProvider([ [ { IDUser: 99, FullName: 'Z' } ] ]);
			const tmpRel = { Entity: 'User', Relationship: { Type: 'Reference', Key: 'IDUser' } };
			let tmpRecords = null;
			// Employee 7 → its User (employee carries IDUser=99).
			tmp.Provider.resolveChildren({ Entity: 'BookStoreEmployee', IDField: 'IDBookStoreEmployee' }, { IDBookStoreEmployee: 7, IDUser: 99 }, tmpRel, { Entity: 'User', IDField: 'IDUser' }, 0, 25, (pError, pRecords) => { tmpRecords = pRecords; });
			Expect(tmp.Calls.page[0].Entity).to.equal('User');
			Expect(tmp.Calls.page[0].Filter).to.equal('FBV~IDUser~EQ~99');   // filter the CHILD by its own id
			Expect(tmpRecords.length).to.equal(1);

			// An unset reference (0) short-circuits with no read, count 0.
			const tmpEmpty = newStubbedProvider([]);
			let tmpCount = -1;
			tmpEmpty.Provider.resolveChildren({ Entity: 'BookStoreEmployee', IDField: 'IDBookStoreEmployee' }, { IDBookStoreEmployee: 7, IDUser: 0 }, tmpRel, { Entity: 'User', IDField: 'IDUser' }, 0, 25, () => {});
			Expect(tmpEmpty.Calls.page.length).to.equal(0);
			tmpEmpty.Provider.resolveChildCount({ Entity: 'BookStoreEmployee', IDField: 'IDBookStoreEmployee' }, { IDUser: 0 }, tmpRel, { Entity: 'User', IDField: 'IDUser' }, (pError, pCount) => { tmpCount = pCount; });
			Expect(tmpCount).to.equal(0);
		});

		test('a custom Resolver bypasses meadow entirely', (fDone) =>
		{
			const tmp = newStubbedProvider([]);
			const tmpRel =
			{
				Entity: 'Document',
				Resolver: (pParentRecord, pOptions) => Promise.resolve({ records: [ { ID: 1 }, { ID: 2 } ], hasMore: true, count: 17 }),
			};
			tmp.Provider.resolveChildren(BOOK, { IDBook: 1042 }, tmpRel, { Entity: 'Document', IDField: 'IDDocument' }, 0, 25, (pError, pRecords, pMeta) =>
			{
				Expect(tmp.Calls.page.length).to.equal(0);   // never touched EntityProvider
				Expect(pRecords.length).to.equal(2);
				Expect(pMeta.hasMore).to.equal(true);
				fDone();
			});
		});

		test('an entity-level Resolver makes resolveList / resolveCount bypass meadow (no-backend sources)', (fDone) =>
		{
			const tmp = newStubbedProvider([]);
			const tmpEntity =
			{
				Entity: 'Planet', IDField: 'IDPlanet',
				Resolver: (pOptions) => Promise.resolve(pOptions.CountOnly ? { count: 8 } : { records: [ { IDPlanet: 1 }, { IDPlanet: 2 } ] }),
			};
			let tmpCount = null;
			tmp.Provider.resolveCount(tmpEntity, '', (pError, pCount) => { tmpCount = pCount; });
			tmp.Provider.resolveList(tmpEntity, '', 0, 25, (pError, pRecords) =>
			{
				Expect(tmp.Calls.page.length).to.equal(0);    // never touched EntityProvider
				Expect(tmp.Calls.count.length).to.equal(0);
				Expect(pRecords.length).to.equal(2);
				Expect(tmpCount).to.equal(8);
				fDone();
			});
		});
	}
);
