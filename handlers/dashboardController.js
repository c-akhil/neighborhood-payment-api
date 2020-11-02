const { User } = require('../models/transactions');

function verifyJwtToken(req, res, next) {
    User.verifyJwtToken(req, res, next);
}

function passportPublicLogin(req, res) {
    User.passportPublicLogin(req, res);
}


module.exports = {
    passportPublicLogin,
    verifyJwtToken,
}