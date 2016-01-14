var WebDavClient = require('./webdav-client.js');
var React = require('react');
var ReactDOM = require('react-dom');

function WebDavUI(element, webDavClient) {
	if (typeof document == 'undefined') {
		throw 'WebDavUI runs in a browser environment only. Missing document variable.';
	}
	this._id = typeof element == 'string'
		? element : (element.id ? element.id : 'webdav-ui-' + Math.round((Math.random() * Math.pow(2, 36))).toString(36));
	this._element = typeof element == 'string' ? document.getElementById(element) : element;
	this._client = webDavClient;
};

try {
	module.exports = WebDavUI;
} catch(e) {}

WebDavUI.prototype._init = function() {
	this._client.propfind('', 1, function(docs) {
		for (var i = 0; i < docs.length; i++) {
			//TODO
			docs.href();
			docs.children();
		}
	});
};

WebDavUI.prototype.upload = function() {
	var fileInput = document.getElementById("fileinput");
	var progressBar = document.getElementById("progressBar");
	var WebDavClient = require('./webdav-client.js');
	var client = new WebDavClient("/files", function(e) {
		progressBar.value = e.loaded / e.total * 100;
	});

	if (fileInput.files.length == 0) {
		alert("Please choose a file");
		return;
	}

	progressBar.value = 0;

	client.put('/' + fileInput.files[0].name, fileInput.files[0], function() {
	});
};

WebDavUI.prototype.update = function() {

};
