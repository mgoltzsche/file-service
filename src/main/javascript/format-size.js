var sizeKB = 1000;
var sizeMB = 1000 * 1000;
var sizeGB = 1000 * 1000 * 1000;

module.exports = function(size) {
	size = size || 0;
	
	if (size >= sizeGB) {
		return (size / sizeGB).toFixed(1) + ' GB';
	} else if (size >= sizeMB) {
		return (size / sizeMB).toFixed(1) + ' MB';
	} else if (size >= sizeKB) {
		return (size / sizeKB).toFixed(1) + ' KB';
	} else {
		return size + ' B';
	}
};