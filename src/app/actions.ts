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

  // Expanded scenario categories for variety - everyday, safe, and relatable
  const scenarios = [
    // Work & Team Collaboration
    "planning a team lunch outing",
    "writing a thank-you note to a colleague",
    "drafting a meeting agenda",
    "creating a welcome message for a new team member",
    "summarizing meeting notes for the team",
    "organizing a team-building activity",
    // Community & Social Events
    "planning a neighborhood potluck dinner",
    "writing an invitation for a book club meeting",
    "organizing a community volunteer day",
    "creating a birthday party itinerary",
    "drafting a thank-you card for a gift",
    "planning a picnic with friends",
    // Creative & Hobbies
    "writing a movie review for a film blog",
    "creating a playlist description for a road trip",
    "drafting a caption for a travel photo",
    "writing a book recommendation",
    "creating a recipe card for a family dish",
    "describing a favorite hobby to share online",
    // Practical & Everyday Life
    "writing a grocery list for a dinner party",
    "creating a packing checklist for a vacation",
    "drafting a schedule for a home renovation project",
    "organizing a weekly meal plan",
    "writing instructions for a pet sitter",
    "creating a to-do list for a busy weekend",
    // Learning & Education
    "explaining a fun science fact to kids",
    "writing study notes for an upcoming exam",
    "creating a how-to guide for a craft project",
    "summarizing a chapter from a textbook",
    "drafting a presentation about a favorite topic",
    "writing tips for learning a new language",
    // Lifestyle & Wellness
    "creating a morning routine guide",
    "writing a beginner's workout plan",
    "planning a relaxing weekend at home",
    "drafting goals for the new year",
    "creating a reading list for the month",
    "writing tips for staying organized",
  ];
  const randomScenario =
    scenarios[Math.floor(Math.random() * scenarios.length)];

  const prompt = `Generate a mystery case for a CO-STAR prompt engineering game. Seed: ${randomSeed}

TASK: Create a case where a flawed prompt (missing ${randomElement.toUpperCase()}) led to a funny/wrong AI output.
SCENARIO MUST BE ABOUT: ${randomScenario}

CO-STAR ELEMENT DEFINITIONS (use these to create a clear, traceable flaw):
- CONTEXT: Background information, situation, or setting that helps the AI understand the scenario
- OBJECTIVE: The specific goal or task the user wants to accomplish
- STYLE: The writing format (e.g., formal, casual, bullet points, paragraph, professional)
- TONE: The emotional quality or attitude (e.g., friendly, serious, enthusiastic, sympathetic)
- AUDIENCE: Who will read/use this content (e.g., children, executives, friends, customers)
- RESPONSE: The expected format, length, or structure of the output

CRITICAL RULES FOR QUALITY:
1. THE FLAW MUST BE OBVIOUS: When someone reads the faultyPrompt, then reads the faultyOutput, they should immediately see WHY the output is wrong.

2. DIRECT CAUSE-AND-EFFECT: The missing ${randomElement.toUpperCase()} must DIRECTLY cause the problem in the output. No vague connections.

3. BACKSTORY RULES:
   - Describe WHO (a relatable person with a simple role) + WHAT happened (the situation and funny result)
   - Do NOT hint at what CO-STAR element was missing
   - Keep it light, fun, and appropriate for all audiences

4. FAULTY PROMPT RULES:
   - Write as a NATURAL, CONVERSATIONAL request (2-3 sentences)
   - NO LABELS like "Context:", "Objective:", etc.
   - Must clearly be missing ${randomElement.toUpperCase()} while including the other elements
   - The missing element should create an obvious gap that leads to the wrong output

5. FAULTY OUTPUT RULES:
   - Must be a DIRECT consequence of the missing ${randomElement.toUpperCase()}
   - Should be plausible (the AI tried its best) but clearly wrong
   - The wrongness should be funny and obvious, not subtle

6. EXPLANATION RULES (THIS IS CRITICAL):
   - MUST directly quote or reference specific text from BOTH the faultyPrompt AND the faultyOutput
   - Use this format: "The prompt said '[quote from prompt]' but didn't specify [missing element]. As a result, the AI [what it did wrong], producing '[quote from output]' when it should have [what was expected]."
   - The explanation must be verifiable - a reader should be able to look back at the prompt and output and confirm every claim

JSON only:
{"id":"${caseNumber}","title":"The Case of [Creative Title]","backstory":"[2 sentences: person + situation + funny result, no hints about the flaw]","faultyPrompt":"[A natural, 2-3 sentence conversational prompt that is clearly missing ${randomElement}. NO LABELS.]","faultyOutput":"[AI response that directly shows the ${randomElement} problem - must be traceable]","botchedElement":"${randomElement}","botchedExplanation":"[MUST quote from both the prompt AND output. Format: The prompt said '[X]' but didn't specify [missing element]. This caused the AI to [Y], resulting in '[Z from output]' instead of [expected].]","idealPrompt":"[A natural, conversational fix that adds ${randomElement} without using labels.]"}`;

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

  // Varied domains for richer case generation - everyday, safe, and relatable
  const domains = [
    "a weekend travel itinerary for a family trip",
    "a summary of a popular book or novel",
    "a recipe for a family dinner",
    "a product review for kitchen appliances",
    "an overview of a fun historical event",
    "a comparison of popular coffee shops",
    "a guide to local parks and hiking trails",
    "a movie recommendation with plot summary",
    "a pet adoption profile for an animal shelter",
    "a description of a local community event",
    "an itinerary for a birthday celebration",
    "a packing list for a camping trip",
    "a restaurant menu description",
    "a summary of a popular podcast episode",
    "a guide to beginner-friendly board games",
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
