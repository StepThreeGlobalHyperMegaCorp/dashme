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

exports.cols = { };

exports.connect = function(cb_final) {
  mongodb.MongoClient.connect(g_mongoUri, function (err, db) {
    if (err) { throw new Error(err); }
    console.log("Connected to mongodb at %s!", g_mongoUri);

    async.each([ "preferences", "events", "location" ],
               function (item, cb) {
                 db.collection(item, function (err, collection) {
                   if (err) { console.error(err); return cb(err); }
                   console.log("Obtained %s collection.", item);
                   exports.cols[item] = collection;
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
                   cb_final(db);
                 }
               });
  });
};
