var log = require('./logger.js');

var state = {
	hash: '',
	listeners: [],
	updateHash: function(hash) {
		if (hash.substring(hash.length - 1, hash.length) === '/')
			hash = hash.substring(0, hash.length - 1);
		if (hash.substring(0, 1) === '#')
			hash = hash.substring(1);
		if (this.hash !== hash) {
			this.hash = hash;
			log.info('#' + hash);

			for (var i = 0; i < this.listeners.length; i++) {
				try {
					this.listeners[i](hash);
				} catch(e) {
					log.error('Error in location hash listener', e);
				}
			}

			return true;
		}

		return false;
	}
};

state.updateHash(window.location.hash || '');

window.addEventListener('hashchange', function() {
	var hash = window.location.hash;

	if (hash.substring(hash.length - 1, hash.length) === '/') {
		hash = hash.substring(0, hash.length - 1);
		window.location.hash = hash;
	}

	state.updateHash(hash);
});

function HashLocation() {};

HashLocation.prototype.hash = function(hash) {
	if (arguments.length == 1) {
		if (state.updateHash(hash)) {
			window.location.hash = '#' + state.hash;
		}
	} else if (arguments.length != 0) {
		throw 'hash() can be called with 1 or 2 arguments only'
	}

	return hash;
};

HashLocation.prototype.addListener = function(listener) {
	if (typeof listener !== 'function')
		throw 'hash listener must be a function';

	for (var i = 0; i < state.listeners.length; i++) {
		if (state.listeners[i] === listener) {
			return false;
		}
	}

	listener(state.hash);
	state.listeners.push(listener);
	return true;
};

HashLocation.prototype.removeListener = function(listener) {
	if (typeof listener !== 'function')
		throw 'hash listener must be a function';

	for (var i = 0; i < state.listeners.length; i++) {
		if (state.listeners[i] === listener) {
			delete state.listeners[i];
			return true;
		}
	}

	return false;
};

try {
	module.exports = new HashLocation();
} catch(e) {}