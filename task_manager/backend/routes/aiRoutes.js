const { Router } = require("express");
const aiRouter = Router();
const authentication = require("./middlewares/authentication");
const { sendResponse } = require("./utils/sendResponse");
const { tasksModel } = require("../db");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callOpenAI(systemPrompt, userPrompt, temperature = 0.3) {
    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature
    });
    return completion.choices[0].message.content;
}

// parsing tasks from prompt
aiRouter.post("/parse-task", authentication, async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return sendResponse(res, false, "Prompt is required", null, 400);
    }

    try {
        const aiReply = await callOpenAI("Extract title, dueDate (ISO), and priority from a task description as JSON.", prompt, 0.2);
        sendResponse(res, true, "Parsed task", JSON.parse(aiReply));
    } catch (error) {
        console.error(error);
        sendResponse(res, false, "AI parsing failed", null, 500);
    }
});  

// tasks prioritization by ai
aiRouter.post("/prioritize-tasks", authentication, async (req, res) => {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || !tasks.length) {
        return sendResponse(res, false, "Tasks array is required.", null, 400);
    }

    try {
        const aiReply = await callOpenAI("Sort tasks by urgency and importance. Return array of task IDs.", JSON.stringify(tasks), 0.2);
        sendResponse(res, true, "Tasks prioritized", aiReply);
    } catch (error) {
        sendResponse(res, false, "AI prioritization failed", null, 500);
    }
});

// next task remmondation by ai
aiRouter.post("/recommed-next-task", authentication, async (req, res) => {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || !tasks.length) {
        return sendResponse(res, false, "Tasks array is required.", null, 400);
    }

    try {
        const aiReply = await callOpenAI("Recommend the single most urgent task as JSON.", JSON.stringify(tasks), 0.2);
        sendResponse(res, true, "Next recommended task: ", aiReply);
    } catch (error) {
        sendResponse(res, false, "AI recommendation failed", null, 500);
    }
});

// time-blocked day plan
aiRouter.post("/generate-day-plan", authentication, async (req, res) => {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || !tasks.length) {
        return sendResponse(res, false, "Tasks list is required.", null, 400);
    }

    try {
    const plan = await callOpenAI("Create a time-blocked 9AM-9PM plan prioritizing high priority tasks first.", JSON.stringify(tasks));
    sendResponse(res, true, "Day plan generated", { plan });
  } catch (error) {
    sendResponse(res, false, "Failed to generate day plan", null, 500);
  }
});

// summarize all task stats
aiRouter.post("/generate-summary", authentication, async (req, res) => {
    const { summaryData } = req.body;

    if (!summaryData) {
        return sendResponse(res, false, "Summary data is required.", null, 400);
    }

    try {
    const sumarry = await callOpenAI("Write a short performance summary from provided task stats.", JSON.stringify(summaryData), 0.4);
    sendResponse(res, true, "Summary generated", sumarry);
  } catch (error) {
    sendResponse(res, false, "Failed to generate summary", null, 500);
  }
});

module.exports = { aiRouter }