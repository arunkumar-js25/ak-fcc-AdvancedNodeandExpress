const { ObjectID } = require('mongodb');
const LocalStrategy = require('passport-local');
const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  passport.use(new LocalStrategy((username, password, done) => {
  myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      //if (password !== user.password) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) { 
        return done(null, false);
      }
      console.log(user);
      return done(null, user);
    });
  }));

  // Serialization and deserialization here...
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });
}