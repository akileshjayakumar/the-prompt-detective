"use server";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CaseData {
  id: string;
  title: string;
  backstory: string;
  faultyPrompt: string;
  faultyOutput: string;
  botchedElement:
    | "context"
    | "objective"
    | "style"
    | "tone"
    | "audience"
    | "response";
  botchedExplanation: string;
  idealPrompt: string;
}

export interface VerdictData {
  success: boolean;
  overallScore: number;
  elementScores: {
    context: number;
    objective: number;
    style: number;
    tone: number;
    audience: number;
    response: number;
  };
  newOutput: string;
  caseSummary: string;
}

// Generate a new case for the player to solve
export async function generateCase(): Promise<CaseData> {
  // Randomize to encourage variety
  const randomSeed = Math.floor(Math.random() * 100000);
  const caseNumber = Math.floor(Math.random() * 900) + 100; // 3-digit case number (100-999)
  const coStarElements = [
    "context",
    "objective",
    "style",
    "tone",
    "audience",
    "response",
  ];
  const randomElement =
    coStarElements[Math.floor(Math.random() * coStarElements.length)];

  // Expanded scenario categories for variety
  const scenarios = [
    // Work & Professional
    "drafting a resignation letter",
    "writing a performance review",
    "requesting a raise via email",
    "onboarding a new team member",
    "presenting a project update to executives",
    "handling a client complaint",
    // Personal & Social
    "writing a wedding speech",
    "composing a dating app bio",
    "apologizing to a friend",
    "planning a surprise party",
    "writing a sympathy card",
    "crafting a roommate agreement",
    // Creative & Entertainment
    "writing a movie review",
    "creating an Instagram caption",
    "drafting a podcast intro",
    "writing a short story opening",
    "composing song lyrics",
    "creating a D&D character backstory",
    // Practical & Everyday
    "writing a product return request",
    "creating a grocery list",
    "drafting a neighborhood complaint",
    "writing a rental application",
    "composing a vet appointment summary",
    "creating a chore schedule",
    // Technical & Educational
    "explaining a concept to a child",
    "writing documentation",
    "creating a tutorial",
    "summarizing a research paper",
    "writing exam study notes",
    "drafting a lab report",
    // Health & Lifestyle
    "creating a meal plan",
    "writing a gym routine",
    "journaling about mental health",
    "writing a doctor's symptom summary",
    "creating a sleep improvement plan",
    "drafting wellness goals",
  ];
  const randomScenario =
    scenarios[Math.floor(Math.random() * scenarios.length)];

  const prompt = `Generate a mystery case for a CO-STAR prompt engineering game. Seed: ${randomSeed}

TASK: Create a case where a flawed prompt (missing ${randomElement.toUpperCase()}) led to a funny/wrong AI output.
SCENARIO MUST BE ABOUT: ${randomScenario}

RULES:
- Use the scenario above but make it fresh and unique.
- The flaw must be discoverable by comparing prompt vs output.
- Backstory: describe WHO + WHAT happened, NOT what was missing (keep it mysterious).
- Faulty output should be plausible but clearly wrong in a funny way.
- IMPORTANT: The faulty prompt must be written as a NATURAL, CONVERSATIONAL request (2-3 sentences).
- DO NOT use labels like "Context:", "Objective:", "Style:", "Tone:", "Audience:", or "Response:".
- Instead, weave the CO-STAR elements naturally into the text as a human would write it.
- The prompt should subtly miss the ${randomElement.toUpperCase()} element while providing enough detail for the others.
- BE CREATIVE! Avoid generic examples.

JSON only:
{"id":"${caseNumber}","title":"The Case of [Creative Title]","backstory":"[2 sentences: person + situation + result, no hints about the flaw]","faultyPrompt":"[A natural, 2-3 sentence conversational prompt that misses ${randomElement}. NO LABELS.]","faultyOutput":"[AI response showing the ${randomElement} problem]","botchedElement":"${randomElement}","botchedExplanation":"[why ${randomElement} caused this]","idealPrompt":"[A natural, conversational fix that includes ${randomElement} without using labels.]"}`;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as CaseData;
      }
      throw new Error("No valid JSON in response");
    } catch (error) {
      console.error("Case generation failed, retrying...", error);
      // Small delay to prevent tight loops in case of persistent errors
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Evaluate the player's rectified prompt
export async function evaluateRectification(
  caseData: CaseData,
  playerPrompt: {
    context: string;
    objective: string;
    style: string;
    tone: string;
    audience: string;
    response: string;
  }
): Promise<VerdictData> {
  const fullPrompt = `
Context: ${playerPrompt.context}
Objective: ${playerPrompt.objective}
Style: ${playerPrompt.style}
Tone: ${playerPrompt.tone}
Audience: ${playerPrompt.audience}
Response Format: ${playerPrompt.response}

Based on the above, generate a response that matches this scenario:
Original faulty request was about: "${caseData.backstory}"
`;

  const evalPrompt = `
You are a detective case evaluator. The player tried to fix a flawed prompt using CO-STAR.

Original flawed element was: ${caseData.botchedElement}
Ideal prompt was: "${caseData.idealPrompt}"

Player's CO-STAR breakdown:
- Context: "${playerPrompt.context}"
- Objective: "${playerPrompt.objective}"
- Style: "${playerPrompt.style}"
- Tone: "${playerPrompt.tone}"
- Audience: "${playerPrompt.audience}"
- Response: "${playerPrompt.response}"

Score each element 0-100 based on how well it addresses the original flaw.
Determine if the case was "solved" (the botched element was properly fixed).
Write a detective-style case summary.

Then, actually generate what the AI would output given this new prompt.

Return ONLY valid JSON:
{
  "success": true,
  "overallScore": 85,
  "elementScores": {
    "context": 90,
    "objective": 85,
    "style": 80,
    "tone": 95,
    "audience": 70,
    "response": 85
  },
  "newOutput": "The actual AI-generated response based on the player's fixed prompt...",
  "caseSummary": "Case closed! The detective correctly identified that the original prompter forgot to specify..."
}
`;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: evalPrompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as VerdictData;
      }
      throw new Error("No valid JSON");
    } catch (error) {
      console.error("Evaluation failed, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Interface for rectification options
export interface RectificationOption {
  id: string;
  promptText: string;
  isCorrect: boolean;
  explanation: string;
}

// Generate 4 rectification options (1 correct, 3 incorrect)
export async function generateRectificationOptions(
  caseData: CaseData
): Promise<RectificationOption[]> {
  const prompt = `Generate 4 multiple-choice prompts for a CO-STAR game. ONE correct, THREE incorrect.

Flawed prompt: "${caseData.faultyPrompt}"
Botched element: ${caseData.botchedElement}
Ideal fix: "${caseData.idealPrompt}"

RULES FOR OPTIONS:
- Each option must be a NATURAL, CONVERSATIONAL prompt.
- DO NOT use labels like "Context:", "Objective:", etc.
- Incorrect options should: fix the wrong element, be too vague, or miss the point entirely.
- The correct option should be a natural-sounding improvement that addresses the ${caseData.botchedElement}.
- Shuffle correct answer position randomly.

JSON only:
{"options":[{"id":"A","promptText":"...","isCorrect":true/false,"explanation":"..."},{"id":"B",...},{"id":"C",...},{"id":"D",...}]}`;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Sort options alphabetically by ID (A, B, C, D)
        const options = parsed.options as RectificationOption[];
        return options.sort((a, b) => a.id.localeCompare(b.id));
      }
      throw new Error("No valid JSON");
    } catch (error) {
      console.error("Option generation failed, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
// --- New Interfaces and Functions for AI Auditor and Prompt Sandbox ---

export interface AuditCaseData {
  id: string;
  title: string;
  originalPrompt: string;
  keyPoints: {
    emoji: string;
    label: string;
    value: string;
  }[];
  aiOutput: string;
  sentences: string[]; // Split sentences for card-based UI
  bugs: {
    id: string;
    text: string;
    explanation: string; // Kid-friendly explanation
  }[];
}

export interface MentorFeedback {
  feedback: {
    element: string;
    status: "missing" | "partial" | "complete";
    comment: string;
  }[];
  overallAssessment: string;
  isReady: boolean;
  improvedPrompt?: string;
}

// Generate a case for the AI Auditor mode
export async function generateAuditCase(): Promise<AuditCaseData> {
  const caseNumber = Math.floor(Math.random() * 900) + 100;

  // Varied domains for richer case generation
  const domains = [
    "a travel itinerary for a business trip",
    "a medical summary for a patient visit",
    "a legal contract summary",
    "a financial investment report",
    "a historical event summary",
    "a recipe with nutritional information",
    "a product comparison review",
    "a scientific research abstract",
    "a sports game analysis",
    "a celebrity biography snippet",
    "a real estate property listing",
    "a university course syllabus",
    "an event planning timeline",
    "a tech product specification sheet",
    "a movie plot summary with ratings",
  ];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];

  const prompt = `Generate a mystery case for the "AI Auditor" mode. This is for KIDS and BEGINNERS learning to spot AI mistakes.

TASK: Create a scenario where a user asked for ${randomDomain}, and the AI made 2-3 MISTAKES.

RULES:
- Keep everything SHORT and SIMPLE
- The aiOutput should be 4-6 SHORT sentences max
- Each sentence in aiOutput should be its own complete thought
- Bugs should have SIMPLE explanations a 10-year-old can understand
- keyPoints should summarize what was asked using emojis

JSON only:
{
  "id": "${caseNumber}",
  "title": "[Short Fun Title]",
  "originalPrompt": "[Simple 1-2 sentence request]",
  "keyPoints": [
    {"emoji": "📋", "label": "Task", "value": "[What they wanted]"},
    {"emoji": "📍", "label": "About", "value": "[Key detail]"},
    {"emoji": "⚠️", "label": "Rule", "value": "[Important constraint]"}
  ],
  "aiOutput": "[4-6 short sentences. Each sentence on its own line. Include 2-3 mistakes.]",
  "bugs": [
    {
      "id": "bug-1",
      "text": "[Exact wrong sentence from aiOutput]",
      "explanation": "[Simple explanation like: The prompt said X, but the AI said Y]"
    }
  ]
}`;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Split aiOutput into sentences for the card-based UI
        const sentences = parsed.aiOutput
          .split(/(?<=[.!?])\s+/)
          .filter((s: string) => s.trim().length > 0);
        return {
          ...parsed,
          sentences,
        } as AuditCaseData;
      }
      throw new Error("No valid JSON");
    } catch (error) {
      console.error("Audit case generation failed, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Get feedback for the Prompt Sandbox mode using CO-STAR
export async function getMentorFeedback(
  promptText: string
): Promise<MentorFeedback> {
  const coachPrompt = `You are a Chief Detective AI Mentor teaching the CO-STAR framework.
The user is writing a prompt: "${promptText}"

CO-STAR elements: Context, Objective, Style, Tone, Audience, Response.

TASK:
1. Analyze the prompt for each CO-STAR element.
2. Provide feedback for each.
3. Write an IMPROVED version of their prompt that perfectly applies all CO-STAR elements.

CRITICAL INSTRUCTION FOR "improvedPrompt":
- Do NOT use explicit labels like "Context:", "Objective:", "Style:", etc.
- Write the prompt as a natural, cohesive paragraph(s) as a human would write it.
- Weave the CO-STAR elements seamlessly into the narrative.

EXAMPLES OF DESIRED FORMAT:
Example 1: "As a marketing officer at a Singaporean tech startup, I need a LinkedIn post announcing our new product launch. The post should be professional and engaging, with an enthusiastic and informative tone for tech professionals and industry leaders in Southeast Asia. Please keep it between 150-200 words and end with a call-to-action to visit our website."

Example 2: "I'm preparing a presentation for a government innovation workshop and need a summary of key findings from a recent AI ethics report. The summary should be concise and data-driven, neutral and factual, aimed at policymakers and senior civil servants. Please limit it to bullet points, not exceeding 100 words."

Example 3: "As a content writer for a travel blog focused on Southeast Asia, I need a blog post about eco-friendly travel in Singapore. The post should be informative and use storytelling, with a friendly and inspiring tone for young travellers and adventure seekers. Please write 400-500 words, divided into three sections: introduction, tips, and conclusion."

Example 4: "As a software engineer working on a GenAI project, I need an explanation of how prompt engineering improves model accuracy. The explanation should be technical and clear, with an objective and instructive tone for junior engineers and non-technical stakeholders. Please keep it to 250-300 words and include simple analogies and practical examples."

Example 5: "As a teacher creating lesson materials for secondary students, I need a quiz on climate change for a science class. The quiz should be educational and interactive, with an encouraging and supportive tone for students aged 13-15. Please provide 5 multiple-choice questions with explanations, each question not exceeding 20 words."

JSON only:
{
  "feedback": [
    {"element": "Context", "status": "missing/partial/complete", "comment": "..."},
    ...
  ],
  "overallAssessment": "[1 sentence of encouragement or direction]",
  "isReady": true/false,
  "improvedPrompt": "[The full, improved CO-STAR prompt text following the natural narrative format shown in examples, NO LABELS]"
}`;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: coachPrompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as MentorFeedback;
      }
      throw new Error("No valid JSON");
    } catch (error) {
      console.error("Mentor feedback failed, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
