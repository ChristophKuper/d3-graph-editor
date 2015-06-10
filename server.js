var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.send('This is a really basic webserver to make some tests in webdevelopment. Files in the public directory can be accessed directly');
});

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://:', host, port);
});
