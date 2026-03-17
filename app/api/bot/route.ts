import { NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { getUsersSheet } from '@/lib/google-sheets';

// In-memory state doesn't work well in serverless, but for simple login steps it might work briefly.
// For a more robust solution, use a database (like the Google Sheet itself or Redis).
// Here we'll try to keep it simple.
const userStates: { [key: number]: { step: string; data?: any } } = {};

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bot token not found' }, { status: 500 });
  }

  const bot = new TelegramBot(token);
  
  try {
    const body = await request.json();
    
    // Handle the update from Telegram
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const text = msg.text;

      if (text === '/start') {
        await bot.sendMessage(chatId, 'Halo! Saya adalah Bot Reminder. Silakan gunakan /login untuk menghubungkan akun Anda.');
      } else if (text === '/login') {
        const sheet = await getUsersSheet();
        const rows = await sheet.getRows();
        const existingUser = rows.find(r => r.get('id_telegram') === chatId.toString());

        if (existingUser) {
          await bot.sendMessage(chatId, `Anda sudah login sebagai *${existingUser.get('nama_lengkap')}*.`, { parse_mode: 'Markdown' });
        } else {
          userStates[chatId] = { step: 'AWAITING_USERNAME' };
          await bot.sendMessage(chatId, 'Silakan masukkan username Anda:');
        }
      } else if (text === '/status') {
        const sheet = await getUsersSheet();
        const rows = await sheet.getRows();
        const user = rows.find(r => r.get('id_telegram') === chatId.toString());
        
        if (user) {
          await bot.sendMessage(chatId, `✅ Akun terhubung!\n\nNama: ${user.get('nama_lengkap')}\nUsername: ${user.get('username')}`);
        } else {
          await bot.sendMessage(chatId, '❌ Akun belum terhubung. Gunakan /login.');
        }
      } else if (text && !text.startsWith('/')) {
        const state = userStates[chatId];
        if (state) {
          if (state.step === 'AWAITING_USERNAME') {
            state.data = { username: text };
            state.step = 'AWAITING_PASSWORD';
            await bot.sendMessage(chatId, 'Silakan masukkan password Anda:');
          } else if (state.step === 'AWAITING_PASSWORD') {
            const username = state.data.username;
            const password = text;

            const sheet = await getUsersSheet();
            const rows = await sheet.getRows();
            const userRow = rows.find(r => r.get('username') === username && r.get('password') === password);

            if (userRow) {
              userRow.set('id_telegram', chatId.toString());
              await userRow.save();
              delete userStates[chatId];
              await bot.sendMessage(chatId, `Login berhasil! Halo ${userRow.get('nama_lengkap')}.`);
            } else {
              delete userStates[chatId];
              await bot.sendMessage(chatId, 'Username atau password salah. Coba /login lagi.');
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Bot webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
