const libPictApplication = require('pict-application');

// The module under test — required by relative path so edits to source/ land in the build.
const libPictDataExplorer = require('../../../source/Pict-DataExplorer.js');

// Preview cards are a SOFT dependency on pict-section-recordset (just the card manager).
const libRecordSetCardManager = require('pict-section-recordset/source/providers/RecordSet-CardManager.js');

// --- An entirely in-memory dataset — NO backend. This is what makes the example stageable onto GitHub
//     Pages: every list/count resolves through a host-supplied `Resolver` instead of meadow-endpoints. ---
const ARTISTS =
[
	{ IDArtist: 1, Name: 'Aurora Bloom', Genre: 'Indie Pop' },
	{ IDArtist: 2, Name: 'The Velvet Echoes', Genre: 'Jazz' },
	{ IDArtist: 3, Name: 'Nova Skyline', Genre: 'Electronic' },
];
const ALBUMS =
[
	{ IDAlbum: 1, IDArtist: 1, Title: 'Golden Hour', Year: 2021 },
	{ IDAlbum: 2, IDArtist: 1, Title: 'Paper Moons', Year: 2023 },
	{ IDAlbum: 3, IDArtist: 2, Title: 'Midnight Brass', Year: 2019 },
	{ IDAlbum: 4, IDArtist: 2, Title: 'Slow Train Home', Year: 2022 },
	{ IDAlbum: 5, IDArtist: 3, Title: 'Neon Drift', Year: 2020 },
	{ IDAlbum: 6, IDArtist: 3, Title: 'Signal Lost', Year: 2024 },
];
const TRACKS =
[
	{ IDTrack: 1, IDAlbum: 1, TrackNumber: 1, Title: 'Sunrise Avenue', Duration: '3:42' },
	{ IDTrack: 2, IDAlbum: 1, TrackNumber: 2, Title: 'Honeyglass', Duration: '4:05' },
	{ IDTrack: 3, IDAlbum: 1, TrackNumber: 3, Title: 'Linen Skies', Duration: '3:18' },
	{ IDTrack: 4, IDAlbum: 2, TrackNumber: 1, Title: 'Paper Moons', Duration: '3:55' },
	{ IDTrack: 5, IDAlbum: 2, TrackNumber: 2, Title: 'Tin Lantern', Duration: '2:47' },
	{ IDTrack: 6, IDAlbum: 3, TrackNumber: 1, Title: 'Brass at Midnight', Duration: '5:21' },
	{ IDTrack: 7, IDAlbum: 3, TrackNumber: 2, Title: 'Smoke & Velvet', Duration: '4:38' },
	{ IDTrack: 8, IDAlbum: 4, TrackNumber: 1, Title: 'Slow Train Home', Duration: '6:02' },
	{ IDTrack: 9, IDAlbum: 4, TrackNumber: 2, Title: 'Last Platform', Duration: '4:11' },
	{ IDTrack: 10, IDAlbum: 5, TrackNumber: 1, Title: 'Neon Drift', Duration: '3:30' },
	{ IDTrack: 11, IDAlbum: 5, TrackNumber: 2, Title: 'Coastline 88', Duration: '4:44' },
	{ IDTrack: 12, IDAlbum: 6, TrackNumber: 1, Title: 'Signal Lost', Duration: '3:59' },
	{ IDTrack: 13, IDAlbum: 6, TrackNumber: 2, Title: 'Static Bloom', Duration: '5:08' },
];

/**
 * A static resolver over an in-memory array — the shape the data explorer expects from any custom source.
 * Answers the count probe (`CountOnly`) and the paged list (`begin`/`count`) from the same filtered rows.
 */
const fStaticResolve = (pRows, pFilterFunction, pOptions) =>
{
	const tmpRows = pFilterFunction ? pRows.filter(pFilterFunction) : pRows;
	if (pOptions && pOptions.CountOnly) { return { count: tmpRows.length }; }
	const tmpBegin = (pOptions && pOptions.begin) || 0;
	const tmpCount = (pOptions && pOptions.count) || tmpRows.length;
	return { records: tmpRows.slice(tmpBegin, tmpBegin + tmpCount), hasMore: (tmpBegin + tmpCount) < tmpRows.length };
};

const _ExplorerConfig =
{
	PageSize: 50,
	MaxDepth: 8,
	Roots: [ { Label: 'Artists', Entity: 'Artist' } ],
	Entities:
	{
		Artist:
		{
			IDField: 'IDArtist',
			Display: { Title: 'Name', Subtitle: 'Genre' },
			// Entity-level Resolver → the ROOT list resolves from memory, no meadow.
			Resolver: (pOptions) => fStaticResolve(ARTISTS, null, pOptions),
			Children:
			[
				{ Label: 'Albums', Entity: 'Album', Resolve: 'count',
					Resolver: (pArtist, pOptions) => fStaticResolve(ALBUMS, (pRow) => (pRow.IDArtist === pArtist.IDArtist), pOptions) },
			],
		},
		Album:
		{
			IDField: 'IDAlbum',
			Display: { Title: 'Title', Subtitle: 'Year' },
			Children:
			[
				{ Label: 'Tracks', Entity: 'Track', Resolve: 'count',
					Resolver: (pAlbum, pOptions) => fStaticResolve(TRACKS, (pRow) => (pRow.IDAlbum === pAlbum.IDAlbum), pOptions) },
			],
		},
		Track:
		{
			IDField: 'IDTrack',
			Display: { Title: '{~D:Record.TrackNumber~}. {~D:Record.Title~}', Subtitle: 'Duration' },
		},
	},
};

const _Cards =
{
	Artist: { Title: 'Name', Subtitle: '{~D:Record.Genre~}' },
	Album: { Title: 'Title', Subtitle: '{~D:Record.Year~}', Fields: [ { Label: 'Album ID', Value: 'IDAlbum' } ] },
	Track: { Title: 'Title', Subtitle: '{~D:Record.Duration~}', Fields: [ { Label: 'Track #', Value: 'TrackNumber' } ] },
};

class MusicExplorerApplication extends libPictApplication
{
	onAfterInitializeAsync(fCallback)
	{
		this.pict.addProvider('RecordSetCardManager', libRecordSetCardManager.default_configuration, libRecordSetCardManager);
		this.pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
		const tmpExplorerProvider = this.pict.providers['Pict-DataExplorer'];
		tmpExplorerProvider.registerCards(_Cards);
		tmpExplorerProvider.createExplorer('MusicExplorer', Object.assign({ DestinationAddress: '#MusicExplorer' }, _ExplorerConfig));
		this.pict.views['MusicExplorer'].renderExplorer();
		return super.onAfterInitializeAsync(fCallback);
	}
}

MusicExplorerApplication.default_configuration = { Name: 'Music Explorer', Hash: 'MusicExplorer' };

module.exports = MusicExplorerApplication;
module.exports.default_configuration = MusicExplorerApplication.default_configuration;
