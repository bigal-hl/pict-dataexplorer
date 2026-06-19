# Quick Start

This walkthrough takes you from an empty page to a working, drillable data explorer. Each step is small and builds on the last.

## Step 1: Prerequisites

- Node.js 16+ and a [Pict](https://github.com/stevenvelozo/pict) application (or a plain `pict` instance).
- A data source. The default resolver speaks [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) through `pict.EntityProvider`, but you can supply your own `Resolver` for any source — see [Step 7](#step-7-resolve-from-anything-no-backend).

## Step 2: Install

```bash
npm install pict-dataexplorer
```

## Step 3: Register the provider

Register the provider on your Pict instance (typically in your application's `onAfterInitializeAsync`):

```javascript
const libPictDataExplorer = require('pict-dataexplorer');

this.pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
```

This also registers the resolution layer (`Pict-DataExplorer-DataProvider`) the first time you create an explorer.

## Step 4: Describe your data

The whole explorer is one config object: the **Entities** you can browse and the **Roots** the tree opens at. Each entity declares its id field, the columns to fetch (`Lite`), a `Display` template, and a list of child **Relationships**:

```javascript
const tmpConfig =
{
    URLPrefix: '/1.0/',
    PageSize: 25,
    Roots: [ { Label: 'Books', Entity: 'Book' } ],
    Entities:
    {
        Book:
        {
            Lite: [ 'Title', 'Genre', 'PublicationYear' ],
            Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~}' },
            Children:
            [
                { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } }
            ]
        },
        Review: { Lite: [ 'Rating', 'Text' ], Display: { Title: '{~D:Record.Rating~} ★', Subtitle: '{~D:Record.Text~}' } }
    }
};
```

`Display.Title` / `Display.Subtitle` are either a field name (`'Title'`) or a `{~…~}` pict template resolved against the record.

## Step 5: Create and render the explorer

`createExplorer(hash, config)` builds a view that renders into `#<hash>` (or a `DestinationAddress` you pass). Call `renderExplorer()` once the destination element exists in the DOM:

```javascript
this.pict.providers['Pict-DataExplorer'].createExplorer('BookExplorer', tmpConfig);
this.pict.views['BookExplorer'].renderExplorer();
```

```html
<div id="BookExplorer"></div>
```

You now have a tree: **Books** opens to a paginated list of book records; each book shows a **Reviews (N)** folder that expands to its reviews.

## Step 6: Add preview cards (optional)

Preview cards are a soft dependency on [pict-section-recordset](https://github.com/fable-retold/pict-section-recordset). Register its `RecordSetCardManager` and declare a card per entity; the explorer then renders a clickable ⓘ on each record:

```javascript
const libRecordSetCardManager = require('pict-section-recordset/source/providers/RecordSet-CardManager.js');
this.pict.addProvider('RecordSetCardManager', libRecordSetCardManager.default_configuration, libRecordSetCardManager);

this.pict.providers['Pict-DataExplorer'].registerCards(
{
    Book: { Title: 'Title', Subtitle: '{~D:Record.Genre~}', Fields: [ { Label: 'Year', Value: 'PublicationYear' } ] },
    Review: { Title: '{~D:Record.Rating~} ★', Subtitle: '{~D:Record.Text~}' }
});
```

Skip this entirely and records simply render as plain text — nothing breaks.

## Step 7: Resolve from anything (no backend)

Any entity or relationship can carry a `Resolver` function instead of hitting meadow. This is how you explore an in-memory set, a data lake, or a cursor API. A resolver answers the count probe (`CountOnly`) and the paged list from the same data:

```javascript
const fResolve = (pRows, pFilter, pOptions) =>
{
    const tmpRows = pFilter ? pRows.filter(pFilter) : pRows;
    if (pOptions.CountOnly) { return { count: tmpRows.length }; }
    return { records: tmpRows.slice(pOptions.begin, pOptions.begin + pOptions.count), hasMore: false };
};

const tmpStaticConfig =
{
    Roots: [ { Label: 'Artists', Entity: 'Artist' } ],
    Entities:
    {
        Artist:
        {
            IDField: 'IDArtist', Display: { Title: 'Name' },
            Resolver: (pOptions) => fResolve(ARTISTS, null, pOptions),
            Children:
            [
                { Label: 'Albums', Entity: 'Album', Resolve: 'count',
                    Resolver: (pArtist, pOptions) => fResolve(ALBUMS, (pRow) => pRow.IDArtist === pArtist.IDArtist, pOptions) }
            ]
        },
        Album: { IDField: 'IDAlbum', Display: { Title: 'Title' } }
    }
};
```

## Step 8: Complete working example

```javascript
const libPictApplication = require('pict-application');
const libPictDataExplorer = require('pict-dataexplorer');

class MyExplorerApplication extends libPictApplication
{
    onAfterInitializeAsync(fCallback)
    {
        this.pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);

        this.pict.providers['Pict-DataExplorer'].createExplorer('BookExplorer',
        {
            URLPrefix: '/1.0/',
            Roots: [ { Label: 'Books', Entity: 'Book' } ],
            Entities:
            {
                Book:
                {
                    Lite: [ 'Title', 'Genre' ],
                    Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~}' },
                    Children: [ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ]
                },
                Review: { Lite: [ 'Rating', 'Text' ], Display: { Title: '{~D:Record.Rating~} ★' } }
            }
        });
        this.pict.views['BookExplorer'].renderExplorer();

        return super.onAfterInitializeAsync(fCallback);
    }
}
```

## Next Steps

- [Architecture](Architecture.md) — how the tree, node model, and resolution layer fit together.
- [Implementation Reference](Implementation_Reference.md) — every config field and relationship type.
- [Function Reference](Function_Reference.md) — the functions you call, with snippets.
- [Music Explorer example](examples/music_explorer/README.md) — a complete no-backend app you can run.
