const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.generateTask = async (req, res) => {
  const { prompt } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a project manager. Break down tasks into professional subtasks. 
          Respond ONLY with a valid JSON object. 
          Format: {"title": "Task Name", "description": "Brief info", "priority": "high/medium/low", "checklist": [{"text": "Subtask 1", "completed": false}]}`
        },
        { role: "user", content: `Break down: ${prompt}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const aiData = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(aiData);
  } catch (error) {
    res.status(500).json({ message: "AI Error: " + error.message });
  }
};