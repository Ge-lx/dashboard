var crypto = require('crypto');
var uuid = require('uuid');
var validator = require('email-validator');
var debug = require('debug')('express:crypto');
var router = require('express').Router();

function createHash(pw, salt, fn) {
	crypto.pbkdf2(pw, salt, 30000, 512, 'sha512', fn);
}

function createSaltHash(pw, fn) {
	var salt = crypto.randomBytes(1024).toString('hex');
	createHash(pw, salt, fn);
	return salt;
}

/**
	Returns false on collision or invalid email
**/
function checkEmail(email, users) {
	if(!validator.validate(email)) return false;
	var collision = false;
	Object.keys(users).forEach( function(userID) {
		debug('Checking email: ' + users[userID] + ' & ' + email);
		if(users[userID].email === email) {
			debug('email collision detected. Rejecting.');
			collision = true;
		}
	});
	return !collision;
}

router.post('/register/complete', function(req, res) {
	if(!(req.session && req.session.creating)) return res.sendStatus(403);
	if(!(req.body.name && req.body.pw)) return res.sendStatus(400);

	var userID = req.session.creating;
	user = req.site.users[userID];

	debug('Hashing password, saving user-data for ' + req.param.name + '.');

	var salt = createSaltHash(req.body.pw, function(err, hash) {
		if(err) throw err;

		user.name = req.body.name
		user.pwhash = hash.toString('hex');
		user.salt = salt;
		delete user.token;
		delete user.expires;
		debug('Data complete. Saving to DB...');

		var changes = { users: {} };
		changes.users[userID] = user;
		req.applyDocChanges(changes, function(err, body) {
			if(err) {
				throw err;
			} else {
				delete req.session.creating;
				req.session.userID = userID;
				req.session.siteID = req.site.siteID;

				debug('New user saved to database.');
				return res.redirect('../');
			}
		});
	});
});

router.get('/register/:email/:token', function(req, res) {
	if(!req.session) return res.sendStatus(403);
	if(req.user) {
		debug('Autheticated user tried to register! ' + req.session.userID);
		res.status(403);
		return res.end('Please log out first.');
	}

	var users = req.site.users;

	var token = req.params.token;
	var email = req.params.email;

	console.log('Email: ' + email + "\nToken: " + token);

	var keys = Object.keys(users);
	for(var i = 0; i < keys.length; i++) {
		var userID = keys[i]
		var user = users[userID];

		if(user.email === email && user.token && user.expires) {
			debug('User found: ' + userID);
			debug('User token:' + user.token);

			debug('Tokens match: ' + token === user.token);

			if(crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(user.token, 'hex') )) {
				if( Date.now() > user.expires) {
					console.err('Expired token was used for ' + email);
					return res.status(403).send('Token expired.');
				}

				debug('User token accepted. Redirecting...');
				req.session.creating = userID;
				return res.redirect('../complete');
			} else {
				debug('Invalid token!');
				return res.status(403).end('Bad token');
			}
			return;
		}
	}
	return res.status(404).end();
});

//Users cannot register themselves, only activate
router.post('/addUser', function(req, res) {
	if(!req.user) {
		debug('Unauthenticated client tried to add user!');
		return res.sendStatus(403);
	} /*else if (!(req.session.user.role === 'admin') ) {
		debug('Unauthenticated user ' + req.session.user.name + ' tried to add user.');
		return res.sendStatus(403);
	}*/

	var email = req.body.email;
	if(!checkEmail(email, req.site.users)) {
		debug('Email check failed!')
		return res.status(500).end('Invalid or duplicate email-address: ' + email);
	}
	var newUUID = uuid.v4();
	var changes = {users : req.site.users };
	var token = crypto.randomBytes(64).toString('hex');
	var expires = Date.now() + 1000*60*120; //now + 120min
	changes.users[newUUID] = {};
	changes.users[newUUID].email = email;
	changes.users[newUUID].token = token;
	changes.users[newUUID].expires = expires

	req.applyDocChanges(changes, function(err, body) {
		if(err) {
			debug('Could not add new user: ' + err);
			res.status(500);
			return res.send(err);
		}
		debug('New user added successfully: ' + body);
		return res.status(200).json({token: token, expires: expires});
	});
});

router.get('/logout', function(req, res) {
	if(!req.session) return res.sendStatus(403);
	if(req.user) {
		delete req.session.userID;
		delete req.session.siteID;
		req.session.msg = {text: 'Successfully logged out.'};
		return res.redirect('back');
	} else {
		debug('Unautheticated user tried to logout!');
		req.session.msg = {title: 'Not logged in', text: 'You cannot logout.'};
		return res.redirect('back');
	}
});

router.get('/createhash/:pw', function(req, res) {
	if(!req.params.pw) return res.sendStatus(404);
	var salt = createSaltHash(req.params.pw, function(err, hash) {
		if(err) throw err;

		var pwhash = hash.toString('hex');

		res.send('Salt: ' + salt + '\nHash: ' + pwhash);
	});
});

router.post('/login', function(req, res) {
	if(!req.session) return res.sendStatus(403);
	if(req.user) {
		debug('Autheticated user tried to login again! ' + req.session.userID);
		res.status(403);
		return res.end('Please log out first.');
	}

	var users = req.site.users;
	if(req.body.email && req.body.pw) {
		debug('Valid login request.');
		var email = req.body.email;
		var pw = req.body.pw;

		var keys = Object.keys(users);
		for(var i = 0; i < keys.length; i++) {
			var userID = keys[i]
			var user = users[userID];

			if(user.email === email) {
				if(user.expires && user.expires != '0') { //User is not registered yet
					return res.sendStatus(403);
				}

				debug('User found: ' + user.name);

				var salt = user.salt;
				var hashBuffer = Buffer.from(user.pwhash, 'hex');
				createHash(pw, salt, function(err, key) {

					delete req.body.pw;
					if(err) throw err;
					if(!crypto.timingSafeEqual(key, hashBuffer) ){

						debug('Received wrong password for ' + user.name);
						req.session.msg = { title: 'Login failed!', text: 'Please check email and password.'};
						return res.redirect('login');
					} else {

						debug('User logged in: ' + user.name);
						req.session.userID = userID;
						req.session.siteID = req.site.siteID;
						req.session.msg = {text: 'Successfully logged in.'};
						return res.redirect('.');
					}
				});
				return;
			}
		}
		req.session.msg = { title: 'Login failed!', text: 'Please check email and password.'};
		return res.redirect('login');
	}
	req.session.msg = { title: 'Login failed!', text: 'Please enter email and password.'};
	return res.redirect('login');
});

module.exports = router;