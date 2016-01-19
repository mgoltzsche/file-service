var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var UploadForm = require('./upload-form.js');
var location = require('./hash-location.js');
var formatSize = require('./format-size.js');

var itemName = function(href) {
	return decodeURIComponent(href.split('/').pop());
};

var collectionHref = function(docHref) {
	return docHref.split('/').slice(0, -1).join('/');
};

var WebDavBrowser = React.createClass({
	getDefaultProps: function() {
		return {
			client: new WebDavClient(),
			onSelectFile: function(href) {},
			onSelectCollection: function(href) {},
			onCollectionLoaded: function(collection) {}
		};
	},
	getInitialState: function() {
		return {collectionHref: null, items: [], displayFile: null};
	},
	componentDidMount: function() {
		this._collections = {};
		this._locationListener = function(hash) {
			this.browseCollection(hash);
		}.bind(this);
		location.addListener(this._locationListener);
	},
	componentWillUnmount: function() {
		location.removeListener(this._locationListener);
	},
	handleRefresh: function(e) {
		e.preventDefault();
		this.update();
	},
	handleItemDelete: function(item) {
		if (confirm('Do you really want to delete ' + item.href + '?')) {
			this.props.client.delete(item.href, function() {
				this.update();
			}.bind(this));
		}
	},
	handleItemMove: function(item) {
		var destination = prompt('Please type the destination you want the resource ' + item.href + ' to be moved to:', item.href);

		if (destination && item.href !== destination) {
			this.props.client.move(item.href, destination, function() {
				this.update();
			}.bind(this));
		}
	},
	browseCollection: function(href) {
		var fileSelected = false;

		if (this._collections[href] === false) {
			// Avoid requests of items that are known not to be collections.
			// Instead request parent collection
			this.props.onSelectFile(href);
			href = collectionHref(href);
			fileSelected = true;
		}
		if (href.indexOf(this.props.rootURL) !== 0) {
			// If URL outside of rootURL request root collection
			href = this.props.rootURL;
		}
		if (this.state.collectionHref !== href) {
			// Request only if not already displayed
			this.update(href);
		}
		if (!fileSelected) {
			this.props.onSelectCollection(href);
		}
	},
	update: function(href) {
		href = typeof href === 'string' ? href : this.state.collectionHref;

		if (typeof href !== 'string')
			return;

		this.props.client.propfind(href, 1, function(items) {
			var requestedItem = items[0];
			var requestedItemHref = requestedItem.href;

			if (requestedItem.resourcetype !== 'collection') { // Requested resource is not a collection
				// Browse containing collection
				this._collections[requestedItemHref] = false;
				this.props.onSelectFile(requestedItemHref);
				this.update(collectionHref(requestedItemHref));
				return;
			}

			for (var i = 0; i < items.length; i++) {
				var item = items[i];

				item.name = itemName(item.href);
				// Mark item href as collection (true) or document (false)
				this._collections[item.href] = item.resourcetype === 'collection';
			}

			this.setState({
				collectionHref: requestedItemHref,
				items: items.slice(1)
			});

			this.props.onCollectionLoaded(items);
		}.bind(this));
	},
	render: function() {
		var baseURL = this.state.collectionHref + '/';
		var collectionItems = this.state.items.map(function(item) {
			return <WebDavItem item={item} onDelete={this.handleItemDelete} onMove={this.handleItemMove} key={item.href} />;
		}.bind(this));
		return <section>
			<WebDavBreadcrumbs path={this.state.collectionHref} />
			<nav className="webdav-action-bar">
				<ul>
					<li><a href={'#' + this.state.collectionHref} onClick={this.handleRefresh}>refresh</a></li>
				</ul>
			</nav>
			<ul className="webdav-collection">
				{collectionItems}
			</ul>
			<UploadForm baseURL={baseURL} onUploadComplete={this.update} client={this.props.client} />
		</section>
		// TODO: populate upload form base URL not via props but use exposed method
	}
});

var WebDavItem = React.createClass({
	getDefaultProps: function() {
		return {
			onDelete: function(href) {},
			onMove: function(href) {}
		};
	},
	handleClick: function(e) {
		e.preventDefault();
		location.hash(this.props.item.href);
	},
	handleDelete: function(e) {
		e.preventDefault();
		this.props.onDelete(this.props.item);
	},
	handleMove: function(e) {
		e.preventDefault();
		this.props.onMove(this.props.item);
	},
	render: function() {
		var item = this.props.item;
		var properties = item.properties;
		var fileSize = formatSize(properties.getcontentlength);
		var title = item.href;

		for (var name in properties) {
			if (properties.hasOwnProperty(name)) {
				title += "\n  " + name + ': ' + properties[name];
			}
		}

		return <li className="webdav-item">
			<img src={item.href} alt="" width="27" height="23" />
			<a href={'#' + item.href} title={title} onClick={this.handleClick}>{item.name}</a> 
			<span className="webdav-item-action-bar">
				<a href="javascript://move" onClick={this.handleMove}>move</a> 
				<a href="javascript://delete" onClick={this.handleDelete}>delete</a>
			</span>
			<span className="webdav-file-size">{fileSize}</span>
		</li>;
	}
});

var WebDavBreadcrumbs = React.createClass({
	handleClick: function(href) {
		location.hash(href);
	},
	render: function() {
		var segments = (this.props.path || '').split('/').slice(1);
		var href = '';
		var breadcrumbs = segments.map(function(segment) {
			href += '/' + segment;
			var handleClick = (function(href) {return function(e) {
				e.preventDefault();
				location.hash(href);
			};})(href);

			return <li key={href}>
				<a href={'#' + href} title={href} onClick={handleClick}>{decodeURIComponent(segment)}</a>
			</li>
		});

		return <nav className="breadcrumbs">
			<ul>
				{breadcrumbs}
			</ul>
		</nav>
	}
});

module.exports = WebDavBrowser;