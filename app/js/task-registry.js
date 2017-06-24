var log = require('./logger.js')('TaskRegistry');

function TaskRegistry() {
	this._state = {
		tasksById: {},
		taskList: [],
		done: 0,
		total: 0,
		listeners: []
	};
};

TaskRegistry.prototype.addListener = function(listener) {
	if (typeof listener !== 'function')
		throw 'TaskRegistry listener must be a function(progress, task)';

	var normalizedTotalProgress = this.getNormalizedProgress();

	for (var i = 0; i < this._state.taskList.length; i++)
		this._state.taskList[i](normalizedTotalProgress, task);

	this._state.listeners.push(listener);
};

TaskRegistry.prototype.removeListener = function(listener) {
	this._state.listeners = this._state.listeners.filter(function(l) {return l !== listener;});
};

TaskRegistry.prototype.addTask = function(task) {
	if (this._state.tasksById[task.id] === undefined) {
		task = {
			id: task.id,
			label: task.label || task.id,
			info: task.info || '',
			done: task.done || 0,
			total: task.total || 1
		};

		this._state.taskList.push(task);
		this._state.tasksById[task.id] = task;
		this._state.done += task.done;
		this._state.total += task.total;

		this._notifyListeners(task);
		return true;
	}

	return false;
};

TaskRegistry.prototype.removeTask = function(taskId) {
	var task = this._state.tasksById[taskId];

	if (task) {
		this._state.taskList = this._state.taskList.filter(function(task) {return task.id !== taskId;});
		delete this._state[taskId];
		task.done = task.total;

		if (this._state.taskList.length === 0)
			this._state.done = this._state.total = 0;

		this._notifyListeners(task);
		return true;
	}

	return false;
};

TaskRegistry.prototype.setProgress = function(taskId, done, total) {
	var task = this._state.tasksById[taskId];

	if (task) {
		if (done > total)
			done = total;

		var doneDelta = done - task.done;
		var totalDelta = total - task.total;
		task.done = done;
		task.total = total;
		this._state.done += doneDelta;
		this._state.total += totalDelta;

		this._notifyListeners(task);
	}
};

TaskRegistry.prototype.getNormalizedProgress = function() {
	return this._state.total === 0 ? 1 : this._state.done / this._state.total;
};

TaskRegistry.prototype._notifyListeners = function(task) {
	var normalizedTotalProgress = this.getNormalizedProgress();

	for (var i = 0; i < this._state.listeners.length; i++) {
		try {
			this._state.listeners[i](normalizedTotalProgress, task);
		} catch(error) {
			log.error('Task progress listener failed', error);
		}
	}
};

module.exports = new TaskRegistry();