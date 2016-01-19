var log = require('./logger.js')('WebDavUI');
var React = require('react');
var ReactDOM = require('react-dom');
var WebDavClient = require('./webdav-client.js');
var WebDavBrowser = require('./webdav-browser.js');
var location = require('./hash-location.js');
var MediaDisplay = require('./media-display.js');

var filterFileHrefs = function(items) {
	var hrefs = [];

	for (var i = 0; i < items.length; i++) {
		var item = items[i];

		if (item.resourcetype !== 'collection') {
			href.push(item.href);
		}
	}

	return hrefs;
};

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
			mediaHref: ''
		}
	},
	getScaledImageHref: function(href, width, height) {
		return href.replace(this._imageHrefPattern, '/image/$1-' + width + 'x' + height + '.$2');
	},
	handleFileSelect: function(href) {
		this.setState({
			mediaHref: href
		});
		//this.refs.mediaDisplay.display(href);
		document.title = href;
	},
	handleCollectionSelect: function(href) {
		this.setState({
			mediaHref: ''
		});
		//this.refs.mediaDisplay.hide();
		document.title = href;
	},
	handleMediaDisplayClose: function(href) {
		location.hash(href.split('/').slice(0, -1).join('/'));
	},
	handleCollectionLoaded: function(items) {
		//this.state = filterFileHrefs(items);
		// TODO: set new state with file refs only 
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
			<MediaDisplay mediaHref={this.state.mediaHref}
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