# Implementation Reference

The entire explorer is driven by one config object passed to `createExplorer(hash, config)`. This page documents every field, the three relationship types, the `Resolver` contract, the preview-card shape, and the CSS hooks.

## Top-Level Config

```javascript
{
    URLPrefix: '/1.0/',   // default meadow URL prefix; '' uses the EntityProvider default
    PageSize: 25,         // default member page size
    MaxDepth: 6,          // hard recursion guard (a record→folder step counts as 1)
    Roots: [ /* Root */ ],
    Entities: { /* <Name>: Entity */ }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `URLPrefix` | string | `''` | URL prefix for meadow reads. `''` falls through to `pict.EntityProvider`'s configured prefix. Per-entity override allowed. |
| `PageSize` | number | `25` | Default page size for member lists; overridable per root and per relationship. |
| `MaxDepth` | number | `6` | The tree stops offering a caret past this depth, bounding circular graphs. |
| `Roots` | Root[] | `[]` | The entities the tree opens at the top level. |
| `Entities` | object | `{}` | Map of entity name → Entity config. |

## Root

```javascript
{ Label: 'Books', Entity: 'Book', Filter: 'FBV~Deleted~EQ~0', Sort: 'Title' }
```

| Field | Type | Required | Description |
|---|---|---|---|
| `Label` | string | no | The folder label (defaults to `Entity`). |
| `Entity` | string | yes | The entity name (must exist in `Entities`). |
| `Filter` | string | no | A base FoxHound filter stanza AND-ed into the root list read. |
| `Sort` | string | no | A field to sort the root list by. |
| `PageSize` | number | no | Overrides the global page size for this root. |

## Entity

```javascript
Book:
{
    Entity: 'Book',                 // defaults to the map key
    IDField: 'IDBook',              // defaults to ID<Entity>
    GUIDField: 'GUIDBook',          // defaults to GUID<Entity>
    Lite: [ 'Title', 'Genre' ],     // LiteExtended columns (ids/audit auto-included)
    Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~}' },
    Sort: 'Title',                  // optional default sort
    Filter: 'FBV~Deleted~EQ~0',     // optional base filter stanza
    URLPrefix: '/1.0/',             // optional per-entity source override
    Resolver: undefined,            // optional custom source (bypasses meadow)
    Children: [ /* ChildRel */ ]
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `Entity` | string | map key | The meadow entity (the REST endpoint base). |
| `IDField` | string | `ID<Entity>` | The record's primary-key column. |
| `GUIDField` | string | `GUID<Entity>` | The record's GUID column (for card action routes). |
| `Lite` | string[] | `[]` | Extra columns to fetch via `LiteExtended`. Give it at least the columns your `Display` and card reference; ids/GUID/audit are always included. Empty ⇒ full records are fetched. |
| `Display` | object | `{Title: IDField}` | `{ Title, Subtitle? }` — each a field name or a `{~…~}` template resolved against the record. |
| `Sort` | string | — | Default sort field for this entity's lists. |
| `Filter` | string | — | Base FoxHound stanza AND-ed into every read of this entity. |
| `URLPrefix` | string | global | Per-entity source prefix (e.g. a data-lake route). |
| `Resolver` | function | — | A custom source for this entity's lists/counts (see [The Resolver Contract](#the-resolver-contract)). When present, meadow is bypassed. |
| `Children` | ChildRel[] | `[]` | The child collections shown when a record of this entity is expanded. |

## ChildRel (a child collection)

```javascript
{
    Label: 'Reviews',
    Entity: 'Review',
    Resolve: 'count',                              // 'count' | 'lazy' | 'eager'
    PageSize: 25,
    Filter: 'FBV~Deleted~EQ~0',
    Sort: 'CreateDate',
    Relationship: { Type: 'Filter', Key: 'IDBook' }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `Label` | string | `Entity` | The folder label shown under the parent record. |
| `Entity` | string | — | The child entity name (must exist in `Entities`). |
| `Relationship` | object | — | How to resolve the children — see [Relationship Types](#relationship-types). |
| `Resolve` | string | `'lazy'` | When to resolve the count badge: `'count'` pre-fetches the badge when the parent expands; `'eager'` also pre-fetches the first page; `'lazy'` fetches nothing until the folder itself is expanded. |
| `PageSize` | number | global | Member page size for this folder. |
| `Filter` | string | — | Extra base stanza AND-ed into the child reads. |
| `Sort` | string | — | Sort field for the child list. |
| `Resolver` | function | — | A custom source for this relationship (bypasses meadow + the `Relationship`). |

## Relationship Types

### `Filter` — one-to-many (child holds the FK)

The child entity has a foreign-key column pointing back at the parent.

```javascript
{ Type: 'Filter', Key: 'IDBook' }   // Review.IDBook EQ <book id>
```

### `Join` — many-to-many (through a join entity)

A join entity carries both foreign keys. The explorer pages the join (projecting only the child key), dedupes the ids, batches one `INN` read of the children, and reorders them to join order. Pagination rides the join, and the count badge counts join rows.

```javascript
{ Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' }
```

| Field | Description |
|---|---|
| `JoinEntity` | The join table entity. |
| `ParentKey` | The join column holding the parent id (filtered to the parent). |
| `ChildKey` | The join column holding the child id (projected + batched). |

### `Reference` — belongs-to (parent holds the FK)

The *parent* record carries a foreign key pointing at one child. Resolves the single referenced row; the badge is 0 or 1.

```javascript
{ Type: 'Reference', Key: 'IDUser' }   // child User where IDUser EQ parent.IDUser
```

## The Resolver Contract

A `Resolver` makes an entity or relationship source from anything — an in-memory set, a data lake, a cursor API. It is called for both the count probe and the paged list, and may return a value or a Promise.

**Entity-level** (a root or any entity's own list):

```javascript
Resolver: (pOptions) =>
{
    // pOptions = { begin, count, filterExpression } OR { CountOnly: true, filterExpression }
    if (pOptions.CountOnly) { return { count: ROWS.length }; }
    return { records: ROWS.slice(pOptions.begin, pOptions.begin + pOptions.count), hasMore: false };
}
```

**Relationship-level** (a child collection):

```javascript
Resolver: (pParentRecord, pOptions) =>
{
    // pOptions = { begin, count, ParentID } OR { CountOnly: true, ParentID }
    const tmpRows = CHILDREN.filter((pRow) => pRow.IDParent === pParentRecord.IDParent);
    if (pOptions.CountOnly) { return { count: tmpRows.length }; }
    return { records: tmpRows.slice(pOptions.begin, pOptions.begin + pOptions.count), hasMore: false };
}
```

Return shape: `{ records: Array, hasMore?: boolean, count?: number }`.

## Preview Cards

Cards are declared with `registerCards(map)` and rendered by [pict-section-recordset](https://github.com/fable-retold/pict-section-recordset)'s `RecordSetCardManager` (a soft dependency). The card key is the entity name; the shape:

```javascript
{
    Title: 'Title',                              // field name or {~…~} template
    Subtitle: '{~D:Record.Genre~}',              // optional
    Fields: [ { Label: 'Year', Value: 'PublicationYear' } ],   // labeled values (field or template)
    Actions: [ { Label: 'View', Icon: 'Eye', Route: '#/Book/{~D:Record.GUIDBook~}' } ]   // optional
}
```

Make sure the card's fields are in the entity's `Lite` list (or omit `Lite` to fetch full records) — the explorer hands the loaded record straight to the card, so a field that was not fetched renders blank.

## CSS Hooks

The view ships its own CSS (auto-registered through the Pict CSS cascade). It themes off `--theme-color-*` custom properties with hard-coded fallbacks, so a host that defines those tokens gets brand-matched chrome for free.

| Class | Element |
|---|---|
| `.pdex` | the tree root |
| `.pdex-node` | a node wrapper (record or folder) |
| `.pdex-row` / `.pdex-row-folder` / `.pdex-row-record` | the clickable row |
| `.pdex-caret` | the expand/collapse chevron |
| `.pdex-folder-ic` | the folder icon |
| `.pdex-label` | a folder label |
| `.pdex-count` | a folder count badge |
| `.pdex-title` / `.pdex-subtitle` | a record's display |
| `.pdex-children` | the indented child container |
| `.pdex-loadmore` | the "Load more…" affordance |
| `.psrs-card-trigger` | the ⓘ preview-card trigger (shared with pict-section-recordset for visual parity) |

Theme tokens read (with fallbacks): `--theme-color-text-primary`, `--theme-color-text-muted`, `--theme-color-brand-primary`, `--theme-color-background-panel`, `--theme-color-background-tertiary`, `--theme-color-border-default`, `--theme-color-border-light`.

## Node State (advanced)

Per-explorer node state lives at `pict.AppData.PictDataExplorer.<ExplorerHash>.Nodes[<nodeKey>]`. Node keys are stable paths (`root:Book/rec:1042/fld:Reviews/rec:88`). Each node holds `Kind` (`'record'` / `'folder'`), `Entity`, `Record` (the lite row), `Expanded` / `Loaded` flags, `Count`, `MemberKeys` / `FolderKeys`, `Cursor`, `HasMore`, and `Depth`. AppData holds data only — the rendered HTML lives transiently in the DOM.
