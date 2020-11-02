const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let Counter = new Schema({
    _id: {
        type: String
    },
    seq: {
        type: Number
    }
});

const CounterModal = mongoose.model("counter", Counter);
exports.Skills = CounterModal;
exports.getValueForNextSequence = async (sequenceOfName) => {
    const sequenceDoc = await CounterModal.findByIdAndUpdate({ _id: sequenceOfName }, { $inc: { seq: 1 } }, { new: true, upsert: true })
    return +sequenceDoc.seq;
};