var log = require('./logger.js')('WebDavBrowser');
var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var UploadForm = require('./upload-form.js');
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
			rootURL: '',
			client: new WebDavClient(),
			className: '',
			getPreviewHref: function(item) {return '';},
			onSelectFile: function(href) {},
			onSelectCollection: function(href) {},
			onCollectionLoaded: function(collection) {}
		};
	},
	getInitialState: function() {
		return {
			collectionHref: null,
			items: [],
			mode: 'loading'
		};
	},
	componentDidMount: function() {
		this._collections = {};
	},
	handleRefresh: function(e) {
		try {
			e.preventDefault();
			this.update();
		} catch(e) {
			log.error('Refresh failed', e);
		}
	},
	handleItemSelect: function(item) {
		this.select(item.href);
	},
	handleItemMove: function(item) {
		var destination = prompt('Please type the destination you want the resource ' + item.href + ' to be moved to:', item.href);

		if (destination && item.href !== destination) {
			this.props.client.move(item.href, destination, function() {
				this.update();
			}.bind(this));
		}
	},
	handleItemDelete: function(item) {
		if (confirm('Do you really want to delete ' + item.href + '?')) {
			this.props.client.delete(item.href, function() {
				this.update();
			}.bind(this));
		}
	},
	handleUploadComplete: function(upload) {
		this.update();
	},
	select: function(href) {
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

		this.setState({
			collectionHref: href,
			items: this.state.items,
			mode: 'loading'
		});

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
				items: items.slice(1),
				mode: 'ready'
			});

			this.props.onCollectionLoaded(items);
		}.bind(this), function(xhr) {
			this.setState({
				collectionHref: this.state.collectionHref,
				items: [],
				mode: 'ready'
			});
			alert('WebDAV request failed with HTTP status code ' + xhr.status + '!');
		}.bind(this));
	},
	render: function() {
		var baseURL = this.state.collectionHref + '/';
		var className = 'webdav-browser ' + (this.props.className ? this.props.className + ' ' : '') + this.state.mode
		var collectionItems = this.state.items.map(function(item) {
			return <WebDavItem item={item}
				getPreviewHref={this.props.getPreviewHref}
				onSelect={this.handleItemSelect}
				onMove={this.handleItemMove}
				onDelete={this.handleItemDelete}
				key={item.href} />;
		}.bind(this));
		return <article className={className}>
			<header className="webdav-browser-header">
				<div className="webdav-item-icon" ref="icon"></div>
				<WebDavBreadcrumbs path={this.state.collectionHref}
					onSelect={this.select}/>
				<div className="webdav-controls">
					<a href={'#' + this.state.collectionHref} className="button dav dav-refresh" onClick={this.handleRefresh} title="refresh"></a>
				</div>
			</header>
			<ul className="webdav-collection-content">
				{collectionItems}
			</ul>
			<UploadForm baseURL={baseURL} onUploadComplete={this.handleUploadComplete} client={this.props.client} />
		</article>
	}
});

var WebDavItem = React.createClass({
	getDefaultProps: function() {
		return {
			getPreviewHref: function(item) {return '';},
			onSelect: function(item) {},
			onMove: function(item) {},
			onDelete: function(item) {}
		};
	},
	handleClick: function(e) {
		try {
			e.preventDefault();
			this.props.onSelect(this.props.item);
		} catch(e) {
			log.error('Item select failed', e);
		}
	},
	handleDelete: function(e) {
		try {
			e.preventDefault();
			this.props.onDelete(this.props.item);
		} catch(e) {
			log.error('Item delete failed', e);
		}
	},
	handleMove: function(e) {
		try {
			e.preventDefault();
			this.props.onMove(this.props.item);
		} catch(e) {
			log.error('Item move failed', e);
		}
	},
	render: function() {
		var item = this.props.item;
		var properties = item.properties;
		var fileSize = formatSize(properties.getcontentlength);
		var title = item.href;
		var isCollection = item.resourcetype === 'collection';
		var previewHref = isCollection ? '' : this.props.getPreviewHref(item);
		var iconClassName = 'webdav-item-icon' + (previewHref ? ' preview' : '') + (isCollection ? ' webdav-icon-collection' : ' webdav-icon-file')

		for (var name in properties) {
			if (properties.hasOwnProperty(name)) {
				title += "\n  " + name + ': ' + properties[name];
			}
		}

		return <li className="webdav-item">
			<div className={iconClassName}>
				<img src={previewHref} alt="" />
				<i></i>
			</div>
			<a href={'#' + item.href} title={title} onClick={this.handleClick} className="webdav-item-label">{item.name}</a> 
			<div className="webdav-item-controls">
				<a href="javascript://move" className="button dav dav-pencil" onClick={this.handleMove} title="move"></a> 
				<a href="javascript://delete" className="button dav dav-trash" onClick={this.handleDelete} title="delete"></a>
			</div>
			<div className="webdav-item-size">{fileSize}</div>
		</li>;
	}
});

var WebDavBreadcrumbs = React.createClass({
	getDefaultProps: function() {
		return {
			path: '',
			onSelect: function(href) {}
		};
	},
	render: function() {
		var segments = (this.props.path || '').split('/').slice(1);
		var href = '';
		var breadcrumbs = segments.map(function(segment) {
			href += '/' + segment;
			var handleClick = function(href, e) {
				try {
					e.preventDefault();
					this.props.onSelect(href);
				} catch(e) {
					log.error('Breadcrumb select failed', e);
				}
			}.bind(this, href);

			return <li key={href}>
				<a href={'#' + href} title={href} onClick={handleClick}>{decodeURIComponent(segment)}</a>
			</li>
		}.bind(this));

		return <nav className="breadcrumbs">
			<ul>
				{breadcrumbs}
			</ul>
		</nav>
	}
});

module.exports = WebDavBrowser;