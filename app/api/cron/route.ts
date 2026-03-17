import { NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { getUsersSheet, getJTSheet } from '@/lib/google-sheets';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Optional: Check for a secret key to prevent unauthorized triggers
  // const { searchParams } = new URL(request.url);
  // if (searchParams.get('key') !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bot token not found' }, { status: 500 });
  }

  const bot = new TelegramBot(token);
  const timeZone = 'Asia/Jakarta';
  const now = new Date();
  
  const currentDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
  const currentTime = formatInTimeZone(now, timeZone, 'HH:mm');

  console.log(`Cron triggered at ${currentDate} ${currentTime}`);

  try {
    const jtSheet = await getJTSheet();
    const userSheet = await getUsersSheet();
    
    const jtRows = await jtSheet.getRows();
    const userRows = await userSheet.getRows();

    let sentCount = 0;

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
          const parts = dueDateStr.split('/');
          if (parts[0].length === 4) dueDateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
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
        const user = userRows.find(u => u.get('user_id') === userId);
        const telegramId = user?.get('id_telegram');

        if (telegramId) {
          const message = `🔔 *PENGINGAT JATUH TEMPO*\n\n` +
                          `📧 Email: ${email}\n` +
                          `📍 Sumber: ${sumber}\n` +
                          `📅 Tanggal: ${dueDateStr}\n` +
                          `⏰ Jam: ${jamStr}\n\n` +
                          `Segera lakukan pengecekan!`;
          
          await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
          sentCount++;
        }
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (error: any) {
    console.error('Cron route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
