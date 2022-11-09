'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const routes = require('./routes.js');
const auth = require('./auth.js');
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();
fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',  // Avoid conflict with passport socket.io authenticate
  store: store         // Avoid conflict with passport socket.io authenticate
}));

//Set up a Template Engine
app.set('view engine', 'pug');
app.set('views', './views/pug');

//Set up Passport
app.use(passport.initialize());
app.use(passport.session());

const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

myDB(async client => {

  const myDataBase = await client.db('ak-mongodb').collection('userLogins');

  routes(app, myDataBase);
  auth(app, myDataBase);

  let currentUsers = 0;
  io.on('connection', socket => {
    ++currentUsers;
    //io.emit('user count', currentUsers);
    console.log('A user has connected');
    console.log('user ' + socket.request.user.username + ' connected');
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    });

    socket.on('chat message', (message) => {
      io.emit('chat message', { username: socket.request.user.username, message });
    });


    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      console.log('user ' + socket.request.user.username + ' disconnected');
      --currentUsers;
      io.emit('user count', currentUsers);
    });
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

//Set up a Template Engine
/*app.route('/').get((req, res) => {
  res.render('index', { title: 'Hello', message: 'Please log in',
      showLogin: true });
});*/

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => { Now that the http server is mounted on the express app, you need to listen from the http server. Change the line with app.listen to http.listen.
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
