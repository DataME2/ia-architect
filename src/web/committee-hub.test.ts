import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_HUB_FILE_BYTES, checkHubFile, isHubKind, isSharePointUrl } from './committee-hub.ts';

describe('checkHubFile', () => {
  it('files a PDF, a Word document or a photo under 4 MB', () => {
    assert.equal(checkHubFile({ type: 'application/pdf', size: 10 }).ok, true);
    assert.deepEqual(
      checkHubFile({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 10 }),
      { ok: true, extension: 'docx' },
    );
  });

  it('refuses an empty file, another type, or one too large', () => {
    assert.equal(checkHubFile({ type: 'application/pdf', size: 0 }).ok, false);
    assert.equal(checkHubFile({ type: 'application/zip', size: 10 }).ok, false);
    assert.equal(checkHubFile({ type: 'application/pdf', size: MAX_HUB_FILE_BYTES + 1 }).ok, false);
  });
});

describe('isSharePointUrl', () => {
  it('accepts the club tenant on sharepoint.com, over https only', () => {
    assert.equal(isSharePointUrl('https://northstarfc.sharepoint.com/sites/Committee/Shared%20Documents'), true);
    assert.equal(isSharePointUrl('http://northstarfc.sharepoint.com/sites/x'), false);
    assert.equal(isSharePointUrl('https://sharepoint.com.evil.test/x'), false);
  });
});

describe('isHubKind', () => {
  it('knows the five kinds', () => {
    assert.equal(isHubKind('minutes'), true);
    assert.equal(isHubKind('memo'), false);
  });
});
