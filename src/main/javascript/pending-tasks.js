var React = require('react');
var ReactDOM = require('react-dom');

var PendingTasks = React.createClass({
	getDefaultProps: function() {
		return {tasks: []};
	},
	getInitialState: function() {
		return {tasks: []};
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
			this.state.tasks.push(task);
			this.setState(this.state);
		}
	},
	removeTask: function(taskId) {
		this.setState({tasks: this.state.tasks.filter(function(task) {return task.id !== taskId;})});
	},
	setProgress: function(taskId, done, total) {
		var taskView = this.refs[taskId];

		if (taskView)
			taskView.setProgress(done, total);
	},
	render: function() {
		return <ul className="pending-tasks">
			{this.state.tasks.map(function(task) {
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

module.exports = PendingTasks;