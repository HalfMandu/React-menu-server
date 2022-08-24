var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('./models/user');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var FacebookTokenStrategy = require('passport-facebook-token');

var config = require('./config.js');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.getToken = function(user) {
    return jwt.sign(user, config.secretKey,
        {expiresIn: 3600});
};

var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = config.secretKey;

exports.jwtPassport = passport.use(new JwtStrategy(opts,
    (jwt_payload, done) => {
        console.log("JWT payload: ", jwt_payload);
        User.findOne({_id: jwt_payload._id}, (err, user) => {
            if (err) {
                return done(err, false);
            }
            else if (user) {
                return done(null, user);
            }
            else {
                return done(null, false);
            }
        });
    }));

exports.verifyUser = passport.authenticate('jwt', {session: false});


exports.verifyAdmin = (req,res,next) => {

    if (req.user.admin){
        next();
    }else {
        err = new Error('You are not authorized to perform this operation!');
        err.status = 403;
        return next(err);
    }

};

//submit clientID/Secret created when app was registered
//once approved, Facebook auth returns "profile" object which holds user's FB info (e.g. name, id)
exports.facebookPassport = passport.use(new FacebookTokenStrategy({
        clientID: config.facebook.clientId,
        clientSecret: config.facebook.clientSecret
    }, (accessToken, refreshToken, profile, done) => {
        //check if user already used this strategy
        User.findOne({ facebookId: profile.id }, (err, user) => {
            if (err) {
                return done(err, false);
            }
            //user has already logged in earlier using Facebook strategy, return the user
            if (!err && user !== null) {
                return done(null, user);
            }
            //user doesn't exist, create a new user and attach new profile.id to user schma as facebookId
            else {
                user = new User({ username: profile.displayName });
                user.facebookId = profile.id;
                user.firstname = profile.name.givenName;
                user.lastname = profile.name.familyName;
                //add the new user to the database
                user.save((err, user) => {
                    if (err)
                        return done(err, false);
                    else
                        return done(null, user);
                })
            }
        });
    }
));