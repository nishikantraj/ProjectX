const mongoose = require("mongoose")

const activityLogSchema = new mongoose.Schema(
    {
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        language: {
            type: String,
            required: true,
        },
        minutes:{
            type: Number,
            required: true,
            default: 0,
        },
        timeStamp: {
            type:Date,
            required: true,
            default: Date.now(),
        },
    },
    {timestamps:true}
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
