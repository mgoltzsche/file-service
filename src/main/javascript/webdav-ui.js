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
			media: []
		}
	},
	getScaledImageHref: function(href, width, height) {
		return href.replace(this._imageHrefPattern, '/image/$1-' + width + 'x' + height + '.$2');
	},
	toMediaDisplayModel: function(webdavItems) {
		var media = [];

		for (var i = 0; i < webdavItems.length; i++) {
			var item = webdavItems[i];

			if (item.resourcetype !== 'collection') {
				var href = item.href;

				media.push(this.toMediaDisplayModelItem(item.href));
			}
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

		for (var i = 0; i < media.length; i++) {
			if (media[i].href === href)
				return i;
		}

		return 0;
	},
	handleFileSelect: function(href) {
		if (this.state.media.length === 0)
			this.state.media = [this.toMediaDisplayModelItem(href)];

		this.refs.mediaDisplay.displayMedia(this.state.media, this.getMediaIndexOr0(href));
		document.title = href;
	},
	handleCollectionSelect: function(href) {
		this.refs.mediaDisplay.hide();
		document.title = href;
	},
	handleMediaDisplayClose: function(media) {
		location.hash(media.href.split('/').slice(0, -1).join('/'));
	},
	handleCollectionLoaded: function(items) {
		this.state.media = this.toMediaDisplayModel(items);
	},
	getIconHref: function(item) {
		if (item.resourcetype === 'collection')
			return ''; // TODO: return collection icon href

		if (this._imageHrefPattern.test(item.href))
			return this.getScaledImageHref(item.href, 27, 23);

		return '';
	},
	rewriteImageHref: function(href, maxWidth, maxHeight) {
		// TODO: Limit possible image resolutions
		return this.getScaledImageHref(href, maxWidth, maxHeight);
	},
	render: function() {
		return <div>
			<MediaDisplay media={this.state.media}
				rewriteImageHref={this.rewriteImageHref}
				onClose={this.handleMediaDisplayClose}
				ref="mediaDisplay" />
			<WebDavBrowser rootURL={this.props.rootURL}
				client={this.props.client}
				onSelectFile={this.handleFileSelect}
				onSelectCollection={this.handleCollectionSelect}
				onCollectionLoaded={this.handleCollectionLoaded}
				getIconHref={this.getIconHref} />
		</div>
	}
});

function createWebDavUI(element, rootURL) {
	var client = new WebDavClient();
	ReactDOM.render(<WebDavUI rootURL={rootURL} client={client} />, element);
};

module.exports = createWebDavUI;