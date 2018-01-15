
var Neo4jsession = require('./ne4jConfig');
authenticated = require('./authMidd');
var express = require('express')
  , router = express.Router();

 
/*
* AUTH ROUTES
*/

var userSession;

//add role [admin, commonUser]

// create account, registar, signup
router.post('/signup', (req, res) => {
	if(req.body.fullname == "" || req.password == "" || req.email == "")
		return res.status(400).send('Your username, password or email is empty. Please check it.');
	if(req.body.password != req.body.confirmPassword)
		return res.status(400).send('Your your password and conform password are not matched. Please check it.');
	

	//error
	/*var image = req.files.userImage;
	var imageName =  Date.now() + '.jpg';
	var imagePath = __dirname + '/public/uploads/users/' + imageName;
	image.mv(imagePath, (err) => {
		if(err)
			return res.status(500).send(err);
	});*/

	//console.log(req.body);
	//return res.status(200).send(req.body);

		
	Neo4jsession.run("CREATE (n:User { fullname: '" + req.body.fullName + "', password: '" + req.body.password + "', email: '"  + req.body.email + "'," +
	" profileImage: ''})").then( resoult =>{
		return res.status(200).send('Try to log in now.');
	}).catch(error => {
		console.log(error);
	});

});

//login
router.post('/login', (req, res) => {
	userSession = req.session;
	Neo4jsession.run("MATCH (u: User) WHERE u.email='" + req.body.email + "' AND u.password ='" + req.body.password + "' return u").then( result => {
		result.records.map((record) => { 
			userSession.user =  record._fields[0].properties;
			res.redirect('/');
		}).catch(error => {
			console.log(error);
		});
	});
});

//update account

router.post('/account-update', (req, res) => {
	userSession = req.session;
	Neo4jsession.run("MATCH (u:User) WHERE u.email='"+req.body.email+"' SET u.password='" + req.body.password + "' SET u.email='" + req.body.newEmail +"' return u")
	.then( result => {
		userSession.user.email = req.body.email;
		userSession.user.password = req.body.password;
		return res.status(200).send("Successfully updated account information.");//r.records);
	});
});

//logout
router.get('/logout', (req, res) => {
	req.session.destroy( function(err) {
		if(err)
		{
			console.log(err);
		}
		else
		{
			//should be redirect but for now
			res.redirect('/');
		}
	});
});


router.get('/profile', authenticated, (req, res) => {
	return res.render('pages/profile', { auth: req.session.user});
});

router.post('/changeEmail', authenticated, (req, res) => {
	userSession = req.session;

    Neo4jsession.run("MATCH (u:User) WHERE u.email='" + userSession.user.email + "' SET u.email='"+ req.body.newEmail + "' return u").than( result.records.map( record => {
			userSession.user = record._fields[0].properties;

			return res.status(200).send("Successfully changed user email.");
		}).catch(err => {
			return res.status(500).send(error);
		}));
	});

/*
* AUTH end
*/
//export routes
module.exports = router; 