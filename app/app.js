var express = require('express');
var http = require('http');
var path = require('path');
var errorhandler = require('errorhandler')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('.html', require('ejs').renderFile);

app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(errorhandler());
}


/**
* Get port from environment and store in Express.
*/

var port = normalizePort(process.env.PORT || '4000');
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
app.set('port', port);

require('./routes')(app);

var server = http.createServer(app);

/**
* Listen on provided port, on all network interfaces.
*/

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
  ? 'Pipe ' + port
  : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

require('./server/main.js')(server);