const dotenv = require("dotenv")
const express = require("express")
const cors = require("cors")
dotenv.config();
const app = express()

// MiddleWare
app.use(express.json())
app.use(cors())

app.use("/api/user", require("./src/routes/user.routes"));
// app.use("/api/leaderboard", require("./src/routes/leaderboardRoutes"))

module.exports = app;