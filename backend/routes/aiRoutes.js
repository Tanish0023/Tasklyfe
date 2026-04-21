const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. Existing Task Generation Route
router.post('/generate-task', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: "Prompt required" });

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert project manager AI. Your job is to break down tasks.
                    CRITICAL DATE RULES: Today's date is ${currentDateStr}. Calculate logical deadlines (dueDate).
                    You MUST return ONLY a valid JSON object matching this exact structure:
                    {"title": "...", "description": "...", "priority": "high", "dueDate": "YYYY-MM-DD", "subTasks": [{"title": "...", "isCompleted": false}]}`
                },
                { role: "user", content: `Break down: ${prompt}` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const aiData = JSON.parse(chatCompletion.choices[0].message.content);
        res.status(200).json(aiData);
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ message: "Groq AI Failed" });
    }
});

// ✅ 2. NAYA ROUTE: AI Daily Briefing
router.post('/daily-briefing', async (req, res) => {
    const { tasks, userName } = req.body;

    // Agar task hi nahi hai, toh AI ki zaroorat nahi
    if (!tasks || tasks.length === 0) {
        return res.status(200).json({ briefing: `Good Morning ${userName}! You have no pending tasks today. Enjoy your day or create a new project!` });
    }

    try {
        // Sirf important data AI ko bhejenge taaki token limit cross na ho
        const taskSummary = tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate ? t.dueDate.split('T')[0] : 'None'})`).join('\n');

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a highly intelligent, polite, and energetic AI Assistant integrated into a premium project management SaaS. 
                    The user's name is ${userName}.
                    Write a 2-3 sentence morning briefing summarizing their pending tasks. 
                    Mention how many high-priority tasks they have. Recommend ONE specific task they should focus on first based on priority and deadline.
                    Keep it conversational, professional, and encouraging. DO NOT use markdown like asterisks or bolding, just plain text.`
                },
                { role: "user", content: `Here are my pending tasks:\n${taskSummary}` }
            ],
            model: "llama-3.3-70b-versatile",
        });

        const briefing = chatCompletion.choices[0].message.content;
        res.status(200).json({ briefing });
    } catch (error) {
        console.error("AI Briefing Error:", error);
        res.status(500).json({ message: "Failed to generate briefing" });
    }
});

module.exports = router;