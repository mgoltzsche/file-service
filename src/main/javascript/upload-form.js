var log = require('./logger.js')('UploadForm');
var React = require('react');
var ReactDOM = require('react-dom');
var formatSize = require('./format-size.js');

var UploadForm = React.createClass({
	getDefaultProps: function() {
		return {onUploadComplete: function(upload) {}}
	},
	getInitialState: function() {
		return {
			pendingUploads: [],
			uploadIdSequence: 0
		};
	},
	removePendingUpload: function(upload) {
		log.debug('Remove upload: ' + upload.label);
		var pendingUploads = this.state.pendingUploads;

		for (var i = 0; i < pendingUploads.length; i++) {
			if (pendingUploads[i] === upload) {
				delete pendingUploads[i];
				this.setState(this.state);
				return;
			}
		}
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
					label: file.name,
					info: ' (' + formatSize(file.size) + ')',
					id: 'upload' + this.state.uploadIdSequence++,
					progress: 0,
					onProgressChange: function(progress) {}
				};

				this.state.pendingUploads.push(upload);
				this.setState(this.state);
				this.props.client.put(this.props.baseURL + file.name, file, function(upload) {
					this.removePendingUpload(upload);
					this.props.onUploadComplete(upload);
				}.bind(this, upload),
				function(upload) {
					this.removePendingUpload(upload);
					alert('Failed to upload ' + upload.label);
				}.bind(this, upload),
				function(upload, loaded, total) {
					this.refs.uploads.setProgress(upload.id, loaded, total);
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
		} catch(error) {
			log.error('Upload initialization failed', error);
		}
	},
	render: function() {
		return <section>
			<form>
				<div>
					<input type="file" onChange={this.handleFilesAdded} multiple />
				</div>
				<PendingTasks tasks={this.state.pendingUploads} ref="uploads" />
			</form>
		</section>
	}
});

var PendingTasks = React.createClass({
	getDefaultProps: function() {
		return {tasks: []};
	},
	setProgress: function(taskId, done, total) {
		var taskView = this.refs[taskId];

		if (taskView)
			taskView.setProgress(done, total);
	},
	render: function() {
		return <ul className="pending-tasks">
			{this.props.tasks.map(function(task) {
				return <PendingTask task={task} key={task.id} ref={task.id} />
			})}
		</ul>;
	}
});

var PendingTask = React.createClass({
	getInitialState: function() {
		return {progress: 0};
	},
	setProgress: function(done, total) {
		var progress = total === 0 ? 0 : done / total * 100;

		if (progress !== this.state.progress)
			this.refs.progressBar.value = this.state.progress = progress;
	},
	render: function() {
		var task = this.props.task;

		return <li className="pending-task" key={task.id}>
			<div>
				<span className="pending-task-label">{task.label}</span>
				<span className="pending-task-info">{task.info || ''}</span>
			</div>
			<progress max="100" value="0" ref="progressBar"></progress>
		</li>;
	}
});

module.exports = UploadForm;