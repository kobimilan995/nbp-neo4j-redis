
Neo4jsession = require('./ne4jConfig');
authenticated = require('./authMidd');
var express = require('express')
  , router = express.Router();
var moment = require('moment');
var path = require("path");

 
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
	var image = req.files.userImage;
	/*var imageName =  Date.now() + '.jpg';
	var imagePath = __dirname + '/public/uploads/users/' + imageName;
	image.mv(imagePath, (err) => {
		if(err)
			return res.status(500).send(err);
	});*/

	//console.log(req.body);
	//return res.status(200).send(req.body);

	console.log("1");

		
	Neo4jsession.run("CREATE (u:User { username:'" + req.body.username + "',fullname: '" + req.body.fullName + "', password: '" + req.body.password + "', email: '" 
	 + req.body.email + "'," + " profileImage: '', role: 'buyer'}) return u").then( result =>{
		//return res.status(200).send('Try to log in now.');
		//console.log(result.records[0]._fields[0].identity.low);
		//return;
		console.log("2");

		var imageName = result.records[0]._fields[0].identity.low + ".jpg";
		var imagePath = path.join( __dirname , '/../' , 'public/uploads/usersProfiles/' + imageName);

		image.mv(imagePath, (err) => {
			if(err)
				return res.status(500).send(err);
		});

		//conosle.log(imagePath);
		Neo4jsession.run
		("MATCH (u: User) WHERE u.email='" + req.body.email + "' SET u.profileImage=ID(u)+" + "'.jpg'" + " return u").then( rec => {
		
		console.log("3.");	
		console.log(rec);


		return res.redirect('/');
		})
	}).catch(error => {
		console.log(error);
	});

});

//login
router.post('/login', (req, res) => {
	
	console.log( "req.body:" + req.body);

	userSession = req.session;
	Neo4jsession.run("MATCH (u: User) WHERE u.email='" + req.body.email + "' AND u.password ='" + req.body.password +
	 "' return u").then( result => {
		result.records.map((record) => {
			if(record._fields[0].properties.email != undefined) {
				userSession.user =  record._fields[0].properties;
				res.redirect('/home');
			} else {
				res.redirect('/');
			}
		});
	}).catch(error => {
		res.redirect('/');
	});
});

//update account

router.post('/account-update', (req, res) => {
	userSession = req.session;
	Neo4jsession.run("MATCH (u:User) WHERE u.email='"+req.body.email+"' SET u.password='" + req.body.password 
	+ "' SET u.email='" + req.body.newEmail +"' return u")
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

//profile
router.get('/profile', authenticated, (req, res) => {
	return res.render('pages/profile', { auth: req.session.user});
});

//changeEmail
router.post('/changeEmail', authenticated, (req, res) => {
	userSession = req.session;

	Neo4jsession.run("MATCH (u:User) WHERE u.email='" + userSession.user.email + "' SET u.email='" 
	+ req.body.newEmail + "' return u").then( result => {
			result.records.map( (record) => {
				userSession.user = undefined;//record._fields[0].properties;
				return res.redirect('/');
			})
		}).catch(err => {
			return res.status(500).send(err);
		});
	});


//changePassword
router.post('/changePassword', authenticated, (req, res) => {
	userSession = req.session;
	if(req.body.newPassword == req.body.confirmPassword)
	{

		Neo4jsession.run("MATCH (u:User) WHERE u.email='" + userSession.user.email + "' SET u.password='" 
		+ req.body.newPassword + "' return u").then( result => {
			result.records.map((record) => {
				userSession.user = undefined;
				return res.redirect('/');
			})
		}).catch(err => {
			return res.status(500).send(err);
		});
	} else
		return res.status(500).send("Dose not match new password and confirm password.");
});
//home
router.get('/home', authenticated,  (req, res) => {
	shoppingCartProducts = [];
	Neo4jsession
	.run("MATCH (u:User { email: '"+req.session.user.email+"' })<-[:IS_ORDERED_BY]-(p:Product) RETURN p").then((result) => {
		result.records.forEach((item) => {
			shoppingCartProducts.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title
			});
		});
	}).catch(error => {
		console.log(error);
	});
	var products = [];
	Neo4jsession
	.run('MATCH (n:Product)-[r:BELONGS_TO]-(b:Category) RETURN n,r,b')
	.then((result) => {
		result.records.forEach((item) => {
			var product = {
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title,
				description:item._fields[0].properties.description,
				price:item._fields[0].properties.price,
				image:item._fields[0].properties.image,
				category:item._fields[2].properties.title,
				isInShoppingCart: false
			};
			shoppingCartProducts.forEach(scProduct => {
				if(product.id == scProduct.id) {
					product.isInShoppingCart = true;
				}
			})
			products.push(product);
		});
		res.render('pages/index', {
			auth: req.session.user,
			products: products
		});
	})
	.catch((error) => {
		console.log(error);
	});
});

//add product to cart

router.post('/product/addToCart', authenticated, (req, res) => {
	console.log(req.body.product_title);
	Neo4jsession
	.run("MATCH (u:User {email:'"+req.session.user.email+"'}), (r:Product {title:'"+req.body.product_title+"'}) CREATE (r)-[:IS_ORDERED_BY]->(u)")
	.then((result) => {
		res.redirect('/home');
	})
	.catch((error) => {
		console.log(error);
	});
	
});
//remove from cart
router.post('/product/removeFromCart', authenticated, (req, res) => {
	console.log(req.body.product_title);
	Neo4jsession
	.run("MATCH (u:User {email:'"+req.session.user.email+"'})<-[r:IS_ORDERED_BY]-(p:Product {title: '"+req.body.product_title+"'}) DELETE r")
	.then((result) => {
		if(req.body.page_type == 'index') {	
			res.redirect('/home');
		} else if (req.body.page_type == 'shoppingCart') {
			res.redirect('/shoppingCart');
		}
	})
	.catch((error) => {
		console.log(error);
	});
	
});
//remove from cart
router.get('/shoppingCart', authenticated, (req, res) => {
	shoppingCartProducts = [];
	Neo4jsession
	.run("MATCH (u:User { email: '"+req.session.user.email+"' })<-[:IS_ORDERED_BY]-(p:Product)-[r:BELONGS_TO]-(b:Category) RETURN p,b").then((result) => {
		result.records.forEach((item) => {
			shoppingCartProducts.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title,
				description:item._fields[0].properties.description,
				price:item._fields[0].properties.price,
				image:item._fields[0].properties.image,
				category:item._fields[1].properties.title
			});
		});
		res.render('pages/shoppingCart', {
			products: shoppingCartProducts,
			auth: req.session.user
		});
	}).catch(error => {
		console.log(error);
	});
});
// get product view
router.get('/product/:id', authenticated, (req, res) => {
	shoppingCartProducts = [];
	Neo4jsession
	.run("MATCH (u:User { email: '"+req.session.user.email+"' })<-[:IS_ORDERED_BY]-(p:Product)-[r:BELONGS_TO]-(b:Category) RETURN p,b").then((result) => {
		result.records.forEach((item) => {
			shoppingCartProducts.push({
				id: item._fields[0].identity.low,
				title:item._fields[0].properties.title,
				description:item._fields[0].properties.description,
				price:item._fields[0].properties.price,
				image:item._fields[0].properties.image,
				category:item._fields[1].properties.title
			});
		});
	}).catch(error => {
		console.log(error);
	});

	Neo4jsession
	.run("MATCH (p:Product)-[r:BELONGS_TO]-(b:Category) WHERE ID(p) = "+req.params.id+"  RETURN p,b").then((result) => {
		var product = result.records[0]._fields[0].properties;
		product.id = result.records[0]._fields[0].identity.low;
		product.category = {
			id: result.records[0]._fields[1].identity.low,
			title: result.records[0]._fields[1].properties.title
		}
		product.isInShoppingCart = false;
		shoppingCartProducts.forEach(scProduct => {
			if(scProduct.id == product.id) {
				product.isInShoppingCart = true;
			}
		});
		product.comments = [];
		Neo4jsession
		.run("MATCH (u:User)<-[rr:IS_WRITTEN_BY]-(c:Comment)<-[r:IS_COMMENTED]-(p:Product) WHERE ID(p) = "+req.params.id+" RETURN c,u ORDER BY c.created_at DESC").then(result2 => {
			result2.records.forEach(item2 => {
				product.comments.push({
					id: item2._fields[0].identity.low,
					text: item2._fields[0].properties.text,
					created_at: item2._fields[0].properties.created_at,
					diffForHumans: moment(item2._fields[0].properties.created_at).fromNow(),
					user: {
						id: item2._fields[1].identity.low,
						username: item2._fields[1].properties.username
					}
				});
			});
			console.log('product', product);
			res.render('pages/product', {
				auth: req.session.user,
				product: product
			});
		});

		
	}).catch(error => {
		console.log(error);
	});
});
//add comment
router.post('/comment/add', authenticated, (req,res) => {
	Neo4jsession
	// .run("MATCH (p:Product {title: '"+req.body.product_title+"'}), (u:User {email: '"req.session.user.email"'}) CREATE (c:Comment {text:'"+req.body.comment+"'})")
	           // (u:User {email: '"req.session.user.email"'})
	.run("MATCH (p:Product {title: '"+req.body.product_title+"'}), (u:User {email: '"+req.session.user.email+"'}) CREATE (u)<-[rr:IS_WRITTEN_BY]-(c:Comment {created_at: '"+moment().format()+"',text:'"+req.body.comment+"' })<-[r:IS_COMMENTED]-(p)")
	.then(response => {
		res.redirect('/product/'+req.body.product_id);
	})
});
/*
* AUTH end
*/
//export routes
module.exports = router; 