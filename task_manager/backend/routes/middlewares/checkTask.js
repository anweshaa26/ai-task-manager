const { tasksModel } = require("../../db");
const { sendResponse } = require("../utils/sendResponse");

async function checkTask(req, res, next) {
    const id = req.params.id;
    const task = await tasksModel.findOne({ _id: id, userId: req.userId });

    if (!task) {
        return sendResponse(res, false, "Task not found or unauthorized", null, 404);
    }
    req.task = task;
    next();
}
module.exports = checkTask;
