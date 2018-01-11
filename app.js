var express = require('express');
var path = require('path');
var fs = require('fs');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver').v1;
var fileUpload = require('express-fileupload');
var moment = require('moment');


var app = express();
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

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', "kizz"));
var session = driver.session();
//home route
app.get('/', (req, res) => {
	res.render('pages/index');
});

/*
* ADMIN ROUTES
*/

//dashboard
app.get('/admin/dashboard', (req, res) => {
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
			categories: categories
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

app.post('/account/create', (req, res) => {
	if(req.username == "" || req.password == "" || req.email == "")
		return res.status(400).send('Your username, password or email is empty. Please check it.');

		
	session.run("CREATE (n:User { username: '" + req.body.username + "', password: '" + req.body.password + "', email: '"  + req.body.email + "'})").then( resoult =>{
		return res.status(200).send('Try to log in now.');
	}).catch(error => {
		console.log(error);
	});

})


app.listen(3001);
console.log('Server started on port 3000!');

module.exports = app;
