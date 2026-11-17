import assert from 'node:assert/strict';
import {flightPhases, flightRectangle} from '../refonte/fall26-hero-flight.js';

const source = {x: 821, y: 391, width: 30, height: 21};
const marker = {left: 48, top: 806, width: 16, height: 16};
const initial = flightPhases(0, 1260, 900);
assert.deepEqual(flightRectangle(source, marker, initial), {
  left: 806, top: 380.5, width: 30, height: 21,
});
const mid = flightPhases(.4, 1080, 900);
const box = flightRectangle(source, marker, mid);
assert.equal(mid.shrink, .5);
assert.ok(box.left > marker.left && box.left < 806);
assert.ok(box.top > 380.5 && box.top < marker.top);
assert.ok(box.width > marker.width && box.width < source.width);
const landed = flightPhases(.76, 900, 900);
assert.deepEqual(flightRectangle(source, marker, landed), marker);
assert.equal(landed.frameAlpha, 0);
assert.ok(flightPhases(.61, 970, 900).frameAlpha < 1);
assert.deepEqual(flightPhases(.4, 1080, 900), mid);
console.log('PASS Shopify flight phases, screen-space endpoints, intermediate picture, and landing fade');
