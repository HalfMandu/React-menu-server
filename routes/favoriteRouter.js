const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var authenticate = require('../authenticate');
const cors = require('./cors');

const Dishes = require('../models/dishes');
const Favorites = require('../models/favorite');
//each router group is a mini Express application
const favoriteRouter = express.Router();

//using middleware to parse body into JSON
favoriteRouter.use(bodyParser.json());

favoriteRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.corsWithOptions, authenticate.verifyUser, (req,res,next) => {
    
    Favorites.findOne({user: req.user._id})
    .populate('user')
    .populate('dishes')
    .then((favorites) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(favorites);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {

    Favorites.findOne({user: req.user._id})
    .then((favorites) => {
        
        //create new document using req user and body, to map user to dishIds list
        if (!favorites) {
            Favorites.create({"user": req.user._id, "dishes": req.body})
            .then((favorite) => {
                console.log('Favorite Created ', favorite);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(favorite);
            }, (err) => next(err));            
        }
        else {
            //check each dish id if it exists already in favorites, if not add it
            for (dish in req.body){
                if (favorites.dishes.indexOf(req.body[dish]._id) === -1){
                    favorites.dishes.push(req.body[dish]._id);
                }
            }
            favorites.save()
            .then((favorites) => {
                Favorites.findById(favorites._id)
                .populate('user')
                .populate('dishes.dish')
                .then((favorites) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorites);
                })            
            }, (err) => next(err));
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites');
})
.delete(cors.corsWithOptions, authenticate.verifyUser,  (req, res, next) => {
    
    Favorites.findOneAndRemove({"user": req.user._id})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));  

});

//:dishId
favoriteRouter.route('/:dishId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser,  (req,res,next) => {
    
    Favorites.findOne({user: req.user._id})
    .then((favorites) => {
        if (!favorites) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.json({"exists": false, "favorites": favorites});
        }
        else {
            if (favorites.dishes.indexOf(req.params.dishId) < 0){
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.json({"exists": false, "favorites": favorites});
            }
            else {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.json({"exists": true, "favorites": favorites});
            }
        }

    }, (err) => next(err))
    .catch((err) => next(err))

})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    
    Favorites.findOne({user: req.user._id})
    .then((favorites) => {
        if (!favorites) {
            Favorites.create({"user": req.user._id, "dishes": [req.params.dishId]})
            .then((favorite) => {
                console.log('Favorite Created ', favorite);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(favorite);
            }, (err) => next(err))
            
        }      
        else if (favorites.dishes.indexOf(req.params.dishId) === -1){
            favorites.dishes.push(req.params.dishId);
            favorites.save()
            .then((favorites) => {
                Favorites.findById(favorites._id)
                .populate('user')
                .populate('dishes.dish')
                .then((favorites) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorites);
                })            
            }, (err) => next(err));
        }
        //the document exists and already contains dishId 
        else if (favorites.dishes.indexOf(req.params.dishId) >= 0){
            res.statusCode = 403;
            res.end('User already has this dish in favorites...');
        }
        else {
            console.log("something else...");
        }
        
    }, (err) => next(err))
    .catch((err) => next(err));

})
.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    
    res.statusCode = 403;
    res.end('PUT operation not supported on /dishes/:dishId');
})
.delete(cors.corsWithOptions, authenticate.verifyUser,  (req, res, next) => {
    
    Favorites.findOne({user: req.user._id})
    .then((favorite) => {
        if (favorite) {            
            var index = favorite.dishes.indexOf(req.params.dishId);
            if (index >= 0) {
                favorite.dishes.splice(index, 1);
                favorite.save()
                .then((favorite) => {
                    Favorites.findById(favorite._id)
                    //.populate('user')
                    .populate('dishes')
                    .then((favorites) => {
                        console.log('Favorite Deleted !!', favorite);
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorites);
                    }) 
                }, (err) => next(err));
            }
            else {
                err = new Error('Dish ' + req.params.dishId + ' not found');
                err.status = 404;
                return next(err);
            }
        }
        else {
            err = new Error('Favorites not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
    
});

module.exports = favoriteRouter;