import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiModel = "gemini-3.1-pro-preview";

export async function generateCreatorIdeas(niche: string, platform: string, goals: string) {
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `You are a world-class viral content strategist for ${platform}. 
    
    TASK:
    1. Use Google Search to find the TOP 3 CURRENT TRENDS in the ${niche} niche for ${platform} as of March 2026.
    2. Based on these trends, generate a "7-Day Viral Sprint" content plan.
    3. For each of the 7 days, provide:
       - A Video Concept
       - A High-CTR Title
       - A Scroll-stopping Hook
       - A Script Outline (Hook, Value, CTA)
       - A Thumbnail Visual Description
       - Audio Suggestion (trending sound type or music style)
       - Algo Hack (platform-specific retention or reach tip)
       - SEO Keywords (3-5 relevant keywords)
    4. Provide 3 "Trend Radar" insights based on search results.
    
    Format the response as a JSON object with this structure:
    {
      "trends": [{"title": string, "insight": string}],
      "sprint": [
        {
          "day": number,
          "concept": string,
          "title": string,
          "hook": string,
          "outline": { "hook": string, "value": string, "cta": string },
          "thumbnail": string,
          "audio": string,
          "algoHack": string,
          "keywords": string[]
        }
      ],
      "growthAdvice": string
    }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function analyzeProfile(bio: string, niche: string, goals: string) {
  // Keeping this for backward compatibility or specific IG audit if needed
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `Analyze this social media profile info and provide a growth strategy:
    Niche: ${niche}
    Bio: ${bio}
    Goals: ${goals}
    
    Provide:
    1. Bio/Profile optimization tips.
    2. Content pillars (3-5 themes).
    3. Engagement strategy.
    4. 10 high-performing hashtags/keywords.
    
    Format as JSON with keys: bioTips, contentPillars, engagementStrategy, hashtags.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function generateCaptions(topic: string, tone: string) {
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `Generate 3 engaging captions for the topic: "${topic}" with a ${tone} tone. 
    Include emojis and a call to action for each.
    
    Format as JSON array of strings.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '[]');
}

export async function generateEngagementReplies(comment: string, style: string) {
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `Generate 3 clever, high-engagement replies to this comment: "${comment}". 
    Style: ${style} (e.g., witty, helpful, controversial).
    
    Format as JSON array of strings.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '[]');
}

export async function generateSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this script naturally: ${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}

export async function generateThumbnail(description: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: `Create a high-impact, high-CTR social media thumbnail for: ${description}. 
          Style: Vibrant, professional, eye-catching, modern creator aesthetic. 
          No text if possible, focus on visual storytelling.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function optimizeTitles(draftTitle: string, platform: string) {
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `You are a viral title expert for ${platform}. 
    Optimize this draft title: "${draftTitle}".
    
    Provide 5 variations:
    1. The "Curiosity Gap" (makes them click to find out)
    2. The "Authority" (sounds like an expert)
    3. The "Listicle/Number" (clear value)
    4. The "Controversial" (bold claim)
    5. The "Short & Punchy" (minimalist)
    
    Format as JSON array of objects with keys: type, title.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '[]');
}

export async function generateHooks(context: string, platform: string) {
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `You are a viral hook specialist for ${platform}. 
    Based on this video context: "${context}", generate 5 high-converting hooks.
    
    Provide 5 distinct hook styles:
    1. The "Negative Hook" (Stop doing X...)
    2. The "Result Hook" (How I got X in Y days...)
    3. The "Question Hook" (Ever wondered why X happens?)
    4. The "Contrarian Hook" (Everyone is wrong about X...)
    5. The "Visual/Action Hook" (Watch me do X...)
    
    Format as JSON array of objects with keys: type, hook.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '[]');
}
