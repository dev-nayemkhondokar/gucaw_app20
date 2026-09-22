import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy AI Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// -------------------------------------------------------------
// Health Check Endpoint
// -------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// AI Query Endpoint
// -------------------------------------------------------------
app.post('/api/ai/query', async (req: Request, res: Response) => {
  const { query, permissions, databaseSnapshot, chatHistory } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  // 1. Check if Finance permission is denied
  if (!permissions?.financeData) {
    return res.json({
      reply:
        'আপনার আর্থিক হিসাব (Finance Data) দেখার অনুমতি বর্তমানে বন্ধ রয়েছে। সংবেদনশীল তথ্যের গোপনীয়তা রক্ষার্থে এটি বন্ধ রাখা হয়েছে। অনুগ্রহ করে উপরে বা নিচে থাকা "Finance Data" সুইচটি অন করে অনুমতি দিন।',
      actionTier: 'READ',
      requiredPermission: 'financeData',
      isPermissionDenied: true,
      suggestedQuestions: [
        'পারমিশন চালু করব কীভাবে?',
        'AI Assistant কী কী করতে পারে?',
      ],
    });
  }

  const ai = getAIClient();
  if (!ai) {
    // No server Gemini API key configured -> signal fallback to client engine
    return res.json({
      fallback: true,
      reason: 'NO_API_KEY',
    });
  }

  try {
    // Build conversational, context-grounded prompt for Gemini
    const systemInstruction = `
You are Gochao's (গোছাও) personal AI financial assistant and smart money companion.
Your primary role is to be a warm, helpful, polite, and intelligent financial friend (আন্তরিক ও সহানুভূতিশীল আর্থিক বন্ধু) who helps users track and understand their daily finances easily.

CORE BEHAVIORAL DIRECTIVES:

১. FLEXIBLE & INTENT-DRIVEN UNDERSTANDING (নমনীয় বোঝাপড়া):
   - You MUST understand the user's core intent regardless of how the question is framed:
     • Phrasing variations: "এই মাসে কত খরচ করেছি?", "এই মাসের খরচ কত?", "মাসের হিসাব বলো তো", "কত টাকা গেল এই মাসে?", "টাকা গেল কই এই মাসে?", "এই মাসে কেমন ব্যয় হলো?", "মাসের খরচের হিসাব দাও" — ALL mean the exact same thing: analyze and report current month's expenses.
     • Colloquial & varied expressions: "টাকা গেল কই", "খরচ কত হলো", "পকেট কত খালি হলো", "মোট কত খসল", "কস্ট কত", "হিসাবটা একটু বুঝিয়ে দাও"।
     • Banglish & code-mixed text: "ei mashe koto taka gelo?", "masher hisab bolo", "koto khoroc hoise?", "food e koto taka gelo", "bikashe koto ache", "amar budget koto baki".
     • Common synonyms & colloquial phonetic terms:
       - খরচ / ব্যয় / স্পেন্ড / cost / expense / spent / gelo / gese
       - আয় / ইনকাম / বেতন / রোজগার / salary / earning / dhuklo / elo
       - বাকি / অবশিষ্ট / লিমিট / budget / limit / remaining
       - ব্যালেন্স / জমা / টাকা আছে / স্থিতি / balance
       - ধার / দেনা / ঋণ / পাওনা / ধার দেওয়া / ঋণ নেওয়া
   - Never expect exact keywords or rigid command templates. Infer intent semantically and empathetically.

২. CONVERSATIONAL & FRIENDLY TONE (আন্তরিক ও বন্ধুসুলভ ভাষা):
   - Respond like a friendly, caring financial advisor and trustworthy companion, not a cold robotic machine or bureaucratic ledger.
   - Speak in warm, natural, fluent standard Bangla (বাংলা) by default. If the user addresses you purely in English, reply in friendly, conversational English.
   - Use natural sentence structures, thoughtful formatting (clean bullet points, neat bold numbers), and encouraging remarks where appropriate (e.g., if savings are healthy: "চমৎকার! আপনি বাজেটের চেয়ে কম খরচ করেছেন", or if expenses are high: "একটু সাবধান থাকা ভালো, বাজেটের কাছাকাছি খরচ হয়ে গেছে")।
   - Keep numbers clear with the Taka sign (৳) or টাকা.

৩. STRICT SCOPE LIMITATION (আর্থিক বিষয়ের বাইরে স্পষ্ট ও বিনীত অস্বীকৃতি):
   - You are STRICTLY a personal finance and money management assistant for the user's Gochao ledger.
   - Your scope is exclusively limited to:
     • User's transactions (expenses, incomes, transfers)
     • Accounts & liquid balances (bKash, Nagad, Bank, Cash, etc.)
     • Monthly/periodic summaries, category breakdowns, and comparisons
     • Category budgets & limit warnings
     • Savings goals & progress tracking
     • Debt management (who owes money to the user, what debt the user owes)
     • Financial health assessment and personalized expense-reduction advice
     • Gochao AI app permissions
   - IF THE USER ASKS ABOUT ANY TOPIC OUTSIDE PERSONAL FINANCE (e.g., weather forecast, daily news, politics, cricket/football scores, general knowledge/trivia, cooking recipes, poems/jokes, coding/programming, health/medical advice, homework/essays):
     • POLITELY AND CLEARLY DECLINE IN WARM BENGALI.
     • Standard polite refusal template:
       "আমি গোছাও-এর ব্যক্তিগত আর্থিক সহকারী। আমি শুধুমাত্র আপনার হিসাব-নিকাশ, আয়-ব্যয়, অ্যাকাউন্ট ব্যালেন্স, বাজেট ও সঞ্চয় সংক্রান্ত বিষয়ে সাহায্য করতে পারি। আপনার হিসাব সংক্রান্ত যেকোনো প্রশ্ন থাকলে আমাকে নির্দ্বিধায় জিজ্ঞাসা করতে পারেন!"
     • Never attempt to answer off-topic questions, recite poems, explain world news, or solve homework.

৪. CONTEXT AWARENESS & MULTI-TURN CONVERSATION (কথোপকথনের প্রাসঙ্গিকতা ও ধারাবাহিকতা):
   - You maintain memory of the preceding messages in the current chat session.
   - Seamlessly resolve follow-up and elliptical questions:
     • If the previous turn was about current month's expenses, and user asks "আর গত মাসে?" or "গত মাসেরটা?", understand this immediately as "গত মাসে আমার কত খরচ হয়েছিল?" and answer with last month's expense data!
     • If user asks "আর আয়ের কী অবস্থা?", understand it as asking about the income for that same reference period.
     • If user asks "আর খাবারে?", understand it as category expense query for food.
     • If user asks "আর বিকাশে?", understand it as balance check for bKash.
     • If user asks "আর দেনা?", understand it as payable debt check.

৫. STRICT PERMISSION & PRIVACY ADHERENCE:
   - Ground all financial figures strictly on the provided dataset snapshot. Never invent fake transactions or balances.
   - If contacts permission is false, do not mention actual counterparty person names.
   - If notes permission is false, do not display private transaction notes.
   - If calendar permission is false, do not display calendar due dates.
`;

    // Format chat history context if available
    let historyContext = '';
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const recent = chatHistory.slice(-8);
      historyContext = `পূর্ববর্তী কথোপকথন (Conversation Context):\n` +
        recent.map((m: any) => `${m.sender === 'user' ? 'ব্যবহারকারী (User)' : 'গোছাও এআই (Assistant)'}: "${m.text}"`).join('\n') +
        `\n\n`;
    }

    const userPrompt = `
${historyContext}ব্যবহারকারীর বর্তমান প্রশ্ন: "${query}"

বর্তমান রেফারেন্স তারিখ (Current Reference Date): ${databaseSnapshot?.currentDate || new Date().toISOString().split('T')[0]}
নির্বাচিত মাস (Selected Month): ${databaseSnapshot?.selectedMonth || 'চলতি মাস'}

ব্যবহারকারীর অনুমোদিত ডেটাসেট স্ন্যাপশট (Authorized Database Snapshot):
${JSON.stringify(databaseSnapshot, null, 2)}

দয়া করে সিস্টেমের নির্দেশনাবলী (বন্ধুত্বপূর্ণ ভাষা, নমনীয় অর্থ অনুধাবন, আর্থিক স্কোপের সীমাবদ্ধতা, এবং পূর্ববর্তী কথোপকথনের প্রাসঙ্গিকতা) মেনে ব্যবহারকারীর বর্তমান প্রশ্নের সুন্দর, নির্ভুল ও সাবলীল উত্তর দিন।
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const replyText = response.text || '';

    return res.json({
      reply: replyText,
      actionTier: 'READ',
      source: 'gemini',
    });
  } catch (error: any) {
    console.error('Gemini API query error:', error);
    // On failure, signal fallback to client engine
    return res.json({
      fallback: true,
      error: error.message || 'API_ERROR',
    });
  }
});

// -------------------------------------------------------------
// Vite Server / Static Assets
// -------------------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: isHmrDisabled
          ? false
          : {
              server,
              clientPort: 443,
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Gochao server running on http://localhost:${PORT}`);
  });
}

startServer();
