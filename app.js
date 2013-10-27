var express = require("express");

var app = express();
app.use(express.logger());
app.use('/fonts', express.static('public/fonts'));
app.use('/audio', express.static('public/audio'));
app.use('/images', express.static('public/images'));
app.use('/', express.static('public/'));

app.get('/', function(request, response) {
  response.sendfile('public/index.html');
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

