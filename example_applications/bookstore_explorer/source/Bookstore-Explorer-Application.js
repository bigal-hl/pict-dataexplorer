const libPictApplication = require('pict-application');

// The module under test — required by relative path so edits to source/ land in the build.
const libPictDataExplorer = require('../../../source/Pict-DataExplorer.js');

// Preview cards are a SOFT dependency on pict-section-recordset — we register just its card manager (and
// declare a few cards) so explored records get the ⓘ popout. Omit these and the explorer degrades to text.
const libRecordSetCardManager = require('pict-section-recordset/source/providers/RecordSet-CardManager.js');

// The explorer config graph: roots Book / Author / BookStore and how each entity's children resolve.
const _ExplorerConfig =
{
	URLPrefix: '/1.0/',
	PageSize: 25,
	MaxDepth: 8,
	Roots:
	[
		{ Label: 'Stores', Entity: 'BookStore' },
		{ Label: 'Books', Entity: 'Book' },
		{ Label: 'Authors', Entity: 'Author' },
	],
	Entities:
	{
		Book:
		{
			Lite: [ 'Title', 'Genre', 'ISBN', 'PublicationYear', 'Language' ],
			Display: { Title: 'Title', Subtitle: '{~D:Record.Genre~} · {~D:Record.PublicationYear~}' },
			Children:
			[
				{ Label: 'Authors', Entity: 'Author', Resolve: 'count', Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDBook', ChildKey: 'IDAuthor' } },
				{ Label: 'Reviews', Entity: 'Review', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBook' } },
				{ Label: 'Prices', Entity: 'BookPrice', Resolve: 'lazy', Relationship: { Type: 'Filter', Key: 'IDBook' } },
				{ Label: 'Carried by stores', Entity: 'BookStore', Resolve: 'count', Relationship: { Type: 'Join', JoinEntity: 'BookStoreCatalogJoin', ParentKey: 'IDBook', ChildKey: 'IDBookStore' } },
			],
		},
		Author:
		{
			Lite: [ 'Name' ],
			Display: { Title: 'Name' },
			Children:
			[
				{ Label: 'Books', Entity: 'Book', Resolve: 'count', Relationship: { Type: 'Join', JoinEntity: 'BookAuthorJoin', ParentKey: 'IDAuthor', ChildKey: 'IDBook' } },
			],
		},
		BookStore:
		{
			Lite: [ 'Name', 'City', 'State', 'StoreType' ],
			Display: { Title: 'Name', Subtitle: '{~D:Record.City~}, {~D:Record.State~}' },
			Children:
			[
				{ Label: 'Catalog', Entity: 'Book', Resolve: 'count', Relationship: { Type: 'Join', JoinEntity: 'BookStoreCatalogJoin', ParentKey: 'IDBookStore', ChildKey: 'IDBook' } },
				{ Label: 'Employees', Entity: 'BookStoreEmployee', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBookStore' } },
				{ Label: 'Sales', Entity: 'BookStoreSale', Resolve: 'lazy', Relationship: { Type: 'Filter', Key: 'IDBookStore' } },
			],
		},

		Review: { Lite: [ 'Rating', 'Text', 'IDBook' ], Display: { Title: '{~D:Record.Rating~} ★', Subtitle: '{~D:Record.Text~}' } },
		BookPrice: { Lite: [ 'Price', 'CouponCode' ], Display: { Title: '{~Dollars:Record.Price~}', Subtitle: '{~D:Record.CouponCode~}' } },
		BookStoreEmployee:
		{
			Lite: [ 'Title', 'IDUser' ], Display: { Title: 'Title' },
			Children: [ { Label: 'User', Entity: 'User', Resolve: 'count', Relationship: { Type: 'Reference', Key: 'IDUser' } } ],
		},
		BookStoreSale:
		{
			Lite: [ 'SaleDate', 'TotalAmount', 'PaymentMethod' ], Display: { Title: '{~Dollars:Record.TotalAmount~}', Subtitle: '{~D:Record.PaymentMethod~}' },
			Children: [ { Label: 'Items', Entity: 'BookStoreSaleItem', Resolve: 'count', Relationship: { Type: 'Filter', Key: 'IDBookStoreSale' } } ],
		},
		BookStoreSaleItem:
		{
			Lite: [ 'Quantity', 'UnitPrice', 'IDBook' ], Display: { Title: '{~D:Record.Quantity~} × {~Dollars:Record.UnitPrice~}' },
			Children: [ { Label: 'Book', Entity: 'Book', Resolve: 'count', Relationship: { Type: 'Reference', Key: 'IDBook' } } ],
		},
		User: { Lite: [ 'FullName', 'LoginID' ], Display: { Title: '{~D:Record.FullName~}', Subtitle: '{~D:Record.LoginID~}' } },
	},
};

// Preview-card layouts (info-only; fields come from the Lite projections above).
const _Cards =
{
	Book: { Title: 'Title', Subtitle: '{~D:Record.Genre~}', Fields: [ { Label: 'ISBN', Value: 'ISBN' }, { Label: 'Year', Value: 'PublicationYear' }, { Label: 'Language', Value: 'Language' } ] },
	Author: { Title: 'Name', Fields: [ { Label: 'Author ID', Value: 'IDAuthor' } ] },
	BookStore: { Title: 'Name', Subtitle: '{~D:Record.City~}, {~D:Record.State~}', Fields: [ { Label: 'Type', Value: 'StoreType' } ] },
	Review: { Title: '{~D:Record.Rating~} ★', Subtitle: '{~D:Record.Text~}' },
	User: { Title: 'FullName', Subtitle: '{~D:Record.LoginID~}' },
	BookStoreSale: { Title: '{~Dollars:Record.TotalAmount~}', Subtitle: '{~D:Record.PaymentMethod~}', Fields: [ { Label: 'Date', Value: 'SaleDate' } ] },
};

class BookstoreExplorerApplication extends libPictApplication
{
	onAfterInitializeAsync(fCallback)
	{
		// 1) The soft card dependency — register pict-section-recordset's card manager + declare cards.
		this.pict.addProvider('RecordSetCardManager', libRecordSetCardManager.default_configuration, libRecordSetCardManager);

		// 2) The explorer provider.
		this.pict.addProvider('Pict-DataExplorer', libPictDataExplorer.default_configuration, libPictDataExplorer);
		const tmpExplorerProvider = this.pict.providers['Pict-DataExplorer'];
		tmpExplorerProvider.registerCards(_Cards);

		// 3) Create + render the explorer into #BookExplorer (in the static HTML shell).
		tmpExplorerProvider.createExplorer('BookExplorer', Object.assign({ DestinationAddress: '#BookExplorer' }, _ExplorerConfig));
		this.pict.views['BookExplorer'].renderExplorer();

		return super.onAfterInitializeAsync(fCallback);
	}
}

BookstoreExplorerApplication.default_configuration =
{
	Name: 'Bookstore Explorer',
	Hash: 'BookstoreExplorer',
};

module.exports = BookstoreExplorerApplication;
module.exports.default_configuration = BookstoreExplorerApplication.default_configuration;
