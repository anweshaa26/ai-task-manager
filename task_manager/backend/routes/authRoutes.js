const { Router } = require("express");
const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { usersModel } = require("../db");
const { sendResponse } = require("./utils/sendResponse");
const authentication = require("./middlewares/authentication");

const jwt_secret = process.env.JWT_SECRET;
const authRouter = Router();

// user sign up
authRouter.post("/signup", async (req, res) => {
    const requiredBody = z.object({
        email: z.string().min(3).max(100).email(),
        name: z.string().min(3).max(100),
        password: z.string().min(8).max(30).refine((val) => {
            return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(val);
        }, {
            message: "Password must have uppercase, lowercase, number, and special character"
        })
    });

    const parsedDataWithSuccess = requiredBody.safeParse(req.body);
    if (!parsedDataWithSuccess.success) {
        return sendResponse(res, false, "Incorrect format", parsedDataWithSuccess.error, 400);
    } 

    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;

    try {
        const hashedPassword = await bcrypt.hash(password, 5);
        console.log(hashedPassword);

        await usersModel.create({
            email: email,
            password: hashedPassword,
            name: name
        });
        sendResponse(res, true, "You are signed up");
    } catch(e) {
        sendResponse(res, false, "User already exists or error while signing up", null, 500);
    }
});

// user sign in
authRouter.post("/signin", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    
    const user = await usersModel.findOne({ email: email });
    if (!user) {
        return sendResponse(res, false, "User does not exist", null, 403);
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return sendResponse(res, false, "Incorrect credentials", null, 403);   
    }

    const token = jwt.sign({
            id: user._id.toString()
        }, jwt_secret);
    return sendResponse(res, true, "Signin successful", { token });
});

// reset/change password
authRouter.put("/change-password", authentication, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // validate new password format using zod
    const passwordCheck = z.string().min(8).max(30).refine((val) => {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(val);
    }, {
        message: "New password must contain uppercase letter, lowercase letter, number, and special character."
    });

    const parsedNewPassword = passwordCheck.safeParse(newPassword);
    if (!parsedNewPassword.success) {
        return sendResponse(res, false, "Invalid password format", parsedNewPassword.error, 400);
    }

    // fetch user
    const user = await usersModel.findById(req.userId);
    if (!user) {
        return sendResponse(res, false, "User not found", null, 404);
    }

    // check old password matches
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
        return sendResponse(res, false, "Current password is incorrect", null, 403);
    }

    // hash new password and save
    const hashedNewPassword = await bcrypt.hash(newPassword, 5);
    user.password = hashedNewPassword;
    await user.save();
    sendResponse(res, true, "Password changed successfully");
});

module.exports = { authRouter }