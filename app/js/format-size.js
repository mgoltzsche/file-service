var sizeKB = 1000;
var sizeMB = 1000 * 1000;
var sizeGB = 1000 * 1000 * 1000;
var fmtFloat = function(v) {
	return parseFloat(v.toFixed(1) + '');
};

module.exports = function(size) {
	size = size || 0;

	if (size >= sizeGB) {
		return fmtFloat(size / sizeGB) + ' GB';
	} else if (size >= sizeMB) {
		return fmtFloat(size / sizeMB) + ' MB';
	} else if (size >= sizeKB) {
		return fmtFloat(size / sizeKB) + ' KB';
	} else {
		return size + ' B';
	}
};