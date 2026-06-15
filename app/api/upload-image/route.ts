import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('fileToUpload') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const catboxFormData = new FormData();
    catboxFormData.append('reqtype', 'fileupload');
    catboxFormData.append('time', '1h');
    catboxFormData.append('fileToUpload', file);

    const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: catboxFormData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const url = await response.text();
    
    if (url.startsWith('http')) {
      return NextResponse.json({ url });
    } else {
      throw new Error(`Invalid response from Catbox: ${url}`);
    }
  } catch (error: any) {
    console.error('Upload proxy error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
