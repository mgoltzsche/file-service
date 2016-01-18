var log = require('./logger.js');
var React = require('react');
var ReactDOM = require('react-dom');
var Dialog = require('./dialog.js');

var MediaDisplay = React.createClass({
	getDefaultProps: function() {
		return {
			mediaHref: null,
			displayTypes: {
				'jpg': 'image',
				'jpeg': 'image',
				'png': 'image',
				'gif': 'image',
				'bmp': 'image',
				'mp4': 'video',
				'mp3': 'audio',
				'txt': 'iframe',
				'html': 'iframe',
				'xhtml': 'iframe'
			},
			rewriteImageHref: function(href, width, height) {
				return href;
			},
			rewriteVideoHref: function(href) {
				return href;
			},
			onClose: function() {}
		};
	},
	getInitialState: function() {
		return {
			prefWidth: 100,
			prefHeight: 100,
			displayType: 'hidden',
			mediaHref: null,
			imageHref: '',
			streamHref: null,
			iframeHref: '',
		};
	},
	componentDidMount: function() {
//		this.refs.dialog.setPreferredSize(100, 100, true);

		var mediaHref = this.props.mediaHref;

		if (typeof mediaHref == 'string' && mediaHref !== '') {
			this.display(mediaHref);
		}
	},
	componentWillUnmount: function() {
	},
	handleMediaError: function(e) {
		if (this.state.streamHref !== null) {
			// Fallback to iframe display
			log.debug('Media error for ' + this.state.streamHref + '. Falling back to iframe display');
			this.state.displayType = 'iframe';
			this.state.iframeHref = this.state.streamHref;
			this.state.streamHref = null;
			this.setState(this.state);
		}
	},
	handleClose: function() {
		this.props.onClose(this.state.mediaHref);
		this._clearState(this.getInitialState());
	},
	display: function(mediaHref) {
		if (this.state.mediaHref !== mediaHref) {
			var state = this.getInitialState();
			var displayType = state.displayType = this.props.displayTypes[mediaHref.split('.').pop().toLowerCase()] || 'unsupported';

			state.mediaHref = mediaHref;

			if (displayType === 'image') {
				state.imageHref = this.props.rewriteImageHref(mediaHref);
			} else if (displayType === 'video') {
				state.streamHref = this.props.rewriteVideoHref(mediaHref);
			} else if (displayType === 'audio') {
				state.streamHref = mediaHref;
			} else if (displayType === 'iframe') {
				state.iframeHref = mediaHref;
			}

			this._stopRunningMedia();

			if (displayType === 'video') {
				this.refs.streamDisplay.load();

				if (this.refs.streamDisplay.error) {
					log.debug('Video element error', this.refs.streamDisplay.error);
				}
			}

			this.setState(state);
			this.refs.dialog.open();
		}
	},
	hide: function() {
		this._clearState(this.getInitialState());
		this.refs.dialog.hide();
//		this.refs.dialog.setPreferredSize(100, 100, true);
	},
	_stopRunningMedia: function() {
		if (this.state.streamHref !== '') {
			try {
				this.refs.streamDisplay.pause();
			} catch(e) {
				log.error('Cannot pause video element', e);
			}
		}
	},
	_clearState: function(state) {
		this._stopRunningMedia();
		this.setState(state);
	},
	setPreferredSize: function(width, height) {
		this.refs.dialog.setPreferredSize(width, height, true); // More lightweight than setState
	},
	render: function() {
		var footer = <a href={this.state.mediaHref} title={this.state.mediaHref}>download</a>;

		return <Dialog className={'media-display media-display-' + this.state.displayType} footer={footer} onClose={this.handleClose} prefWidth={this.state.prefWidth} prefHeight={this.state.prefHeight} resizeProportional={true} ref="dialog">
			<ImageLoader className="image-display" src={this.state.imageHref} onLoad={this.setPreferredSize} />
			<video className="video-display" width="100%" height="100%" src={this.state.streamHref} controls onError={this.handleMediaError} ref="streamDisplay">
				<span>Your browser does not support the video element. Go get a new Browser!</span>
			</video>
			<iframe className="iframe-display" src={this.state.iframeHref} />
		</Dialog>
	}
});

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
		this._loadImage(this.props.src);
	},
	componentWillUnmount: function() {
	},
	componentWillUpdate: function(nextProps) {
		this._loadImage(nextProps.src);
	},
	_onImageLoaded: function(href, width, height) {
		log.debug('Image loaded: ' + href + ' (' + width + 'x' + height + ')');
		this.refs.image.src = href;
		this.props.onLoad(width, height);
	},
	_loadImage: function(src) {
		if (!src) {
			if (!!this._currentSrc)
				this.refs.image.src = this._currentSrc = this.props.src = '';
			return;
		}

		if (this._currentSrc === src) {
			return; // Avoid onLoad call if image source has not changed
		}

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

module.exports = MediaDisplay;