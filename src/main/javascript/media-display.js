var React = require('react');
var ReactDOM = require('react-dom');

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
			onClose: function() {},
			resizeProportional: true,
			preferredWidth: 0,
			preferredHeight: 0,
			minMargin: 10,
			footerHeight: 30
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
		this._preferredWidth = this.props.preferredWidth;
		this._preferredHeight = this.props.preferredHeight;
		var mediaHref = this.props.mediaHref;

		if (typeof mediaHref == 'string' && mediaHref !== '') {
			this.display(mediaHref);
		}

		this._escListener = (function(self) {return function(e) {
			if (self.state.displayType !== 'hidden' && e.keyCode === 27) {
				self.handleClose(e);
			}
		};})(this);
		this._resizeListener = (function(self) {return function(e) {
			self.resize();
		};})(this);

		document.body.addEventListener('keyup', this._escListener);
		window.addEventListener('resize', this._resizeListener);
		//this.refs.footer.style.height = this.props.footerHeight + 'px';
		this.resize();
	},
	componentWillUnmount: function() {
		document.body.removeEventListener('keyup', this._escListener);
		window.removeEventListener('resize', this._resizeListener);
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
	handleClose: function(e) {
		e.preventDefault();
		if (this.props.onClose(this.state.mediaHref) !== false) {
			this.hide();
		}
	},
	avoidClose: function(e) {
		e.stopPropagation();
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
			this.resize();

			if (displayType === 'video') {
				this.refs.streamDisplay.load();

				if (this.refs.streamDisplay.error) {
					console.log('Video element error: ' + this.refs.streamDisplay.error);
				}
			}
		}
	},
	hide: function() {
		if (this.state.displayType !== 'hidden') {
			this._clearState(this.getInitialState());
		}
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
	setPreferredSize: function(width, height, resizeProportional) {
		var proportionalDefined = typeof resizeProportional !== 'undefined';

		if (this.props.preferredWith !== width || this.props.preferredHeight !== height ||
				proportionalDefined && this.props.resizeProportional !== resizeProportional) {
			this._preferredWidth = width || 0;
			this._preferredHeight = height || 0;

			if (proportionalDefined) {
				this.props.resizeProportional = resizeProportional;
			}

			this.resize();
		}
	},
	resize: function() {
		var canvasStyle = this.refs.canvas.style;
		var margin = this.props.minMargin * 2;
		var maxWidth = window.innerWidth - margin;
		var maxHeight = window.innerHeight - margin - this.props.footerHeight; // TODO: use derived footer height
		var width = this._preferredWidth;
		var height = this._preferredHeight;
		var bothAxisDefined = width > 0 && height > 0;
		var proportional = this.props.resizeProportional;

		if (bothAxisDefined && proportional) {
			var resizeFactor = Math.min(maxWidth / width, maxHeight / height);

			if (resizeFactor < 1) {
				width = Math.floor(width * resizeFactor);
				height = Math.ceil(height * resizeFactor);
			}
		} else {
			if (width > maxWidth)
				width = Math.floor(width * (maxWidth / width));
			if (height > maxHeight)
				height = Math.floor(height * (maxHeight / height));
		}

		canvasStyle.maxWidth = maxWidth + 'px';
		canvasStyle.maxHeight = maxHeight + 'px';
		canvasStyle.overflow = proportional ? 'hidden' : 'auto';

		if (bothAxisDefined) {
			canvasStyle.width = width + 'px';
			canvasStyle.height = height + 'px';
		} else {
			canvasStyle.width = width > 0 ? width + 'px' : 'auto';
			canvasStyle.height = height > 0 ? height + 'px' : 'auto';
		}
	},
	render: function() {
		return <section className={'media-display media-display-' + this.state.displayType}>
			<div className="media-display-overlay" onClick={this.handleClose}> </div>
			<div className="media-display-content-table">
				<div className="media-display-content-cell" onClick={this.handleClose}>
					<div className="media-display-content-border" onClick={this.avoidClose}>
						<a className="media-display-close" onClick={this.handleClose}>X</a>
						<div className="media-display-content">
							<div className="media-display-canvas" ref="canvas">
								<ImageDisplay src={this.state.imageHref} onLoad={this.setPreferredSize} />
								<video className="video-display" width="100%" height="100%" src={this.state.streamHref} controls onError={this.handleMediaError} ref="streamDisplay">
									<span>Your browser does not support the video element. Go get a new Browser!</span>
								</video>
								<iframe className="iframe-display" src={this.state.iframeHref} />
							</div>
							<div className="media-display-footer" ref="footer">
								<div className="download-display">
									<a href={this.state.mediaHref} title={this.state.mediaHref}>download</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	}
});

var ImageDisplay = React.createClass({
	getDefaultProps: function() {
		return {
			src: '',
			onLoad: function(width, height) {}
		};
	},
	componentDidMount: function() {
		this._loadListener = function(e) {
			console.log('image loaded: ' + e.target.src + '  ' + e.target.naturalWidth + 'x' + e.target.naturalHeight);
			this.props.onLoad(e.target.naturalWidth, e.target.naturalHeight);
		}.bind(this);
		this._errorListener = function(e) {
			console.log('Error: Failed to load image: ' + e.target.src);
		}.bind(this);

		this.refs.image.addEventListener('load', this._loadListener);
		this.refs.image.addEventListener('error', this._errorListener);
	},
	componentWillUnmount: function() {
		this.refs.image.removeEventListener('load', this._loadListener);
		this.refs.image.removeEventListener('error', this._errorListener);
	},
	render: function() {
		return <div className="image-display">
			<img src={this.props.src} ref="image" />
		</div>
	}
});

module.exports = MediaDisplay;