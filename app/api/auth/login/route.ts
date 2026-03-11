import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/google-sheets.ts';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();
    const userRow = rows.find(r => r.get('username') === username && r.get('password') === password);

    if (userRow) {
      return NextResponse.json({
        success: true,
        user: {
          user_id: userRow.get('user_id'),
          username: userRow.get('username'),
          nama_lengkap: userRow.get('nama_lengkap'),
        }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
