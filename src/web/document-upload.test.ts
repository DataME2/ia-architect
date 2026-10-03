import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_DOCUMENT_BYTES, checkDocumentFile, documentPath } from './document-upload.ts';

describe('checkDocumentFile', () => {
  it('accepts a PDF, a JPEG or a PNG under the limit', () => {
    assert.deepEqual(checkDocumentFile({ type: 'application/pdf', size: 1000 }), { ok: true, extension: 'pdf' });
    assert.equal(checkDocumentFile({ type: 'image/jpeg', size: 1000 }).ok, true);
  });

  it('refuses an empty file, another type, or one too large', () => {
    assert.equal(checkDocumentFile({ type: 'application/pdf', size: 0 }).ok, false);
    assert.equal(checkDocumentFile({ type: 'application/zip', size: 10 }).ok, false);
    assert.equal(checkDocumentFile({ type: 'image/png', size: MAX_DOCUMENT_BYTES + 1 }).ok, false);
  });
});

describe('documentPath', () => {
  it('files under the club, then the registration — the two segments the policy checks', () => {
    assert.equal(documentPath('c', 'r', 'Birth certificate', 7, 'pdf'), 'c/r/birth-certificate-7.pdf');
    assert.equal(documentPath('c', 'r', '../../x', 7, 'pdf'), 'c/r/x-7.pdf');
  });
});
