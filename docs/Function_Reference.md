# Function Reference

Every function a developer calls to use Pict-DataExplorer at its fullest capacity, with a code snippet for each. They fall into three groups: the **provider** (your main entry points), the **view** (the live explorer instance), and the **data provider** (the resolution layer, for advanced or standalone use).

The module's exports:

```javascript
const libPictDataExplorer = require('pict-dataexplorer');

libPictDataExplorer;                            // the provider class (default export)
libPictDataExplorer.default_configuration;      // provider default config (pass to addProvider)
libPictDataExplorer.PictViewDataExplorer;       // the tree view class
libPictDataExplorer.DataProvider;               // the resolution provider class
```

---

## Provider

The provider is registered once and is your main API surface.

```javascript
pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
const tmpProvider = pict.providers['Pict-DataExplorer'];
```

### createExplorer(explorerHash, config)

Create (or reconfigure + reuse) an explorer view. Ensures the resolution `DataProvider` exists, normalizes the config, and returns the view. The tree renders into `#<explorerHash>` unless you pass a `DestinationAddress`.

- **`explorerHash`** `string` — a unique id; also the default DOM destination (`#<hash>`).
- **`config`** `object` — the explorer config graph (see the [Implementation Reference](Implementation_Reference.md)).
- **Returns** the explorer view instance.

```javascript
const tmpExplorer = tmpProvider.createExplorer('BookExplorer',
{
    URLPrefix: '/1.0/',
    Roots: [ { Label: 'Books', Entity: 'Book' } ],
    Entities:
    {
        Book: { Lite: [ 'Title' ], Display: { Title: 'Title' },
            Children: [ { Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } } ] },
        Review: { Lite: [ 'Rating' ], Display: { Title: '{~D:Record.Rating~} ★' } }
    }
});
tmpExplorer.renderExplorer();
```

### registerCards(cardMap)

Declare preview-card layouts through the (soft) `RecordSetCardManager`. The key is the entity name. Returns `true` when a card manager was present to register into, `false` (with a warning) otherwise.

- **`cardMap`** `object` — `{ <EntityName>: <cardConfig>, … }`.
- **Returns** `boolean`.

```javascript
// the card manager must be registered first (soft dependency)
const libRecordSetCardManager = require('pict-section-recordset/source/providers/RecordSet-CardManager.js');
pict.addProvider('RecordSetCardManager', libRecordSetCardManager.default_configuration, libRecordSetCardManager);

tmpProvider.registerCards(
{
    Book: { Title: 'Title', Subtitle: '{~D:Record.Genre~}', Fields: [ { Label: 'Year', Value: 'PublicationYear' } ] },
    Review: { Title: '{~D:Record.Rating~} ★', Subtitle: '{~D:Record.Text~}' }
});
```

### normalizeConfig(config)

Fill in the defaults on a config graph (IDField → `ID<Entity>`, per-child `Resolve`/`PageSize`, etc.) without creating a view. Useful for inspecting or pre-processing a config. Returns a normalized copy; the input is not mutated.

```javascript
const tmpNormalized = tmpProvider.normalizeConfig(tmpConfig);
// tmpNormalized.Entities.Book.IDField === 'IDBook'
```

---

## View

`createExplorer` returns the view; you can also reach it via `pict.views['<explorerHash>']`. You will normally only call `renderExplorer()`; the rest are wired to the tree's own inline handlers but are available for programmatic control.

### renderExplorer()

Render the root folder list into the destination. Call once after the destination element exists in the DOM (and again any time you want to reset the tree to its roots).

```javascript
pict.views['BookExplorer'].renderExplorer();
```

### toggleNode(nodeKey)

Expand or collapse a node by its key — loading its children on first expand. This is what the row carets call; you can drive it programmatically to deep-link into the tree.

```javascript
const tmpView = pict.views['BookExplorer'];
tmpView.toggleNode('root:Book');                 // open the Books root
tmpView.toggleNode('root:Book/rec:1042');        // open book 1042 → its child folders
tmpView.toggleNode('root:Book/rec:1042/fld:Reviews');   // open its Reviews folder
```

### loadMore(folderKey)

Fetch and append the next page of a folder's members. This is what the "Load more…" affordance calls.

```javascript
pict.views['BookExplorer'].loadMore('root:Book/rec:1042/fld:Reviews');
```

### openCardForNode(nodeKey, anchorElement)

Open the preview card for a record node, anchored to an element. This is what a record's ⓘ trigger calls; it hands the already-loaded record to `RecordSetCardManager.openCard` (no refetch) and is a no-op when no card manager is present.

```javascript
const tmpAnchor = document.querySelector('#some-element');
pict.views['BookExplorer'].openCardForNode('root:Book/rec:1042', tmpAnchor);
```

---

## DataProvider (resolution layer)

The resolution provider is created automatically by `createExplorer`, but you can use it standalone — for example to power a custom view or to test resolution. Reach it at `pict.providers['Pict-DataExplorer-DataProvider']`. Every method is stateless and takes the resolved entity config it needs. Callbacks mirror `pict.EntityProvider`: list → `(err, records)`, count → `(err, number)`; the child methods add a `meta` arg `(err, records, { hasMore })`.

### resolveList(entityConfig, filterExpression, begin, count, callback)

Fetch one page of an entity's list, Lite-projected when the entity declares `Lite` columns (or via the entity's `Resolver`).

```javascript
const tmpDataProvider = pict.providers['Pict-DataExplorer-DataProvider'];
tmpDataProvider.resolveList(
    { Entity: 'Book', IDField: 'IDBook', Lite: [ 'Title' ] },
    'FBV~Genre~EQ~eng', 0, 25,
    (pError, pRecords) => { /* pRecords is one page of books */ });
```

### resolveCount(entityConfig, filterExpression, callback)

Count the records matching a filter.

```javascript
tmpDataProvider.resolveCount({ Entity: 'Book' }, 'FBV~Genre~EQ~eng',
    (pError, pCount) => { /* pCount is a number */ });
```

### resolveChildren(parentEntityConfig, parentRecord, childRel, childEntityConfig, begin, count, callback)

Resolve a page of a parent record's child collection — dispatching on the relationship (`Filter` / `Join` / `Reference`) or a `Resolver`.

```javascript
tmpDataProvider.resolveChildren(
    { Entity: 'Book', IDField: 'IDBook' },           // parent entity config
    { IDBook: 1042 },                                 // the parent record
    { Entity: 'Author', Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' } },
    { Entity: 'Author', IDField: 'IDAuthor', Lite: [ 'Name' ] },
    0, 25,
    (pError, pRecords, pMeta) => { /* pRecords = the book's authors; pMeta.hasMore */ });
```

### resolveChildCount(parentEntityConfig, parentRecord, childRel, childEntityConfig, callback)

Count a parent record's child collection (the badge number) — join rows for a `Join`, child rows for a `Filter`, 0/1 for a `Reference`, or the `Resolver`'s count.

```javascript
tmpDataProvider.resolveChildCount(
    { Entity: 'Book', IDField: 'IDBook' }, { IDBook: 1042 },
    { Relationship: { Type: 'Filter', Key: 'IDBook' } },
    { Entity: 'Review', IDField: 'IDReview' },
    (pError, pCount) => { /* pCount = number of reviews for book 1042 */ });
```

---

## The Resolver callback

For a complete description of the custom `Resolver` contract (entity-level and relationship-level, the `CountOnly` probe, and the return shape) see [The Resolver Contract](Implementation_Reference.md#the-resolver-contract) in the Implementation Reference. In short:

```javascript
// entity-level (a root / any entity's list)
Resolver: (pOptions) => pOptions.CountOnly
    ? { count: ROWS.length }
    : { records: ROWS.slice(pOptions.begin, pOptions.begin + pOptions.count), hasMore: false };

// relationship-level (a child collection)
Resolver: (pParentRecord, pOptions) => { /* filter CHILDREN by pParentRecord, answer count or page */ };
```
