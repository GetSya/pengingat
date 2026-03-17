import { NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bot token not found' }, { status: 500 });
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const bot = new TelegramBot(token);
    const webhookUrl = `${url.replace(/\/$/, '')}/api/bot`;
    
    console.log(`Setting webhook to: ${webhookUrl}`);
    const result = await bot.setWebHook(webhookUrl);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Webhook setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
