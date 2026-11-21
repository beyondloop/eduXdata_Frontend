import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salaryPdfBytes } from './salaryPdf.js';

test('PDF embeds image bytes intact with correct object and cross-reference offsets', () => {
  const jpeg = new Uint8Array([255, 216, 0, 128, 10, 13, 255, 217]);
  const pdf = salaryPdfBytes(jpeg, 1684, 2382);
  const text = Buffer.from(pdf).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.endsWith('%%EOF\n'));
  assert.ok(text.includes('/Width 1684 /Height 2382'));
  const start = text.indexOf('stream\n') + 7;
  assert.deepEqual(pdf.slice(start, start + jpeg.length), jpeg);
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xref, xref + 4), 'xref');
  const entries = text.slice(xref).split('\n').slice(3, 8);
  entries.forEach((entry, index) => assert.ok(text.slice(Number(entry.slice(0, 10))).startsWith(`${index + 1} 0 obj`)));
});
