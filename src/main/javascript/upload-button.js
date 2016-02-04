var log = require('./logger.js')('UploadButton');
var React = require('react');
var ReactDOM = require('react-dom');
var formatSize = require('./format-size.js');

var UploadButton = React.createClass({
	getDefaultProps: function() {
		return {
			baseURL: '',
			onStarted: function(upload) {},
			onSuccess: function(upload) {},
			onError: function(upload, xhr) {},
			onProgress: function(upload, loaded, total) {}
		}
	},
	getInitialState: function() {
		return {
			uploadIdSequence: 0,
			baseURL: '',
		};
	},
	componentDidMount: function() {
		this.setBaseURL(this.props.baseURL);
	},
	componentWillUpdate: function(nextProps, nextState) {
		if (nextProps.baseURL !== this.props.baseURL) {
			this.setBaseURL(nextProps.baseURL);
			nextState = this.state.baseURL;
		}
	},
	setBaseURL: function(baseURL) {
		this.state.baseURL = baseURL.substring(baseURL.length - 1, baseURL.length) === '/' ? baseURL : baseURL + '/';
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
				alert("Please choose a file to upload");
				return;
			}

			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var upload = {
					id: 'upload' + this.state.uploadIdSequence++,
					label: file.name,
					info: ' (' + formatSize(file.size) + ')',
					done: 0,
					total: file.size
				};

				if (this.props.client.put(this.state.baseURL + file.name, file,
						function(upload) {
							this.props.onSuccess(upload);
						}.bind(this, upload),
						function(upload, status) {
							this.props.onError(upload, status);
						}.bind(this, upload),
						function(upload, loaded, total) {
							this.props.onProgress(upload, loaded, total);
						}.bind(this, upload))) {
					this.props.onStarted(upload);
				}
			}

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