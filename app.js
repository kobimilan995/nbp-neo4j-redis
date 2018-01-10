var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver').v1;


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
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', ""));
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
	session
	.run('MATCH (n:Product) RETURN n LIMIT 25')
	.then((result) => {
		var products = [];
		result.records.forEach((item) => {
			products.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title,
				description:item._fields[0].properties.description
			});
		});
		res.render('pages/admin/dashboard', {
			products: products
		});
	})
	.catch((error) => {
		console.log(error);
	});
});
// end dashboard

//update product
app.post('/product/update', (req, res) => {
	session.run("MATCH (p:Product) WHERE ID(p) = "+req.body.id+" SET p.title = '"+req.body.title+"' SET p.description= '"+req.body.description+"' RETURN p")
	.then(result => {
		res.redirect('/admin/dashboard');
	})
	.catch(error => {
		console.log(error);
	});
});

app.post('/product/delete', (req, res) => {
	session.run("MATCH (p:Product) WHERE ID(p) = "+req.body.id+" DELETE p")
	.then(result => {
		res.redirect('/admin/dashboard');
	})
	.catch(error => {
		console.log(error);
	});
});
//end update product
/*
* END ADMIN ROUTES
*/

app.listen(3001);
console.log('Server started on port 3000!');

module.exports = app;