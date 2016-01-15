var WebDavUI = require('./webdav-ui.js');
var domready = require("domready");

if (typeof function() {}.bind != 'function') {
	alert("This application won't work with this browser. Please get a new browser!");
}

domready(function () {
	try {
		WebDavUI(document.getElementById('webdav-ui'), '/files');
	} catch(e) {
		console.log(e);
		alert("D'oh! " + e);
	}
});