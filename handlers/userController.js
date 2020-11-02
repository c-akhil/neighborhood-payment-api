const { User } = require('../models/users');
const { Transactions } = require("../models/transactions");

function verifyJwtToken(req, res, next) {
    User.verifyJwtToken(req, res, next);
}

function passportPublicLogin(req, res) {
    User.passportPublicLogin(req, res);
}
function getDashboardSummary(req, res) {
    User.getDashboardSummary(req, res);
}
function createTransction(req, res) {
    try {
        Transactions.createTransction(req, res);
    } catch (error) {
        console.log("error::", error)
    }
}


module.exports = {
    passportPublicLogin,
    passportPublicFindUser: User.passportPublicFindUser,
    verifyJwtToken,
    createTransction,
    getDashboardSummary,
    getTransctionHistory: Transactions.getTransctionHistory,
}