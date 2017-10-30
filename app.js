var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var cors = require('cors');
require('./routes/passport')(passport);

var routes = require('./routes/index');
var users = require('./routes/users');
var mongoSessionURL = "mongodb://localhost:27017/sessions";
var expressSessions = require("express-session");
var mongoStore = require("connect-mongo/es5")(expressSessions);

var app = express();
var mongo = require("mongodb").MongoClient;
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

var corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
}
app.use(cors(corsOptions))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSessions({
    secret: "CMPE273_passport",
    resave: false,
    //Forces the session to be saved back to the session store, even if the session was never modified during the request
    saveUninitialized: false, //force to save uninitialized session to db.
    //A session is uninitialized when it is new but not modified.
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 6 * 1000,
    store: new mongoStore({
        url: mongoSessionURL
    })
}));
app.use(passport.initialize());

app.use('/', routes);
app.use('/users', users);

app.post('/logout', function(req,res) {
    console.log(req.session.user);
    req.session.destroy();
    console.log('Session Destroyed');
    res.status(200).send();
});

app.post('/login', function(req, res) {
    passport.authenticate('login', function(err, user) {
        if(err) {
            console.log(err);
            res.status(500).send();
        }

        if(!user) {

            res.status(401).send();
        }
        else{
            req.session.user = user.username;
            req.session.save();
            console.log(req.session.user);
            console.log("session initilized");
            return res.status(201).send({message: "Success", data: user});            
        }

    })(req, res);
});

app.post('/signup', function(req, res) {
    try {
        var user_data = {
            "username"  : req.body.username,
            "password"  : req.body.password,
            "email"     : req.body.email,
            "firstname" : req.body.firstname,
            "lastname"  : req.body.lastname
        }
        kafka.make_request('signup_topic',user_data, function(err,response_kafka){
            if(err){
                console.trace(err);
            }
            else if(!results){
                res.status(401).json({error: "User not found"});
            }
            else{
                res.status(200).send({message: "Success"});
            }

        });

        mongo.connect('mongodb://localhost:27017/demo3', function(err, db){
            db.collection('creds').insertOne({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                username: req.body.username,
                password: req.body.password
            }).then(function(result){
                console.log(result.ops[0])
                req.session.user = req.body.username;
                req.session.save();
                res.status(200).send({message: "Success", data : result.ops[0]});
            }).
            catch(function(e){
                console.log(e);
                res.status(500).send({"error": "Username already exists"});
            });
        });
    }
    catch (e){
        console.log("Error here");        
        res.send(e);
    }
});

module.exports = app;
