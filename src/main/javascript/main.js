var log = require('./logger.js')('main');
var WebDavUI = require('./webdav-ui.js');
var domready = require('domready');

var requiredSupport = function(name, obj) {
	if (typeof obj === 'undefined')
		throw "Your browser doesn't support " + name + "!\nThis application won't run on your browser.\nPlease use a different browser.";
};

domready(function () {
	requiredSupport('XMLHttpRequest', XMLHttpRequest);
	requiredSupport('Function.bind', Function.prototype.bind);

	try {
		requiredSupport('Web Worker', Worker);
		WebDavUI(document.getElementById('webdav-ui'), '/files');
	} catch(e) {
		log.error('Initialization failed', e);
		alert("D'oh! " + e);
	}
});