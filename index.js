var proxiedHttp = require( 'findhit-proxywrap' ).proxy( require( 'http' ) )
var proxiedHttps = require( 'findhit-proxywrap' ).proxy( require( 'https' ) )

var express = require('express')
const morgan = require('morgan');
var app = express()
const os = require('os');
const jwt = require('jsonwebtoken');
var concat = require('concat-stream');

app.set('json spaces', 2);
// app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

app.use(morgan('combined'));

app.use(function(req, res, next){
  req.pipe(concat(function(data){
    req.body = data.toString('utf8');
    next();
  }));
});

app.all('*', (req, res) => {
  const echo = {
    path: req.path,
    headers: req.headers,
    method: req.method,
    body: req.body,
    cookies: req.cookies,
    fresh: req.fresh,
    hostname: req.hostname,
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    query: req.query,
    subdomains: req.subdomains,
    xhr: req.xhr,
    os: {
      hostname: os.hostname()
    },
    connection: {
      servername: req.connection.servername
    }
  };
  if (process.env.JWT_HEADER) {
    const token = req.headers[process.env.JWT_HEADER.toLowerCase()];
    if (!token) {
      echo.jwt = token;
    } else {
      const decoded = jwt.decode(token, {complete: true});
      echo.jwt = decoded;
    }
  }
  res.json(echo);
  console.log('-----------------')
  console.log(echo);
});

const sslOpts = {
  key: require('fs').readFileSync('privkey.pem'),
  cert: require('fs').readFileSync('fullchain.pem'),
};

var port  = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 80,
    sport = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 443,
    ip    = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

console.log('process.env.OPENSHIFT_NODEJS_IP=', process.env.OPENSHIFT_NODEJS_IP);
console.log('Server will start on http://%s:%s', ip, port);
var httpServer = proxiedHttp.createServer(app).listen( port, ip, function() {
  console.log((new Date()) + ' Server is listening on port 80');
});
var httpsServer = proxiedHttps.createServer(sslOpts,app).listen( sport, ip, function() {
  console.log((new Date()) + ' Server is listening on port 443');
});

// var httpServer = proxiedHttp.createServer(app).listen(process.env.HTTP_PORT || 80);
// var httpsServer = proxiedHttps.createServer(sslOpts,app).listen(process.env.HTTPS_PORT || 443);

let calledClose = false;

process.on('exit', function () {
  if (calledClose) return;
  console.log('Got exit event. Trying to stop Express server.');
  server.close(function() {
    console.log("Express server closed");
  });
});

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

function shutDown(){
  console.log('Got a kill signal. Trying to exit gracefully.');
  calledClose = true;
  httpServer.close(function() {
    httpsServer.close(function() {
      console.log("HTTP and HTTPS servers closed. Asking process to exit.");
      process.exit()
    });
    
  });
}
