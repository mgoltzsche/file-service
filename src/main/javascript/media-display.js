var log = require('./logger.js')('MediaDisplay');
var React = require('react');
var ReactDOM = require('react-dom');
var Dialog = require('./dialog.js');
var ImageLoader = require('./image-loader.js');

var MediaDisplay = React.createClass({
	getDefaultProps: function() {
		return {
			className: '',
			mediaHref: null,
			displayTypes: {
				'jpg': 'image',
				'jpeg': 'image',
				'png': 'image',
				'gif': 'image',
				'bmp': 'image',
				'mp4': 'stream',
				'mp3': 'stream',
				'txt': 'iframe',
				'html': 'iframe',
				'xhtml': 'iframe'
			},
			rewriteImageHref: function(href, width, height) {
				return href;
			},
			rewriteStreamHref: function(href) {
				return href;
			},
			onClose: function() {}
		};
	},
	getInitialState: function() {
		return {
			prefWidth: 100,
			prefHeight: 100,
			mediaHref: '',
			display: this.displays.hidden
		};
	},
	componentDidMount: function() {
		var mediaHref = this.props.mediaHref;

		if (typeof mediaHref == 'string' && mediaHref !== '') {
			this.display(mediaHref);
		}
	},
	componentWillUnmount: function() {
	},
	componentWillUpdate: function(nextProps, nextState) {
		if (nextProps.mediaHref !== this.props.mediaHref) {
			if (nextProps.mediaHref) {
				this.display(nextProps.mediaHref);
			} else {
				this.hide();
			}
		}
	},
	handleMediaError: function(e) {
		if (this.state.streamHref !== null) {
			// TODO: Fallback to iframe display
			/*log.debug('Media error for ' + this.state.streamHref + '. Falling back to iframe display');
			this.state.displayType = 'iframe';
			this.state.iframeHref = this.state.streamHref;
			this.state.streamHref = null;
			this.setState(this.state);*/
		}
	},
	handleClose: function() {
		this.props.onClose(this.state.mediaHref);
	},
	displays: {
		image: {
			name: 'image',
			show: function(self, href) {
				var maxWidth = self.refs.dialog.getMaxContentWidth();
				var maxHeight = self.refs.dialog.getMaxContentHeight();
				href = self.props.rewriteImageHref(href, maxWidth, maxHeight);
				self.refs.image.showImage(href);
			},
			clear: function(self) {
				self.refs.image.showImage();
			}
		},
		stream: {
			name: 'stream',
			show: function(self, href) {
				self.refs.stream.src = self.props.rewriteStreamHref(href);
				self.refs.stream.load();

				if (self.refs.stream.error) {
					log.debug('Video element error', self.refs.stream.error);
				}

				self.setPreferredSize(720, 480);
			},
			clear: function(self) {
				try {
					self.refs.stream.pause();
				} catch(e) {
					log.error('Cannot pause video element', e);
				}
			}
		},
		iframe: {
			name: 'iframe',
			show: function(self, href) {
				self.refs.iframe.src = href;
				self.refs.dialog.setPreferredSize(1000, 1000, false);
			},
			clear: function(self) {
				self.refs.iframe.src = '';
			}
		},
		download: {
			name: 'download',
			show: function(self, href) {
				self.refs.download.href = href;
				self.setPreferredSize(320, 240);
			},
			clear: function() {}
		},
		hidden: {
			name: 'hidden',
			show: function() {},
			clear: function() {}
		}
	},
	display: function(mediaHref) {
		if (this.state.mediaHref !== mediaHref) {
			var extension = mediaHref.split('.').pop().toLowerCase();
			var displayType = this.props.displayTypes[extension] || 'download';
			var display = this.displays[displayType];

			if (!display)
				throw 'Unsupported media display type: ' + displayType;

			log.debug('Display ' + display.name + ' ' + mediaHref);
			this.state.mediaHref = mediaHref;
			this.state.display.clear(this);
			display.show(this, mediaHref);
			this.state.display = display;
			this.refs.label.href = mediaHref;
			this.refs.label.title = mediaHref;
			this.refs.label.innerHTML = decodeURIComponent(mediaHref.split('/').pop());
			this.refs.container.className = this.getClassName();
			this.refs.dialog.show();

//			this.setState(this.state);
		} else {
			log.debug('Display ' + this.state.display.name + ' ' + mediaHref);
			this.state.display.show(this, mediaHref);
			this.refs.dialog.show()
		}
	},
	hide: function() {
		if (this.state.display !== this.displays.hidden) {
			this.state.display.clear(this);
			this.refs.dialog.hide();
		}
	},
	setPreferredSize: function(width, height) {
		this.refs.dialog.setPreferredSize(width, height, true); // Cheaper than setState
	},
	getClassName: function() {
		return 'media-display-' + this.state.display.name + ' ' + this.props.className;
	},
	render: function() {
		log.debug('RENDER MEDIA DISPLAY');
		var mediaName = decodeURIComponent(this.state.mediaHref.split('/').pop());
		var footer = <a ref="label">{mediaName}</a>;

		return <Dialog className={'media-display' + (this.props.className ? ' ' + this.props.className : '')} footer={footer} onClose={this.handleClose} prefWidth={this.state.prefWidth} prefHeight={this.state.prefHeight} resizeProportional={true} ref="dialog">
			<div className={this.getClassName()} ref="container">
				<ImageLoader className="image-display" onLoad={this.setPreferredSize} ref="image" />
				<video className="stream-display" width="100%" height="100%" controls onError={this.handleMediaError} ref="stream">
					<span>Your browser does not support the video element. Go get a new Browser!</span>
				</video>
				<iframe className="iframe-display" width="100%" height="100%" ref="iframe" />
				<a className="download-display" title="Download" ref="download">Download</a>
			</div>
		</Dialog>
	}
});

module.exports = MediaDisplay;