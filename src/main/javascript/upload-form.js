var log = require('./logger.js')('UploadForm');
var React = require('react');
var ReactDOM = require('react-dom');
var formatSize = require('./format-size.js');

var UploadForm = React.createClass({
	getDefaultProps: function() {
		return {onUploadComplete: function() {}}
	},
	getInitialState: function() {
		return {pending: []};
	},
	componentDidMount: function() {
		this._uploadCount = 0;
	},
	removePendingUpload: function(upload) {
		log.debug('Upload removed: ' + upload.name);
		var pending = this.state.pending;

		for (var i = 0; i < pending.length; i++) {
			if (pending[i] === upload) {
				delete pending[i];
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
			var upload = {
				name: file.name,
				size: file.size,
				id: 'upload-' + this._uploadCount++,
				onProgressChange: function(progress) {}
			};

			this.state.pending.push(upload);
			this.setState(this.state);
			this.props.client.put(this.props.baseURL + file.name, file, function(upload) {
				try {
					this.props.onUploadComplete();
				} catch(e) {
					log.error('Error in upload complete listener', e);
				}
				this.removePendingUpload(upload);
			}.bind(this, upload),
			function(e) {
				this.onProgressChange(e.loaded / e.total);
			}.bind(upload),
			function(upload) {
				this.removePendingUpload(upload);
				alert('Failed to upload ' + upload.name);
			}.bind(this, upload));
		}

		// Reset input field
		try{
			input.value = '';
			if (input.value) {
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
				</div>
				<PendingUploads items={this.state.pending} />
			</form>
		</section>
	}
});

var PendingUploads = React.createClass({
	getDefaultProps: function() {
		return {items: []};
	},
	render: function() {
		return <ul className="uploads-pending">
			{this.props.items.map(function(item) {
				<PendingUpload item={item} key={item.id} />
			})}
		</ul>;
	}
});

var PendingUpload = React.createClass({
	getInitialState: function() {
		return {progress: 0};
	},
	render: function() {
		var item = this.props.item;
		item.onProgressChange = function(progress) {
			var progress = Math.round(progress * 100);
			
			if (progress !== this.state.progress) {
				log.debug(this.props.id + ' ' + progress);
				this.setState({progress: progress});
			}
		}.bind(this);

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