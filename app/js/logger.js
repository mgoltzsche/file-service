var log = [];
var consoleLog = console && typeof console.log === 'function'
	? function(msg) {console.log(msg);} : function() {};

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
		message += ': ' + error + "\n" + (error.stack ? error.stack : '');
	}

	consoleLog(message);
	log.push(message);

	if (level === 'ERROR' && !LoggerFactory.isErrorMsgReported(message)) {
		LoggerFactory._reportedErrorMsgs.push(message);
		LoggerFactory._errorReporter(log.join("\n"));
	}
};

function LoggerFactory(name) {
	return new Logger(name);
}

LoggerFactory._reportedErrorMsgs = [];
LoggerFactory.isErrorMsgReported = function(errorMsg) {
	var reported = LoggerFactory._reportedErrorMsgs;

	for (var i = 0; i < reported.length; i++)
		if (reported[i] === errorMsg)
			return true;

	return false;
};

LoggerFactory._errorReporter = function() {};
LoggerFactory._lastReportedErrorMsg = null;

LoggerFactory.setErrorReporter = function(reporter) {
	LoggerFactory._errorReporter = reporter;
};

module.exports = LoggerFactory;