# Pict-DataExplorer

> **[Read the Pict-DataExplorer Documentation](https://fable-retold.github.io/pict-dataexplorer/)**

[pict-dataexplorer on npm](https://www.npmjs.com/package/pict-dataexplorer) | [MIT License](LICENSE)

A config-driven, hierarchical **"folders"** data explorer for the [Pict](https://github.com/stevenvelozo/pict) application framework. Browse a relational dataset as an expandable tree: a list of root records where expanding a record reveals its child collections — *"Users (5)", "Media (10)", "Documents (3)"* — each expandable to paginated child records, and each record carrying a preview-card popout. Drive the whole thing from a single config graph of entity endpoints and relationships.

## Features

- **Hierarchical folder tree** — expand a record to see its related collections, drill each collection to its records, recursively.
- **Three relationship kinds, declaratively** — one-to-many (`Filter`), many-to-many through a join entity (`Join`), and belongs-to single references (`Reference`).
- **Resolve from anywhere** — natively from [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) (paginated, `LiteExtended` column projection, `FilteredTo`, `Count`) via `pict.EntityProvider`, or from a host-supplied custom `Resolver` for any source — including an in-memory dataset with no backend at all.
- **Soft preview cards** — an opt-in dependency on [pict-section-recordset](https://github.com/fable-retold/pict-section-recordset)'s `RecordSetCardManager`; present → a clickable ⓘ card on each record, absent → plain text.
- **Lazy by default** — child counts resolve only when a record is expanded, and members page in on demand, so a tree over hundreds of thousands of rows stays cheap.

## Installation

```bash
npm install pict-dataexplorer
```

## Quick Start

```javascript
const libPictDataExplorer = require('pict-dataexplorer');

// register the provider on your Pict instance
pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);

// create an explorer that renders into #BookExplorer
pict.providers['Pict-DataExplorer'].createExplorer('BookExplorer',
{
    URLPrefix: '/1.0/',
    Roots: [ { Label: 'Books', Entity: 'Book' } ],
    Entities:
    {
        Book:
        {
            Lite: [ 'Title', 'Genre' ],
            Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~}' },
            Children:
            [
                { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } },
                { Label: 'Authors', Entity: 'Author', Resolve: 'count',
                    Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' } }
            ]
        },
        Review: { Lite: [ 'Rating', 'Text' ], Display: { Title: '{~D:Record.Rating~} ★', Subtitle: '{~D:Record.Text~}' } },
        Author: { Lite: [ 'Name' ], Display: { Title: 'Name' } }
    }
});

pict.views['BookExplorer'].renderExplorer();
```

```html
<div id="BookExplorer"></div>
```

## No backend? Resolve from memory

Any entity or relationship can carry a `Resolver` function, so the same tree can explore an in-memory dataset, a data lake, or a cursor API with no REST endpoints at all:

```javascript
Artist:
{
    IDField: 'IDArtist', Display: { Title: 'Name' },
    Resolver: (pOptions) => pOptions.CountOnly
        ? { count: ARTISTS.length }
        : { records: ARTISTS.slice(pOptions.begin, pOptions.begin + pOptions.count), hasMore: false },
    Children: [ { Label: 'Albums', Entity: 'Album', Resolve: 'count',
        Resolver: (pArtist, pOptions) => resolveAlbumsFor(pArtist, pOptions) } ]
}
```

## Documentation

Full documentation lives at **[fable-retold.github.io/pict-dataexplorer](https://fable-retold.github.io/pict-dataexplorer/)** and in the [docs](./docs) folder:

- [Overview](./docs/README.md) — what it does and the key concepts
- [Quick Start](./docs/Quick_Start.md) — step-by-step from install to a working tree
- [Architecture](./docs/Architecture.md) — the node model, resolution layer, and rendering strategy (with diagrams)
- [Implementation Reference](./docs/Implementation_Reference.md) — every config field, relationship type, and CSS hook
- [Function Reference](./docs/Function_Reference.md) — code snippets for each function you call

## Examples

- **[Music Explorer](./example_applications/music_explorer)** — runs with no backend (in-memory via custom Resolvers); the live demo on the docs site.
- **[Bookstore Explorer](./example_applications/bookstore_explorer)** — full-fidelity against the [retold bookstore harness](https://github.com/fable-retold/retold-harness); run locally with `example_applications/ServeExamples.js`.

## Related Packages

- [pict](https://github.com/stevenvelozo/pict) — the MVC application framework.
- [pict-section-recordset](https://github.com/fable-retold/pict-section-recordset) — the optional preview-card manager.
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) — the REST read conventions the default resolver speaks.

## License

MIT
