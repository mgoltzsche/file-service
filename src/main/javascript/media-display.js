var log = require('./logger.js')('MediaDisplay');
var React = require('react');
var ReactDOM = require('react-dom');
var Dialog = require('./dialog.js');
var ImageLoader = require('./image-loader.js');

var MediaDisplay = React.createClass({
	getDefaultProps: function() {
		return {
			className: '',
			media: [],
			index: 0,
			displayTypes: {
				'jpg': 'image',
				'jpeg': 'image',
				'png': 'image',
				'gif': 'image',
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
			onDisplay: function(media, index) {},
			onClose: function(media, index) {}
		};
	},
	getInitialState: function() {
		return {
			prefWidth: 100,
			prefHeight: 100,
			media: [],
			index: 0,
			display: this.displays.hidden
		};
	},
	componentDidMount: function() {
		this._keyupListener = function(e) {
			if (e.keyCode === 39) {
				this.next();
			} else if (e.keyCode === 37) {
				this.previous();
			}
		}.bind(this);

		if (this.props.media.length > 0)
			this.displayMedia(this.props.media, this.props.index);
	},
	componentWillUpdate: function(nextProps, nextState) {
		if (nextProps.media !== this.props.media ||
				nextProps.index !== this.props.index) {
			if (nextProps.media.length > 0) {
				this.displayMedia(nextProps.media, nextProps.index);
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
		this.props.onClose(this.state.media, this.state.index);
	},
	displays: {
		image: {
			name: 'image',
			show: function(self, media) {
				var maxWidth = self.refs.dialog.getMaxContentWidth();
				var maxHeight = self.refs.dialog.getMaxContentHeight();
				href = self.props.rewriteImageHref(media.href, maxWidth, maxHeight);
				self.refs.image.showImage(href);
			},
			clear: function(self) {
				self.refs.image.showImage();
			}
		},
		stream: {
			name: 'stream',
			show: function(self, media) {
				self.refs.stream.src = self.props.rewriteStreamHref(media.href);
				self.refs.stream.load();

				if (self.refs.stream.error) {
					log.debug('Video element error', self.refs.stream.error);
				}

				self.refs.dialog.setPreferredContentSize(720, 480);
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
			show: function(self, media) {
				self.refs.iframe.src = media.href;
				self.refs.dialog.setPreferredContentSize(1024, 1024, false);
			},
			clear: function(self) {
				self.refs.iframe.src = '';
			}
		},
		download: {
			name: 'download',
			show: function(self, media) {
				self.refs.download.href = media.href;
				self.refs.dialog.setPreferredContentSize(320, 240);
			},
			clear: function() {}
		},
		hidden: {
			name: 'hidden',
			show: function() {},
			clear: function() {}
		}
	},
	displayMedia: function(media, index) {
		if (media.length === 0) {
			this.hide();
			return;
		}

		var active = this.state.display !== this.displays.hidden;

		if (active && media === this.state.media && index === this.state.index)
			return;

		if (typeof index === 'undefined')
			index = 0;

		if (index < 0 || index >= media.length)
			throw 'MediaDisplay index out of range';

		if (this.state.display === this.displays.hidden) {
			document.addEventListener('keyup', this._keyupListener);
		}

		this.state.media = media;
		this.state.index = index;

		if (!active)
			this.refs.dialog.setPreferredContentSize(100, 100, false);

		this._update();
		this.refs.dialog.show();
		this.props.onDisplay(media, index);
	},
	_update: function() {
		var media = this.state.media;
		var index = this.state.index;
		var currentMedia = media[index];
		var href = currentMedia.href;
		var label = currentMedia.label;
		var extension = href.split('.').pop().toLowerCase();
		var displayType = this.props.displayTypes[extension] || 'download';
		var display = this.displays[displayType];

		if (!display)
			throw 'Unsupported media display type: ' + displayType;

		// Hide last display if different media format
		if (display !== this.state.display)
			this.state.display.clear(this);

		// Show new display with href
		this.state.display = display;
		this.state.display.show(this, currentMedia);

		// Update label
		if (media.length > 0) {
			label += ' (' + (index + 1) + '/' + media.length + ')';
		}

		this.refs.label.href = href;
		this.refs.label.title = href;
		this.refs.label.innerHTML = label;

		this._updateControls();
		this.refs.container.className = 'media-display-' + this.state.display.name + ' ' + this.props.className;
	},
	_updateControls: function() {
		this.refs.previous.className = 'previous' + (this.state.index > 0 ? '' : ' hidden');
		this.refs.next.className = 'next' + (this.state.index < this.state.media.length - 1 ? '' : ' hidden');
	},
	hide: function() {
		if (this.state.display !== this.displays.hidden) {
			this.state.display.clear(this);
			this.state.display = this.displays.hidden;
			this.refs.dialog.hide();
			document.removeEventListener('keyup', this._keyupListener);
		}
	},
	handlePrevious: function(e) {
		e.preventDefault();
		this.previous();
	},
	handleNext: function(e) {
		e.preventDefault();
		this.next();
	},
	previous: function() {
		if (this.state.index > 0) {
			this.state.index--;
			this._update();
			this.props.onDisplay(this.state.media, this.state.index);
		}
	},
	next: function() {
		if (this.state.index < this.state.media.length - 1) {
			this.state.index++;
			this._update();
			this.props.onDisplay(this.state.media, this.state.index);
		}
	},
	handleImageLoaded: function(href, width, height) {
		this.refs.dialog.setPreferredContentSize(width, height, true); // Cheaper than setState
	},
	render: function() {
		log.debug('RENDER MEDIA DISPLAY');
		var footer = <div>
			<a ref="previous" title="previous" onClick={this.handlePrevious}></a>
			<a ref="label" className="media-display-label"></a>
			<a ref="next" title="next" onClick={this.handleNext}></a>
		</div>;

		return <Dialog className={'media-display' + (this.props.className ? ' ' + this.props.className : '')} footer={footer} onClose={this.handleClose} prefWidth={this.state.prefWidth} prefHeight={this.state.prefHeight} resizeProportional={true} ref="dialog">
			<div ref="container">
				<ImageLoader className="image-display" onLoad={this.handleImageLoaded} ref="image" />
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