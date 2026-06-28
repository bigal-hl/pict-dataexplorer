// The container for all the pict-dataexplorer related code.
//
// pict-dataexplorer is a config-driven, hierarchical ("folders") data explorer: browse a relational
// dataset as an expandable tree of records and their child collections — expand a record to see its
// 5 Users, 10 Media, 3 Documents — each expandable, each record carrying a preview-card popout. Lists
// resolve from meadow-endpoints (Lite / paginated / filtered / two-hop join) or a host-supplied
// custom resolver. Preview cards are a soft dependency on pict-section-recordset's RecordSetCardManager.

// The provider (primary API surface — registers the view + the resolution DataProvider, and exposes
// createExplorer() / registerCards()).
const PictProviderDataExplorer = require('./providers/Pict-Provider-DataExplorer.js');

// The resolution layer (meadow list/count/lite/join, or a custom Resolver).
const PictDataExplorerDataProvider = require('./providers/Pict-DataExplorer-DataProvider.js');

// The folders view (the expandable record/folder tree).
const PictViewDataExplorer = require('./views/PictView-DataExplorer.js');

module.exports = PictProviderDataExplorer;

module.exports.PictProviderDataExplorer = PictProviderDataExplorer;
module.exports.PictDataExplorerDataProvider = PictDataExplorerDataProvider;
module.exports.DataProvider = PictDataExplorerDataProvider;
module.exports.PictViewDataExplorer = PictViewDataExplorer;

module.exports.default_configuration = PictProviderDataExplorer.default_configuration;
