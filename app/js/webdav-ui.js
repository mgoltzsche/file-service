var logFactory = require('./logger.js');
var log = logFactory('WebDavUI');
var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var taskRegistry = require('./task-registry.js');
var fileUploadService = require('./file-upload-service.js');
var WebDavBrowser = require('./webdav-browser.js');
var location = require('./hash-location.js');
var MediaDisplay = require('./media-display.js');
var UploadButton = require('./upload-button.js');
var Progress = require('./progress-view.js');

var imgMarginX = 22, imgMarginY = 56;

var WebDavUI = React.createClass({
	_imageHrefPattern: /^\/files\/(.*?)\.(jpg|jpeg|png|gif)$/i,
	getDefaultProps: function() {
		return {
			rootURL: '/',
			client: new WebDavClient(),
			imageResolutions: [
				[640-imgMarginX, 640-imgMarginY], // Large phone/tablet resolution (longer side taken twice)
				[1366-imgMarginX, 1024-imgMarginY], // Two popular workstation/laptop resolutions according to W3C
				[1920-imgMarginX, 1080-imgMarginY] // FullHD
			]
		};
	},
	getInitialState: function() {
		return {
			media: [],
			currentMediaHref: null,
			currentCollectionHref: null
		}
	},
	componentDidMount: function() {
		this.state.currentCollectionHref = this.props.rootURL;
		this._locationListener = function(hash) {
			this.refs.browser.select(hash);
		}.bind(this);
		location.addListener(this._locationListener);
	},
	componentWillUnmount: function() {
		location.removeListener(this._locationListener);
	},
	getTransformedImageHref: function(href, mode, width, height) {
		return href.replace(this._imageHrefPattern, '/image/' + mode + '/$1-' + width + 'x' + height + '.$2');
	},
	toMediaDisplayModel: function(webdavItems) {
		var media = [];

		for (var i = 0; i < webdavItems.length; i++) {
			var item = webdavItems[i];

			if (item.resourcetype !== 'collection')
				media.push(this.toMediaDisplayModelItem(item.href));
		}

		return media;
	},
	toMediaDisplayModelItem: function(href) {
		return {
			href: href,
			label: decodeURIComponent(href.split('/').pop())
		};
	},
	getMediaIndexOr0: function(href) {
		var media = this.state.media;

		for (var i = 0; i < media.length; i++)
			if (media[i].href === href)
				return i;

		return 0;
	},
	handleFileSelect: function(href) {
		if (this.state.media.length === 0)
			this.state.media = [this.toMediaDisplayModelItem(href)];

		var index = this.getMediaIndexOr0(href);
		this.refs.mediaDisplay.displayMedia(this.state.media, index);
		document.title = href;
	},
	handleCollectionSelect: function(href) {
		location.hash(href);
		this.state.currentCollectionHref = href;
		this.refs.mediaDisplay.hide();
		document.title = href;
	},
	handleMediaDisplayed: function(media, index) {
		var href = this.state.currentMediaHref = media[index].href;
		location.hash(href);
		document.title = href;
	},
	handleMediaDisplayClose: function(media, index) {
		var mediaItem = media[index];
		var collectionHref = mediaItem.href.split('/').slice(0, -1).join('/');
		this.state.currentMediaHref = null;
		location.hash(collectionHref);
		document.title = collectionHref;
	},
	handleCollectionLoaded: function(items) {
		this.state.media = this.toMediaDisplayModel(items);

		if (this.state.currentMediaHref !== null) {
			var index = this.getMediaIndexOr0(this.state.currentMediaHref);
			this.refs.mediaDisplay.displayMedia(this.state.media, index);
		}
	},
	handleRefresh: function() {
		this.refs.browser.update();
	},
	handleCreateCollection: function() {
		this.refs.browser.createCollection();
	},
	handleUploadStarted: function(upload) {
		taskRegistry.addTask(upload);
	},
	handleUploadSuccess: function(upload) {
		this.refs.browser.update();
		taskRegistry.removeTask(upload.id);
	},
	handleUploadError: function(upload, status) {
		alert('Upload ' + upload.label + ' failed with status code ' + status);
		taskRegistry.removeTask(upload.id);
	},
	handleUploadProgress: function(upload, loaded, total) {
		taskRegistry.setProgress(upload.id, loaded, total);
	},
	handleFileUpload: function(files) {
		fileUploadService(this.props.client, this.state.currentCollectionHref, files, function() {
			this.refs.browser.update();
		}.bind(this), function(upload, status) {
			alert('Upload ' + upload.label + ' failed with status code ' + status);
		});
	},
	_matchImageResolution: function(maxWidth, maxHeight) {
		var r, resolutions = this.props.imageResolutions;

		for (var i = 0; i < resolutions.length; i++) {
			r = resolutions[i];
			var width = r[0], height = r[1];

			if (r[0] >= maxWidth && r[1] >= maxHeight) {
				return r;
			}
		}

		return r;
	},
	getPreviewHref: function(item) {
		if (this._imageHrefPattern.test(item.href))
			return this.getTransformedImageHref(item.href, 'crop', 27, 23);

		return null;
	},
	rewriteImageHref: function(href, maxWidth, maxHeight) {
		var r = this._matchImageResolution(maxWidth, maxHeight);

		return this.getTransformedImageHref(href, 'scale', r[0], r[1]);
	},
	render: function() {
		var header = <div className="webdav-controls">
			<Progress />
			<UploadButton onFilesSelected={this.handleFileUpload} />
			<a href="javascript://create_collection" className="button dav dav-folder-plus" onClick={this.handleCreateCollection} title="create collection"></a>
			<a href="javascript://refresh" className="button dav dav-refresh" onClick={this.handleRefresh} title="refresh"></a>
		</div>;
		return <div>
			<MediaDisplay media={this.state.media}
				onDisplay={this.handleMediaDisplayed}
				onClose={this.handleMediaDisplayClose}
				rewriteImageHref={this.rewriteImageHref}
				ref="mediaDisplay" />
			<WebDavBrowser rootURL={this.props.rootURL}
				client={this.props.client}
				header={header}
				onSelectFile={this.handleFileSelect}
				onSelectCollection={this.handleCollectionSelect}
				onCollectionLoaded={this.handleCollectionLoaded}
				onDropFiles={this.handleFileUpload}
				getPreviewHref={this.getPreviewHref}
				ref="browser" />
		</div>
	}
});

function createWebDavUI(element, rootURL) {
	var client = new WebDavClient();

	return ReactDOM.render(<WebDavUI rootURL={rootURL} client={client} />, element);
};

module.exports = createWebDavUI;
