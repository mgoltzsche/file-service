var log = require('./logger.js')('Progress');
var React = require('react');
var ReactDOM = require('react-dom');
var Dialog = require('./dialog.js');
var domready = require("domready");

var globalState = {
	dialog: null
};

var ProgressButton = React.createClass({
	addTask: function(task) {
		globalState.dialog.addTask(task);
	},
	removeTask: function(taskId) {
		globalState.dialog.removeTask(taskId);
	},
	setProgress: function(taskId, done, total) {
		globalState.dialog.setProgress(taskId, done, total);
	},
	toggle: function() {
		globalState.dialog.toggle();
	},
	render: function() {
		return <a href="javascript://progress" className="button progress-button" onClick={this.toggle}>
			<progress max="100" value="0" ref="progressBar"></progress>
		</a>;
	}
});

var PendingTasksDialog = React.createClass({
	getDefaultProps: function() {
		return {
			onTotalProgress: function(percent) {}
		};
	},
	toggle: function() {
		this.refs.dialog.toggle();
	},
	addTask: function(task) {
		this.refs.taskList.addTask(task);
	},
	removeTask: function(taskId) {
		this.refs.taskList.removeTask(taskId);
	},
	setProgress: function(taskId, done, total) {
		this.refs.taskList.setProgress(taskId, done, total);
	},
	_handleTotalProgress: function(percent) {
		this.props.onTotalProgress(percent);
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
	getDefaultProps: function() {
		return {
			tasks: [],
			onTotalProgress: function(percent) {}
		};
	},
	getInitialState: function() {
		return {
			tasks: [],
			done: 0,
			total: 0,
			progressPercent: 0
		};
	},
	componentDidMount: function() {
		this.state.tasks = this.props.tasks;
	},
	componentWillUpdate: function(nextProps, nextState) {
		if (nextProps.tasks !== this.props.tasks)
			nextState.tasks = nextProps.tasks;
	},
	addTask: function(task) {
		if (this.refs[task.id] === undefined) {
			task = {
				id: task.id,
				label: task.label || task.id,
				info: task.info || '',
				done: task.done || 0,
				total: task.total || 1
			}
			this.state.tasks.push(task);
			this.state.done += task.done;
			this.state.total += task.total;
			this._progressUpdated();
			this.setState(this.state);
		}
	},
	removeTask: function(taskId) {
		var taskView = this.refs[taskId];

		if (taskView) {
			var task = taskView.getTask();
			this.state.tasks = this.state.tasks.filter(function(task) {return task.id !== taskId;});

			if (this.state.tasks.length === 0)
				this.state.done = this.state.total = 0;

			this._progressUpdated();
			this.setState(this.state);
		}
	},
	setProgress: function(taskId, done, total) {
		var taskView = this.refs[taskId];

		if (taskView) {
			var task = taskView.getTask();
			var doneDelta = done - (task.done || 0);
			task.done = done;
			this.state.done += doneDelta;
			this._progressUpdated();
			taskView.setProgress(done, total);
		}
	},
	_progressUpdated: function() {
		var totalProgressPercent = this.state.total === 0 ? 100 : Math.floor(this.state.done / (0.0+this.state.total) * 100);

		if (totalProgressPercent !== this.state.progressPercent) {
			this.state.progressPercent = totalProgressPercent;
			this.props.onTotalProgress(totalProgressPercent);
			this.refs.progressBar.value = totalProgressPercent;
			this.refs.done.innerHTML = this.state.done;
			this.refs.total.innerHTML = this.state.total;
		}
	},
	render: function() {
		return <div className="pending-tasks-list">
			<progress max="100" value="0" className="total-progress-bar" ref="progressBar"></progress>
			<span ref="done"></span>/<span ref="total"></span>
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

domready(function () {
	var element = document.createElement('div');
	document.body.appendChild(element);
	globalState.dialog = ReactDOM.render(<PendingTasksDialog />, element);
});

module.exports = ProgressButton;