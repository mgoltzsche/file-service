function WebDavClient(errorHandler) {
	this._errorHandler = errorHandler || function(xhr) {alert('WebDAV request failed with HTTP status code ' + xhr.status + '!');};
}

WebDavClient.prototype.propfind = function(path, depth, callback, errorCallback) {
	var callbackConverter = (function(callback, self) {return function(xhr) {
		callback(self._parsePropfindResult(xhr));
	};})(callback, this);
	var xhr = this._createRequest('PROPFIND', path, callbackConverter, errorCallback);
	var xml = '<?xml version="1.0" encoding="UTF-8" ?>' +
		'<D:propfind xmlns:D="DAV:"><D:allprop /></D:propfind>';

	xhr.setRequestHeader('Depth', depth || 0);
	xhr.setRequestHeader('Content-Type', 'text/xml; charset=UTF-8');
	xhr.send(xml);
};

WebDavClient.prototype.get = function(path, callback, errorCallback) {
	var xhr = this._createRequest('GET', path, callback, errorCallback).xhr.send();
};

WebDavClient.prototype.put = function(path, file, callback, progressCallback, errorCallback) {
	var xhr = this._createRequest('PUT', path, callback, errorCallback);

	xhr.upload.onprogress = progressCallback;
	xhr.setRequestHeader('Content-Type', file.type);
	xhr.send(file);
};

WebDavClient.prototype._createRequest = function(method, path, callback, errorCallback) {
	var xhr;

	try {
		xhr = new XMLHttpRequest();
		xhr.onerror = (function(callback, xhr) {return function() {
			callback(xhr);
		};})(errorCallback || this._errorHandler, xhr);
		xhr.onload = (function(callback, xhr) {return function() {
			if (xhr.status >= 200 && xhr.status < 300) {
				callback(xhr);
			} else {
				xhr.onerror(xhr);
			}
		};})(callback, xhr);
	} catch(e) {
		alert("Your Browser does not support XMLHttpRequest. Get a new browser!\nError: " + e);
		throw("Browser not supported");
	}

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
						doc.status = responseChild.textContent;
					} else if (propstatChild.nodeName === 'D:prop') {
						for (var p = 0; p < propstatChild.childNodes.length; p++) {
							var property = propstatChild.childNodes[p];

							if (property.nodeType != 1) continue;

							var propertyName = property.nodeName.split(':')[1];
	
							if (propertyName === 'resourcetype' && property.childNodes.length > 0) {
								doc.resourcetype = property.childNodes[0].nodeName.split(':')[1];
							} else {
								doc.properties[propertyName] = property.textContent;
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

try {
	module.exports = WebDavClient;
} catch(e) {}