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
		this.showImage(this.props.src); // Load image
	},
	componentWillUpdate: function(nextProps) {
		if (this.props.src !== nextProps.src)
			this.showImage(nextProps.src);
	},
	_onImageLoaded: function(href, width, height) {
		if (this.state.src === href) {
			log.debug('loaded: ' + href + ' (' + width + 'x' + height + ')');
			this.refs.image.src = href;
			this.setLoading(false);
			this.props.onLoad(href, width, height);
		}
	},
	_removePreloadListeners: function(listeners) {
		this._preloadElement.removeEventListener('load', listeners.onLoad);
		this._preloadElement.removeEventListener('error', listeners.onError);
	},
	_onLoad: function(listeners, e) {
		this._removePreloadListeners(listeners);

		if (listeners.src === this.state.src)
			this._onImageLoaded(listeners.src, e.target.naturalWidth, e.target.naturalHeight);
	},
	_onError: function(listeners, e) {
		log.debug('Failed to load image: ' + listeners.src);
		this._removePreloadListeners(listeners);

		if (listeners.src === this.state.src) {
			this.refs.image.src = 'error.jpg';
			this.setLoading(false);
			this.props.onLoadFailed(listeners.src);
		}
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
			var listeners = {src: src};
			listeners.onLoad = this._onLoad.bind(this, listeners);
			listeners.onError = this._onError.bind(this, listeners);
			img.addEventListener('load', listeners.onLoad);
			img.addEventListener('error', listeners.onError);
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
		return <div className={this.getClassName()} ref="container">
			<i className="progress-indicator"></i>
			<img ref="image" />
		</div>
	}
});

module.exports = ImageLoader;