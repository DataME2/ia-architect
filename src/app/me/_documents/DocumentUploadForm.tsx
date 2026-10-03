'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { uploadDocumentAction } from './actions.ts';

/** Send one missing document (BR165): a PDF, or a photo of the page. */
export function DocumentUploadForm({
  clubId,
  registrationId,
  documentId,
  documentType,
}: {
  readonly clubId: string;
  readonly registrationId: string;
  readonly documentId: string;
  readonly documentType: string;
}) {
  const [state, action, pending] = useActionState(uploadDocumentAction, IDLE_FORM);
  const id = `doc-${documentId}`;
  return (
    <form action={action} className="stack" style={{ gap: '0.4rem' }}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="documentType" value={documentType} />
      <label htmlFor={id}>{documentType}</label>
      <input id={id} name="file" type="file" accept="application/pdf,image/jpeg,image/png" capture="environment" />
      <FormNotice result={state} />
      <div>
        <button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  );
}
