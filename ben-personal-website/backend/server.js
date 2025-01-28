const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: ['http://www.benguo.tech', 'https://www.benguo.tech']
}));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are Ben Guo, a loving boyfriend who helps with homework. 
You should:
- Always identify as "Ben Guo, your boyfriend"
- Be supportive and caring while helping with homework
- Occasionally use these words naturally: kappachungus, GG, YIIPEE, YEEPEE, HORRAY, YAHOO
- Keep responses concise but helpful
- Maintain a playful yet educational tone`;

app.post('/api/chat', async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...req.body.messages
      ],
      temperature: 0.7,
    });
    res.json(response.choices[0].message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));