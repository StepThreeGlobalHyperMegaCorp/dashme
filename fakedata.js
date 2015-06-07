var async = require('async');
var mongodb = require('mongodb');

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

  async.each([ { col: "preferences", cb: function(col) { g_preferencesCollection = col; } },
               { col: "events",      cb: function(col) { g_eventsCollection = col; } },
               { col: "location",    cb: function(col) { g_locationCollection = col; } }
             ],
             function (item, cb) {
               db.collection(item.col, function(err, collection) {
                 if (err) { return cb(err); }
                 console.log("Obtained %s collection.", item.col);
                 item.cb(collection);
                 return cb(null);
               });
             },
             function (err) {
               if (err) {
                 console.log("Couldn't connect to all collections.");
                 process.exit(1);
               }
               else {
                 console.log("Successfully connected to all collections.");
                 main();
               }
             });
});

//------------------------------------------------------------------------------
// Fake Locations
//------------------------------------------------------------------------------
var fakeSpan = function(date, startHour, endHour) {
  return {
    seenFirst: new Date(date.valueOf() + startHour * 60*60*1000),
    seenLast: new Date(date.valueOf() + endHour * 60*60*1000)
  };
};

var fakeAWeekOfWork = function(startDate) {
  var sun = new Date(startDate.valueOf() -
                     (startDate.getDay() * 24*60*60*1000));
  sun.setHours(0);
  sun.setMinutes(0);
  sun.setSeconds(0);

  var map = [
    /* Sun */ [ ],
    /* Mon */ [ [9, 12], [13, 18] ],
    /* Tue */ [ [8, 11], [13, 17], [21, 22] ],
    /* Wed */ [ [12, 17] ],
    /* Thu */ [ [8, 12], [13, 16], [18, 20] ],
    /* Fri */ [ [9, 13], [14, 16] ],
    /* Sat */ [ ]
  ];

  var insert_me = [];
  for (var i = 0; i < map.length; ++i) {
    var start = new Date(sun.valueOf() + i*24*60*60*1000);
    var spans = map[i];
    for (var j = 0; j < spans.length; ++j) {
      var span = fakeSpan(start, spans[j][0], spans[j][1]);
      insert_me.push(span);
    }
  }

  return insert_me;
};

var insertSpans = function(username, location_name, spans, cb_final) {
  async.eachLimit(
    spans,
    2,
    function(span, cb) {
      console.log("Inserting fake span %s -> %s",
                  span.seenFirst.toISOString(), span.seenLast.toISOString());
      g_eventsCollection.insert(
        {
          user: username,
          type: location_name,
          seenFirst: span.seenFirst,
          seenLast: span.seenLast
        },
        cb);
    },
    cb_final);
};

var die = function(msg) {
  console.error(msg);
  process.exit(1);
};

var main = function() {
  var opt = require("node-getopt").create([
    [ 'u', 'user=ARG', 'The username (e.g. lucas)' ],
    [ 'l', 'location=ARG', 'The location name (e.g. work)' ],
    [ 'p', 'printonly', 'Only print, no insert.' ],
    [ 'r', 'remove', 'Remove all events, do not add.' ]
  ]).bindHelp().parseSystem();

  var username = opt.options['user'] || die("Username argument empty.");
  var location = opt.options['location'] || die("Location argument empty.");

  // always start one week ago from now
  var startDate = new Date(new Date().valueOf() - 7*24*60*60*1000);
  var spans = fakeAWeekOfWork(startDate);

  if (opt.options['printonly']) {
    for (var i = 0; i < spans.length; ++i) {
      console.log("Fake span %s -> %s",
                  spans[i].seenFirst.toISOString(),
                  spans[i].seenLast.toISOString());
    }
    process.exit(0);
  }
  else if (opt.options['remove']) {
    console.log("Removing all records with user %s and location %s...",
                username, location);
    g_eventsCollection.remove(
      {
        user: username,
        type: location
      },
      {},
      function (err, result) {
        if (err) { console.log("Error %s", err); }
        else { console.log("Success."); }
        process.exit(0);
      });
  }
  else {
    console.log("Faking %s time spans for the current week for user %s.",
                username, location);

    insertSpans(
      username,
      location,
      spans,
      function (err) {
        if (err) {
          console.log("Error! %s", err);
        }
        else {
          console.log("Success!");
          process.exit(0);
        }
      });
  }
};
