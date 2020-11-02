const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_URL;
const options = {
    authSource: process.env.MONGODB_OPT_AUTHSOURCE || 'admin',
    reconnectTries: process.env.MONGODB_OPT_RECONTRIES || 30,
    reconnectInterval: process.env.MONGODB_OPT_RECONINTERVAL || 1000,
    poolSize: process.env.MONGODB_OPT_POOLSIZE || 5,
    useNewUrlParser: true
};
const db = connectMongo(MONGODB_URL, options);

function connectMongo(url, mongoOptions) {
    try {
        const db = mongoose.connect(url, mongoOptions);
        mongoose.connection.on('close', (closeError) => {
            console.log("mongo connection closed", closeError);
        });

        mongoose.connection.on('error', (connectError) => {
            console.log("mongo connection error", connectError);
        });

        mongoose.connection.on('parseError', (parseError) => {
            console.log("mongo illegal or coorupt bson", parseError);
        });

        mongoose.connection.on('reconnect', (reconnectObj) => {
            console.log("mongo is trying to reconnect", reconnectObj);
        });

        mongoose.connection.on('timeout', (connectionTimeout) => {
            console.log("mongo connection timeout", connectionTimeout);
        });
        return db;
    } catch (connectMongoError) {
        console.log("connectMongoError....", connectMongoError);
    }
}
module.exports = db;