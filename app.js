var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver').v1;

var app = express();

//view engine

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', ""));
var session = driver.session();

app.get('/', (req, res) => {
	session
	.run('MATCH (n:Product) RETURN n LIMIT 25')
	.then((result) => {
		var products = [];
		result.records.forEach((item) => {
			products.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title
			});
			console.log(item._fields[0].properties);
		});
		res.render('index', {
			products: products
		});
	})
	.catch((error) => {
		console.log(error);
	});
});

app.listen(3000);
console.log('Server started on port 3000!');

module.exports = app;