const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getValueForNextSequence } = require('./counter');
const { User } = require("./users");

let Transactions = new Schema({
    _id: {
        type: String
    },
    toUserId: {
        type: String,
    },
    fromUserId: {
        type: String,
    },
    amount: {
        type: Number,
    },
    comments: {
        type: [String]
    }
});

Transactions.pre('save', async function (next) {
    if (this.isNew) {
        this._id = "TRN" + (await getValueForNextSequence('TRN'));
        next();
    } else {
        next();
    }
});

Transactions.statics = {
    createTransction: function (req, res) {
        try {
            console.log("createTransction::Start")
            let { toUserId, fromUserId, amount, comments } = req.body;
            if (!toUserId || !fromUserId || !amount) {
                res.status(201).send({ statusCode: 201, 'statusMessage': 'Missing mandatory parameters' });
                return;
            }
            let transaction = new TransactionsModal({
                toUserId,
                fromUserId,
                amount,
                comments
            });
            transaction.save().then(async (data) => {
                let toUser = await User.findOne({ _id: toUserId });
                let fromUser = await User.findOne({ _id: fromUserId });
                if (!toUser.contacts || !toUser.contacts.length) {
                    toUser.contacts = [{ userId: fromUserId, amount }]
                } else {
                    let i = toUser.contacts.findIndex((c) => c.userId == fromUserId);
                    if (i > -1) toUser.contacts[i].amount += amount;
                    else toUser.contacts.push({ userId: fromUserId, amount });
                    console.log("toUser", toUser._id, toUser.contacts)
                }

                if (!fromUser.contacts || !fromUser.contacts.length) {
                    fromUser.contacts = [{ userId: toUserId, amount: (amount * -1) }]
                } else {
                    let i = fromUser.contacts.findIndex((c) => c.userId == toUserId);
                    if (i > -1) fromUser.contacts[i].amount += (-1 * amount);
                    else fromUser.contacts.push({ userId: toUserId, amount: (-1 * amount) });
                    console.log("fromUser", fromUser._id, fromUser.contacts)
                }
                await User.update({ _id: toUserId }, toUser);
                await User.update({ _id: fromUserId }, fromUser);
                res.status(200).send({ statusCode: 200, 'statusMessage': 'Transaction Created' });
            }, (err) => {
                res.status(400).send({ statusCode: 400, 'statusMessage': 'Something went wrong! Please try again later' });
            })
        } catch (error) {
            res.status(400).send({ statusCode: 400, 'statusMessage': 'Something went wrong! Please try again later' });
            console.log("Error::", error)
        }
    },
    modifyTransction: async function (req, res) {
        let { _id, toUserId, fromUserId, amount, comments } = req.body;
        if (!_id) {
            res.status(201).send({ statusCode: 201, 'statusMessage': 'Missing mandatory parameters' });
            return;
        }
        let transaction = {};
        if (toUserId) transaction.toUserId = toUserId;
        if (fromUserId) transaction.fromUserId = fromUserId;
        if (amount) transaction.amount = amount;
        if (comments) transaction.comments = comments;
        await TransactionsModal.update({ _id }, transaction, {
            upsert: false,
            new: true,
            setDefaultsOnInsert: true
        }, (err, raw) => {
            if (err) throw new Error(err)
            res.status(200).send({ statusCode: 200, 'statusMessage': "Transaction Updated" });
        });
    },
    getTransctionHistory: function (req, res) {
        try {
            console.log("getTransctionHistory::Start")
            let { userId } = req.body;
            if (!userId || !userId.length || !userId[0] || !userId[1]) {
                res.status(201).send({ statusCode: 201, 'statusMessage': 'Missing mandatory parameters' });
                return;
            }
            TransactionsModal.find({
                $or: [
                    {
                        $and: [
                            { toUserId: { $in: userId[0] } },
                            { fromUserId: { $in: userId[1] } }
                        ]
                    },
                    {
                        $and: [
                            { toUserId: { $in: userId[1] } },
                            { fromUserId: { $in: userId[0] } }
                        ]
                    },
                ]
            }).then((data) => {
                let transactions = data;
                res.status(200).send({ statusCode: 200, 'statusMessage': 'Success', transactions });
            }, (e) => {
                console.log("e", e)
                res.status(400).send({ statusCode: 400, 'statusMessage': 'Something went wrong! Please try again later' });
            }).catch((e) => {
                console.log("e", e)
                res.status(400).send({ statusCode: 400, 'statusMessage': 'Something went wrong! Please try again later' });
            })
        } catch (error) {
            res.status(400).send({ statusCode: 400, 'statusMessage': 'Something went wrong! Please try again later' });
            console.log("Error::", error)
        }
    },
}

const TransactionsModal = mongoose.model("transactions", Transactions);

exports.Transactions = TransactionsModal;
