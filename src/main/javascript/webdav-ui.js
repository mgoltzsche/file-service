var log = require('./logger.js')('WebDavUI');
var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var WebDavBrowser = require('./webdav-browser.js');
var location = require('./hash-location.js');
var MediaDisplay = require('./media-display.js');
var UploadButton = require('./upload-button.js');
var Progress = require('./pending-tasks.js');

var WebDavUI = React.createClass({
	_imageHrefPattern: /^\/files\/(.*?)\.(jpg|jpeg|png|gif)$/i,
	getDefaultProps: function() {
		return {
			rootURL: '/',
			client: new WebDavClient(),
			imageResolutions: [
				[1858, 792], // Workstation/Laptop resolution without padding
				[378, 611], // IPhone 6 resolution without padding
				[298, 290] // lowest possible solution
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
	getScaledImageHref: function(href, width, height) {
		return href.replace(this._imageHrefPattern, '/image/$1-' + width + 'x' + height + '.$2');
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
		this.refs.uploadButton.setBaseURL(this.state.currentCollectionHref);
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
	handleUploadStarted: function(upload) {
		this.refs.tasks.addTask(upload);
	},
	handleUploadSuccess: function(upload) {
		this.refs.browser.update();
		this.refs.tasks.removeTask(upload.id);
	},
	handleUploadError: function(upload, status) {
		alert('Upload ' + upload.label + ' failed with status code ' + status);
		this.refs.tasks.removeTask(upload.id);
	},
	handleUploadProgress: function(upload, loaded, total) {
		this.refs.tasks.setProgress(upload.id, loaded, total);
	},
	_matchImageResolution: function(maxWidth, maxHeight) {
		var r, resolutions = this.props.imageResolutions;

		for (var i = 0; i < resolutions.length; i++) {
			r = resolutions[i];
			var width = r[0], height = r[1];

			if (width <= maxWidth && height <= maxHeight) {
				if (i > 0) {
					var last = resolutions[i - 1];
					var distLast = this._resolutionDistance(last[0], last[1], maxWidth, maxHeight) * 1.5;
					var distThis = this._resolutionDistance(height, width, maxWidth, maxHeight);

					return distThis < distLast ? r : last;
				} else {
					return r;
				}
			}
		}

		return r;
	},
	_resolutionDistance: function(width1, height1, width2, height2) {
		var dx = width1 - width2;
		var dy = height1 - height2;

		return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
	},
	getPreviewHref: function(item) {
		if (this._imageHrefPattern.test(item.href))
			return this.getScaledImageHref(item.href, 27, 23);

		return null;
	},
	rewriteImageHref: function(href, maxWidth, maxHeight) {
		var r = this._matchImageResolution(maxWidth, maxHeight);

		return this.getScaledImageHref(href, r[0], r[1]);
	},
	render: function() {
		var header = <div className="webdav-controls">
			<Progress ref="tasks" />
			<UploadButton baseURL={this.state.baseURL}
				client={this.props.client}
				onStarted={this.handleUploadStarted}
				onSuccess={this.handleUploadSuccess}
				onError={this.handleUploadError}
				onProgress={this.handleUploadProgress}
				ref="uploadButton" />
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