var log = require('./logger.js')('UploadButton');
var React = require('react');
var ReactDOM = require('react-dom');

var UploadButton = React.createClass({
	getDefaultProps: function() {
		return {
			onFilesSelected: function(files) {}
		}
	},
	handleButtonClick: function(evt) {
		this.refs.fileInput.click();
	},
	handleFilesAdded: function(evt) {
		try {
			evt.preventDefault();

			var input = evt.target;
			var files = input.files;

			if (files.length == 0) {
				alert('Please choose a file to upload');
				return;
			}

			// Invoke upload
			this.props.onFilesSelected(files);

			// Reset input field
			try{
				input.value = '';
				if (input.value) {
					input.type = 'text';
					input.type = 'file';
				}
			}catch(e){}
		} catch(error) {
			log.error('Upload initialization failed', error);
		}
	},
	render: function() {
		return <a href="javascript://upload" className="button upload-button" onClick={this.handleButtonClick} title="upload">
			<form>
				<input type="file" onChange={this.handleFilesAdded} multiple ref="fileInput" />
			</form>
		</a>
	}
});

module.exports = UploadButton;