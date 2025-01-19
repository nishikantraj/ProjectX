const dotenv = require("dotenv")
const express = require("express")
const cors = require("cors")
const connectDB = require("./src/config/db")

dotenv.config();
const app = express()

// MiddleWare
app.use(express.json())
app.use(cors())

//Database Connection
connectDB()

app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/leaderboard", require("./src/routes/leaderboardRoutes"))

//Server listening
const PORT = process.env.PORT || 5001
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`))
