import { NextResponse } from 'next/server';
import { getJTSheet } from '@/lib/google-sheets.ts';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, sumber, jatuh_tempo, user_id, jam } = body;

    if (!email || !sumber || !jatuh_tempo || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sheet = await getJTSheet();
    
    // Ensure 'jam' header exists
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    if (!headers.includes('jam')) {
      await sheet.setHeaderRow([...headers, 'jam']);
    }

    await sheet.addRow({
      id: uuidv4(),
      email,
      sumber,
      jatuh_tempo,
      user_id,
      jam: jam || '09:00'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sheet = await getJTSheet();
    const rows = await sheet.getRows();
    const data = rows.map(row => ({
      id: row.get('id'),
      email: row.get('email'),
      sumber: row.get('sumber'),
      jatuh_tempo: row.get('jatuh_tempo'),
      user_id: row.get('user_id'),
      jam: row.get('jam'),
    }));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
