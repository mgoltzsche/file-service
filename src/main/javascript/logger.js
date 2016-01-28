function Logger(name) {
	this._name = name;
}
Logger.prototype.info = function(message) {
	this.log('INFO ', message);
};
Logger.prototype.error = function(message, error) {
	this.log('ERROR', message, error);
};
Logger.prototype.debug = function(message, error) {
	this.log('DEBUG', message, error);
};
Logger.prototype.log = function(level, message, error) {
	message = level + ' - ' + this._name + ' - ' + message;

	if (typeof error !== 'undefined' && error !== null) {
		console.log(message + ': ' + error + "\n" + (error.stack ? error.stack : ''));
	} else {
		console.log(message);
	}
};

function LoggerFactory(name) {
	return new Logger(name);
}

module.exports = LoggerFactory;

var logger = new Logger('main');

var navigator = window.navigator;
logger.info('Browser engine: ' + navigator.product + ' ' + navigator.appVersion
	+ "\n        Platform: " + navigator.platform
	+ "\n        User agent: " + navigator.userAgent
	+ "\n        Language: " + navigator.language);