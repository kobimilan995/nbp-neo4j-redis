var express = require('express');
var session = require('express-session');
var path = require('path');
var fs = require('fs');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver').v1;
var fileUpload = require('express-fileupload');
var moment = require('moment');


var app = express();
app.use(session({secret: 'ssshhhhh',   saveUninitialized: true, resave: true}));
//assets
app.use('/scripts', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
//view engine

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));
var authenticated = function (req, res, next) {
  if(req.session.user != undefined)
  	{
		next();
  	}
	else
	{
		res.redirect('/');
		return;
	}
}


var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', ""));
var session = driver.session();
//home route
app.get('/', (req, res) => {
	res.render('pages/index', {auth: req.session.user});
});

/*
* ADMIN ROUTES
*/

//dashboard
app.get('/admin/dashboard',authenticated, (req, res) => {

	var products = [];
	var categories = [];
	session
	.run('MATCH (n:Product)-[r:BELONGS_TO]-(b) RETURN n,r,b')
	.then((result) => {
		result.records.forEach((item) => {
			products.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title,
				description:item._fields[0].properties.description,
				price:item._fields[0].properties.price,
				image:item._fields[0].properties.image,
				category:item._fields[2].properties.title
			});
		});
	})
	.catch((error) => {
		console.log(error);
	});

	session
	.run('MATCH (n:Category) RETURN n LIMIT 25')
	.then((result) => {
		result.records.forEach((item) => {
			categories.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title
			});
		});
		res.render('pages/admin/dashboard', {
			products: products,
			categories: categories,
			auth: req.session.user
		});
	})
	.catch((error) => {
		console.log(error);
	});
});
// end dashboard

//update product
app.post('/product/update', (req, res) => {
	session.run("MATCH (p:Product) WHERE ID(p) = "+req.body.id+" SET p.title = '"+req.body.title+"' SET p.description= '"+req.body.description+"' SET p.price='"+req.body.price+"' RETURN p")
	.then(result => {
		res.redirect('/admin/dashboard');
	})
	.catch(error => {
		console.log(error);
	});
});
//delete product
app.post('/product/delete', (req, res) => {
	session.run("MATCH (p:Product) WHERE ID(p) = "+req.body.id+" DETACH DELETE p")
	.then(result => {
		res.redirect('/admin/dashboard');
	})
	.catch(error => {
		console.log(error);
	});
});

//create product

app.post('/product/create', (req, res) => {
	if (!req.files)
	    return res.status(400).send('No files were uploaded.');
	 
	  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
	  var sampleFile = req.files.image;
	 
	  // Use the mv() method to place the file somewhere on your server
	  var newFileName = req.body.title+Date.now()+'.jpg';
	  var newFilePath = __dirname + '/public/uploads/'+newFileName;
	  sampleFile.mv(newFilePath, function(err) {
	    if (err)
	      return res.status(500).send(err);
	  });
	  session.run("CREATE (n:Product { title: '"+req.body.title+"', description: '"+req.body.description+"', price:'"+req.body.price+"' , image: '"+newFileName+"' }) RETURN n ")
		.then(result => {
			  session.run("MATCH (p:Product),(c:Category) WHERE ID(p)="+result.records[0]._fields[0].identity.low+" AND ID(c)="+req.body.category+" CREATE (p)-[r:BELONGS_TO]->(c) return r")
				.then(result => {
					res.redirect('/admin/dashboard');
				})
				.catch(error => {
					console.log(error);
				});
		})
		.catch(error => {
			console.log(error);
		});

	
});
/*
* END ADMIN ROUTES
*/

/*
* AUTH ROUTES
*/

var userSession;

//add role [admin, commonUser]

// create account
app.post('/signup', (req, res) => {
	if(req.body.fullname == "" || req.password == "" || req.email == "")
		return res.status(400).send('Your username, password or email is empty. Please check it.');
	if(req.body.password != req.body.confirmPassword)
		return res.status(400).send('Your your password and conform password are not matched. Please check it.');
	
	
//	console.log(req.body);
//	return;
		
	session.run("CREATE (n:User { fullname: '" + req.body.fullname + "', password: '" + req.body.password + "', email: '"  + req.body.email + "'})").then( resoult =>{
		return res.status(200).send('Try to log in now.');
	}).catch(error => {
		console.log(error);
	});

});

//login
app.post('/login', (req, res) => {
	userSession = req.session;
	session.run("MATCH (u: User) WHERE u.username='" + req.body.username + "' AND u.password ='" + req.body.password + "' return u").then( result => {
		result.records.map((record) => { 
			userSession.user =  record._fields[0].properties;
			res.redirect('/');
		}).catch(error => {
			console.log(error);
		});
	});
});

//update account

app.post('/account-update', (req, res) => {
	userSession = req.session;
	session.run("MATCH (u:User) WHERE u.email='"+req.body.email+"' SET u.password='" + req.body.password + "' SET u.email='" + req.body.newEmail +"' return u")
	.then( r => {
		userSession.user.email = req.body.email;
		userSession.user.password = req.body.password;
		return res.status(200).send("Successfully updated account information.");//r.records);
	});
});

//logout
app.get('/logout', (req, res) => {
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

function isUserLoggedIn() {
	if(req.session.user.email != null && req.session.user.email != "")
		return true;
	else
		return false;
}

/*
* AUTH end
*/



app.listen(3001);
console.log('Server started on port 3001!');

module.exports = app;
