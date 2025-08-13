const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.ObjectId;

const users = new Schema({
    email: {type: String, unique: true},
    password: String,
    name: String
})

const tasks = new Schema({
    title: String,
    description: String,
    dueDate: Date,
    priority: String,
    status: String,
    repeat: String,         // daily, weekly, monthly
    createdAt: Date,
    updatedAt: Date,
    completedAt: Date,
    userId: ObjectId,
    isDeleted: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    trashedAt: Date
}, {
    timestamps: true
});

const usersModel = mongoose.model('users', users);
const tasksModel = mongoose.model('tasks', tasks);

module.exports = {
    usersModel,
    tasksModel
}