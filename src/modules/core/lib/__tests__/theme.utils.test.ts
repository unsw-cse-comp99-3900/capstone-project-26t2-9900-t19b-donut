import { describe, expect, it } from 'vitest';
import { getBrandColorTokens } from '../theme.utils';

describe('brand color theme tokens', () => {
  it('chooses an accessible foreground for light and dark brand colors', () => {
    expect(getBrandColorTokens('#A48AFB')?.foreground).toBe('0 0% 0%');
    expect(getBrandColorTokens('#4F46E5')?.foreground).toBe('0 0% 100%');
    expect(getBrandColorTokens('invalid')).toBeNull();
  });
});
