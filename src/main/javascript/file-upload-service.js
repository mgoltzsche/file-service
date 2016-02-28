var log = require('./logger.js')('FileUploadService');
var taskRegistry = require('./task-registry.js');
var formatSize = require('./format-size.js');

var runCallback = function(name, callback, upload, status) {
	if (typeof callback === 'function') {
		try {
			callback(upload, status);
		} catch(e) {
			log.error('Unexpected error in file upload ' + name + ' callback', e);
		}
	}
};

var state = {
	uploadIdSequence: 0
};

module.exports = function(client, collectionPath, files, onSuccess, onError) {
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		var upload = {
			id: 'upload' + state.uploadIdSequence++,
			label: file.name,
			info: formatSize(file.size),
			done: 0,
			total: file.size
		};

		if ('/' !== collectionPath.substring(collectionPath.length - 1, collectionPath.length))
			collectionPath += '/';

		if (client.put(collectionPath + file.name, file,
				function(callback, upload) {
					runCallback('success', callback, upload);
					taskRegistry.removeTask(upload.id);
				}.bind(undefined, onSuccess, upload),
				function(callback, upload, status) {
					runCallback('error', callback, upload, status);
					taskRegistry.removeTask(upload.id);
				}.bind(undefined, onError, upload),
				function(upload, loaded, total) {
					taskRegistry.setProgress(upload.id, loaded, total);
				}.bind(undefined, upload))) {
			taskRegistry.addTask(upload);
		}
	}
};