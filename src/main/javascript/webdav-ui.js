var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var location = require('./hash-location.js');
var UploadForm = require('./upload-form.js');
var MediaDisplay = require('./media-display.js');
var formatSize = require('./format-size.js');

var itemName = function(href) {
	var segments = href.split('/');

	return decodeURIComponent(segments[segments.length - 1]);
};
var collectionHref = function(docHref) {
	var hrefSegments = docHref.split('/');				
	var lastSegment = hrefSegments[hrefSegments.length - 1];

	return docHref.substring(0, docHref.length - lastSegment.length - 1);
};

var WebDavUI = React.createClass({
	getDefaultProps: function() {
		return {
			rootURL: '/files',
			client: new WebDavClient()
		};
	},
	handleFileSelect: function(href) {
		this.refs.mediaDisplay.display(href);
		document.title = href;
	},
	handleCollectionSelect: function(href) {
		this.refs.mediaDisplay.hide();
		document.title = href;
	},
	handleMediaDisplayClose: function(href) {
		location.hash(collectionHref(href));
	},
	render: function() {
		return <div>
			<MediaDisplay onClose={this.handleMediaDisplayClose} ref="mediaDisplay" />
			<WebDavBrowser rootURL={this.props.rootURL} client={this.props.client} onSelectFile={this.handleFileSelect} onSelectCollection={this.handleCollectionSelect} />
		</div>
	}
});

var WebDavBrowser = React.createClass({
	getDefaultProps: function() {
		return {
			client: new WebDavClient(),
			onSelectFile: function(href) {},
			onSelectCollection: function(href) {}
		};
	},
	getInitialState: function() {
		return {collectionHref: null, items: [], displayFile: null};
	},
	componentDidMount: function() {
		this._collections = {};
		this._locationListener = (function(self) {return function(hash) {
			self.browseCollection(hash);
		};})(this);
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
			this.props.client.delete(item.href, (function(self) {return function() {
				self.update();
			};})(this));
		}
	},
	handleItemMove: function(item) {
		var destination = prompt('Please type the destination you want the resource ' + item.href + ' to be moved to:', item.href);

		if (destination && item.href !== destination) {
			this.props.client.move(item.href, destination, (function(self) {return function() {
				self.update();
			};})(this));
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

		this.props.client.propfind(href, 1, (function(self) {return function(items) {
			var requestedItem = items[0];
			var requestedItemHref = requestedItem.href;

			if (requestedItem.resourcetype !== 'collection') { // Requested resource is not a collection
				// Browse containing collection
				self._collections[requestedItemHref] = false;
				self.props.onSelectFile(requestedItemHref);
				self.update(collectionHref(requestedItemHref));
				return;
			}

			for (var i = 0; i < items.length; i++) {
				var item = items[i];

				item.name = itemName(item.href);
				// Mark item href as collection (true) or document (false)
				self._collections[item.href] = item.resourcetype === 'collection';
			}

			self.setState({
				collectionHref: requestedItemHref,
				items: items.slice(1)
			});
		};})(this));
	},
	render: function() {
		var baseURL = this.state.collectionHref + '/';
		var collectionItems = this.state.items.map((function(self) {return function(item) {
			return <WebDavItem item={item} onDelete={self.handleItemDelete} onMove={self.handleItemMove} key={item.href} />;
		};})(this));
		return <section>
			<WebDavBreadcrumbs path={this.state.collectionHref} />
			<nav className="webdav-action-bar">
				<ul>
					<li><a href={'#' + this.state.collectionHref} onClick={this.handleRefresh}>update</a></li>
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

function createWebDavUI(element, rootURL) {
	var client = new WebDavClient();
	ReactDOM.render(<WebDavUI rootURL={rootURL} client={client} />, element);
};

module.exports = createWebDavUI;