var _ = require('lodash');
var express = require('express');
var session = require('express-session');
var EJS = require('ejs');
var mongodb = require('mongodb');
var app = express();
var distance = require('gps-distance');
var async = require('async');
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;

//---------------------------------------------------------------------------
// Database and connection
//---------------------------------------------------------------------------
var g_mongoUri =
      process.env.MONGOLAB_URI ||
      process.env.MONGOHQ_URL  ||
      process.env.MONGO_URL    ||
      'mongodb://localhost:27017/dashme';

// The users collection will be placed here.
var g_eventsCollection = null;
var g_locationCollection = null;
var g_preferencesCollection = null;

mongodb.MongoClient.connect(g_mongoUri, function (err, db) {
  if (err) { throw new Error(err); }
  console.log("Connected to mongodb at %s!", g_mongoUri);

  db.collection("preferences", function(err, collection) {
    if (err) { throw new Error(err); }
    console.log("Obtained preferences collection.");
    g_preferencesCollection = collection;
  });
  db.collection("events", function(err, collection) {
    if (err) { throw new Error(err); }
    console.log("Obtained events collection.");
    g_eventsCollection = collection;
  });
  db.collection("location", function(err, collection) {
    if (err) { throw new Error(err); }
    console.log("Obtained location collection.");
    g_locationCollection = collection;
  });
});

/*

Schema Design:

{
  day: 'Wednesday',
  spans: [ ['start', 'fin'],
           ['start', 'fin']
           ],
  total: total,
}

QUERY for user=lucas
{
  user: 'lucas',
  type: 'atwork',
  start: 'start',
  end: 'end'
}
{
  user: 'lucas',
  type: 'weight',
  value: 160
}
*/

//------------------------------------------------------------------------------
// User pref logic
//------------------------------------------------------------------------------
var setUserPreference = function (user, preference, value, cb) {
  g_preferencesCollection.findOneAndUpdate(
    {
      user:user,
      // TODO: rework the schema for preference types like location vs weight goal
      preference:preference
    },
    { $set: { value: value } },
    {
      upsert: true,
      returnOriginal: false
    },
    function (err, result) {
      if (err) { console.warn("Error inserting: ", err); return cb(false); }
      return cb(true);
    });
};

//------------------------------------------------------------------------------
// Location logic.
//------------------------------------------------------------------------------
var onNewLocation = function (req, res) {
  var username = req.user;

  var doc = _.pick(req.query, ['lat', 'lon', 'alt']);
  doc.user = username;
  doc.timestamp = new Date();

  g_locationCollection.insert(
    doc,
    function (err, result) {
      if (err) { console.warn("Error inserting: ", err); return; }

      // Find all the preferences for a given user
      g_preferencesCollection.find({user: username}).toArray(
        function (e, docs) {
          if (e) { console.warn(e); res.send(500); return e; }

          // foreach preference, check the distance and update if necessary
          return async.eachSeries(docs, function (doc, cb) {
            var locationName = doc.preference;
            var loc = doc.value;
            var dist = distance(parseFloat(loc.lat), parseFloat(loc.lon),
                                parseFloat(req.query.lat), parseFloat(req.query.lon));
            console.log("The distance to %s is %s meters.", locationName, dist);
            if (dist < 200) {
              console.log("Less than 200 Meters from %s, so updating!", locationName);
              updateOrCreateLocationEventRecord(username, locationName, cb);
            }
            else {
              cb(null);
            }
          });
        },
        function (err) {
          if (err) {
            console.warn("error %s occurred during processing", err);
          }
          else {
            console.log("successfully processed all locations");
          }
        });
    });

  res.send({ success: true }); // TODO: too eager / optimistic?
};

var updateOrCreateLocationEventRecord = function (username, location_name, cb) {
  // Find records newer than 20 minutes
  var now = new Date();
  var threshold = new Date(now.getTime() - 20 * 60 * 1000 /* 20 minutes */);

  // Find the last modified location if it is less than the threshold, if not create it.
  g_eventsCollection.findOneAndUpdate(
    {
      user: username,
      type: location_name,
      seenLast: { $gte: threshold }
    },
    { $set: { seenLast: now } },
    {
      sort: {seenLast: -1},
      upsert: true,
      returnOriginal: false
    },
    function(err, doc) {
      if (err) { console.warn("Error inserting: ", err); return cb(err); }
      doc = doc.value;
      if (!doc.seenFirst) {
        console.warn("No previous event found");
        // We created a new record. We need to set the seenFirst field
        g_eventsCollection.findOneAndUpdate(
          { _id: doc._id },
          { $set: {seenFirst: now} },
          {},
          function(err, doc) {
            if (err) { console.warn("Error inserting: ", err); return cb(err); }
            return cb(null);
          });
      }
      return null;
    });
}

//---------------------------------------------------------------------------
// Routing and server config
//---------------------------------------------------------------------------
app.set('view engine', 'ejs');

app.use(session({
  secret: 'homerjsimpson',
  saveUninitialized: false,
  resave: true
}));

// Log every request.
app.use(function(req, res, next) {
  console.log('%s %s', req.method, req.url);
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// These directories get used for static files.
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/gen"));
app.use(express.static(__dirname + "/bower_components"));

//------------------------------------------------------------------------------
// Authentication
//------------------------------------------------------------------------------
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  done(null, id);
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    console.log(username, password);
    done(null, username);
  }));

app.get('/login',
        function (req, res) {
          res.render('login');
        });

app.get('/localauth',
         passport.authenticate('local', { failureRedirect: '/login' }),
         function(req, res) {
           res.redirect('/');
         }
       );

var ensureAuth = function (api) {
  return function (req, res, next) {
    if (req.isAuthenticated()) {
      next();
    }
    else if (api) {
      res.send(401);
    }
    else {
      res.redirect("/login");
    }
  };
};

//------------------------------------------------------------------------------
// Endpoints
//------------------------------------------------------------------------------
app.get('/',
        ensureAuth(false),
        function(req, res) {
          async.series([
            function (cb) {
              if (req.query.name) { // There is a key to store, let's store it
                // Submit to the DB
                g_eventsCollection.insert(
                  {
                    user: req.query.name,
                    type: 'weight', // TODO hardcoded weight here.
                    value: req.query.weight,
                    timestamp: new Date()
                  },
                  function (err, result) {
                    if (err) { console.warn(err); res.send(500); cb(err); }
                    else { cb(null); }
                  });
              } else {
                cb(null);
              }
            },
            function (cb) {
              g_eventsCollection.find().toArray(function(e, docs) {
                if (e) { console.warn(e); res.send(500); cb(e); }
                else {
                  console.log("Query result is ", docs);
                  res.render('home',
                             { username: req.user, keys: docs });
                }
              });
            }
          ]);
        });


// GPS handler
app.get('/gps',
        ensureAuth(true),
        function(req, res) {
          if (req.query.lat && req.query.lon) {
            onNewLocation(req, res);
          }
          else if (req.query.tracker) {
            // The Android app sends ?tracker=start and ?tracker=stop requests
            //  that need to succeed.
            res.send(200);
          }
          else {
            console.warn("Invalid GPS params: %s", req.url);
            res.send(400);
          }
        });


// Set Place Handler
app.get('/setPlace/:place',
        ensureAuth(true),
        function(req, res) {
          if (req.query.lat && req.query.lon) {
            setUserPreference(
              req.user, req.param('place'),
              {lat:req.query.lat, lon:req.query.lon}, function(success) {
                if(success){ res.send({ success:true }); }
                else{ res.send(500); }
              });
          }
          else {
            console.warn("Invalid GPS params: %s", req.url);
            res.send(400);
          }
        });


// Get user data
app.get('/getData/:type',
        ensureAuth(true),
        function(req, res) {
          g_eventsCollection.find(
            { user: req.user, type:req.param("type") },
            { timestamp: 1, value: 1 }
          ).toArray(function(e, docs) {
            if (e) { console.warn(e); res.send(500); }
            else {
              console.log("Query result is ", docs);
              res.send(docs);
            }
          });
        });

//------------------------------------------------------------------------------
// Start the server.
var g_port = Number(process.env.PORT || 3000);
app.listen(g_port, function() {
  console.log("Listening on port %s...", g_port);
  console.log("Ctrl+C to exit.");
});
