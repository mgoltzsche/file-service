var log = require('./logger.js')('WebDavUI');
var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var WebDavBrowser = require('./webdav-browser.js');
var location = require('./hash-location.js');
var MediaDisplay = require('./media-display.js');

var WebDavUI = React.createClass({
	_imageHrefPattern: /^\/files\/(.*?)\.(jpg|jpeg|png|gif)$/i,
	getDefaultProps: function() {
		return {
			rootURL: '/',
			client: new WebDavClient()
		};
	},
	getInitialState: function() {
		return {
			media: [],
			currentMediaHref: null
		}
	},
	componentDidMount: function() {
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
	getPreviewHref: function(item) {
		if (this._imageHrefPattern.test(item.href))
			return this.getScaledImageHref(item.href, 27, 23);

		return null;
	},
	rewriteImageHref: function(href, maxWidth, maxHeight) {
		// TODO: Limit possible image resolutions
		return this.getScaledImageHref(href, maxWidth, maxHeight);
	},
	render: function() {
		return <div>
			<MediaDisplay media={this.state.media}
				onDisplay={this.handleMediaDisplayed}
				onClose={this.handleMediaDisplayClose}
				rewriteImageHref={this.rewriteImageHref}
				ref="mediaDisplay" />
			<WebDavBrowser rootURL={this.props.rootURL}
				client={this.props.client}
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
	ReactDOM.render(<WebDavUI rootURL={rootURL} client={client} />, element);
};

module.exports = createWebDavUI;