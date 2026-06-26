const libPictProvider = require('pict-provider');

/** @type {Record<string, any>} */
const _DEFAULT_CONFIGURATION =
{
	ProviderIdentifier: 'Pict-DataExplorer-DataProvider',

	AutoInitialize: true,
	AutoInitializeOrdinal: 0,
};

/**
 * Resolves the lists, counts and child collections that the data explorer browses.
 *
 * Stateless w.r.t. the explorer config: every method takes the *resolved* entity config object(s) it
 * needs, so a single provider instance serves any number of explorers. The default implementation talks
 * to meadow-endpoints through the host's `pict.EntityProvider` (paginated + LiteExtended + FilteredTo +
 * Count); a child relationship can instead carry a `Resolver` function to source from anything (a data
 * lake, a cursor API, an in-memory set).
 *
 * Entity config shape (the fields this provider reads):
 *   { Entity, IDField, Lite?:[cols], URLPrefix?, Filter?:'<FoxHound stanza>', Sort?:'<field>' }
 * Child relationship shape:
 *   { Entity, Relationship: {Type:'Filter', Key} | {Type:'Join', JoinEntity, ParentKey, ChildKey},
 *     Filter?, Sort?, Resolver?:fn }
 *
 * Callback contracts mirror EntityProvider: list → `(err, recordsArray)`, count → `(err, number)`. The
 * child methods add a third `meta` arg: `(err, recordsArray, { hasMore })`.
 */
class PictDataExplorerDataProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DEFAULT_CONFIGURATION, pOptions);
		super(pFable, tmpOptions, pServiceHash);
	}

	/** @return {any} the host EntityProvider (resolved lazily so test stubs can replace it). */
	get entityProvider()
	{
		return this.pict.EntityProvider;
	}

	/**
	 * Fetch one page of a list, Lite-projected when the entity declares `Lite` columns.
	 * @param {Record<string, any>} pEntityConfig
	 * @param {string} pFilterExpression - a FoxHound filter stanza (or '' for none).
	 * @param {number} pBegin
	 * @param {number} pCount
	 * @param {(pError?: Error, pRecords?: Array<any>) => void} fCallback
	 */
	resolveList(pEntityConfig, pFilterExpression, pBegin, pCount, fCallback)
	{
		// Entity-level custom source: a host can resolve an entity's list from anything (an in-memory set,
		// a data lake, a cursor API) by giving the entity a `Resolver` fn. Bypasses meadow entirely.
		if (pEntityConfig && (typeof pEntityConfig.Resolver === 'function'))
		{
			return Promise.resolve(pEntityConfig.Resolver({ begin: pBegin, count: pCount, filterExpression: pFilterExpression }))
				.then((pResult) => fCallback(null, (pResult && Array.isArray(pResult.records)) ? pResult.records : []))
				.catch((pError) => fCallback(pError));
		}

		const tmpFilter = [ this._baseFilter(pEntityConfig, pFilterExpression), this._sortClause(pEntityConfig) ]
			.filter((pPart) => (pPart && pPart.length > 0)).join('~');
		const tmpProjection = this._projection(pEntityConfig);
		return this.entityProvider.getEntitySetPage(
			pEntityConfig.Entity, tmpFilter, pBegin, pCount, fCallback,
			'', pEntityConfig.URLPrefix || '', { Projection: tmpProjection });
	}

	/**
	 * Count the records matching a filter (sort is irrelevant to a count, so it is omitted).
	 * @param {Record<string, any>} pEntityConfig
	 * @param {string} pFilterExpression
	 * @param {(pError?: Error, pCount?: number) => void} fCallback
	 */
	resolveCount(pEntityConfig, pFilterExpression, fCallback)
	{
		if (pEntityConfig && (typeof pEntityConfig.Resolver === 'function'))
		{
			return Promise.resolve(pEntityConfig.Resolver({ CountOnly: true, filterExpression: pFilterExpression }))
				.then((pResult) => fCallback(null, this._resultCount(pResult)))
				.catch((pError) => fCallback(pError));
		}
		const tmpFilter = this._baseFilter(pEntityConfig, pFilterExpression);
		return this.entityProvider.getEntitySetRecordCount(pEntityConfig.Entity, tmpFilter, fCallback, '', pEntityConfig.URLPrefix || '');
	}

	/**
	 * Resolve a page of a parent record's child collection (the `Filter` one-hop, the `Join` two-hop, or a
	 * custom `Resolver`).
	 * @param {Record<string, any>} pParentEntityConfig
	 * @param {Record<string, any>} pParentRecord
	 * @param {Record<string, any>} pChildRelationship
	 * @param {Record<string, any>} pChildEntityConfig
	 * @param {number} pBegin
	 * @param {number} pCount
	 * @param {(pError?: Error, pRecords?: Array<any>, pMeta?: {hasMore:boolean}) => void} fCallback
	 */
	resolveChildren(pParentEntityConfig, pParentRecord, pChildRelationship, pChildEntityConfig, pBegin, pCount, fCallback)
	{
		const tmpParentID = pParentRecord[pParentEntityConfig.IDField];

		if (pChildRelationship && (typeof pChildRelationship.Resolver === 'function'))
		{
			return this._resolveCustom(pChildRelationship, pParentRecord, tmpParentID, pBegin, pCount, fCallback);
		}

		const tmpRelationship = (pChildRelationship && pChildRelationship.Relationship) || {};
		const tmpChildListConfig = this._childListConfig(pChildEntityConfig, pChildRelationship);

		if (tmpRelationship.Type === 'Join')
		{
			return this._resolveJoinChildren(tmpRelationship, tmpChildListConfig, pChildEntityConfig, tmpParentID, pBegin, pCount, fCallback);
		}

		if (tmpRelationship.Type === 'Reference')
		{
			// N:1 "belongs to" — the PARENT carries the FK (`Key`) pointing at one child by its id.
			const tmpReferenceID = pParentRecord[tmpRelationship.Key];
			if (this._isEmptyReference(tmpReferenceID)) { return fCallback(null, [], { hasMore: false }); }
			const tmpReferenceFilter = `FBV~${pChildEntityConfig.IDField}~EQ~${this._encode(tmpReferenceID)}`;
			return this.resolveList(tmpChildListConfig, tmpReferenceFilter, pBegin, pCount, (pError, pRecords) =>
			{
				if (pError) { return fCallback(pError); }
				return fCallback(null, pRecords || [], { hasMore: false });
			});
		}

		// Default: one-hop Filter — the child's `Key` FK column EQ the parent's id.
		const tmpFilter = `FBV~${tmpRelationship.Key}~EQ~${this._encode(tmpParentID)}`;
		return this.resolveList(tmpChildListConfig, tmpFilter, pBegin, pCount, (pError, pRecords) =>
		{
			if (pError) { return fCallback(pError); }
			const tmpRecords = pRecords || [];
			return fCallback(null, tmpRecords, { hasMore: (tmpRecords.length >= pCount) });
		});
	}

	/**
	 * Count a parent record's child collection (the badge number) — counts the join rows for a Join, or the
	 * filtered child rows for a Filter. Custom resolvers may answer via `{ count }`.
	 * @param {(pError?: Error, pCount?: number) => void} fCallback
	 */
	resolveChildCount(pParentEntityConfig, pParentRecord, pChildRelationship, pChildEntityConfig, fCallback)
	{
		const tmpParentID = pParentRecord[pParentEntityConfig.IDField];

		if (pChildRelationship && (typeof pChildRelationship.Resolver === 'function'))
		{
			return Promise.resolve(pChildRelationship.Resolver(pParentRecord, { CountOnly: true, ParentID: tmpParentID }))
				.then((pResult) => fCallback(null, this._resultCount(pResult)))
				.catch((pError) => fCallback(pError));
		}

		const tmpRelationship = (pChildRelationship && pChildRelationship.Relationship) || {};

		if (tmpRelationship.Type === 'Join')
		{
			const tmpJoinConfig = { Entity: tmpRelationship.JoinEntity, URLPrefix: pChildEntityConfig.URLPrefix };
			return this.resolveCount(tmpJoinConfig, `FBV~${tmpRelationship.ParentKey}~EQ~${this._encode(tmpParentID)}`, fCallback);
		}

		if (tmpRelationship.Type === 'Reference')
		{
			// N:1 — the badge is simply 0 or 1 (the FK is set or it is not); no query needed.
			return fCallback(null, this._isEmptyReference(pParentRecord[tmpRelationship.Key]) ? 0 : 1);
		}

		const tmpChildListConfig = this._childListConfig(pChildEntityConfig, pChildRelationship);
		return this.resolveCount(tmpChildListConfig, `FBV~${tmpRelationship.Key}~EQ~${this._encode(tmpParentID)}`, fCallback);
	}

	// --- internals -----------------------------------------------------------------------------------

	/**
	 * The Join two-hop: page the join (projecting only the child-key FK) → dedupe child ids in join order
	 * → one batched `INN` child read → reorder children to the join order. Pagination rides the JOIN.
	 */
	_resolveJoinChildren(pRelationship, pChildListConfig, pChildEntityConfig, pParentID, pBegin, pCount, fCallback)
	{
		const tmpJoinConfig = { Entity: pRelationship.JoinEntity, URLPrefix: pChildListConfig.URLPrefix, Lite: [ pRelationship.ChildKey ] };
		const tmpJoinFilter = `FBV~${pRelationship.ParentKey}~EQ~${this._encode(pParentID)}`;
		return this.resolveList(tmpJoinConfig, tmpJoinFilter, pBegin, pCount, (pJoinError, pJoinRows) =>
		{
			if (pJoinError) { return fCallback(pJoinError); }
			const tmpJoinRows = pJoinRows || [];
			const tmpHasMore = (tmpJoinRows.length >= pCount);

			// Collect + dedupe the child ids, preserving join order.
			const tmpIDs = [];
			const tmpSeen = {};
			for (let i = 0; i < tmpJoinRows.length; i++)
			{
				const tmpID = tmpJoinRows[i][pRelationship.ChildKey];
				if ((tmpID === undefined) || (tmpID === null)) { continue; }
				const tmpKey = String(tmpID);
				if (tmpSeen[tmpKey]) { continue; }
				tmpSeen[tmpKey] = true;
				tmpIDs.push(tmpID);
			}
			if (tmpIDs.length < 1) { return fCallback(null, [], { hasMore: tmpHasMore }); }

			// One batched child read by INN (no sort — we reorder to join order ourselves).
			const tmpChildIDField = pChildEntityConfig.IDField;
			const tmpINNConfig = Object.assign({}, pChildListConfig, { Sort: undefined });
			const tmpChildFilter = `FBL~${tmpChildIDField}~INN~${tmpIDs.map((pID) => this._encode(pID)).join(',')}`;
			return this.resolveList(tmpINNConfig, tmpChildFilter, 0, tmpIDs.length, (pChildError, pChildRecords) =>
			{
				if (pChildError) { return fCallback(pChildError); }
				const tmpByID = {};
				(pChildRecords || []).forEach((pRecord) => { tmpByID[String(pRecord[tmpChildIDField])] = pRecord; });
				const tmpOrdered = tmpIDs.map((pID) => tmpByID[String(pID)]).filter(Boolean);
				return fCallback(null, tmpOrdered, { hasMore: tmpHasMore });
			});
		});
	}

	/** A host-supplied resolver: `Resolver(parentRecord, {begin,count,ParentID}) → {records, hasMore, count?}`. */
	_resolveCustom(pChildRelationship, pParentRecord, pParentID, pBegin, pCount, fCallback)
	{
		return Promise.resolve(pChildRelationship.Resolver(pParentRecord, { begin: pBegin, count: pCount, ParentID: pParentID }))
			.then((pResult) =>
			{
				const tmpRecords = (pResult && Array.isArray(pResult.records)) ? pResult.records : [];
				return fCallback(null, tmpRecords, { hasMore: !!(pResult && pResult.hasMore) });
			})
			.catch((pError) => fCallback(pError));
	}

	/** Overlay the child entity config with the relationship's own base Filter/Sort. */
	_childListConfig(pChildEntityConfig, pChildRelationship)
	{
		const tmpFilter = [ pChildEntityConfig.Filter, pChildRelationship && pChildRelationship.Filter ]
			.filter((pPart) => (pPart && String(pPart).length > 0)).join('~');
		return Object.assign({}, pChildEntityConfig,
			{
				Filter: tmpFilter || undefined,
				Sort: (pChildRelationship && pChildRelationship.Sort) || pChildEntityConfig.Sort,
			});
	}

	/** `[ entity.Filter, filterExpression ]` joined with `~` (no sort). */
	_baseFilter(pEntityConfig, pFilterExpression)
	{
		return [ (pEntityConfig && pEntityConfig.Filter) || '', pFilterExpression || '' ]
			.filter((pPart) => (pPart && String(pPart).length > 0)).join('~');
	}

	_sortClause(pEntityConfig)
	{
		if (!pEntityConfig || !pEntityConfig.Sort) { return ''; }
		const tmpDirection = (String(pEntityConfig.SortDirection || 'ASC').toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
		return `FSF~${pEntityConfig.Sort}~${tmpDirection}~0`;
	}

	_projection(pEntityConfig)
	{
		return (pEntityConfig && Array.isArray(pEntityConfig.Lite) && (pEntityConfig.Lite.length > 0))
			? { Mode: 'LiteExtended', ExtraColumns: pEntityConfig.Lite }
			: undefined;
	}

	_resultCount(pResult)
	{
		if (pResult && (typeof pResult.count === 'number')) { return pResult.count; }
		if (pResult && Array.isArray(pResult.records)) { return pResult.records.length; }
		return 0;
	}

	/** A foreign-key reference is "empty" when unset or the 0/'0' sentinel (no related record). */
	_isEmptyReference(pValue)
	{
		return (pValue === undefined) || (pValue === null) || (pValue === 0) || (pValue === '0');
	}

	/** Encode a filter VALUE (structural `~` stays literal). Numeric ids pass through unchanged. */
	_encode(pValue)
	{
		return encodeURIComponent(pValue);
	}
}

module.exports = PictDataExplorerDataProvider;
module.exports.default_configuration = _DEFAULT_CONFIGURATION;
