import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/google-sheets.ts';

export async function GET() {
  try {
    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();
    const data = rows.map(row => ({
      user_id: row.get('user_id'),
      username: row.get('username'),
      nama_lengkap: row.get('nama_lengkap'),
    }));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
