
var express = require('express');
//var router = express.Router();
var session = require('express-session');

var path = require('path');
var fs = require('fs');
var logger = require('morgan');
var bodyParser = require('body-parser');


var fileUpload = require('express-fileupload');
var moment = require('moment');


//neo4j
var Neo4jsession = require('./Routes/ne4jConfig');


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

//routes
app.use(require('./Routes/auth'));
app.use(require('./Routes/admin'));

//home route
app.get('/', (req, res) => {
	res.render('pages/index', {auth: req.session.user});
});

//about route
app.get('/about', (req,res) => {
	res.render('pages/about', { auth: req.session.user });
});


app.listen(3001);
console.log('Server started on port 3001!');

module.exports = app;
