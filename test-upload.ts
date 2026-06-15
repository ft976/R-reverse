import * as fs from 'fs';

async function test() {
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

    const res = await fetch('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData
    });
    const text = await res.text();
    console.log('upload body:', text);
  } catch (e) {
    console.error(e);
  }
}
test();
