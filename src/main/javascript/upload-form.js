var React = require('react');
var ReactDOM = require('react-dom');
var formatSize = require('./format-size.js');

var UploadForm = React.createClass({
	getDefaultProps: function() {
		return {onUploadComplete: function() {}}
	},
	getInitialState: function() {
		return {queue: []};
	},
	componentDidMount: function() {
		this._uploadCount = 0;
	},
	removePendingUpload: function(upload) {
		var queue = this.state.queue;

		for (var i = 0; i < queue.length; i++) {
			if (queue[i] === upload) {
				delete queue[i];
				this.setState(this.state);
				return;
			}
		}
	},
	handleFilesAdded: function(e) {
		e.preventDefault();

		var input = e.target;
		var files = input.files;

		if (files.length == 0) {
			alert("Please choose a file to upload");
			return;
		}

		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			var uploadState = {
				name: file.name,
				size: file.size,
				id: 'upload-' + this._uploadCount++,
				progress: 0,
				onProgressChange: function(progress) {}
			};

			this.state.queue.push(uploadState);
			this.props.client.put(this.props.baseURL + file.name, file, (function(self, uploadState) {return function() {
				try {
					self.props.onUploadComplete();
				} catch(e) {
					console.log('Error in upload complete listener: ' + e);
				}
				self.removePendingUpload(uploadState);
			};})(this, uploadState),
			(function(self, upload) {return function(e) {
				upload.progress = Math.round(e.loaded / e.total) * 100;
				console.log(upload.id + ' progress:  ' + upload.progress);
				upload.onProgressChange(upload.progress);
			};})(this, uploadState),
			(function(self, uploadState) {return function() {
				self.removePendingUpload(uploadState);
				alert('Failed to upload ' + file.name);
			};})(this, uploadState));
		}

		// Reset input field
		try{
			input.value = '';
			if(input.value){
				input.type = 'text';
				input.type = 'file';
			}
		}catch(e){}
	},
	render: function() {
		return <section>
			<form onSubmit={this.upload}>
				<div>
					<input type="file" onChange={this.handleFilesAdded} multiple />
					<button>upload</button>
				</div>
				<PendingUploads uploads={this.state.queue} />
			</form>
		</section>
	}
});

var PendingUploads = React.createClass({
	render: function() {
		var pendingUploads = this.props.uploads.map(function(item) {
			<PendingUploadItem item={item} />
		});

		return <ul className="uploads-pending">
			{pendingUploads}
		</ul>;
	}
});

var PendingUploadItem = React.createClass({
	getInitialState: function() {
		return {progress: 0};
	},
	render: function() {
		var item = this.props.item;
		this.props.onProgressChange = (function(self) {return function(progress) {
			self.setState({progress: progress});
		};})(this)

		return <li className="upload-item" key={item.id}>
			<div>
				{item.name} 
				<span className="upload-item-size">
					({formatSize(item.size)})
				</span>
			</div>
			<progress max="100" value={this.state.progress}></progress>
		</li>;
	}
});

module.exports = UploadForm;