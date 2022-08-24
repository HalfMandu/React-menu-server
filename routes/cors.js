const express = require('express');
const cors = require('cors');
const app = express();

//Array of all acceptable origins 
const whitelist = ['http://localhost:3000', 'https://localhost:3443', 'http://localhost:4200'];

var corsOptionsDelegate = (req, callback) => {
    var corsOptions;

    //return index greater or equal to 0 if present in array, -1 if not present
    if (whitelist.indexOf(req.header('Origin')) !== -1) {
        //console.log("origin found in whitelist...allowing...");
        //allow this origin...include origin into header with access control allow origin there 
        corsOptions = { origin: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
};

//if pass no args, then will use wildcard *
exports.cors = cors();
//use this function if need to apply specific CORS options to a route
exports.corsWithOptions = cors(corsOptionsDelegate);
