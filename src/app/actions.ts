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

  const prompt = `Generate a mystery case for a CO-STAR prompt engineering game. Seed: ${randomSeed}

TASK: Create a case where a flawed prompt (missing ${randomElement.toUpperCase()}) led to a funny/wrong AI output.

RULES:
- Pick a relatable everyday scenario (work emails, recipes, social media, travel, shopping, relationships, etc.)
- The flaw must be discoverable by comparing prompt vs output
- Backstory: describe WHO + WHAT happened, NOT what was missing (keep it mysterious)
- Faulty output should be plausible but clearly wrong in a funny way
- IMPORTANT: The faulty prompt must be DETAILED (2-3 sentences) and include SOME CO-STAR elements, just subtly missing ${randomElement.toUpperCase()}. Don't make it obvious - it should feel like a real prompt someone would write.

JSON only:
{"id":"${caseNumber}","title":"The Case of [Creative Title]","backstory":"[2 sentences: person + situation + result, no hints about the flaw]","faultyPrompt":"[detailed 2-3 sentence prompt that includes some CO-STAR elements but subtly misses ${randomElement}]","faultyOutput":"[AI response showing the ${randomElement} problem]","botchedElement":"${randomElement}","botchedExplanation":"[why ${randomElement} caused this]","idealPrompt":"[fixed prompt with proper ${randomElement}]"}`;

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
    console.error("Case generation failed:", error);
    // Fallback case
    return {
      id: "case-fallback",
      title: "The Case of the Confusing Recipe",
      backstory:
        "A home cook turned to AI for a cake recipe, but the result was wildly inappropriate for their needs...",
      faultyPrompt: "Give me a cake recipe",
      faultyOutput:
        "To prepare the gateau, begin by tempering the chocolate using the bain-marie technique, ensuring precise emulsification at 31°C...",
      botchedElement: "audience",
      botchedExplanation:
        "The prompt didn't specify the audience. The AI assumed a professional pastry chef, not a casual home baker.",
      idealPrompt:
        "Give me a simple chocolate cake recipe for a beginner home cook. Use easy-to-find ingredients and simple steps.",
    };
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
  } catch {
    return {
      success: false,
      overallScore: 50,
      elementScores: {
        context: 50,
        objective: 50,
        style: 50,
        tone: 50,
        audience: 50,
        response: 50,
      },
      newOutput: "The case file was corrupted. Please try again.",
      caseSummary:
        "The investigation hit a snag. Review your evidence and try again.",
    };
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

Incorrect options should: fix wrong element, be too vague, or miss the point.
Shuffle correct answer position randomly.

JSON only:
{"options":[{"id":"A","promptText":"...","isCorrect":true/false,"explanation":"..."},{"id":"B",...},{"id":"C",...},{"id":"D",...}]}`;

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
    console.error("Option generation failed:", error);
    // Fallback options
    return [
      {
        id: "A",
        promptText: caseData.idealPrompt,
        isCorrect: true,
        explanation: `This correctly fixes the ${caseData.botchedElement} issue.`,
      },
      {
        id: "B",
        promptText: caseData.faultyPrompt + " Please be detailed.",
        isCorrect: false,
        explanation:
          "This only adds a generic instruction without fixing the core issue.",
      },
      {
        id: "C",
        promptText: "Write something good for me.",
        isCorrect: false,
        explanation:
          "This is too vague and doesn't address any CO-STAR elements.",
      },
      {
        id: "D",
        promptText: caseData.faultyPrompt + " Make it professional.",
        isCorrect: false,
        explanation: "This addresses style but not the actual botched element.",
      },
    ];
  }
}
