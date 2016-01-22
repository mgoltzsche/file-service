var log = require('./logger.js')('ImageLoader');
var React = require('react');
var ReactDOM = require('react-dom');

var ImageLoader = React.createClass({
	getDefaultProps: function() {
		return {
			src: '',
			onLoad: function(width, height) {},
			onLoadFailed: function() {}
		};
	},
	componentDidMount: function() {
		this._currentSrc = null;
		this._preloadElement = document.createElement('img');
		this._loadListener = function(e) {
			this._removePreloadListeners();
			this._onImageLoaded(e.target.src, e.target.naturalWidth, e.target.naturalHeight);
		}.bind(this);
		this._errorListener = function(e) {
			log.debug('Failed to load image: ' + e.target.src);
			this._removePreloadListeners();
			this.refs.image.src = 'error.jpg';
			this.props.onLoadFailed();
		}.bind(this);
		this._removePreloadListeners = function() {
			this._preloadElement.removeEventListener('load', this._loadListener);
			this._preloadElement.removeEventListener('error', this._errorListener);
		}.bind(this);

		// Load image
		this.showImage(this.props.src);
	},
	componentWillUnmount: function() {
	},
	componentWillUpdate: function(nextProps) {
		if (this.props.src !== nextProps.src)
			this.showImage(nextProps.src);
	},
	_onImageLoaded: function(href, width, height) {
		log.debug('loaded: ' + href + ' (' + width + 'x' + height + ')');
		this.refs.image.src = href;
		this.props.onLoad(width, height);
	},
	showImage: function(src) {
		if (!src) {
			if (!!this._currentSrc)
				this.refs.image.src = this._currentSrc = '';
			return;
		}

		log.debug('loading: ' + src);
		var img = this._preloadElement;
		img.src = this._currentSrc = src;

		if (img.complete) {
			this.refs.image.src = src;
			this._onImageLoaded(img.src, img.naturalWidth, img.naturalHeight);
		} else {
			this.refs.image.src = 'spinner.jpg';
			img.addEventListener('load', this._loadListener);
			img.addEventListener('error', this._errorListener);
		}
	},
	render: function() {
		log.debug('RENDER IMAGE');
		return <div className={'image-loader ' + this.props.className}>
			<img ref="image" />
		</div>
	}
});

module.exports = ImageLoader;