var debug = require('debug')('express:dashbaord');
var router = require('express').Router();

router.get('/', function(req, res) {
	if(!req.dashboard) {
		return res.render('dashboard_error', {error: 'Could not load dashboard data.'});
	} else {
		return res.render('db_main', {data: req.dashboard});
	}
});

router.get('/error', function(req, res) {
	var err = new Error('Not Found');
	err.status = 404;
	return res.render('db_error', {error: err});
});

module.exports = router;
