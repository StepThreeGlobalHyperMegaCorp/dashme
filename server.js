var express = require('express');
var EJS = require('ejs');
var mongodb = require('mongodb');
var app = express();

//---------------------------------------------------------------------------
// Database and connection
//---------------------------------------------------------------------------
var g_mongoUri =
  process.env.MONGO_URL || 'mongodb://localhost:27017/dashme';

// The users collection will be placed here.
var g_usersCollection = null;

mongodb.MongoClient.connect(g_mongoUri, function (err, db) {
    if (err) { throw new Error(err); }
    console.log("Connected to mongodb at %s!", g_mongoUri);

    // Now connect to the actual database collection (like a table)
    db.collection("users", function(err, collection) {
        if (err) { throw new Error(err); }
        console.log("Obtained users collection.");
        g_usersCollection = collection;
      });
  });

//---------------------------------------------------------------------------
// Routing and server config
//---------------------------------------------------------------------------

app.set('view engine', 'ejs');

// Log every request.
app.use(function(req, res, next) {
    console.log('%s %s', req.method, req.url);
    next();
  });

// These directories get used for static files.
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/gen"));
app.use(express.static(__dirname + "/bower_components"));

app.get('/',
        function(req, res) {
          if(req.query.name) { // There is a key to store, let's store it
            // Submit to the DB
            var docToInsert = {};
            docToInsert[req.query.name] = req.query.weight;
			var name = req.query.name;
			var weight = req.query.weight;
			
            //g_usersCollection.insert(docToInsert, 
			g_usersCollection.findAndModify(
				    {name:name},
					{},
				    {$currentDate: {"event.timestamp": { $type: "timestamp" }}, $set: {"event.weight": weight}},
				    {upsert:true},
					function (err, doc) {
              			if (err) {
                			console.log(err);
                			// If it failed, return error
                			res.send("There was a problem adding the information to the database.");
              			}
            		}
			 );
          }
          // res.render('home', { foo: req.query.foo || "foo" });
          g_usersCollection.find().toArray(function(e, docs) {
            console.log("Query result is ", docs);
            res.render('home',
                       { foo  : (req.query.foo || "foo"),
                         keys : docs
                       });
          });
        });

// Start the server.
var g_port = Number(process.env.PORT || 3000);
app.listen(g_port, function() {
    console.log("Listening on port %s...", g_port);
    console.log("Ctrl+C to exit.");
  });

