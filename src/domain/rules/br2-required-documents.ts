import { fail, pass, type RegistrationRule } from './types.ts';

/**
 * BR2 — a registration cannot be COMPLETE with a required document missing.
 *
 * Names the missing types in the message. "Documents incomplete" sends a
 * guardian back to guess; "birth certificate is missing" does not, and the
 * difference is the re-loop BR55 and this rule both exist to remove.
 */
export const br2RequiredDocuments: RegistrationRule = {
  id: 'BR2',
  summary: 'Every required document is attached',
  evaluate: ({ registration }) => {
    const provided = new Set(registration.providedDocumentTypes);
    const missing = registration.requiredDocumentTypes.filter((t) => !provided.has(t));
    return missing.length === 0
      ? pass('BR2', 'All required documents are attached.')
      : fail('BR2', `Still needed: ${missing.join(', ')}.`);
  },
};
