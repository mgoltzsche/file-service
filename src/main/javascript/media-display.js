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
			displayType: 'hidden',
			mediaHref: null,
			imageHref: '',
			streamHref: null,
			iframeHref: '',
		};
	},
	componentDidMount: function() {
		this.refs.dialog.setPreferredSize(100, 100, true);

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
			console.log('Media error for ' + this.state.streamHref + '. Falling back to iframe display');
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

			this._clearState(state);

			if (displayType === 'video') {
				this.refs.streamDisplay.load();

				if (this.refs.streamDisplay.error) {
					console.log('Video element error: ' + this.refs.streamDisplay.error);
				}
			}

			this.refs.dialog.open();
		}
	},
	hide: function() {
		this.refs.dialog.hide();
		this.refs.dialog.setPreferredSize(100, 100, true);
	},
	_clearState: function(state) {
		if (this.state.streamHref !== '') {
			try {
				this.refs.streamDisplay.pause();
			} catch(e) {
				console.log('Cannot pause video element: ' + e);
			}
		}

		this.setState(state);
	},
	setPreferredSize: function(width, height) {
		this.refs.dialog.setPreferredSize(width, height, true);
	},
	render: function() {
		var footer = <a href={this.state.mediaHref} title={this.state.mediaHref}>download</a>;

		return <Dialog className={'media-display media-display-' + this.state.displayType} footer={footer} onClose={this.handleClose} ref="dialog">
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
		this._preloadElement = document.createElement('img');
		this._loadListener = function(e) {
			console.log('image loaded: ' + e.target.src + '  ' + e.target.naturalWidth + 'x' + e.target.naturalHeight);
			this._onImageLoaded(e.target.src, e.target.naturalWidth, e.target.naturalHeight);
			this.props.onLoad(e.target.naturalWidth, e.target.naturalHeight);
		}.bind(this);
		this._errorListener = function(e) {
			console.log('Error: Failed to load image: ' + e.target.src);
			this.refs.image.src = this.props.src = 'error.jpg';
			this.props.onLoadFailed();
		}.bind(this);

		this._preloadElement.addEventListener('load', this._loadListener);
		this._preloadElement.addEventListener('error', this._errorListener);
	},
	componentWillUnmount: function() {
		this._preloadElement.removeEventListener('load', this._loadListener);
		this._preloadElement.removeEventListener('error', this._errorListener);
	},
	componentWillUpdate: function(nextProps) {
		if (!this.loadImage(nextProps.src)) {
			this.refs.image.src = 'spinner.jpg';
		}
	},
	_onImageLoaded: function(href, width, height) {
		this.refs.image.src = href;
		this.props.onLoad(width, height);
	},
	loadImage: function(src) {
		if (!src) {
			this.refs.image.src = this.props.src = '';
			return;
		}

		var img = this._preloadElement;
		img.src = src;

		if (img.complete) {
			this._onImageLoaded(img.src, img.naturalWidth, img.naturalHeight);
			return true;
		} else {
			return false;
		}
	},
	render: function() {
		return <div className={'image-loader ' + this.props.className}>
			<img src={this.props.src} ref="image" />
		</div>
	}
});

module.exports = MediaDisplay;