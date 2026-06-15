import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  let appUrl = process.env.APP_URL || `${forwardedProto}://${forwardedHost}`;

  if (!botToken) {
    return NextResponse.json({ 
      error: 'Requirements missing. Ensure TELEGRAM_BOT_TOKEN is set in secrets.' 
    }, { status: 400 });
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json();
    return NextResponse.json({ success: true, url: webhookUrl, telegramResponse: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
