var router = require('express').Router();
var debug = require('debug')('express:site');

function escapeHTML(s, forAttribute) {
    return s.replace(forAttribute ? /[&<>']/g : /[&<>]/g, function(c) {
    	return {'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;'}[c];
    });
}

router.get('/', function(req, res) {
	if(!req.site.subsites.index){
		res.status(404);
		return res.end('The requested site has no index.');
	} else return serveSubsite('index', req, res);
});

router.get('/admin', function(req, res) {
	if(!req.user) {
		debug('Unauthenticated user tried to access admin-page!');
		res.status(403);
		return res.end('You are not permitted to view that site.');
	} 
	return res.render('cb_page_admin', {site: site});
})

router.get('/register/complete', function(req, res) {
	if(req.user) {
		debug('Logged in user tried to register.');
		res.status(403);
		return res.end('You cannot register when you are logged in.');
	} else if(!req.session.creating) {
		debug('User not creating account tried to register');
		res.status(403);
		return res.end('You are not creating an account.');
	}
	return res.render('cb_page_register', {site: req.site});
})

router.get('/login', function(req, res) {
	if (!req.session) {
		return res.render('cb_enable_cookie', {site: req.site} );
	} else if (req.session.userID || req.session.siteID) {
		var msg = req.session.msg;
		delete req.session.msg;
		return res.render('cb_page_login', {existingSession: true, site: req.site, msg: msg}); //Login should not be displayed in template
	} else {
		var msg = req.session.msg;
		delete req.session.msg;
		return res.render('cb_page_login', {existingSession: false, site: req.site, msg: msg});
	}
});

router.get('/:subsite', function(req, res) {
	return serveSubsite(req.params['subsite'], req, res);
});

function serveSubsite(subsite, req, res) {
	if(!req.site.subsites[subsite]) {
		res.sendStatus(404);
	} else {
		var msg = req.session.msg;
		delete req.session.msg;
		return res.render('cb_page', {site: req.site, subsite: subsite, user: req.user, msg: msg} );
	}
}

router.post('/*', function(req, res) {
	if(!req.user) {
		console.error('POST from unauthenticated user: ' + req.body);
		return res.sendStatus(403);
	} else {
		var clientChanges = req.body;
		if(clientChanges.users) {
			console.log('User ' + req.user.name + ' tried to update users over site-Update!');
			return res.status(403).end('Invalid request.');
		}
		console.log('ClientChanges: ' + JSON.stringify(clientChanges, null, 4));
		req.applyDocChanges(clientChanges, function(err, body) {
			if(err) {
				console.error('Could not update db contents: ' + err);
				return req.sendStatus(500);
			} else {
				console.log('Database successfully updated: ' + JSON.stringify(body, null, 4));
				return res.status(200).json({status: 'Successfully sent.'});
			}
		});
	}
});

module.exports = router;