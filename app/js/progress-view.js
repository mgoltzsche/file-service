var log = require('./logger.js')('Progress');
var React = require('react');
var ReactDOM = require('react-dom');
var Dialog = require('./dialog.js');
var domready = require('domready');
var taskRegistry = require('./task-registry.js');

var globalState = {
	dialog: null
};

var ProgressButton = React.createClass({
	getInitialState: function() {
		return {
			progressPercent: 0,
			pending: false
		};
	},
	componentDidMount: function() {
		this._progressListener = function(normalizedProgress, task) {
			this.refs.progressBar.value = normalizedProgress;

			// hide/show
			if (normalizedProgress === 1) {
				if (this.state.pending) {
					this.state.pending = false;
					this.setState(this.state);
				}
			} else {
				if (!this.state.pending) {
					this.state.pending = true;
					this.setState(this.state);
				}
			}
		}.bind(this);

		taskRegistry.addListener(this._progressListener);
	},
	componentWillUnmount: function() {
		taskRegistry.removeListener(this._progressListener);
	},
	toggle: function() {
		globalState.dialog.toggle();
	},
	render: function() {
		return <a href="javascript://progress" className={'button progress-button' + (this.state.pending ? ' pending' : ' idle')} onClick={this.toggle}>
			<progress max="1" value="0" ref="progressBar"></progress>
		</a>;
	}
});

var PendingTasksDialog = React.createClass({
	toggle: function() {
		this.refs.dialog.toggle();
	},
	render: function() {
		return <Dialog className={'pending-tasks-dialog' + (this.props.className ? ' ' + this.props.className : '')}
				prefWidth="400"
				prefHeight="600"
				resizeProportional={false}
				ref="dialog">
			<PendingTasks onTotalProgress={this._handleTotalProgress} ref="taskList" />
		</Dialog>;
	}
});

var PendingTasks = React.createClass({
	getInitialState: function() {
		return {
			tasks: [],
			progressPercent: 0
		};
	},
	componentDidMount: function() {
		this._progressListener = function(normalizedProgress, task, tasks) {
			var taskView = this.refs[task.id];

			if (task.done === task.total) { // Task finished
				if (taskView) { // Task known, delete
					this.state.tasks = this.state.tasks.filter(function(t) {return t.id !== task.id;});
					this.setState(this.state);
				}
			} else { // Task pending
				if (taskView) { // Task known, update
					taskView.setProgress(task.done, task.total);
				} else { // Task unknown, add
					this.state.tasks.push(task);
					this.setState(this.state);
				}
			}

			this.updateTotalProgressBar(normalizedProgress);
		}.bind(this);

		this.registerProgressListener();
	},
	componentWillUpdate: function(nextProps, nextState) {
		if (nextProps.tasks !== this.props.tasks)
			nextState.tasks = nextProps.tasks;
	},
	componentWillUnmount: function() {
		this.unregisterProgressListener();
	},
	registerProgressListener: function() {
		taskRegistry.addListener(this._progressListener);
	},
	unregisterProgressListener: function() {
		taskRegistry.removeListener(this._progressListener);
	},
	updateTotalProgressBar: function(normalizedProgress) {
		this.refs.progressBar.value = normalizedProgress;
	},
	render: function() {
		return <div className="pending-tasks-list">
			<progress max="1" value="0" className="total-progress-bar" ref="progressBar"></progress>
			<ul>
				{this.state.tasks.map(function(task) {
					return <PendingTask task={task} key={task.id} ref={task.id} />
				})}
			</ul>
		</div>;
	}
});

var PendingTask = React.createClass({
	getInitialState: function() {
		return {progress: 0};
	},
	getTask: function() {
		return this.props.task;
	},
	setProgress: function(done, total) {
		this.refs.progressBar.value = total === 0 ? 0 : done / total;
	},
	render: function() {
		var task = this.props.task;

		return <li className="pending-task" key={task.id}>
			<div>
				<span className="pending-task-label">{task.label}</span>
				<span className="pending-task-info">{task.info || ''}</span>
			</div>
			<progress max="1" value="0" ref="progressBar"></progress>
		</li>;
	}
});

domready(function () {
	var element = document.createElement('div');
	document.body.appendChild(element);
	globalState.dialog = ReactDOM.render(<PendingTasksDialog />, element);
});

module.exports = ProgressButton;