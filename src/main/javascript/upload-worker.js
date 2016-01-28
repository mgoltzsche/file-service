var log = function(level, msg, err) {
	postMessage({
		type: 'log',
		level: level,
		msg: msg + (err ? ': ' + err + "\n" + (err.stack ? err.stack : '') : '')
	});
};

var request = require('./request.js')(log);

module.exports = function(self) {
	var onMessage = function(evt) {
		var data = evt.data;

		try {
			switch(data.type) {
				case 'upload':
					request(data.method, data.url)
						.onError(function(xhr) {
							postMessage({
								type: 'upload-failed',
								url: data.url,
								status: xhr.status
							});
						})
						.onUploadProgress(function(loaded, total) {
							postMessage({
								type: 'upload-progress',
								url: data.url,
								loaded: loaded,
								total: total
							});
						})
						.onSuccess(function() {
							postMessage({
								type: 'upload-success',
								url: data.url
							});
						})
						.setRequestHeader('Content-Type', data.file.type)
						.send(data.file);
					break;
				default:
					log('ERROR', 'Unsupported message type: ' + data.type + ". Expecting message: {type: '<type>', msg: <message>}");
			}
		} catch(e) {
			log('ERROR', 'Error in message processor: ' + data.type, e);
		}
	};

	try {
		self.addEventListener('message', onMessage);
	} catch(e) {
		log('ERROR', 'Worker internal initialization failed', e);
	}
};