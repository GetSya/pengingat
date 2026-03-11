import { NextResponse } from 'next/server';
import { getJTSheet } from '@/lib/google-sheets.ts';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sheet = await getJTSheet();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);

    if (!row) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    await row.delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { email, sumber, jatuh_tempo, jam } = body;

    const sheet = await getJTSheet();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);

    if (!row) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    if (email) row.set('email', email);
    if (sumber) row.set('sumber', sumber);
    if (jatuh_tempo) row.set('jatuh_tempo', jatuh_tempo);
    if (jam !== undefined) row.set('jam', jam || '09:00');

    await row.save();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
