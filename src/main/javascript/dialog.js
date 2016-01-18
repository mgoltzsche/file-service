var React = require('react');
var ReactDOM = require('react-dom');
var domready = require("domready");

var addClassName = function(classNames, className) {
}

var modalOverlay = {
	hidden: true,
	show: function() {
		if (this.hidden) {
			this._element.className = 'dialog-modal-overlay';
			this.hidden = false;
		}
	},
	hide: function() {
		if (!this.hidden) {
			this._element.className = 'dialog-modal-overlay hidden';
			this.hidden = true;
		}
	}
}

var Dialog = React.createClass({
	getDefaultProps: function() {
		return {
			header: null,
			footer: null,
			onClose: function() {},
			resizeProportional: false,
			preferredWidth: 0,
			preferredHeight: 0,
			minMargin: 10,
			footerHeight: 30
		};
	},
	getInitialState: function() {
		return {hidden: true};
	},
	componentDidMount: function() {
		this._escListener = function(e) {
			if (!this.state.hidden && e.keyCode === 27) {
				this.handleClose(e);
			}
		}.bind(this);
		this._resizeListener = function(e) {
			this.resize();
		}.bind(this);

		document.body.addEventListener('keyup', this._escListener);
		window.addEventListener('resize', this._resizeListener);
		
		this.resizeProportional = this.props.resizeProportional;
		this.preferredWidth = this.props.preferredWidth;
		this.preferredHeight = this.props.preferredHeight;
		this.resize();
	},
	componentWillUnmount: function() {
		document.body.removeEventListener('keyup', this._escListener);
		window.removeEventListener('resize', this._resizeListener);
	},
	componentWillUpdate: function(nextProps) {
		if (nextProps.preferredWidth !== this.props.preferredWidth ||
				nextProps.preferredHeight !== this.props.preferredHeight ||
				nextProps.resizeProportional !== this.props.resizeProportional) {
			this.setPreferredSize(nextProps.preferredWidth, nextProps.preferredHeight, nextProps.resizeProportional);
		}
	},
	handleClose: function(e) {
		e.preventDefault();
		this.hide();
	},
	avoidClose: function(e) {
		e.stopPropagation();
	},
	open: function() {
		if (this.state.hidden) {
			modalOverlay.show();
			this.resize();
			this.setState({hidden: false});
			return true;
		} else {
			return false;
		}
	},
	hide: function() {
		if (!this.state.hidden) {
			this.props.onClose();
			this.setState({hidden: true});
			modalOverlay.hide();
			return true;
		} else {
			return false;
		}
	},
	setPreferredSize: function(width, height, resizeProportional) {
		var proportionalDefined = typeof resizeProportional !== 'undefined';

		if (this.preferredWidth !== width || this.preferredWidth !== height ||
				proportionalDefined && this.resizeProportional !== resizeProportional) {
			this.preferredWidth = width || 0;
			this.preferredHeight = height || 0;

			if (proportionalDefined) {
				this.resizeProportional = resizeProportional;
			}

			this.resize();
		}
	},
	resize: function() {
		var canvasStyle = this.refs.content.style;
		var margin = this.props.minMargin * 2;
		var maxWidth = window.innerWidth - margin;
		var maxHeight = window.innerHeight - margin - this.props.footerHeight; // TODO: use derived footer height
		var width = this.preferredWidth;
		var height = this.preferredHeight;
		var bothAxisDefined = width > 0 && height > 0;
		var proportional = this.resizeProportional;

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
		var className = 'dialog ' + this.props.className + (this.state.hidden ? ' hidden' : '');

		return <section className={className}>
			<div className="media-display-content-table">
				<div className="media-display-content-cell" onClick={this.handleClose}>
					<div className="media-display-content-border" onClick={this.avoidClose}>
						<a className="media-display-close" onClick={this.handleClose}>X</a>
						<div className="media-display-content">
							<div className="dialog-header" ref="header">
								{this.props.header}
							</div>
							<div className="media-display-canvas" ref="content">
								{this.props.children}
							</div>
							<div className="media-display-footer" ref="footer">
								{this.props.footer}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	}
});

domready(function () {
	modalElement = document.createElement('div');
	modalElement.className = 'dialog-modal-overlay hidden';
	document.body.appendChild(modalElement);
	modalOverlay._element = modalElement;
});

module.exports = Dialog;