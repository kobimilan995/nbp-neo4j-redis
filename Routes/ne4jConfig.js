var neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', "kizz"));
var Neo4jsession = driver.session();

module.exports = Neo4jsession;