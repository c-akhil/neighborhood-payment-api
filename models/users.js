const mongoose = require('mongoose');
const passport = require('passport');
const jwtSecretKey = process.env.JWT_SECRET_KEY;
const jwt = require('jsonwebtoken');
const Schema = mongoose.Schema;
const { getValueForNextSequence } = require('./counter');

let contactSchema = new Schema({
    userId: {
        type: String,
    },
    amount: {
        type: Number
    }
});

let User = new Schema({
    _id: {
        type: String
    },
    name: {
        type: String,
    },
    mobileNumber: {
        type: String,
    },
    userName: {
        type: String,
        required: true,
        message: "mobile number is required"
    },
    contacts: {
        type: [contactSchema]
    },
    password: {
        type: String,
        // required: true,
        select: false
    },
    pwdSalt: {
        type: String,
        select: false
    }
});

User.pre('save', async function (next) {
    if (this.isNew) {
        this._id = "USR" + (await getValueForNextSequence('userId'));
        next();
    } else {
        next();
    }
});

User.methods = {
    saveUser: function (req, res) {
        let reqBody = req.body;
        if (reqBody.password) {
            mongoose.model('user').findOne({ userName: reqBody.userName }).select('+pwdSalt').then((userDocument) => {
                if (!userDocument) {
                    let salt = crypto.randomBytes(16).toString('hex');
                    let hash = crypto.pbkdf2Sync(reqBody.password, salt, 1000, 64, 'sha512').toString('hex')
                    this.password = hash;
                    this.pwdSalt = salt;
                    return this.save();
                }
            }).then((findDoc) => {
                res.status(200).send(findDoc);
            }).catch((err) => {
                let resBody = { statusCode: 500, statusMessage: "Something went wrong" }
                req.log.error({ resBody: resBody }, "res body");
                res.status(500).json(resBody);
            });
        }
    }
}

User.statics = {
    passportPublicFindUser: function (username, password, done) {

        this.findOne({ userName: username })
            .select(`+password +pwdSalt  _id userName name address dob skillSet profilePic
            roleList mobileNumber emailId gender qualification yearsOfExp speciality clientId`).then((userDoc) => {

                if (!userDoc) {
                    done(null, false);
                }
                else if (userDoc) {
                    if (!userDoc.password || !userDoc.pwdSalt) {
                        let parsedUserDoc = userDoc.toJSON();
                        return done(null, {
                            mobileNumber: parsedUserDoc.mobileNumber,
                            newUser: true,
                        });
                    }

                    let saltFromDB = userDoc.pwdSalt;
                    let hash = crypto.pbkdf2Sync(password, saltFromDB, 1000, 64, 'sha512').toString('hex');
                    if (userDoc.password === hash) {
                        let parsedUserDoc = userDoc.toJSON();
                        delete parsedUserDoc.password;
                        delete parsedUserDoc.pwdSalt;
                        return done(null, parsedUserDoc)
                    }
                    else {
                        return done(null, false);
                    }

                }

            }).catch((err) => {
                return done(err);
            });

    },
    passportPublicLogin: function (req, res) {
        passport.authenticate('local', function (err, user, info) {
            let { userName, token } = req.body;
            if (user.newUser) {
                res.status(500).send({ 'statusCode': 404, 'statusMessage': "Plz set your password first", user });
                return;
            }
            if (err) {
                res.status(500).send({ 'statusCode': 500, 'statusMessage': 'Something went wrong! Please try again later' });
                return;
            }
            else if (!user) {
                res.status(500).send({ 'statusCode': 500, 'statusMessage': 'Something went wrong! Please try again later' });
                return;
            }
            else {
                if (token) {
                    UserModal.findOneAndUpdate({
                        userName: userName
                    }, {
                        $addToSet: {
                            'tokens.FCM': token
                        }
                    }).select("+tokens.FCM +tokens.APNS").then(d => {
                        // console.log(d, "token updated")
                    }).catch(e => { console.log(e) });
                }
                let jwtToken = generateJwtToken(
                    user._id,
                    user.userName,
                    user.name
                );
                user.jwtToken = jwtToken;
                if (user.roleList && user.roleList.length > 0) {
                    user.roleList = toObjectId(user.roleList)
                    Promise.all([mongoose.model('rolesdatas').aggregate([
                        // { $match: { orgId: mongoose.Types.ObjectId(user.orgId) } },
                        { $unwind: { path: "$rolelist", preserveNullAndEmptyArrays: true } },
                        { $match: { 'rolelist._id': { "$in": user.roleList } } },
                        {
                            $project: {
                                "roleName": '$rolelist.roleName', "rolelId": '$rolelist._id',
                                'checkedFeatureList': '$rolelist.checkedFeatureList', '_id': 0
                            }
                        }
                    ])]).then((data) => {
                        user.empId = user._id;
                        user.assignedRole = data[0];
                        user.statusCode = 200;
                        user.statusMessage = 'Something went wrong! Please try again later';
                        res.status(200).send(user);

                    }).catch((err) => {
                        res.status(500).send({ 'statusCode': 500, 'statusMessage': 'Error while fetching base roles' });
                    })
                } else {
                    res.status(200).send({ 'statusCode': 200, 'statusMessage': 'Sucess', ...user });
                }
            }

        })(req, res);
    },
    verifyJwtToken(req, res, next) {
        next();
        let token = req.headers["x-access-token"];
        if ((req.url + '').startsWith("/basicNode/unsecureservices/")) {
            next();
            return;
        }
        jwt.verify(token, jwtSecretKey, function (err, decoded) {
            if (err) {
                res.status(500).json({ 'statusCode': 500, 'statusMessage': 'you are not authorized' });

            }
            else if (decoded) {

                next();
            }
            else {
                res.status(500).json({ 'statusCode': 500, 'statusMessage': 'you are not authorized' });
            }
        });


    },
    getDashboardSummary: async function (req, res) {
        try {
            let { userId } = req.body;
            if (!userId) {
                res.status(201).send({ statusCode: 201, 'statusMessage': 'Missing mandatory parameters' });
                return;
            }
            let user = await UserModal.aggregate([
                { $match: { _id: "USER1" } },
                {
                    $addFields: {
                        totalAmount: { $sum: "$contacts.amount" }
                    }
                },
                { $unwind: "$contacts" },
                {
                    $lookup: {
                        from: "users",
                        localField: "contacts.userId",
                        foreignField: "_id",
                        as: "contacts.user"
                    }
                },
                { $unwind: "$contacts.user" },
                {
                    $addFields: {
                        "contacts.name": "$contacts.user.name"
                    }
                },
                { $project: { "contacts.user": 0 } },
                {
                    $group: {
                        _id: "$_id",
                        "contacts": {
                            $addToSet: "$contacts"
                        }
                    }
                }
            ]);
            res.status(200).send({ statusCode: 200, 'statusMessage': 'Success', user: user[0] });
        } catch (error) {
            res.status(400).send({ statusCode: 400, 'statusMessage': 'Something went wrong! Please try again later' });
            console.log("Error::", error)
        }
    },
}


function generateJwtToken(id, userName, name) {
    try {
        let token = jwt.sign({
            _id: id,
            userName: userName,
            name: name
        }, jwtSecretKey);
        return token;

    } catch (err) {

    }
}

function toObjectId(ids) {

    if (ids.constructor === Array) {
        return ids.map(mongoose.Types.ObjectId);
    }

    return mongoose.Types.ObjectId(ids);
}

const UserModal = mongoose.model("users", User);

exports.User = UserModal;
