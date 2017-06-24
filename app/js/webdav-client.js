var createLogger = require('./logger.js');
var log = createLogger('WebDavClient');
var request = require('./request.js')(log.log.bind(log));
var ABSOLUTE_URL_PATTERN = /^[^:\/]+:\/\/.+/;
var resolveUrl = function(url) {
	var baseUrl = window.location.href;
	var hashPos = baseUrl.indexOf('#');
	if (hashPos !== -1) baseUrl = baseUrl.substring(0, hashPos);

	if (url.match(ABSOLUTE_URL_PATTERN)) { // absolute URL with protocol + host
		return url;
	} else if (url.substring(0, 1) === '/') { // server relative URL
		return baseUrl.substring(0, baseUrl.indexOf('/', baseUrl.indexOf('//') + 2)) + url;
	} else { // relative URL
		return baseUrl.substring(0, baseUrl.lastIndexOf('/')) + '/' + url;
	}
};

function WebDavClient(user, password) {
	this._defaultErrorHandler = function(xhr) {alert('WebDAV request failed with HTTP status code ' + xhr.status + '!');};
	this._uploadWorker = null;
	this._uploadQueue = [];
	this._pendingUploads = {};
	this._pendingUploadCount = 0;
	if (user && password) {
		this._request = function(method, path) {
			return request(method, path)
				.setRequestHeader('Authorization', 'Basic ' + btoa(this._user + ':' + this._password));
		};
	} else {
		this._request = request;
	}
	log.debug('Upload worker supported: ' + UploadWorkerManager.isSupported());
}

WebDavClient.prototype.propfind = function(path, depth, callback, errorCallback) {
	this._request('PROPFIND', path)
		.onSuccess(function(callback, xhr) {
			callback(this._parsePropfindResult(xhr))
		}.bind(this, callback))
		.onError(errorCallback)
		.setRequestHeader('Depth', depth || 0)
		.setRequestHeader('Content-Type', 'text/xml; charset=UTF-8')
		.send('<?xml version="1.0" encoding="UTF-8" ?><D:propfind xmlns:D="DAV:"><D:allprop /></D:propfind>');
};

WebDavClient.prototype.mkcol = function(path, callback, errorCallback) {
	this._request('MKCOL', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.send();
};

WebDavClient.prototype.get = function(path, callback, errorCallback) {
	this._request('GET', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.send();
};

WebDavClient.prototype.delete = function(path, callback, errorCallback) {
	this._request('DELETE', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.send();
};

WebDavClient.prototype.move = function(path, destination, callback, errorCallback) {
	this._request('MOVE', path)
		.onSuccess(callback)
		.onError(errorCallback)
		.setRequestHeader('Destination', destination)

		// See http://www.webdav.org/specs/rfc2518.html#rfc.section.8.9.2
		// Required to move collection but fails with Bad request on collection move.
		// Lock on source and destination has to be acquired first.
		//.setRequestHeader('Depth', 'Infinity')

		.send();
};

WebDavClient.prototype.put = function(path, data, callback, errorCallback, progressCallback) {
	var uploadInfo = {
		url: resolveUrl(path),
		data: data,
		onSuccess: callback,
		onError: errorCallback,
		onProgress: progressCallback
	};

	if (this._pendingUploads[uploadInfo.url])
		return false;

	this._pendingUploads[uploadInfo.url] = uploadInfo;

	if (this._pendingUploadCount++ === 0) { // first upload. start immediately
		this._upload(uploadInfo);
	} else { // Nth upload. queue and start later
		this._uploadQueue.push(uploadInfo);
	}

	return true;
};

WebDavClient.prototype._upload = function(upload) {
	if (UploadWorkerManager.isSupported()) {
		this._putWithWorker(upload);
	} else {
		this._putFallback(upload);
	}
};

WebDavClient.prototype._onUploadFinished = function(upload) {
	delete this._pendingUploads[upload.url];

	if (--this._pendingUploadCount === 0 && this._uploadWorker !== null) { // Last upload. Stop worker
		this._uploadWorker.terminate();
		this._uploadWorker = null;
	} else if (this._uploadQueue.length > 0) { // Start next queued upload
		this._upload(this._uploadQueue.pop());
	}
};

WebDavClient.prototype._onUploadSuccess = function(upload, xhr) {
	try {
		upload.onSuccess(xhr);
	} catch(e) {
		log.error('Upload success callback failed', e);
	}

	this._onUploadFinished(upload);
};

WebDavClient.prototype._onUploadError = function(upload, status) {
	try {
		upload.onError(status);
	} catch(e) {
		log.error('Upload error callback failed', e);
	}

	this._onUploadFinished(upload);
};

WebDavClient.prototype._onUploadProgress = function(upload, loaded, total) {
	try {
		upload.onProgress(loaded, total);
	} catch(e) {
		log.error('Upload progress callback failed', e);
	}
};

WebDavClient.prototype._newUploadProgressListener = function(upload) {
	return upload.onProgress ? this._onUploadProgress.bind(undefined, upload) : null;
};

WebDavClient.prototype._putWithWorker = function(upload) {
	if (this._uploadWorker === null)
		this._uploadWorker = new UploadWorkerManager();

	this._uploadWorker.upload('PUT', upload.url, upload.data,
		this._onUploadSuccess.bind(this, upload),
		this._onUploadError.bind(this, upload),
		this._newUploadProgressListener(upload));
};

WebDavClient.prototype._putFallback = function(upload) {
	var contentType = typeof update.data === 'string' ? 'text/plain' : update.data.type;

	this._request('PUT', upload.url)
		.onSuccess(this._onUploadSuccess.bind(this, upload))
		.onError(this._onUploadError.bind(this, upload))
		.onUploadProgress(this._newUploadProgressListener(upload))
		.setRequestHeader('Content-Type', contentType)
		.send(upload.data);
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
					this._pendingUploads[data.url].onError(data.status);
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

UploadWorkerManager.isSupported = function() {
	return window.Worker !== undefined;
};
UploadWorkerManager.prototype._log = createLogger('UploadWorkerManager');
UploadWorkerManager.prototype._workerLog = createLogger('UploadWorker');
UploadWorkerManager.prototype.upload = function(method, url, data, onSuccess, onError, onProgress) {
	url = resolveUrl(url);

	if (this._pendingUploads[url])
		return false;

	this._pendingUploads[url] = {
		onSuccess: onSuccess || function() {},
		onProgress: onProgress || function(loaded, total) {},
		onError: onError || function(httpStatus) {}
	};
	this._pendingUploadCount++;
	this._worker.postMessage({
		type: 'upload',
		method: method,
		url: url,
		data: data
	});

	return true;
};
UploadWorkerManager.prototype.terminate = function() {
	this._worker.terminate();
	this._worker = null;
};

module.exports = WebDavClient;