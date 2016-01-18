var log = require('./logger.js');
var React = require('react');
var ReactDOM = require('react-dom');
var domready = require("domready");

var modalOverlay = {
	hidden: true,
	clickListeners: [],
	addClickListener: function(listener) {
		this.clickListeners.push(listener);
	},
	removeClickListener: function(listener) {
		for (var i = 0; i < this.clickListeners.length; i++) {
			if (this.clickListeners[i] === listener) {
				delete this.clickListeners[i];
				return;
			}
		}
	},
	onClick: function(e) {
		e.stopPropagation();
		var lastClickListener = this.clickListeners.pop();

		if (lastClickListener)
			lastClickListener();
	},
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
			open: false,
			header: null,
			footer: null,
			resizeProportional: false,
			prefWidth: 0,
			prefHeight: 0,
			marginX: 10,
			marginY: 10,
			onClose: function() {}
		};
	},
	getInitialState: function() {
		return {
			hidden: true,
			active: false
		};
	},
	componentDidMount: function() {
		// Register escape keyup, resize and modal overlay click listeners
		this._escListener = function(e) {
			if (this.state.active && e.keyCode === 27) {
				this.handleClose(e);
			}
		}.bind(this);
		this._resizeListener = function(e) {
			if (!this.state.hidden)
				this.resize();
		}.bind(this);
		this._modalOverlayClickListener = function() {
			if (this.state.active)
				this.hide();
		}.bind(this);

		document.body.addEventListener('keyup', this._escListener);
		window.addEventListener('resize', this._resizeListener);

		// Detect outer size of dialog as offset x/y
		var dialog = this.refs.dialog;
		var content = this.refs.content;
		content.style.visibility = 'hidden';
		content.style.overflow = 'hidden';
		content.style.width = content.style.minWidth = content.style.maxWidth = '1000px';
		content.style.height = content.style.minHeight = content.style.maxHeight = '1000px';
		this._offsetX = dialog.offsetWidth - 1000; // Detect offset x
		this._offsetY = dialog.offsetHeight - 1000; // Detect offset y
		content.removeAttribute('style'); // Remove all inline styles
		log.debug('offsetX: ' + this._offsetX);

		this._prefWidth = this.props.prefWidth;
		this._prefHeight = this.props.prefHeight;
		this._resizeProportional = this.props.resizeProportional;
		this.resize();
	},
	componentWillUnmount: function() {
		document.body.removeEventListener('keyup', this._escListener);
		window.removeEventListener('resize', this._resizeListener);
		modalOverlay.removeClickListener(this._modalOverlayClickListener); // In case dialog has not been closed
	},
	componentWillUpdate: function(nextProps, nextState) {
		// Resize dialog if props changed
		if (nextProps.prefWidth !== this.props.prefWidth ||
				nextProps.prefHeight !== this.props.prefHeight ||
				nextProps.resizeProportional !== this.props.resizeProportional) {
			this._prefWidth = nextProps.prefWidth;
			this._prefHeight = nextProps.prefHeight;
			this._resizeProportional = nextProps.resizeProportional;
			this.resize();
		}

		// Open/close dialog if props changed
		// TODO
	},
	handleClose: function(e) {
		e.preventDefault();
		this.hide();
	},
	open: function() {
		if (this.state.hidden) {
			modalOverlay.addClickListener(this._modalOverlayClickListener);
			modalOverlay.show();
			this.setState({hidden: false, active: true});
		}
	},
	hide: function() {
		if (!this.state.hidden) {
			// Set state before listener invocation to guarantee method is not executed reentrant
			this.state.hidden = true;
			this.state.active = false;

			try {
				this.props.onClose();
			} catch(e) {
				log.error('Error in dialog close listener', e);
			}

			this.setState(this.state);
			modalOverlay.hide();
			modalOverlay.removeClickListener(this._modalOverlayClickListener);
		}
	},
	/* Method to set preferred size manually without rerendering everything */
	setPreferredSize: function(width, height, resizeProportional) {
		var proportionalDefined = typeof resizeProportional !== 'undefined';

		if (this._prefWidth !== width || this._prefWidth !== height ||
				proportionalDefined && this._resizeProportional !== resizeProportional) {
			this._prefWidth = width || 0;
			this._prefHeight = height || 0;

			if (proportionalDefined) {
				this._resizeProportional = resizeProportional;
			}

			this.resize();
		}
	},
	resize: function() {
		log.debug('Resize dialog: ' + this._prefWidth + 'x' + this._prefHeight);
		var contentStyle = this.refs.content.style;
		var vpWidth = window.innerWidth;
		var vpHeight = window.innerHeight;
		var maxWidth = vpWidth - this._offsetX - this.props.marginX * 2;
		var maxHeight = vpHeight - this._offsetY - this.props.marginY * 2;
		var width = this._prefWidth;
		var height = this._prefHeight;
		var proportional = this._resizeProportional;
		var bothAxisDefined = width > 0 && height > 0;

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

		contentStyle.maxWidth = maxWidth + 'px';
		contentStyle.maxHeight = maxHeight + 'px';
		contentStyle.overflow = proportional ? 'hidden' : 'auto';

		if (bothAxisDefined) {
			contentStyle.width = width + 'px';
			contentStyle.height = height + 'px';
		} else {
			contentStyle.width = width > 0 ? width + 'px' : 'auto';
			contentStyle.height = height > 0 ? height + 'px' : 'auto';
		}

		//var dialog = this.refs.dialog;
		//var left = Math.floor(vpWidth / 2 - dialog.offsetWidth / 2);
		//var top = Math.floor(vpHeight / 2 - dialog.offsetHeight / 2);
		//dialog.style.left = left + 'px';
		//dialog.style.top = top + 'px';
	},
	render: function() {
		log.debug('RENDER DIALOG');
		return <div className={'dialog ' + this.props.className + (this.state.hidden ? ' hidden' : ' open')} ref="dialog">
			<div className="dialog-header" ref="header">
				{this.props.header}
				<a className="dialog-close" onClick={this.handleClose}>X</a>
			</div>
			<div className="dialog-content" ref="content">
				{this.props.children}
			</div>
			<div className="dialog-footer" ref="footer">
				{this.props.footer}
			</div>
		</div>
	}
});

domready(function () {
	modalElement = document.createElement('div');
	modalElement.className = 'dialog-modal-overlay hidden';
	modalElement.addEventListener('click', modalOverlay.onClick.bind(modalOverlay));
	document.body.appendChild(modalElement);
	modalOverlay._element = modalElement;
});

module.exports = Dialog;