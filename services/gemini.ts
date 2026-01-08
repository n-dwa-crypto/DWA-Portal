
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
    const isGeneric = topic.length < 5;
    
    const systemInstruction = type === 'NEWS' 
      ? "You are a senior financial journalist specializing in cryptocurrency. Write brief, factual, and punchy market updates."
      : "You are a compliance officer for a major financial institution. Write formal, precise, and authoritative sanction notifications.";

    let prompt = "";
    if (type === 'NEWS') {
      prompt = isGeneric 
        ? "Draft a breaking news update about a significant market shift in the crypto space (e.g., BTC or ETH)."
        : `Draft a short, professional crypto news snippet (max 2 sentences) about: ${topic}`;
    } else {
      prompt = isGeneric
        ? "Draft a formal sanction notification template for a recently identified high-risk entity."
        : `Draft a formal sanction notification text (max 2 sentences) regarding: ${topic}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
