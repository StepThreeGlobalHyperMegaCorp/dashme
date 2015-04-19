var bodyParser = require('body-parser');
var express = require('express');
var ECT = require('ect');
var app = express();

var ectRenderer = ECT( { watch : true,
                         root  : __dirname + '/views',
                         ext   : '.ect',
                         open  : '{{',
                         close : '}}'
  });

app.set('view engine', 'ect');
app.engine('ect', ectRenderer.render);

app.use(bodyParser());

app.use(function(req, res, next) {
    console.log('%s %s', req.method, req.url);
    next();
  });

app.use(express.static(__dirname + "/public"))
app.use(express.static(__dirname + "/gen"))
app.use(express.static(__dirname + "/bower_components"))


app.get('/',
        function(req, res) {
          res.render('home', { foo: 'foo' });
        });

var g_port = Number(process.env.PORT || 3000);
app.listen(g_port, function() {
    console.log("Listening on port %s...", g_port);
  });

