# Pict-DataExplorer

A config-driven, hierarchical **"folders"** data explorer for the [Pict](https://github.com/stevenvelozo/pict) application framework. Browse a relational dataset as an expandable tree: a list of root records — Projects, Stores, Artists — where expanding a record reveals its child collections ("Users (5)", "Media (10)", "Documents (3)"), each expandable to paginated child records, and each record carrying a preview-card popout. Drive the whole thing from a single config graph of entity endpoints and relationships.

## What It Does

Pict-DataExplorer turns a relational dataset into a navigable folder tree, driven entirely by configuration:

- **Expand records into their related collections** — open a Store to see its Catalog, Employees and Sales; open an Employee to see its User; open a Sale to see its Items, each Item its Book.
- **Three relationship kinds, declaratively** — one-to-many (`Filter`), many-to-many through a join entity (`Join`), and belongs-to single references (`Reference`).
- **Resolve from anywhere** — natively from [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) (paginated, `LiteExtended` column projection, `FilteredTo`, `Count`) through the host's `pict.EntityProvider`, or from a host-supplied custom `Resolver` function (a data lake, a cursor API, or an in-memory dataset — no backend required).
- **Preview-card popouts on every node** — a soft dependency on [pict-section-recordset](https://github.com/fable-retold/pict-section-recordset)'s `RecordSetCardManager`. Present → a clickable ⓘ card on each record; absent → plain text.
- **Lazy by default** — a record's child-folder counts resolve only when that record is expanded, and member records page in on demand, so a tree over hundreds of thousands of rows stays cheap.

## Key Concepts

### The config graph

You describe your data as a map of **Entities** (each with an id field, the columns to fetch, a display template, and a list of child **Relationships**) and a set of **Roots** (the entities the tree opens at the top level). That single object is the entire API surface — see the [Implementation Reference](Implementation_Reference.md).

### Record and folder nodes

The tree alternates two node kinds. A **record node** is one record — it shows its display title (and a card ⓘ) and expands to its child **folders**. A **folder node** is a labeled child collection under a record — it shows a count badge and expands to its member records. They alternate all the way down: record → folders → records → folders.

### The resolution layer

Every list, count and child collection is fetched through the `Pict-DataExplorer-DataProvider`, which reuses `pict.EntityProvider` for meadow reads (Lite-projected, paginated, two-hop joins) and falls through to your `Resolver` when an entity or relationship provides one. The explorer never cares where the data came from.

### Soft preview cards

Cards are never required. When the host has registered `RecordSetCardManager` and declared a card for an entity, the explorer renders a ⓘ trigger that opens the entity's preview card — handing it the already-loaded record so there is no extra fetch. Without a card manager, records render as plain text.

## Quick Example

```javascript
const libPictDataExplorer = require('pict-dataexplorer');

pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);

pict.providers['Pict-DataExplorer'].createExplorer('MyExplorer',
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

pict.views['MyExplorer'].renderExplorer();
```

## Learn More

- **[Quick Start](Quick_Start.md)** — a step-by-step walkthrough from install to a working tree.
- **[Architecture](Architecture.md)** — the node model, the resolution layer, and the rendering strategy, with diagrams.
- **[Implementation Reference](Implementation_Reference.md)** — every config field, relationship type, and CSS hook.
- **[Function Reference](Function_Reference.md)** — code snippets for each function a developer calls.

## Example Applications

- **[Music Explorer](examples/music_explorer/README.md)** — runs live in your browser with **no backend**: Artists → Albums → Tracks resolved entirely from an in-memory dataset via custom `Resolver` functions, with preview cards. The best place to see the explorer in action.
- **Bookstore Explorer** — the full-fidelity demo against the live [retold bookstore harness](https://github.com/fable-retold/retold-harness): Stores / Books / Authors drilling into one-to-many, many-to-many and belongs-to relationships across 10k+ records. It needs the harness on `:8086`, so it ships in `example_applications/bookstore_explorer/` and is run locally with that module's `example_applications/ServeExamples.js` rather than staged onto GitHub Pages.

## Ecosystem

Pict-DataExplorer is part of the [Retold](https://github.com/fable-retold) ecosystem and builds on:

- [pict](https://github.com/stevenvelozo/pict) — the MVC application framework (views, providers, the EntityProvider).
- [pict-section-recordset](https://github.com/fable-retold/pict-section-recordset) — the optional `RecordSetCardManager` that powers the preview-card popouts.
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) — the REST read conventions the default resolver speaks.

## License

MIT
