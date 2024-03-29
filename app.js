var express = require('express');

var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var cors = require('cors');
var kafka = require('./routes/kafka/client');


var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
var fs = require('fs-extra');
var fs_native = require('fs');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

require('./routes/passport')(passport);



var routes = require('./routes/index');
var users = require('./routes/users');
var mongoSessionURL = "mongodb://localhost:27017/sessions";
var expressSessions = require("express-session");
var mongoStore = require("connect-mongo/es5")(expressSessions);


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
        console.log(user_data);
        var user_data = {
            "username"  : req.body.username,
            "password"  : req.body.password,
            "email"     : req.body.email,
            "firstname" : req.body.firstname,
            "lastname"  : req.body.lastname,
            "key"       : "signup_api"
        }
        kafka.make_request('new_topic_1',user_data, function(err,response_kafka){
            if(err){
                console.trace(err);
                res.status(401).json({error: err});
            }
            else{
                console.log("Signup user response ", JSON.stringify(response_kafka));
                res.status(200).send({message: "Success", data : response_kafka});
            }

        });

    }
    catch (e){
        console.log(e);        
        res.send(e);
    }
});

app.post('/uploadfile', upload.single('file'), function(req, res) {
    try {
        console.log("/upladfile", req.body.username);
        kafka.make_request('new_topic_1',{"username":req.body.username, "path": req.body.path,"originalname": req.file.originalname,"encoding": req.file.encoding, "buffer": req.file.buffer ,"key": "upload_dir_api"}, function(err,response_kafka){
            if(err){
                console.trace(err);
                res.status(401).json({error: err});
            }
            else{
                console.log("listdir user response ", JSON.stringify(response_kafka));
                res.status(200).send({message: "Success", data : response_kafka});
            }

        });

    }
    catch (e){
        
        
    }
});

app.post('/listdir', function(req, res) {
    try {
        console.log("/listdir", req.body.username);
        kafka.make_request('new_topic_1',{"username":req.body.username, "key": "list_directory_api"}, function(err,response_kafka){
            if(err){
                console.trace(err);
                res.status(401).json({error: err});
            }
            else{
                console.log("listdir user response ", JSON.stringify(response_kafka));
                res.status(200).send({message: "Success", data : response_kafka});
            }

        });

    }
    catch (e){
        
        
    }
});
module.exports = app;
