#!/usr/bin/env node

var program = require('commander'),
	bouncy = require('bouncy'),
	crypto = require('crypto'),
	querystring = require('querystring'),
	_ = require('underscore'),
	url = require('url'),
	XDate = require('xdate');

_.str = require('underscore.string');
_.mixin(_.str.exports());

program
	.version('1.0.1')
	.option('-a, --account [account]', 'storage account name')
	.option('-k, --key [key]', 'storage account key')
	.option('-p, --port [port]', 'port (defaults to 8080)', parseInt)
	.parse(process.argv);

['account', 'key'].forEach(function (name) {
	if (!program[name]) {
		console.log('Missing required parameter: ' + name);
		program.help();
	}
});

function canonicalizedResource(parsedUrl) {
	return '/' + parsedUrl.hostname.split('.')[0] + (parsedUrl.pathname || '/') +
		_.chain(querystring.parse(parsedUrl.query)).pairs().sortBy(function (pair) { return pair[0]; }).map(function (pair) {
			return '\n' + pair[0] + ':' + pair[1];
		}).value().join('');
}

function canonicalizedHeaders(headers) {
	return _.chain(headers).pairs().filter(function (pair) {
		return _.startsWith(pair[0], 'x-ms-');
	}).sortBy(function (pair) {
		return pair[0];
	}).map(function (pair) {
		return pair[0] + ':' + pair[1] + '\n';
	}).value().join('');
}

function getHeader(headers, name, additionalHeaders) {
	if (headers[name] !== undefined) {
		return headers[name];
	} else if (additionalHeaders && additionalHeaders[name] !== undefined) {
		return additionalHeaders[name];
	} else {
		return '';
	}
}

function stringForTable(req, parsedUrl, additionalHeaders) {
	if (!_.contains(req.headers, 'DataServiceVersion')) {
		additionalHeaders['DataServiceVersion'] = '1.0;NetFx';
	}
	if (!_.contains(req.headers, 'MaxDataServiceVersion')) {
		additionalHeaders['MaxDataServiceVersion'] = '1.0;NetFx';
	}
	return req.method + '\n' +
		getHeader(req.headers, 'content-md5') + '\n' +
		getHeader(req.headers, 'content-type') + '\n' +
		getHeader(req.headers, 'x-ms-date', additionalHeaders) + '\n' +
		(req.headers['content-md5'] || '') + '\n' +
		(req.headers['content-type'] || '') + '\n' +
		(req.headers['x-ms-date'] || additionalHeaders['x-ms-date']) + '\n' +
		canonicalizedResource(parsedUrl);	
}

function stringForBlobOrQueue(req, parsedUrl, additionalHeaders) {
	return req.method + '\n' +
		getHeader(req.headers, 'content-encoding') + '\n' +
		getHeader(req.headers, 'content-language') + '\n' +
		getHeader(req.headers, 'content-length') + '\n' +
		getHeader(req.headers, 'content-md5') + '\n' +
		getHeader(req.headers, 'content-type') + '\n' +
		getHeader(req.headers, 'date') + '\n' +
		getHeader(req.headers, 'if-modified-since') + '\n' +
		getHeader(req.headers, 'if-match') + '\n' +
		getHeader(req.headers, 'if-none-match') + '\n' +
		getHeader(req.headers, 'if-unmodified-since') + '\n' +
		getHeader(req.headers, 'range') + '\n' +
		canonicalizedHeaders(_.extend(req.headers, additionalHeaders)) +
		canonicalizedResource(parsedUrl);
}

function sign(req, key, stringGenerator) {
	var parsedUrl = url.parse(req.url);
	var account = parsedUrl.hostname.split('.')[0];
	var additionalHeaders = {};
	if (!_.contains(req.headers, 'x-ms-version')) {
		additionalHeaders['x-ms-version'] = '2011-08-18';
	}
	if (!_.contains(req.headers, 'x-ms-date')) {
		additionalHeaders['x-ms-date'] = new XDate().toUTCString("ddd, dd MMM yyyy HH:mm:ss 'GMT'");
	}
	var stringToSign = stringGenerator(req, parsedUrl, additionalHeaders);
	var hmac = crypto.createHmac('sha256', new Buffer(key, 'base64').toString('binary'));
	hmac.update(stringToSign);
	additionalHeaders['Authorization'] = 'SharedKey ' + account + ':' + hmac.digest('base64');
   	return additionalHeaders;	
}

bouncy(function (req, bounce) {
	var split = req.headers.host.split(':');
	var host = split[0];
	var port = split[1];
	var match = host.match(RegExp('^' + program.account + '\\.(blob|table|queue)\\.core\\.windows\\.net$'));
	if (match) {
		var additionalHeaders;
		if (match[1] === 'blob' || match[1] === 'queue') {
			additionalHeaders = sign(req, program.key, stringForBlobOrQueue);
		} else {
			additionalHeaders = sign(req, program.key, stringForTable);
		}
		bounce(host, port || 80, {headers: additionalHeaders});
	} else {
		bounce(host, port || 80);
	}
}).listen(program.port || 8080);

console.log('Wazproxy is listening. Set your HTTP proxy to 127.0.0.1:' + (program.port || 8080) + '.');
console.log('Press Ctrl+C to exit...');
