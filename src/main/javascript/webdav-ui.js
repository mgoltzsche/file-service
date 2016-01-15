var WebDavClient = require('./webdav-client.js');
var location = require('./hash-location.js');
var React = require('react');
var ReactDOM = require('react-dom');

var itemName = function(href) {
	var segments = href.split('/');

	return decodeURIComponent(segments[segments.length - 1]);
};
var collectionHref = function(docHref) {
	var hrefSegments = docHref.split('/');				
	var lastSegment = hrefSegments[hrefSegments.length - 1];

	return docHref.substring(0, docHref.length - lastSegment.length - 1);
};

var WebDavBrowser = React.createClass({
	getInitialState: function() {
		return {collectionHref: null, items: []};
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
	browseCollection: function(href) {
		if (this._collections[href] === false) {
			// Avoid requests of items that are known not to be collections.
			// Instead request parent collection
			href = collectionHref(href);
		}
		if (href.indexOf(this.props.rootURL) !== 0) {
			// If URL outside of rootURL request root collection
			href = this.props.rootURL;
		}
		if (this.state.collectionHref !== href) {
			// Request only if not already displayed
			this.update(href);
		}
	},
	handleRefresh: function(e) {
		e.preventDefault();
		this.update();
	},
	update: function(href) {
		console.log('href: ' + href);
		var collectionHref = typeof href === 'string' ? href : this.state.collectionHref;

		if (typeof collectionHref !== 'string')
			return;
		console.log('request ' + collectionHref);
		this.props.client.propfind(collectionHref, 1, (function(self) {return function(items) {
			var collection = items[0];
			var collectionHref = items[0].href;

			if (collection.resourcetype !== 'collection') { // Requested resource is not a collection
				// Browse containing collection
				self.update(collectionHref(collectionHref));
				return;
			}

			for (var i = 0; i < items.length; i++) {
				var item = items[i];

				item.name = itemName(item.href);
				// Mark item href as collection (true) or document (false)
				self._collections[item.href] = item.resourcetype === 'collection';
			}

			self.setState({
				collectionHref: collectionHref,
				items: items.slice(1)
			});
		};})(this));
	},
	render: function() {
		var baseURL = this.state.collectionHref + '/';
		var collectionItems = this.state.items.map(function(item) {
			return <WebDavItem item={item} key={item.href} />;
		});
		return <div>
			<div className="webdav-collection-href">{this.state.collectionHref}</div>
			<form onSubmit={this.handleRefresh}><button>update</button></form>
			<div className="webdav-collection">
				{collectionItems}
			</div>
			<WebDavUploadForm baseURL={baseURL} onUploadComplete={this.update} client={this.props.client} />
		</div>
	}
});

var WebDavItem = React.createClass({
	render: function() {
		var item = this.props.item;

		return <div className="webdav-item">
			<img src={item.href} alt="" width="27" height="23" />
			<a href={'#' + item.href} title={item.href}>{item.name}</a>
		</div>;
	}
});

var WebDavUploadForm = React.createClass({
	getInitialState: function() {
		return {queue: []};
	},
	componentDidMount: function() {
		this._uploadCount = 0;
	},
	cancelUpload: function(upload) {
		var queue = this.state.queue;

		for (var i = 0; i < queue.length; i++) {
			if (queue[i] === upload) {
				delete queue[i];
				this.setState(this.state);
				return;
			}
		}
	},
	handleFilesAdded: function(e) {
		e.preventDefault();

		var input = e.target;
		var files = input.files;

		if (files.length == 0) {
			alert("Please choose a file to upload");
			return;
		}

		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			var uploadState = {
				name: file.name,
				size: file.size,
				id: 'upload-' + this._uploadCount++,
				progress: 0
			};

			this.state.queue.push(uploadState);
			this.props.client.put(this.props.baseURL + file.name, file, (function(self, uploadState) {return function() {
				try {
					self.props.onUploadComplete();
				} catch(e) {
					console.log('Error in upload complete listener: ' + e);
				}
				self.cancelUpload(uploadState);
			};})(this, uploadState),
			(function(self, uploadState) {return function(e) {
				uploadState.progress = Math.round(e.loaded / e.total) * 100;
				self.setState(self.state);
			};})(this, uploadState),
			(function(self, uploadState) {return function() {
				uploadState.progress = 0;
				self.cancelUpload(uploadState);
				alert('Failed to upload ' + file.name);
			};})(this, uploadState));
		}

		// Reset input field
		try{
			input.value = '';
			if(input.value){
				input.type = 'text';
				input.type = 'file';
			}
		}catch(e){}
	},
	render: function() {
		return <form onSubmit={this.upload}>
			<div>
				<input type="file" onChange={this.handleFilesAdded} multiple />
				<button>upload</button>
			</div>
			<PendingUploads uploads={this.state.queue} />
		</form>;
	}
});

var PendingUploads = React.createClass({
	render: function() {
		var pendingUploads = this.props.uploads.map(function(item) {
			return <li className="upload-item" key={item.id}>
				<div>{item.name} ({item.size})</div>
				<progress max="100" value={item.progress}></progress>
			</li>;
		});

		return <ul className="uploads-pending">
			{pendingUploads}
		</ul>;
	}
});

function createWebDavUI(element, rootUrl) {
	var client = new WebDavClient();
	ReactDOM.render(<WebDavBrowser rootURL="/files" client={client} />, element);
};

try {
	module.exports = createWebDavUI;
} catch(e) {}