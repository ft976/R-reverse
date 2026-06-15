import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow it to run for up to 60s

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: 'No token' }, { status: 500 });

  try {
    const body = await req.json();
    console.log("Telegram webhook received:", JSON.stringify(body, null, 2));

    const message = body.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;

    // Acknowledge Start
    if (message.text === '/start') {
      await sendMessage(chatId, "Welcome to OmniSearch OSINT Bot! Send me an image and I will analyze it thoroughly, providing comprehensive intelligence data.", botToken);
      return NextResponse.json({ ok: true });
    }

    if (!message.photo && !message.document) {
      await sendMessage(chatId, "Please send an image to begin the OSINT analysis.", botToken);
      return NextResponse.json({ ok: true });
    }

    // Acknowledge receipt
    await sendMessage(chatId, "Received. Initializing Vision processing and deep metadata extraction... This may take a moment.", botToken);

    let fileId;
    if (message.photo) {
      // Get the highest resolution photo
      fileId = message.photo[message.photo.length - 1].file_id;
    } else if (message.document && message.document.mime_type?.startsWith('image/')) {
      fileId = message.document.file_id;
    } else {
      await sendMessage(chatId, "Please send a valid image format.", botToken);
      return NextResponse.json({ ok: true });
    }

    // Get File Path
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    
    if (!fileData.ok) {
      await sendMessage(chatId, "Failed to retrieve image from Telegram servers.", botToken);
      return NextResponse.json({ ok: true });
    }

    const filePath = fileData.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // Download the image
    const imageRes = await fetch(fileUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Data = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      await sendMessage(chatId, "NVIDIA_API_KEY environment variable is missing for analysis.", botToken);
      return NextResponse.json({ ok: true });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    const prompt = `You are an elite, world-class OSINT (Open Source Intelligence) investigator. Perform a PERFECT, FLAWLESS, and EXHAUSTIVE analysis of this image using advanced IMINT (Imagery Intelligence), GEOINT (Geospatial Intelligence), and SOCMINT (Social Media Intelligence) methodologies. Every single detail is of critical intelligence value. Do not omit anything.

1. **EXHAUSTIVE IMINT (Imagery Intelligence) & OCR EXTRACTION**:
- Extract ALL visible text, numbers, license plates, signs, graffiti, street markers, packaging text, labels, or documents perfectly. Provide exact transcription and translate/identify any foreign languages.
- Identify all logos, insignia, symbols, branding, flags, and commercial graphics.
- Identify all objects, equipment, vehicles (include make, model, color, type), clothes, uniforms, shoes, accessories, weapon types (if any), and facial features/demographics visible.

2. **DEEP GEOINT (Geospatial Intelligence) EXTRACTION**:
- Identify all landmarks, architecture types (e.g., European, East Asian, modern, historical), building styles, road/pavement designs, power outlets, utility poles, foliage, trees, soil type, and climate indicators.
- Analyze meteorological and temporal clues: shadow length and angles to estimate sun position/direction/time of day, light source, weather, and absolute season.
- Deduce the precise geographic coordinates or highly specific location/region (country, state, city, neighborhood). Suggest a Confidence Score (0-100%) and thoroughly document your visual-logical reasoning.

3. **SOCMINT (Social Media Intelligence) & CONTEXTUAL PROFILING**:
- Assess potential source profiles: public posting, surveillance feed, news broadcast, private photo, or stock imagery.
- Outline investigative leads, target associations, and actionable search strings (reverse lookups, registry queries) for further OSINT pivoting.

Structure the entire output perfectly in a clean, highly structured, logical MD template. Make sure every single piece of data is extracted and analyzed!`;

    const completion = await openai.chat.completions.create({
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const report = completion.choices[0]?.message?.content || 'No intelligence report generated.';
    
    // Telegram messages have a length limit of 4096 characters.
    const chunkSize = 4000;
    for (let i = 0; i < report.length; i += chunkSize) {
      const chunk = report.substring(i, i + chunkSize);
      await sendMessage(chatId, chunk, botToken);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Error:', error);
    return NextResponse.json({ ok: true });
  }
}

async function sendMessage(chatId: number, text: string, token: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error('Error sending message:', e);
  }
}
