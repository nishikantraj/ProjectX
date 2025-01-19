const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const ActivityLog = require("../models/ActivityLog");
const mongoose = require("mongoose")

//Endpoint to update activity log
router.post("/activity", authMiddleware, async(req,res)=>{
    const {language, minutes} = req.body;
    if(!language || !minutes){
        return res.send(401).json({message:"Language and minutes are requied"})
    }
    
    try {
        let activity = await ActivityLog.findOne({user:(req.user.id),language});

        if(activity){
            //If activity exists then update
            activity.minutes+= minutes;
        }
        else{
            //If not exists then create a new one.
            activity = new ActivityLog({userId:req.user.id,language,minutes});
        }
        await activity.save();
        res.status(200).json({message:"Activity log updated successfully.",activity});
    } catch (error) {
        res.status(500).json({messgae:"Serven error",error:error.message});
    }
})

//Endpoint to get Leaderboard data sorted by minutes
router.get("/board", async (req, res) => {
    try {
        const leaderboard = await ActivityLog.aggregate([
            {
                $group: {
                    _id: { user: "$userId", language: "$language" }, // Group by user and language
                    totalMinutes: { $sum: "$minutes" } // Sum up the minutes for each language
                }
            },
            {
                $group: {
                    _id: { user: "$_id.user" }, // Group by user only
                    languages: {
                        $push: { language: "$_id.language", minutes: "$totalMinutes" } // Collect language details
                    },
                    totalMinutes: { $sum: "$totalMinutes" } // Sum up all the minutes spent on coding
                }
            },
            {
                $sort: {
                    totalMinutes: -1 // Sort by total minutes in descending order
                }
            },
            {
                $lookup: {
                    from: "users", // Reference the "users" collection
                    localField: "_id.user", // Match userId from ActivityLog to _id from users
                    foreignField: "_id", // Match against _id in users
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },
            {
                $project: {
                    userId: "$_id.user", // Return userId as the main identifier
                    totalMinutes: 1,
                    languages: 1,
                    userName: "$userDetails.name",
                    email: "$userDetails.email"
                }
            }
        ]);

        console.log(leaderboard);
        res.status(200).json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;