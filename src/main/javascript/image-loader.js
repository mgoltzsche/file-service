var log = require('./logger.js')('ImageLoader');
var React = require('react');
var ReactDOM = require('react-dom');

var ImageLoader = React.createClass({
	getDefaultProps: function() {
		return {
			src: '',
			onLoad: function(src, width, height) {},
			onLoadFailed: function(src) {}
		};
	},
	getInitialState: function() {
		return {
			src: null,
			loading: true
		};
	},
	componentDidMount: function() {
		this._preloadElement = document.createElement('img');
		this._loadListener = function(e) {
			this._removePreloadListeners();
			this._onImageLoaded(e.target.src, e.target.naturalWidth, e.target.naturalHeight);
		}.bind(this);
		this._errorListener = function(e) {
			log.debug('Failed to load image: ' + e.target.src);
			this._removePreloadListeners();
			this.refs.image.src = 'error.jpg';
			this.setLoading(false);
			this.props.onLoadFailed(e.target.src);
		}.bind(this);
		this._removePreloadListeners = function() {
			this._preloadElement.removeEventListener('load', this._loadListener);
			this._preloadElement.removeEventListener('error', this._errorListener);
		}.bind(this);

		// Load image
		this.showImage(this.props.src);
	},
	componentWillUpdate: function(nextProps) {
		if (this.props.src !== nextProps.src)
			this.showImage(nextProps.src);
	},
	_onImageLoaded: function(href, width, height) {
		log.debug('loaded: ' + href + ' (' + width + 'x' + height + ')');
		this.refs.image.src = href;
		this.setLoading(false);
		this.props.onLoad(href, width, height);
	},
	showImage: function(src) {
		if (!src) {
			if (!!this.state.src)
				this.refs.image.src = this.state.src = '';
			return;
		}

		var img = this._preloadElement;
		img.src = this.state.src = src;

		if (img.complete) {
			this.refs.image.src = src;
			this.setLoading(false);
			this._onImageLoaded(src, img.naturalWidth, img.naturalHeight);
		} else {
			this.setLoading(true);
			img.addEventListener('load', this._loadListener);
			img.addEventListener('error', this._errorListener);
		}
	},
	setLoading: function(loading) {
		this.state.loading = loading;
		this.refs.container.className = this.getClassName();
	},
	getClassName: function() {
		return 'image-loader ' + this.props.className + (this.state.loading ? ' loading' : '');
	},
	render: function() {
		log.debug('RENDER IMAGE');
		return <div className={this.getClassName()} ref="container">
			<i className="progress-indicator"> </i>
			<img ref="image" />
		</div>
	}
});

module.exports = ImageLoader;