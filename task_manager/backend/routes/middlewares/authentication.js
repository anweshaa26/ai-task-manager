const jwt = require("jsonwebtoken");
const { sendResponse } = require("../utils/sendResponse");
const jwt_secret = process.env.JWT_SECRET;

// authentication middleware
function authentication(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return sendResponse(res, false, "No token provided", null, 401);
    }

    const token = authHeader.split(" ")[1];
    try {
        const decodedToken = jwt.verify(token, jwt_secret);

        // safeguard to ensure the token has a valid id
        if (!decodedToken || !decodedToken.id) {
            return sendResponse(res, false, "Invalid token payload", null, 401);
        }
        req.userId = decodedToken.id;
        next();
    } catch (e) {
        sendResponse(res, false, "Invalid or expired token", null, 401);
    }
}
module.exports = authentication;