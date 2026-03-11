import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { getUsersSheet, getJTSheet } from './lib/google-sheets.ts';
import cron from 'node-cron';
import { format, addDays, addMonths, addYears, isSameDay, parseISO } from 'date-fns';
import next from 'next';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = 3000;

app.prepare().then(async () => {
  const server = express();
  
  // Initialize Telegram Bot
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not defined');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  console.log('Telegram Bot initialized');

  // Bot State (Simple in-memory for session-like behavior)
  const userStates: { [key: number]: { step: string; data?: any } } = {};

  // Bot Commands
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Halo! Saya adalah Bot Reminder. Silakan gunakan /login untuk menghubungkan akun Anda.');
  });

  bot.onText(/\/login/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const sheet = await getUsersSheet();
      const rows = await sheet.getRows();
      const existingUser = rows.find(r => r.get('id_telegram') === chatId.toString());

      if (existingUser) {
        bot.sendMessage(chatId, `Anda sudah login sebagai *${existingUser.get('nama_lengkap')}*. \n\nJika ingin mengganti akun, silakan hubungi admin atau gunakan perintah /status untuk melihat detail.`, { parse_mode: 'Markdown' });
        return;
      }

      userStates[chatId] = { step: 'AWAITING_USERNAME' };
      bot.sendMessage(chatId, 'Silakan masukkan username Anda:');
    } catch (error) {
      console.error('Error checking login status:', error);
      bot.sendMessage(chatId, 'Terjadi kesalahan saat memeriksa status login Anda.');
    }
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const sheet = await getUsersSheet();
      const rows = await sheet.getRows();
      const user = rows.find(r => r.get('id_telegram') === chatId.toString());
      
      if (user) {
        bot.sendMessage(chatId, `✅ Akun terhubung!\n\nNama: ${user.get('nama_lengkap')}\nUsername: ${user.get('username')}\n\nAnda akan menerima pengingat di sini.`);
      } else {
        bot.sendMessage(chatId, '❌ Akun belum terhubung. Silakan gunakan /login untuk menghubungkan akun Anda.');
      }
    } catch (error) {
      bot.sendMessage(chatId, 'Terjadi kesalahan saat memeriksa status.');
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const state = userStates[chatId];

    if (!state) return;

    try {
      if (state.step === 'AWAITING_USERNAME') {
        state.data = { username: msg.text };
        state.step = 'AWAITING_PASSWORD';
        bot.sendMessage(chatId, 'Silakan masukkan password Anda:');
      } else if (state.step === 'AWAITING_PASSWORD') {
        const username = state.data.username;
        const password = msg.text;

        const sheet = await getUsersSheet();
        const rows = await sheet.getRows();
        const userRow = rows.find(r => r.get('username') === username && r.get('password') === password);

        if (userRow) {
          userRow.set('id_telegram', chatId.toString());
          await userRow.save();
          
          delete userStates[chatId];
          bot.sendMessage(chatId, `Login berhasil! Halo ${userRow.get('nama_lengkap')}. Anda sekarang akan menerima pengingat di sini.`);
        } else {
          delete userStates[chatId];
          bot.sendMessage(chatId, 'Username atau password salah. Silakan coba /login lagi.');
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses permintaan Anda.');
    }
  });

  // Cron Job to check reminders every minute
  cron.schedule('* * * * *', async () => {
    const timeZone = 'Asia/Jakarta';
    const now = new Date();
    const nowInJakarta = toZonedTime(now, timeZone);
    
    const currentDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
    const currentTime = formatInTimeZone(now, timeZone, 'HH:mm');

    try {
      const jtSheet = await getJTSheet();
      const userSheet = await getUsersSheet();
      
      const jtRows = await jtSheet.getRows();
      const userRows = await userSheet.getRows();

      for (const row of jtRows) {
        let dueDateStr = row.get('jatuh_tempo'); 
        let jamStr = row.get('jam') || '09:00';
        const userId = row.get('user_id');
        const email = row.get('email');
        const sumber = row.get('sumber');

        if (!dueDateStr || !userId) continue;

        // Normalize Date
        try {
          if (dueDateStr.includes('/')) {
            // Handle MM/DD/YYYY or DD/MM/YYYY if spreadsheet formats it
            const parts = dueDateStr.split('/');
            if (parts[0].length === 4) dueDateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          // Ensure it's YYYY-MM-DD
          const parsedDate = parseISO(dueDateStr);
          if (!isNaN(parsedDate.getTime())) {
            dueDateStr = format(parsedDate, 'yyyy-MM-dd');
          }
        } catch (e) {}

        // Normalize Time (HH:mm)
        try {
          const timeParts = jamStr.split(':');
          if (timeParts.length === 2) {
            jamStr = `${timeParts[0].trim().padStart(2, '0')}:${timeParts[1].trim().padStart(2, '0')}`;
          }
        } catch (e) {}

        // Check if date and time match
        if (dueDateStr === currentDate && jamStr === currentTime) {
          console.log(`Match found for ${email} at ${dueDateStr} ${jamStr}`);
          const user = userRows.find(u => u.get('user_id') === userId);
          const telegramId = user?.get('id_telegram');

          if (telegramId) {
            const message = `🔔 *PENGINGAT JATUH TEMPO*\n\n` +
                            `📧 Email: ${email}\n` +
                            `📍 Sumber: ${sumber}\n` +
                            `📅 Tanggal: ${dueDateStr}\n` +
                            `⏰ Jam: ${jamStr}\n\n` +
                            `Segera lakukan pengecekan!`;
            
            bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' })
              .then(() => console.log(`Successfully sent reminder to ${telegramId}`))
              .catch((err) => console.error(`Failed to send reminder to ${telegramId}:`, err.message));
          } else {
            console.log(`No telegram_id found for user ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  // Next.js request handling
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
