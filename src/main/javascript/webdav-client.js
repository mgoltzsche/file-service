var createLogger = require('./logger.js');
var log = createLogger('WebDavClient');
var request = require('./request.js')(log.log.bind(log));

function WebDavClient(defaultErrorHandler) {
	this._defaultErrorHandler = defaultErrorHandler || function(xhr) {alert('WebDAV request failed with HTTP status code ' + xhr.status + '!');};
	this._uploadWorker = null;
}

WebDavClient.prototype.propfind = function(path, depth, callback, errorCallback) {
	request('PROPFIND', path)
		.onSuccess(function(callback, xhr) {
			callback(this._parsePropfindResult(xhr))
		}.bind(this, callback))
		.onError(errorCallback)
		.setRequestHeader('Depth', depth || 0)
		.setRequestHeader('Content-Type', 'text/xml; charset=UTF-8')
		.send('<?xml version="1.0" encoding="UTF-8" ?><D:propfind xmlns:D="DAV:"><D:allprop /></D:propfind>');
};

WebDavClient.prototype.get = function(path, callback, errorCallback) {
	request('GET', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.send();
};

WebDavClient.prototype.delete = function(path, callback, errorCallback) {
	request('DELETE', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.send();
};

WebDavClient.prototype.put = function(path, file, callback, errorCallback, progressCallback) {
	if (this._uploadWorker === null)
		this._uploadWorker = new UploadWorkerManager();

	this._uploadWorker.upload('PUT', path, file, callback, errorCallback, function(loaded, total) {
		try {
			this(loaded, total);
		} catch(e) {
			log.error('Upload progress propagation failed', e);
		}
	}.bind(progressCallback));
	/*request('PUT', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.onUploadProgress(function(evt) {
			try {
				this(evt.loaded, evt.total);
			} catch(e) {
				log.error('Upload progress propagation failed', e);
			}
		}.bind(progressCallback))
		.setRequestHeader('Content-Type', file.type)
		.send(file);*/
};

WebDavClient.prototype.move = function(path, destination, callback, errorCallback) {
	request('MOVE', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.setRequestHeader('Destination', destination)

		// See http://www.webdav.org/specs/rfc2518.html#rfc.section.8.9.2
		// Required to move collection but fails with Bad request on collection move.
		// Lock on source and destination has to be acquired first.
		//.setRequestHeader('Depth', 'Infinity')

		.send();
};

WebDavClient.prototype._parsePropfindResult = function(xhr) {
	var docs = [],
	    childNodes = xhr.responseXML.childNodes[0].childNodes;

	for (var i = 0; i < childNodes.length; i++) {
		var response = childNodes[i],
		    doc = {
			'href': null,
			'status': null,
			'properties': {}
		};

		if (response.nodeType != 1) continue;

		for (var j = 0; j < response.childNodes.length; j++) {
			var responseChild = response.childNodes[j];

			if (responseChild.nodeName === 'D:href') {
				doc.href = responseChild.textContent;
			} else if (responseChild.nodeName === 'D:status') {
				doc.status = responseChild.textContent;
			} else if (responseChild.nodeName === 'D:propstat') {
				for (var k = 0; k < responseChild.childNodes.length; k++) {
					var propstatChild = responseChild.childNodes[k];

					if (propstatChild.nodeName === 'D:status') {
						doc.status = propstatChild.textContent;
					} else if (propstatChild.nodeName === 'D:prop') {
						for (var p = 0; p < propstatChild.childNodes.length; p++) {
							var property = propstatChild.childNodes[p];

							if (property.nodeType != 1) continue;

							var propertyName = property.nodeName.split(':')[1];
	
							if (propertyName === 'resourcetype' && property.childNodes.length > 0) {
								doc.resourcetype = property.childNodes[0].nodeName.split(':')[1];
							} else {
								var value = property.textContent;
								
								if (typeof value !== 'undefined' && value !== '') {
									doc.properties[propertyName] = value;
								}
							}
						}
					}
				}
			}
		}

		docs.push(doc);
	}

	return docs;
};

function UploadWorkerManager(uploadLimit) {
	this._uploadLimit = uploadLimit || 1;
	this._pendingUploads = {};
	this._pendingUploadCount = 0;

	// Create upload web worker
	var work = require('webworkify');
	var uploadWorker = require('./upload-worker.js');
	var w = this._worker = work(uploadWorker);

	// Set listeners 
	w.onmessage = function(evt) {
		var data = evt.data;

		try {
			switch(data.type) {
				case 'upload-success':
					this._pendingUploads[data.url].onSuccess();
					delete this._pendingUploads[data.url];
					this._pendingUploadCount--;
					break;
				case 'upload-progress':
					this._pendingUploads[data.url].onProgress(data.loaded, data.total);
					break;
				case 'upload-failed':
					log.error('Upload ' + data.url + ' failed with status code ' + data.status);
					this._pendingUploads[data.url].onError(data.httpStatus);
					delete this._pendingUploads[data.url];
					this._pendingUploadCount--;
					break;
				case 'log':
					this._workerLog.log(data.level, data.msg);
					break;
				default:
					this._log.debug("Unsupported message type '" + data.type + "' received from UploadWorker");
			}
		} catch(e) {
			this._log.error('Error message processor: ' + data.type);
		}
	}.bind(this);
	w.onerror = function(e) {
		this._log.error('Worker failure', e);
	};
}

UploadWorkerManager.prototype._log = createLogger('UploadWorkerManager');
UploadWorkerManager.prototype._workerLog = createLogger('UploadWorker');
UploadWorkerManager.prototype.upload = function(method, url, file, onSuccess, onError, onProgress) {
	url = this._resolveUrl(url);

	if (this._pendingUploads[url])
		return false;

	this._pendingUploads[url] = {
		onSuccess: onSuccess || function() {},
		onProgress: onProgress || function() {},
		onError: onError || function() {}
	};
	this._pendingUploadCount++;
	this._worker.postMessage({
		type: 'upload',
		method: method,
		url: url,
		file: file
	});

	return true;
};
UploadWorkerManager.prototype._ABSOLUTE_URL_PATTERN = /^[^:\/]+:\/\/.+/;
UploadWorkerManager.prototype._resolveUrl = function(url) {
	var baseUrl = window.location.href;
	var hashPos = baseUrl.indexOf('#');
	if (hashPos !== -1) baseUrl = baseUrl.substring(0, hashPos);

	if (url.match(this._ABSOLUTE_URL_PATTERN)) { // absolute URL with protocol + host
		return url;
	} else if (url.substring(0, 1) === '/') { // server relative URL
		return baseUrl.substring(0, baseUrl.indexOf('/', baseUrl.indexOf('//') + 2)) + url;
	} else { // relative URL
		return baseUrl.substring(0, baseUrl.lastIndexOf('/')) + '/' + url;
	}
};

module.exports = WebDavClient;