var log = require('./logger.js')('WebDavClient');

function WebDavClient(errorHandler) {
	this._errorHandler = errorHandler || function(xhr) {alert('WebDAV request failed with HTTP status code ' + xhr.status + '!');};
}

WebDavClient.prototype.propfind = function(path, depth, callback, errorCallback) {
	var callbackConverter = function(callback, xhr) {
		callback(this._parsePropfindResult(xhr));
	}.bind(this, callback);
	var xhr = this._createRequest('PROPFIND', path, callbackConverter, errorCallback);
	var xml = '<?xml version="1.0" encoding="UTF-8" ?>' +
		'<D:propfind xmlns:D="DAV:"><D:allprop /></D:propfind>';

	xhr.setRequestHeader('Depth', depth || 0);
	xhr.setRequestHeader('Content-Type', 'text/xml; charset=UTF-8');
	xhr.send(xml);
};

WebDavClient.prototype.get = function(path, callback, errorCallback) {
	this._createRequest('GET', path, callback, errorCallback).send();
};

WebDavClient.prototype.delete = function(path, callback, errorCallback) {
	this._createRequest('DELETE', path, callback, errorCallback).send();
};

WebDavClient.prototype.put = function(path, file, callback, progressCallback, errorCallback) {
	var xhr = this._createRequest('PUT', path, callback, errorCallback);

	xhr.upload.onprogress = function(evt) {
		try {
			this(evt.loaded, evt.total);
		} catch(e) {
			log.error('Upload progress propagation failed', e);
		}
	}.bind(progressCallback);
	xhr.setRequestHeader('Content-Type', file.type);
	xhr.send(file);
};

WebDavClient.prototype.move = function(path, destination, callback, errorCallback) {
	var xhr = this._createRequest('MOVE', path, callback, errorCallback);

	xhr.setRequestHeader('Destination', destination);
	// See http://www.webdav.org/specs/rfc2518.html#rfc.section.8.9.2
	// Required to move collection but fails with Bad request on collection move.
	// Lock on source and destination has to be acquired first.
	//xhr.setRequestHeader('Depth', 'Infinity');
	xhr.send();
};

WebDavClient.prototype._createRequest = function(method, path, callback, errorCallback) {
	if (typeof XMLHttpRequest === 'undefined') {
		alert("Your Browser does not support XMLHttpRequest. Get a new browser!\nError: " + e);
		throw("XMLHttpRequest not supported");
	}

	var reqName = method + ' ' + path;
	var xhr = new XMLHttpRequest();

	xhr.onerror = function(xhr, req) {
		try {
			this(xhr);
		} catch(e) {
			log.error('Failure callback error in ' + req, e);
		}
	}.bind(errorCallback || this._errorHandler, xhr, reqName);
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

	log.debug('XHR: ' + method + ' ' + path);
	xhr.open(method, path, true);

	return xhr;
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

module.exports = WebDavClient;