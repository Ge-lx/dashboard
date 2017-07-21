var debug = require('debug')('express:dashbaord');
var router = require('express').Router();

router.get('/', function(req, res) {
	if(!req.dashboard) {
		return res.render('dashboard_error', {error: 'Could not load dashboard data.'});
	} else {
		return res.render('dashboard', {data: req.dashboard});
	}
});

router.get('/')

module.exports = router;