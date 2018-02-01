
var express = require('express');
var router = express.Router();
var session = require('express-session');

var path = require('path');
var fs = require('fs');
var logger = require('morgan');
var bodyParser = require('body-parser');


var fileUpload = require('express-fileupload');
var moment = require('moment');

//redis set up
var redis = require('redis');
var redisClient = redis.createClient();

//redisClient.set('key', 'Hello world!', redis.print);

//redisClient.get('key', (err, resp) => { console.log(resp); } );

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
var authR = require('./Routes/auth');
var adminR = require('./Routes/admin'); 
app.use(authR);
app.use(adminR);
var unAuthenticated = function (req, res, next) {
    console.log(req.param);
    if(req.session.user == undefined)
        {
          next();
        }
      else
      {
          res.redirect('/home');
          return;
      }
  }
//landing page
app.get('/', unAuthenticated, (req, res) => {
	res.render('pages/landing', {
			auth: req.session.user
		});
});



//about route
app.get('/about', (req,res) => {
	res.render('pages/about', { auth: req.session.user });
});


//console.log(adminR.stack);
//console.log(authR.stack);

app.listen(3001);
console.log('Server started on port 3001!');

module.exports = app;
