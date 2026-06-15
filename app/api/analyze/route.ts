import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const maxDuration = 60; // Allow it to run for up to 60s since Vision models can be slower

export async function POST(req: Request) {
  try {
    const { base64Data, fileType, prompt, model } = await req.json();

    // 1. If model is a Gemini model, use the Google GenAI SDK with Search Grounding
    if (model && model.startsWith('gemini-')) {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is missing.' }, { status: 500 });
      }

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare multi-modal content parts
      const parts: any[] = [{ text: prompt }];

      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: fileType || 'image/jpeg',
            data: base64Data
          }
        });
      }

      // Add special OSINT parameters & system instructions to produce a gorgeous exhaustive report
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          systemInstruction: "You are an elite, world-class forensic OSINT (Open Source Intelligence) investigator. Your analytical reports must be flawless, detailed, objective, structured, and use bullet points for max scannability.",
          tools: [{ googleSearch: {} }] // Activate Search Grounding to let Gemini search the web for visual cues/context!
        }
      });

      const report = response.text || 'No intelligence report generated.';
      
      // Map grounding chunks properly to webSources structure
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const webSources = chunks ? chunks.map((chunk: any) => ({
        web: {
          uri: chunk.web?.uri || '',
          title: chunk.web?.title || ''
        }
      })).filter((s: any) => s.web.uri) : [];

      return NextResponse.json({ report, webSources });
    }

    // 2. Otherwise fall back to NVIDIA models
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA_API_KEY environment variable is missing.' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    // Validate model or default to the best model 'meta/llama-3.2-90b-vision-instruct'
    const allowedModels = [
      'meta/llama-3.2-90b-vision-instruct',
      'nvidia/llama-3.1-nemotron-nano-vl-8b-v1'
    ];
    const chosenModel = allowedModels.includes(model) ? model : 'meta/llama-3.2-90b-vision-instruct';

    const completion = await openai.chat.completions.create({
      model: chosenModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const report = completion.choices[0]?.message?.content || 'No intelligence report generated.';
    return NextResponse.json({ report, webSources: [] });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate report' }, { status: 500 });
  }
}
