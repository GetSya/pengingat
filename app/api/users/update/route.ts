import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/google-sheets.ts';

export async function POST(req: Request) {
  try {
    const { user_id, nama_lengkap, password, telegram_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();
    const userRow = rows.find(r => r.get('user_id') === user_id);

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the row
    if (nama_lengkap) userRow.set('nama_lengkap', nama_lengkap);
    if (password) userRow.set('password', password);
    if (telegram_id) userRow.set('telegram_id', telegram_id);

    await userRow.save();

    return NextResponse.json({
      success: true,
      user: {
        user_id: userRow.get('user_id'),
        username: userRow.get('username'),
        nama_lengkap: userRow.get('nama_lengkap'),
        telegram_id: userRow.get('telegram_id'),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
