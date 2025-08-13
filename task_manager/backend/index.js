require("dotenv").config();
const express = require("express");
const app = express();
const { tasksModel, usersModel } = require("./db");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);
const cron = require("node-cron");
const { tasksRouter } = require("./routes/tasksRoutes");
const { aiRouter } = require("./routes/aiRoutes");
const { authRouter } = require("./routes/authRoutes");
const { sendResponse } = require("./routes/utils/sendResponse");
const authentication = require("./routes/middlewares/authentication");

const cors = require("cors");
app.use(cors());

app.use(express.json());
app.use("/auth", authRouter);
app.use("/tasks", tasksRouter);
app.use("/ai", aiRouter);

// view of the trash
app.get("/trash", authentication, async (req, res) => {
    const tasks = await tasksModel.find({
        userId: req.userId,
        isDeleted: true
    });
    sendResponse(res, true, "Trashed tasks fetched successfully", { tasks });
});

// 404 handler for unknown endpoints (must be before global error handler)
app.use((req, res) => {
    sendResponse(res, false, "Endpoint not found", null, 404);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    sendResponse(res, false, "Something went wrong", null, 500);
});

// runs every day at midnight
cron.schedule('0 0 * * *', async () => {
    // console.log("Running auto-deleted job...");
    await tasksModel.deleteMany({
        isDeleted: true,
        trashedAt: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }        // delete trash tasks older than 30 days
        // trashedAt: { $lte: new Date(Date.now() - 1 * 60 * 1000) }            // 1 min ago (testing)
    });
    console.log("Old trashed tasks auto-deleted.");
});

// async function autoDeleteOldTasks() {
//   const result = await tasksModel.deleteMany({
//     isDeleted: true,
//     trashedAt: { $lte: new Date(Date.now() - 1 * 60 * 1000) }  // 1 minute ago
//   });
//   console.log(`${result.deletedCount} old trashed tasks deleted`);
// }
// autoDeleteOldTasks();

app.listen(3000);