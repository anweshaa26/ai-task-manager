const { Router } = require("express");
const tasksRouter = Router();
const { z } = require("zod");
const authentication = require("./middlewares/authentication");
const checkTask = require("./middlewares/checkTask");
const { sendResponse } = require("./utils/sendResponse");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);
const { tasksModel } = require("../db");

// defining task schema
const taskBodySchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    dueDate: z.string().refine((date) => 
        !isNaN(Date.parse(date)), {
            message: "Invalid date format"
        }),
    priority: z.enum(["low", "medium", "high"]),
    status: z.enum(["pending", "in progress", "completed"]),
    repeat: z.enum(["none", "daily", "weekly", "monthly"]).optional().default("none")
});

// add/create a new task
tasksRouter.post("/", authentication, async (req, res) => {
    const userId = req.userId;
    const parsedTask = taskBodySchema.safeParse(req.body);

    if (!parsedTask.success) {
        return sendResponse(res, false, "Invalid task format", parsedTask.error, 400);
    }

    const {
        title,
        description,
        dueDate,
        priority,
        status,
        repeat } = parsedTask.data;
    
    const newTask = await tasksModel.create({
        title,
        description,
        dueDate,
        priority,
        status,
        repeat,
        userId
    });
    
    // res.json({
    //     message: "Task created successfully",
    //     task: newTask
    // });

    sendResponse(res, true, "Task created successfully", {
        task: newTask
    });
});

// get all tasks
tasksRouter.get("/", authentication, async (req, res) => {
    try {
        const userId = req.userId;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // building query object
        const query = { userId: userObjectId, isDeleted: false };

        // query filters
        if (req.query.priority) {
            query.priority = req.query.priority;
        }
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.repeat) {
            query.repeat = req.query.repeat;
        }
        if (req.query.dueBefore) {
            query.dueDate = { $lte: new Date(req.query.dueBefore) };        // $lte: less than or equal to
        }
        // search filter
        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: "i" } },             // $or: match if any of the conditions inside is true
                { description: { $regex: req.query.search, $options: "i" } }        // $regex: partial text matching,      $options: "i": makes it case insensitive
            ];
        }

        // pagination
        const limit = parseInt(req.query.limit) || 10;      // default limit 10
        const skip = parseInt(req.query.skip) || 0;         // default skip 0

        const sortBy = req.query.sortBy || 'createdAt';     // default sort
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        let tasks;

        // aggregation for all sorts to handle isPinned + statusValue consistently
        const pipeline = [
            { $match: query },
            {
                $addFields: {
                    priorityValue: {
                        $indexOfArray: [["high", "medium", "low"], "$priority"]
                    },
                    statusValue: {
                        $cond: [{ $eq: ["$status", "completed"] }, 2, 1]
                    }
                }
            }
        ];

        // sort logic
        if (sortBy === 'priority') {
            pipeline.push({
                $sort: {
                    isPinned: -1,
                    statusValue: 1,
                    priorityValue: 1
                }
            });
        } else {
            pipeline.push({
                $sort: {
                    isPinned: -1,
                    statusValue: 1,
                    [sortBy]: sortOrder
                }
            });
        }

        // select fields
        pipeline.push({
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                dueDate: 1,
                priority: 1,
                repeat: 1,
                status: 1,
                isPinned: 1,
                userId: 1,
                isDeleted: 1,
                createdAt: 1,
                updatedAt: 1,
                completedAt: 1
            }
        });

        // pagination
        pipeline.push(
            { $skip: skip }, 
            { $limit: limit }
        );

        // run aggregation
        tasks = await tasksModel.aggregate(pipeline);
        
        sendResponse(res, true, "Tasks fetched", { tasks });
    } catch (err) {
        console.error(err);
        sendResponse(res, false, "Error fetching tasks", null, 500);
    }
});

tasksRouter.get("/summary", authentication, async (req, res) => {
  try {
    const userId = req.userId;

    const totalTasks = await tasksModel.countDocuments({ userId });
    const completedTasks = await tasksModel.countDocuments({ userId, status: "completed" });
    const pendingTasks = await tasksModel.countDocuments({ userId, status: "pending" });
    const overdueTasks = await tasksModel.countDocuments({
      userId,
      status: "pending",
      dueDate: { $lt: new Date() }
    });

    const summary = {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate: totalTasks === 0 ? "0%" : `${Math.round((completedTasks / totalTasks) * 100)}%`
    };

    sendResponse(res, true, "Summary generated successfully", summary);
  } catch (err) {
    console.error(err);
    sendResponse(res, false, "Failed to generate task summary");
  }
});

tasksRouter.get("/trends", authentication, async (req, res) => {
  try {
    const userId = req.userId;

    const tasks = await tasksModel.find({ userId }).lean();

    const trends = tasks.map(task => ({
      title: task.title,
      completed: task.status === "completed",
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      priority: task.priority
    }));

    sendResponse(res, true, "Trends data fetched", trends);
  } catch (err) {
    console.error(err);
    sendResponse(res, false, "Failed to fetch task trends");
  }
});

// get a single task
tasksRouter.get("/:id", authentication, checkTask, async (req, res) => {
    // since checkTask already fetched and attached the task to req.task
    // res.json({
    //     task: req.task
    // });
    sendResponse(res, true, "Task fetched successfully", { task: req.task });
});

// update a task (edit/ mark done etc)
tasksRouter.put("/:id", authentication, checkTask, async (req, res) => {
    const id = req.params.id;

    const taskUpdateSchema = taskBodySchema.partial().strict();
    const parsedUpdate = taskUpdateSchema.safeParse(req.body);
    
    if (!parsedUpdate.success) {
        return sendResponse(res, false, "Invalid task update data", parsedUpdate.error, 400);
    }

    const {
        title,
        description,
        dueDate,
        priority,
        status, 
        repeat
    } = parsedUpdate.data;

    const updateData = { ...parsedUpdate.data };

    if (status === "completed") {
        updateData.completedAt = new Date();
    } else {
        // reset if not completed anymore
        updateData.completedAt = null;
    }

    // update the original task
    const updatedTask = await tasksModel.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedTask) {
        return sendResponse(res, false, "Task not found", null, 404);
    }
    
    // if repeating task, auto create the next one
    if (status === "completed" && req.task.repeat !== "none") {
        const oldDueDate = new Date(req.task.dueDate);
        const newDueDate = new Date(oldDueDate);

        const now = new Date();

        if (req.task.repeat === "daily") {
            do {
                newDueDate.setDate(newDueDate.getDate() + 1);
            } while (newDueDate < now);
        } 
        else if (req.task.repeat === "weekly") {
            do {
                newDueDate.setDate(newDueDate.getDate() + 7);
            } while (newDueDate < now);
        } 
        else if (req.task.repeat === "monthly") {
            do {
                newDueDate.setMonth(newDueDate.getMonth() + 1);
            } while (newDueDate < now);
        }

        await tasksModel.create({
            title: req.task.title,
            description: req.task.description,
            dueDate: newDueDate,
            priority: req.task.priority,
            status: "pending",           // new task is initially pending
            repeat: req.task.repeat,
            userId: req.userId
        });
    }
    sendResponse(res, true, "Task updated successfully", { task: updatedTask });
});

// delete a task
tasksRouter.delete("/:id", authentication, checkTask, async (req, res) => {
    const id = req.params.id;
    const permanent = req.query.permanent === "true";

    if (permanent) {
        await tasksModel.findByIdAndDelete(id);
        // return res.json({
        //     message: "Task permanently deleted"
        // });
        return sendResponse(res, true, "Task permanently deleted");
    } else {
        await tasksModel.findByIdAndUpdate(id, { isDeleted: true, trashedAt: new Date() });
        // return res.json({
        //     message: "Task moved to trash"
        // });
        return sendResponse(res, true, "Task moved to trash");
    }
});

tasksRouter.patch("/:id/toggle-pin", authentication, async (req, res) => {
    try {
        const task = await tasksModel.findById(req.params.id);
        if (!task) {
            return sendResponse(res, false, "Task not found", null, 404);
        }

        task.isPinned = !task.isPinned;
        await task.save();
        sendResponse(res, true, "Task pinned status update", task);
    } catch (err) {
        console.error(err);
        sendResponse(res, false, "Error toggling pin", null, 500);
    }
});

module.exports = { tasksRouter }