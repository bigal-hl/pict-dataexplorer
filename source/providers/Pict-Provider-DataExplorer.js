const libPictProvider = require('pict-provider');

const libPictDataExplorerDataProvider = require('./Pict-DataExplorer-DataProvider.js');
const libPictViewDataExplorer = require('../views/PictView-DataExplorer.js');

/** @type {Record<string, any>} */
const _DEFAULT_CONFIGURATION =
{
	ProviderIdentifier: 'Pict-DataExplorer',

	AutoInitialize: true,
	AutoInitializeOrdinal: 0,
};

/**
 * The pict-dataexplorer provider — the primary API surface. Ensures the resolution DataProvider exists,
 * normalizes an explorer config graph, and creates/reconfigures explorer view instances.
 *
 * Preview cards are a SOFT dependency: when the host has registered pict-section-recordset's
 * `RecordSetCardManager`, explored records render a clickable ⓘ card; otherwise they degrade to plain
 * text. `registerCards()` is a convenience passthrough for hosts that want to declare card layouts here.
 */
class PictProviderDataExplorer extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DEFAULT_CONFIGURATION, pOptions);
		super(pFable, tmpOptions, pServiceHash);
	}

	/**
	 * Create (or reconfigure + reuse) an explorer view instance.
	 * @param {string} pExplorerHash - unique hash/id; renders into `#<pExplorerHash>` unless DestinationAddress given.
	 * @param {Record<string, any>} pConfig - the explorer config graph (Entities / Roots / URLPrefix / PageSize / MaxDepth).
	 * @return {any} the explorer view instance.
	 */
	createExplorer(pExplorerHash, pConfig)
	{
		if (!this.pict.providers['Pict-DataExplorer-DataProvider'])
		{
			this.pict.addProvider('Pict-DataExplorer-DataProvider', libPictDataExplorerDataProvider.default_configuration, libPictDataExplorerDataProvider);
		}

		const tmpConfig = this.normalizeConfig(pConfig);
		const tmpDestination = (pConfig && pConfig.DestinationAddress) || `#${pExplorerHash}`;
		const tmpViewConfig = Object.assign({}, libPictViewDataExplorer.default_configuration,
			{
				ViewIdentifier: pExplorerHash,
				ExplorerHash: pExplorerHash,
				ExplorerConfig: tmpConfig,
				DestinationAddress: tmpDestination,
				DefaultDestinationAddress: tmpDestination,
			});

		if (this.pict.views[pExplorerHash])
		{
			Object.assign(this.pict.views[pExplorerHash].options, tmpViewConfig);
			return this.pict.views[pExplorerHash];
		}
		return this.pict.addView(pExplorerHash, tmpViewConfig, libPictViewDataExplorer);
	}

	/**
	 * Fill in the defaults on an explorer config graph so the view + DataProvider can consume it directly.
	 * @param {Record<string, any>} pConfig
	 * @return {Record<string, any>} the normalized config (a copy; the input is not mutated).
	 */
	normalizeConfig(pConfig)
	{
		const tmpConfig = Object.assign({ URLPrefix: '', PageSize: 25, MaxDepth: 6 }, pConfig || {});
		const tmpEntities = {};
		const tmpSourceEntities = tmpConfig.Entities || {};
		for (const tmpName of Object.keys(tmpSourceEntities))
		{
			const tmpEntity = Object.assign({}, tmpSourceEntities[tmpName]);
			tmpEntity.Entity = tmpEntity.Entity || tmpName;
			tmpEntity.IDField = tmpEntity.IDField || `ID${tmpEntity.Entity}`;
			tmpEntity.GUIDField = tmpEntity.GUIDField || `GUID${tmpEntity.Entity}`;
			tmpEntity.Lite = Array.isArray(tmpEntity.Lite) ? tmpEntity.Lite : [];
			tmpEntity.URLPrefix = tmpEntity.URLPrefix || tmpConfig.URLPrefix || '';
			tmpEntity.Display = tmpEntity.Display || { Title: tmpEntity.IDField };
			tmpEntity.Children = (Array.isArray(tmpEntity.Children) ? tmpEntity.Children : []).map((pChild) =>
				Object.assign({}, pChild,
					{
						Label: pChild.Label || pChild.Entity,
						Resolve: pChild.Resolve || 'lazy',
						PageSize: pChild.PageSize || tmpConfig.PageSize,
					}));
			tmpEntities[tmpName] = tmpEntity;
		}
		tmpConfig.Entities = tmpEntities;
		tmpConfig.Roots = (Array.isArray(tmpConfig.Roots) ? tmpConfig.Roots : []).map((pRoot) =>
			Object.assign({}, pRoot, { Label: pRoot.Label || pRoot.Entity }));
		return tmpConfig;
	}

	/**
	 * Convenience passthrough: register preview-card layouts with the (soft-dependency) RecordSetCardManager.
	 * @param {Record<string, any>} pCardMap - `{ <EntityName>: <cardConfig>, ... }`.
	 * @return {boolean} true when a card manager was present to register into.
	 */
	registerCards(pCardMap)
	{
		const tmpManager = this.pict.providers.RecordSetCardManager;
		if (!tmpManager || (typeof tmpManager.registerCard !== 'function'))
		{
			this.log.warn('Pict-DataExplorer: registerCards() called but no RecordSetCardManager is registered — explored records will degrade to plain text.');
			return false;
		}
		const tmpMap = pCardMap || {};
		for (const tmpKey of Object.keys(tmpMap))
		{
			tmpManager.registerCard(tmpKey, tmpMap[tmpKey]);
		}
		return true;
	}
}

module.exports = PictProviderDataExplorer;
module.exports.default_configuration = _DEFAULT_CONFIGURATION;
