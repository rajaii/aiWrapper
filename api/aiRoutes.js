// const router = require('express').Router();
// const OpenAI = require('openai');
// const db = require('../db/dbConfig');

// const sendEmail = require('../utils/email/email');

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// router.post('/generate', async (req, res) => {
//   const { linkedIn, email } = req.body;

//   if (!email || !linkedIn) {
//     return res.status(400).json({ error: 'Email and LI are required' });
//   }

//   //   // Parse if it's a string
//   //   if (typeof linkedIn === 'string') {
//   //     console.log('Parsing linkedIn string to JSON');
//   //     try {
//   //       linkedIn = JSON.parse(linkedIn);
//   //     } catch (err) {
//   //       return res.status(400).json({ error: 'Invalid LinkedIn JSON' });
//   //     }
//   //   }

//   const masterProfilePrompt = `
//     #ROLE: You are an expert Linkedin summarizer, and super critical to our outreaach.
//     #TASK: Given a profile from linkedin, generate a summary of the user in 2-3 concise sentences that captures their professional background, key skills, and interests. The summary should be engaging and provide a clear overview of the individual's expertise and career highlights. you can also use posts and activity to get a better idea of the person. if they have posts you can do 4-5 sentences to capture everything.
//     #INPUT: ${linkedIn},
//     #FORMAT: 4-5 concise sentences
//     #CONSTRAINTS:  Only generate the summary, no tontext or anything else.
//  `;

//   let profileSummary;
//   try {
//     const profileResponse = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [
//         { role: 'system', content: 'You are an expert LinkedIn summarizer.' },
//         { role: 'user', content: masterProfilePrompt },
//       ],
//       max_tokens: 1000,
//     });
//     const profileSummary = profileResponse.choices[0].message.content.trim();
//   } catch (error) {
//     console.error('Error generating text:', error);
//     res.status(500).json({ error: 'Failed to generate profile summary' });
//   }

//   let generatedText;
//   try {
//     const masterMessagePrompt = `
//     #ROLE: You are an expert outreach email generator.
//     #TASK: Given a summary of profile from linkedin, generate a concise and engaging outreach email that engages the prospect, and tersely offers the product AI services. The email should be professional yet approachable, aiming to capture the recipient's interest and encourage them to learn more about the offering.
//     #INPUT: ${profileSummary},
//     #FORMAT: The email should be in plain text format, it should follow this flow: relate with prospect, introduce yourself and your company, ask if they wand a demo.
//     #CONSTRAINTS: The email should be terse 3 small 2 sentece max paragraphs.  Only generate the message, no subject or anything else.  Avoid using overly technical language or jargon. Ensure the email is free of grammatical errors and typos. Do not provide any context ONLY generate the message.
//  `;

//     const messageResponse = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: 'You are an expert outreach email generator.',
//         },
//         { role: 'user', content: masterMessagePrompt },
//       ],
//       max_tokens: 300,
//     });
//     const generatedText = messageResponse.choices[0].message.content.trim();
//   } catch (error) {
//     console.error('Error generating text:', error);
//     res.status(500).json({ error: 'Failed to generate message' });
//   }

//   try {
//     sendEmail(email, 'New AI Automation no risk', generatedText);
//   } catch (error) {
//     console.error('Error sending email:', error);
//     res.status(500).json({ error: 'Failed to send email' });
//   }

//   try {
//     await db('outreach_specs').insert({
//       email: email,
//       message: generatedText,
//       date_of_sending: new Date(),
//       profile_summary: profileSummary,
//       emails_sent: 1,
//     });
//   } catch (error) {
//     console.error('Error saving to db:', error);
//     res.status(500).json({ error: 'Failed to save to db' });
//   }

//   res.json({ generatedText });
// });

// module.exports = router;

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
