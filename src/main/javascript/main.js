var log = require('./logger.js')('main');
var WebDavUI = require('./webdav-ui.js');
var domready = require("domready");

if (typeof function() {}.bind != 'function') {
	alert("This application won't work with this browser. Please get a new browser!");
}

var requiredSupport = function(name, obj) {
	if (typeof obj === 'undefined')
		throw "Your browser doesn't support " + name + "!\nThis application won't run on your browser.\nPlease use a different browser.";
};

domready(function () {
	try {
		requiredSupport('XMLHttpRequest', XMLHttpRequest);
		requiredSupport('Function.bind', Function.prototype.bind);
		requiredSupport('Web Worker', Worker);
		WebDavUI(document.getElementById('webdav-ui'), '/files');
	} catch(e) {
		log.error('Initialization failed', e);
		alert("D'oh! " + e);
	}
});