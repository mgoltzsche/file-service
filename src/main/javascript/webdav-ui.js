var WebDavClient = require('./webdav-client.js');

function WebDavUI(element, webDavClient) {
	this._element = element;
	this._client = webDavClient;
};

try {
	module.exports = WebDavUI;
} catch(e) {} 

WebDavUI.prototype._init = function() {
	this._client.propfind('', 1, function(docs) {
		for (var i = 0; i < docs.length; i++) {
			docs[i];//TODO
		}
	});
};

WebDavUI.prototype.update = function() {

};


alert(require.main + "    ===    " + module);

if (require.main === module) {
	var fileInput = document.getElementById("fileinput");
	var progressBar = document.getElementById("progressBar");
	var client = new WebDavClient("/files", function(e) {
		progressBar.value = e.loaded / e.total * 100;
	});
	
	var name = 'World';
	
	alert(`Hello ${name}!
	
	asdf`);

	client.propfind("", 1, function(docs) {
		for (var i = 0; i < docs.length; i++) {
			console.log(docs[i]);
		}
	});
}
