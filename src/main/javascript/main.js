var WebDavUI = require('./webdav-ui.js');
var WebDavClient = require('./webdav-client.js');
var React = require('react');
var ReactDOM = require('react-dom');
var domready = require("domready");

domready(function () {
	try {
		var element = document.getElementById('webdav-ui');
		var HelloMessage = React.createClass({
			render: function() {
				return <div>Hello {this.props.name}</div>;
			}
		});

		ReactDOM.render(<HelloMessage name="John" />, element);
	} catch(e) {
		console.log('ERROR: ' + e);
		alert("D'oh! " + e);
	}
	
	/*
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
	*/
	
	
	
	/*
	var form = document.getElementById('uploadform');

	form.onsubmit = function(e) {
		e.preventDefault();
		
		try {
			startUpload();
		} catch(e) {
			console.log("ERROR: " + e);
			alert("D'oh! " + e);
		}
	}
	*/

});