import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: 'No token' });
  const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
  const data = await res.json();
  return NextResponse.json({ success: true, data });
}
