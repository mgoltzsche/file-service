var trace = function(error) {
	if (error.stack) {
		return error.stack;
	} else {
		return '';
	}
};

var log = function(level, message, error) {
	message = level + ' - ' + message;

	if (typeof error !== 'undefined' && error !== null) {
		console.log(message + ': ' + error + "\n" + trace(error));
	} else {
		console.log(message);
	}
};

module.exports = {
	info: function(message) {
		log('INFO ', message);
	},
	error: function(message, error) {
		log('ERROR', message, error);
	},
	debug: function(message, error) {
		log('DEBUG', message, error);
	}
};