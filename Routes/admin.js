var Neo4jsession = require('./ne4jConfig');
authenticated = require('./authMidd');
var express = require('express')
  , router = express.Router();

/*
* ADMIN ROUTES
*/

//dashboard
router.get('/admin/dashboard',authenticated, (req, res) => {

	var products = [];
	var categories = [];
	Neo4jsession
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

	Neo4jsession
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
router.post('/product/update', (req, res) => {
	Neo4jsession.run("MATCH (p:Product) WHERE ID(p) = "+req.body.id+" SET p.title = '"+req.body.title+"' SET p.description= '"+req.body.description+"' SET p.price='"+req.body.price+"' RETURN p")
	.then(result => {
		res.redirect('/admin/dashboard');
	})
	.catch(error => {
		console.log(error);
	});
});
//delete product
router.post('/product/delete', (req, res) => {
	Neo4jsession.run("MATCH (p:Product) WHERE ID(p) = "+req.body.id+" DETACH DELETE p")
	.then(result => {
		res.redirect('/admin/dashboard');
	})
	.catch(error => {
		console.log(error);
	});
});

//create product

router.post('/product/create', (req, res) => {
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
	  Neo4jsession.run("CREATE (n:Product { title: '"+req.body.title+"', description: '"+req.body.description
	  +"', price:'"+req.body.price+"' , image: '"+newFileName+"' }) RETURN n ")
		.then(result => {
			Neo4jsession.run("MATCH (p:Product),(c:Category) WHERE ID(p)="+result.records[0]._fields[0].identity.low+" AND ID(c)="+req.body.category+" CREATE (p)-[r:BELONGS_TO]->(c) return r")
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

module.exports = router;