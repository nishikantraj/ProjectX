const express = require("express");
const {registerUser, loginUser} = require("../controllers/user.controller");
const router = express.Router();
const z = require("zod");

const registerSchema = z.object({
    userName: z.string().min(2,"User Name lenght must be 2 character long."),
    name: z.string().min(2, "Name must be of length 2."),
    email: z.string().email().min(4, "Email must be of length 4."),
    password: z.string().min(6, "Password must contain 6 characters."),
});
const loginSchema = registerSchema.pick({
    email:true,
    password:true,
})

// Middleware to validate user data and login
const registerValidation = (req,res,next)=>{
    const {name, userName, email, password} = req.body;
    
    const validating = registerSchema.safeParse({
        userName:userName,
        name:name,
        email:email,
        password:password,
    });
    
    if(!validating.success)
        return res.status(400).json({message:validating.error.errors})
    next();
}

const loginValidation = (req,res,next)=>{
    const {email, password} = req.body;
    const validating = loginSchema.safeParse({
        email:email,
        password:password,
    });
    if(!validating.success)
        return res.status(400).json({message:validating.error.errors})
    next();
}

router.post("/register",registerValidation,registerUser);
// router.post("/login",loginValidation,loginUser);

module.exports = router;