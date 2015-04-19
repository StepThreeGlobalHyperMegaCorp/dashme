var express = require('express');
var ECT = require('ect');
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

var ectRenderer = ECT( { watch : true,
                         root  : __dirname + '/views',
                         ext   : '.ect',
                         open  : '{{',
                         close : '}}'
  });

app.set('view engine', 'ect');
app.engine('ect', ectRenderer.render);

// Log every request.
app.use(function(req, res, next) {
    console.log('%s %s', req.method, req.url);
    next();
  });

// These directories get used for static files.
app.use(express.static(__dirname + "/public"))
app.use(express.static(__dirname + "/gen"))
app.use(express.static(__dirname + "/bower_components"))

app.get('/',
        function(req, res) {
          res.render('home', { foo: req.query.foo || "foo" });
        });

// Start the server.
var g_port = Number(process.env.PORT || 3000);
app.listen(g_port, function() {
    console.log("Listening on port %s...", g_port);
    console.log("Ctrl+C to exit.")
  });

