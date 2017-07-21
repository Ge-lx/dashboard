var debug = require('debug')('express:parseDir');
var fs = require('fs');
var path = require('path');
var alphaNum = require('short-uuid')('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

var parse = function(dir) {
	var absPath = path.join(__dirname, dir);
	debug('Path' + absPath);
	if(!fs.lstatSync(absPath).isDirectory() ) {
		throw absPath + ' is not a directory';
	}
	var categories = getDirectories(absPath);
	var config = {categories: {}};

	categories.forEach( function(category) {
		var catID = alphaNum.uuid();
		config.categories[catID] = {name: category, url: category.toLowerCase(), documents: {}};
		var documents = getFiles(path.join(absPath, category));
		documents.forEach( function(doc) {
			var docID = alphaNum.uuid();
			config.categories[catID].documents[docID] = {name: doc, filename: doc};
		});
	});

	return config;
}

function getDirectories (srcpath) {
	return fs.readdirSync(srcpath)
		.filter(file => fs.lstatSync(path.join(srcpath, file)).isDirectory());
}

function getFiles (srcpath) {
	return fs.readdirSync(srcpath)
		.filter(file => fs.lstatSync(path.join(srcpath, file)).isFile());
}

module.exports = parse;