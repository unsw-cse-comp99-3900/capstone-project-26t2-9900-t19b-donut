import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/platform/i18n';
import { LocaleProvider } from '../LocaleProvider';

vi.mock('@/modules/settings/hooks/useSettings', () => ({
  useSettings: () => ({ orgBranding: null }),
}));

describe('LocaleProvider', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en-GB');
  });

  it('keeps the document language in sync with i18n', async () => {
    render(
      <LocaleProvider>
        <div />
      </LocaleProvider>,
    );

    await act(() => i18n.changeLanguage('fr-FR'));

    expect(document.documentElement.lang).toBe('fr-FR');
  });
});
