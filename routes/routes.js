const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');


const handlers = {
    userController: require('../handlers/userController'),

    // other controllers
};


function setup(app) {

    // app.use(handlers.userController.verifyJwtToken);
    app.use(function (req, res, next) {
        // add passport strategy
        passport.use(new LocalStrategy(
            {
                usernameField: 'userName',
                passwordField: 'password',
                // session : false
            }, handlers.userController.passportPublicFindUser));

        // initialize passport
        app.use(passport.initialize());

        req.log = console.log;

        next();
    });

    let userRouter = express.Router();
    userRouter.post("/getDashboardSummary", handlers.userController.getDashboardSummary);
    userRouter.post("/createTransction", handlers.userController.createTransction);
    userRouter.post("/getTransctionHistory", handlers.userController.getTransctionHistory)
    app.use('/usercontroller', userRouter);


    let unsecureservicesRouter = express.Router();
    // Unsecure api's like generate otp ...
    app.use('/basicservices', unsecureservicesRouter);
    // add passport handler

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error("Not Found");
        err.status = 404;
        next(err);
    });

    // error handler
    app.use(function (err, req, res, next) {
        console.log("Error::",err)
        res.status(err.status || 500);
        res.send({ statusCode: 500, err: err })
        next();
    });

}

module.exports.setup = setup;