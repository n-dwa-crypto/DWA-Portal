
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client using the provided environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a draft for either News or Sanctions using Gemini 3 Flash.
 * @param topic The topic or keyword to write about
 * @param type The type of content to generate
 * @returns A professionally drafted string
 */
export const generateDraft = async (topic: string, type: 'NEWS' | 'SANCTION'): Promise<string> => {
  try {
    const systemInstruction = type === 'NEWS' 
      ? "You are a senior financial journalist specializing in cryptocurrency. Write brief, factual, and punchy market updates."
      : "You are a compliance officer for a major financial institution. Write formal, precise, and authoritative sanction notifications.";

    const prompt = type === 'NEWS' 
      ? `Draft a short, professional crypto news snippet (max 2 sentences) about: ${topic}`
      : `Draft a formal sanction notification text (max 2 sentences) regarding: ${topic}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.9,
      }
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
