var log = require('./logger.js')('Dialog');
var React = require('react');
var ReactDOM = require('react-dom');
var domready = require("domready");

var addClassName = function(classNames, className) {
	return removeClassName(classNames, className) + ' ' + className;
};
var removeClassName = function(classNames, className) {
	var classNamesSplit = classNames.split(' ');
	var newClassNames = [];

	for (var i = 0; i < classNamesSplit.length; i++)
		if (name !== '' && name !== className)
			newClassNames.push(name);

	return newClassNames.join(' ');
};

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
			show: false,
			header: null,
			footer: null,
			resizeProportional: false,
			prefWidth: 0,
			prefHeight: 0,
			marginX: 20,
			marginY: 20,
			onResize: function() {},
			onClose: function() {}
		};
	},
	componentDidMount: function() {
		// Register escape keyup, resize and modal overlay click listeners
		this._escListener = function(e) {
			if (this._show && e.keyCode === 27) {
				this.handleClose(e);
			}
		}.bind(this);
		this._resizeListener = function(e) {
			if (this._show)
				this.resize();
		}.bind(this);
		this._modalOverlayClickListener = function() {
			this.hide();
		}.bind(this);

		// Detect outer size of dialog as offset x/y
		// ATTENTION: Requires CSS to be loaded before this javascript
		var dialog = this.refs.dialog;
		var content = this.refs.content;
		content.style.visibility = 'hidden';
		content.style.overflow = 'hidden';
		content.style.display = 'block';
		dialog.style.display = 'block';
		dialog.style.position = 'fixed';
		dialog.style.left = '-2000px';
		dialog.style.top = '-2000px';
		var testSize = '1000px';
		content.style.width = testSize;
		content.style.height = testSize;
		content.style.minWidth = testSize;
		content.style.minHeight = testSize;
		content.style.maxWidth = testSize;
		content.style.maxHeight = testSize;
		this._offsetX = dialog.offsetWidth - 1000; // Detect offset x
		this._offsetY = dialog.offsetHeight - 1000; // Detect offset y
		log.debug('Detected offset: x: ' + this._offsetX + ', y: ' + this._offsetY);
		content.removeAttribute('style'); // Remove all inline styles used to detect offset
		dialog.removeAttribute('style');

		if (this._offsetX < 0) this._offsetX = 0; // Fallback on error
		if (this._offsetY < 0) this._offsetY = 0; // Fallback on error

		this._prefWidth = this.props.prefWidth;
		this._prefHeight = this.props.prefHeight;
		this._resizeProportional = this.props.resizeProportional;
		this.resize();

		document.body.addEventListener('keyup', this._escListener);
		window.addEventListener('resize', this._resizeListener);

		if (this.props.show) {
			this._show = false;
			this.show();
		} else {
			this._show = false;
			this.updateClassName();
		}
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
		if (nextProps.show !== this.props.show) {
			(nextProps.show ? this.show : this.hide)();
		}
	},
	handleClose: function(e) {
		e.preventDefault();
		this.hide();
	},
	toggle: function() {
		(this._show ? this.hide : this.show)();
	},
	show: function() {
		if (!this._show) {
			this._show = true;
			modalOverlay.addClickListener(this._modalOverlayClickListener);
			modalOverlay.show();
			this.resize();
			this.updateClassName();
			return true;
		}
		
		return false;
	},
	hide: function() {
		if (this._show) {
			// Set state before listener invocation to guarantee method is not executed reentrant
			this._show = false;

			try {
				this.props.onClose();
			} catch(e) {
				log.error('Error in dialog close listener', e);
			}

			modalOverlay.hide();
			modalOverlay.removeClickListener(this._modalOverlayClickListener);
			this.updateClassName();
			return true;
		}
		
		return false;
	},
	/* Method to set preferred size manually without rerendering everything */
	setPreferredContentSize: function(width, height, resizeProportional) {
		var proportionalDefined = typeof resizeProportional !== 'undefined';

		if (this._prefWidth !== width || this._prefHeight !== height ||
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
		log.debug('Resize to ' + this._prefWidth + 'x' + this._prefHeight);
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

		this._maxContentWidth = maxWidth;
		this._maxContentHeight = maxHeight;
		this.props.onResize(maxWidth, maxHeight);
	},
	getMaxContentWidth: function() {
		return this._maxContentWidth;
	},
	getMaxContentHeight: function() {
		return this._maxContentHeight;
	},
	getClassName: function() {
		var className = 'dialog';

		if (typeof this.props.className === 'string') {
			className += ' ' + this.props.className;
		}

		return className + (this._show ? ' open' : ' hidden');
	},
	updateClassName: function() {
		this.refs.dialog.className = this.getClassName();
	},
	render: function() {
		log.debug('RENDER DIALOG');
		return <div className={this.getClassName()} ref="dialog">
			<div className="dialog-header" ref="header">
				{this.props.header}
				<a javascript="javascript://close" className="dialog-close" onClick={this.handleClose}></a>
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
	var modalElement = document.createElement('div');
	modalElement.className = 'dialog-modal-overlay hidden';
	modalElement.addEventListener('click', modalOverlay.onClick.bind(modalOverlay));
	document.body.appendChild(modalElement);
	modalOverlay._element = modalElement;
});

module.exports = Dialog;