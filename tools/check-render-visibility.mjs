import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

// Check actual rendered pixels: animation telemetry can pass behind a broken outline shader.
export async function assertLightRoomVisible(filename) {
  const png = await readFile(filename);
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(png[24], 8);
  const channels = png[25] === 6 ? 4 : png[25] === 2 ? 3 : 0;
  assert.ok(channels, 'Expected an RGB screenshot');
  const chunks = [];
  for (let p = 8; p < png.length;) {
    const length = png.readUInt32BE(p);
    if (png.toString('ascii', p + 4, p + 8) === 'IDAT') chunks.push(png.subarray(p + 8, p + 8 + length));
    p += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  let previous = Buffer.alloc(stride), offset = 0, dark = 0;
  const paeth = (a,b,c) => {const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;};
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++], row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a=x>=channels?row[x-channels]:0,b=previous[x],c=x>=channels?previous[x-channels]:0;
      row[x]=(raw[offset++]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;
    }
    for(let x=0;x<stride;x+=channels)if(row[x]+row[x+1]+row[x+2]<30)dark++;
    previous=row;
  }
  const fraction=dark/(width*height);
  assert.ok(fraction<.25, `Room obscured by dark geometry: ${(fraction*100).toFixed(1)}% black pixels`);
  return {darkFraction:fraction,width,height};
}
