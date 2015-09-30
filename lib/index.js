var express = require('express');
var mime = require('mime');
var getRawBody = require('raw-body')

var uuid = require('node-uuid');

var debug = require('hitd-debug')('hitd-front');

var Client = require('pigato').Client;

module.exports = function(inport, conf, callback) {

  var app = express();


  var httpServer = app.listen(conf.port || 3000);


  var client = new Client(inport, {
    hearbeat: 30,
    timeout: 2000,
    retry: 2
  }); // TODO : test impact of retry

  client.on('start', function() {
    callback(null, {
      stop: function(cb) {
        httpServer.close(cb);
      }
    });
  });
  client.start();

  client.on('error', function(err) {
    debug('PIGATO client error %s', err);
  });

  var serveStatic = function(req, res, next) {
    var key = "http/" + req.headers.host + req.originalUrl;

    if (req.method != "GET") {
      key = req.method + '/' + key;
    }

    debug("will request key %s, body length is %d", key, (req.text || "").length);
    var pRes = client.request(key, {
      key: key,
      body: req.text,
      clientId: req.clientId
    }, {
      timeout: 20000
    });


    var charset = undefined,
      type = undefined;

    pRes.on('error', function(err) {
      console.error("PIGATO res error for ", key, err);
    });

    var code = undefined;
    pRes.on('data', function(data) {
      debug("pRes for route %s get ", key);
      if (code == undefined && data < 100) {
        debug("received non standart code %d", data);
        code = data;
      } else if (code < 100) {
        debug("received non standart code %d", data);
        if (code == 1) {
          //set cookie
          res.cookie(data.name, data.value);
        } else if (code == 2) {

          console.log('namually setted content type', data);
          type = data;
          res.set('Content-Type', type);
          if (data.indexOf('utf-8') != -1) {
            charset = 'utf-8';
          }
        }

        code = undefined;
      } else if (code == undefined) {
        code = data;
        res.status(code);
      } else {
        if (code === 302) {
          res.set('Location', "" + data);
          //res.end();
        } else {

          if (type == undefined) {
            type = mime.lookup(key);
            charset = mime.charsets.lookup(key);
            debug('charset for res is %s', charset);
            res.set('Content-Type', type + (charset ?
              '; charset=' + charset : ''));

            charset = charset || 'binary';

          }
          debug("writ eobject of length %d %s", data.length, typeof data);
          res.write(data, charset);
        }
      }

    }).on('end', function() {
      debug("pRes for route %s end", key);
      res.status(code || 500).end();
    });
  };


  app.use(function(req, res, next) {
    getRawBody(req, {
        length: req.headers['content-length']
      },
      function(err, string) {
        if (err) {
          return next(err);
        }
        req.text = string.toString('binary');
        next();
      });
  });

  app.use(require('cookie-parser')());

  app.use(function(req, res, next) {
    var cookieName = 'hitd-clientId';
    var cookie = req.cookies[cookieName];
    if (!cookie) {
      cookie = uuid.v4();
      res.cookie(cookieName, cookie);
    }
    req.clientId = cookie;
    next();
  });
  app.use(serveStatic);


};
