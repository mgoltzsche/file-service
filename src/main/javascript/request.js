function XHRequest(method, path, log) {
	if (typeof XMLHttpRequest === 'undefined') {
		throw('XMLHttpRequest not supported');
	}

	this._name = method + ' ' + path;
	this._method = method;
	this._path = path;
	this._headers = {};

	if (log !== undefined) {
		this._log = log;
	}
};
XHRequest.prototype._log = function() {};
XHRequest.prototype._successHandler = function(xhr) {};
XHRequest.prototype._errorHandler = function(xhr) {
	this._log('ERROR', 'Request ' + this._name + ' failed with HTTP status code ' + xhr.status);
};
XHRequest.prototype.onSuccess = function(successCallback) {
	return this;
};
XHRequest.prototype.onError = function(errorHandler) {
	if (errorHandler !== undefined)
		this._errorHandler = errorHandler;
	return this;
};
XHRequest.prototype.onSuccess = function(successHandler) {
	this._successHandler = successHandler;
	return this;
};
XHRequest.prototype.onUploadProgress = function(progressHandler) {
	this._progressHandler = progressHandler;
	return this;
};
XHRequest.prototype.setRequestHeader = function(key, value) {
	this._headers[key] = value;
	return this;
};
XHRequest.prototype.send = function(data) {
	this._log('DEBUG', 'XHR: ' + this._name);
	var xhr = new XMLHttpRequest();

	xhr.onerror = function(xhr) {
		try {
			this._errorHandler(xhr);
		} catch(e) {
			this._log('ERROR', 'Failure callback error in ' + this._name, e);
		}
	}.bind(this, xhr);

	if (this._successHandler) {
		xhr.onload = function(xhr) {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					this._successHandler(xhr);
				} catch(e) {
					this._log('ERROR', 'Success callback error in ' + this._name, e);
				}
			} else {
				try {
					xhr.onerror();
				} catch(e) {
					this._log('ERROR', 'Failure callback error in ' + this._name, e);
				}
			}
		}.bind(this, xhr);
	}

	if (this._progressHandler) {
		xhr.upload.onprogress = function(evt) {
			try {
				this._progressHandler(evt.loaded, evt.total);
			} catch(e) {
				this._log.error('Upload progress propagation failed', e);
			}
		}.bind(this);
	}

	xhr.open(this._method, this._path, true);

	for (var key in this._headers) {
		if (this._headers.hasOwnProperty(key)) {
			xhr.setRequestHeader(key, this._headers[key]);
		}
	}

	xhr.send(data);
};


module.exports = function(logger) {
	return function(method, path) {
		return new XHRequest(method, path, logger);
	};

	/*return function(method, path, callback, errorCallback) {
		if (typeof XMLHttpRequest === 'undefined') {
			throw("XMLHttpRequest not supported");
		}

		var reqName = method + ' ' + path;
		var xhr = new XMLHttpRequest();

		xhr.onerror = function(xhr, req) {
			try {
				this(xhr);
			} catch(e) {
				log('ERROR', 'Failure callback error in ' + req, e);
			}
		}.bind(errorCallback || this._defaultErrorHandler, xhr, reqName);
		xhr.onload = function(xhr, req) {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					this(xhr);
				} catch(e) {
					log.error('Success callback error in ' + req, e);
				}
			} else {
				try {
					xhr.onerror();
				} catch(e) {
					log.error('Failure callback error in ' + req, e);
				}
			}
		}.bind(callback, xhr, reqName);

		log('DEBUG', 'XHR: ' + method + ' ' + path);
		xhr.open(method, path, true);

		return xhr;
	};*/
};