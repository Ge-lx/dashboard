// Load modules
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require('express-session');
var debug = require('debug')('express:cardboard');

var dirparser = require('./parseDir.js');

var app = express();

// Set up pug renderig engine
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

// Logging + Utils
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
var extendify = require('extendify')( {
	arrays: 'replace',
	isDeep: true,
	inPlace: true
});

// Set up database connection
console.log('Connecting to CouchDB...');
var nano = require('nano')('http://127.0.0.1:5984');
var searchMap = undefined;

nano.db.list(function (err, body) {
	if(err) {
		console.error('Could not connect: ' + err);
	} else {
		console.log('Connected. Databases available: ' + body.join(', '));
		app.locals.nano = nano;
		if(body.indexOf('sites') == -1) {
			console.log('No sites DB found. Creating one...');
			nano.db.create('sites');
		}
		if(body.indexOf('dashboard') == -1) {
			console.log('No dashboard DB found. Creating one...');
			nano.db.create('dashboard');
		}
		if(body.indexOf('session_store') == -1) {
			console.log('No session DB found. Creating one...');
			nano.db.create('session_store');
		}

		// Set up sessions
		var CouchDBStore = require('connect-couchdb')(session);
		app.use(session( {
		  resave: false,
		  saveUninitialized: false,
		  secret: 'Z3qZBqrdmKjHReMM9HVWilv2GeWL8lsr',
		  store: new CouchDBStore({nano: nano})
		}) );

		var dashboardDB = nano.use('dashboard');
		var siteDB = nano.use('sites');
		dashboardDB.list(function(err, body) {
			if(err) {
				console.error('Could not access dashboardDB: ' + err);
			} else {
				console.log('DashboardDB connected.');
				app.locals.dashboardDB = dashboardDB;
			}
		})
		siteDB.list(function(err, body) {
			if(err) {
				console.error('Could not access siteDB: ' + err);
			} else {
				var sites = body.total_rows;
				console.log('SiteDB connected. Found ' + sites + ' sites.');
				app.locals.siteDB = siteDB;
			}
		});

		setTimeout(function() {
			rescan();
			finishSetup();
		}, 500);
	}
});



// middleware
var loadDashboardMiddleware = function(req, res, next) {

	var insertFunction = function(dataClient, fn) {
		var dataDB = req.dashboard;
		extendify(dataDB, dataClient);
		debug('Inserted into database: ' + JSON.stringify(dataClient, null, 4));
		return app.locals.dashboardDB.insert(dataDB, fn);
	};
	req.applyDocChanges = insertFunction;

	debug('Loading Dashboard data');
	app.locals.dashboardDB.get('data', function(err, body) {
		if(err) {
			var msg = 'Could not fetch data: ' + err;
			console.error(msg);
			return next();
		} else {
			req.dashboard = body;
			debug('Injected dashboard data into "req" object.');
			return next();
		}
	});
}

var loadSiteMiddleware = function(req, res, next) {

	var insertFunction = function(dataClient, fn) {
		var dataDB = req.site;
		extendify(dataDB, dataClient);
		debug('Inserted into database: ' + JSON.stringify(dataClient, null, 4));
		return app.locals.siteDB.insert(dataDB, fn);
	};
	req.applyDocChanges = insertFunction;

	var site = req.params['site'];
	debug('Loading site: ' + site + ' from DB.');
	app.locals.siteDB.get(site, function(err, body) {
		if(err) {
			var msg = 'Could not fetch ' + site + ' from DB: ' + err;
			console.error(msg);
			return next();
		} else {
			req.site = body;
			//debug('DB contents: ' + JSON.stringify(body, null, 4));
			debug('Injected site into "req" object.');
			return next();
		}
	});
};

var userAuthMiddleware = function(req, res, next) {
	if(req.session.userID && ( req.session.siteID)) {
		var userID = req.session.userID;
		debug('Authenticated user: ' + userID);
		if(req.session.siteID === req.site.siteID) {
			debug('User matches site!');
			var user = req.site.users[userID];
			req.user = user;
			debug('User: ' + user.name);
		}
	}
	return next();
};

function updateSearchMap() {
	debug('Updating SearchMap...');
	app.locals.dashboardDB.get('data', function(err, body) {
		if(err) {
			var msg = 'Could not fetch data: ' + err;
			console.error(msg);
			return;
		} else {
			var categories = body.categories;
			var map = {};
			Object.getOwnPropertyNames(categories).forEach( function(key) {
				var cat = categories[key];
				Object.getOwnPropertyNames(cat.documents).forEach( function(key) {
					var doc = cat.documents[key];
					map[key] = doc;
					map[key].caturl = cat.url;
				});
			});
			searchMap = map;
			console.log('SearchMap initialized.');
			debug(JSON.stringify(map, null, 4));
			return;
		}
	});
}

function rescan() {
	var config = dirparser('served_files');
		if(config) {
			app.locals.dashboardDB.get('data', function(err, body) {
				if (err) return res.render(err);
				var dataDB = body;
				delete dataDB.categories
				extendify(dataDB, config);
				debug('Updated category-database: ' + JSON.stringify(dataDB, null, 4));
				app.locals.dashboardDB.insert(dataDB, function(err, body) {
					if(err) {
						throw err;
					} else {
						updateSearchMap();
						return body;
					}
				});
			});
		}
}

function finishSetup() {

	app.get('/rescan', function(req, res) {
		res.send(JSON.stringify(updateSearchMap() ));
	});

	app.get("/getFile/:hash", function(req, res) {
		var hash = req.params.hash;
		if(searchMap == undefined || !searchMap.hasOwnProperty(hash)) {
			console.log('SearchMap not initialized or not containing hash. Rescanning...');
			rescan();
		}
		if(!searchMap.hasOwnProperty(hash)){
			return res.send(404);
		}
		var doc = searchMap[hash];
		var url = path.join(__dirname, 'served_files', doc.caturl, doc.filename);
		if(doc.filename.endsWith('.pdf'))
			res.sendFile(url)
		else
			res.download(url, doc.filename);
	});
	// Register routes + middleware
	app.use('/', loadDashboardMiddleware);
	app.use('/', require('./routes/crypto'));
	app.use('/', require('./routes/dashboard'));
	// app.use('/:site', loadSiteMiddleware);
	// app.use('/:site', userAuthMiddleware);
	// app.use('/:site', require('./routes/crypto'));
	// app.use('/:site', require('./routes/site'));

	// Default route -> 404
	app.use(function(req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});


	// ERROR HANDLERS
	//
	// DEV: stacktrace
	if (app.get('env') === 'development') {

	 	app.locals.pretty = true;

		app.use(function(err, req, res, next) {
			res.status(err.status || 500);
			res.render('error', {
				message: err.message,
				error: err
			});
		});
	}

	// PROD: no stackstrace
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
	});

}


module.exports = app;
