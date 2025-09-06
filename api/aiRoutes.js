const router = require('express').Router();
const OpenAI = require('openai');
const db = require('../db/dbConfig');
const sendEmail = require('../utils/email/email');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/generate', async (req, res) => {
  try {
    let { linkedIn, email } = req.body;

    if (!email || !linkedIn) {
      return res.status(400).json({ error: 'Email and LI are required' });
    }

    // If linkedIn is a JSON string, parse it
    if (typeof linkedIn === 'string') {
      try {
        linkedIn = JSON.parse(linkedIn);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid LinkedIn JSON' });
      }
    }

    // Build prompts (keep your format, just stringify the object)
    const masterProfilePrompt = `
#ROLE: You are an expert Linkedin summarizer, and super critical to our outreach.
#TASK: Given a profile from linkedin, generate a summary of the user in 2-3 concise sentences that captures their professional background, key skills, and interests. If they have posts/activity, you can do 4-5 sentences.
#INPUT: ${JSON.stringify(linkedIn)}
#FORMAT: 4-5 concise sentences
#CONSTRAINTS: Only generate the summary, no context or anything else.
    `.trim();

    const profileResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert LinkedIn summarizer.' },
        { role: 'user', content: masterProfilePrompt },
      ],
      max_tokens: 500,
    });

    const profileSummary =
      profileResponse?.choices?.[0]?.message?.content?.trim?.() || '';

    if (!profileSummary) {
      return res
        .status(502)
        .json({ error: 'Failed to generate profile summary' });
    }

    const masterMessagePrompt = `
#ROLE: You are an expert outreach email generator.
#TASK: Given a summary of a profile from LinkedIn, generate a concise, engaging outreach email offering AI services.
#INPUT: ${profileSummary}
#FORMAT: Plain text; 3 short paragraphs, max 2 sentences each: (1) relate, (2) introduce you/company, (3) ask for demo.
#CONSTRAINTS: Only generate the message (no subject). Avoid jargon. No extra context.
    `.trim();

    const messageResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert outreach email generator.',
        },
        { role: 'user', content: masterMessagePrompt },
      ],
      max_tokens: 300,
    });

    const generatedText =
      messageResponse?.choices?.[0]?.message?.content?.trim?.() || '';

    if (!generatedText) {
      return res
        .status(502)
        .json({ error: 'Failed to generate outreach message' });
    }

    // Send email first (optional)
    await sendEmail(email, 'New AI Automation no risk', generatedText);

    // Save to DB
    await db('outreach_specs').insert({
      email,
      message: generatedText,
      date_of_sending: new Date(),
      profile_summary: profileSummary,
      emails_sent: 1,
    });

    return res.json({ profileSummary, generatedText });
  } catch (err) {
    console.error('Error in /generate:', err);
    // Ensure we only respond once
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate text' });
    }
  }
});

module.exports = router;
