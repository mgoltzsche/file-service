var logFactory = require('./logger.js');
var log = logFactory('main');
var WebDavClient = require('./webdav-client.js');
var WebDavUI = require('./webdav-ui.js');
var domready = require('domready');

var requiredSupport = function(name, obj) {
	if (typeof obj === 'undefined')
		throw "Your browser doesn't support " + name + "!\nThis application won't run on your browser.\nPlease use a newer browser.";
};

var removeLoader = function() {
	var loader = document.getElementById('loader');
	loader.parentNode.removeChild(loader);
};

domready(function () {
	try {
		requiredSupport('Function.bind', Function.prototype.bind);
		requiredSupport('Array.filter', Array.prototype.filter);

		// Register log factory to write error reports into WebDAV
		logFactory.setErrorReporter(function(completeLog) {
			var d2 = function(n) {
				return n < 10 ? '0' + n : n;
			};
			var client = new WebDavClient();
			var d = new Date();
			var reportId = d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate()) + '_' + d2(d.getHours()) + '-' + d2(d.getMinutes()) + '-' + d2(d.getSeconds()) + '_' + (Math.random() * 0xffffff).toString(16);
			var navigator = window.navigator;
			var reportContent = 'Error report ' + reportId
				+ "\n        Browser engine: " + navigator.product + ' ' + navigator.appVersion
				+ "\n        Platform: " + navigator.platform
				+ "\n        User agent: " + navigator.userAgent
				+ "\n        Language: " + navigator.language
				+ "\n        Viewport: " + window.innerWidth + 'x' + window.innerHeight
				+ "\n" + completeLog;

			// TODO: Add cookie to distinguish between users
			client.put('/files/bug-reports/' + reportId + '.log', reportContent, function() {}, function(status) {
				log.debug('Cannot report bug since server responded with ' + status);
			});
		});

		WebDavUI(document.getElementById('webdav-ui'), '/files');
		removeLoader();
	} catch(e) {
		log.error('Initialization failed', e);
		alert("D'oh! " + e);
	}
});