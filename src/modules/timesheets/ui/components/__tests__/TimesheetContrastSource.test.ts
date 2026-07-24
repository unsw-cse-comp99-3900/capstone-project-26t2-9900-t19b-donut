import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const pageSource = readFileSync(resolve(root, 'src/modules/timesheets/ui/TimesheetPage.tsx'), 'utf8');
const badgeSource = readFileSync(resolve(root, 'src/modules/timesheets/ui/components/TimesheetStatusBadge.tsx'), 'utf8');

describe('timesheet text contrast', () => {
  it('does not dim meaningful status text below the accessible palette', () => {
    expect(pageSource).toContain('text-muted-foreground mr-1');
    expect(pageSource).not.toContain('text-muted-foreground/40 mr-1');
    expect(pageSource).not.toMatch(/data-\[state=on\]:text-(?:amber|emerald|rose)-500/);
    expect(badgeSource).not.toMatch(/text-(?:slate|sky|emerald|rose|red|indigo|amber)-(?:400|500)/);
    expect(badgeSource).not.toContain('text-white/40');
  });

  it('uses a compact status selector on mobile', () => {
    expect(pageSource).toContain('aria-label="Filter timesheets by status"');
    expect(pageSource).toContain('className="md:hidden"');
    expect(pageSource).toContain('className="hidden md:flex');
  });
});
