import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'src/modules/broadcasts/ui/views/BroadcastNotificationsList.view.tsx'),
  'utf8',
);

describe('BroadcastNotificationsList source safety', () => {
  it('does not crash when broadcast notification display fields are missing', () => {
    expect(source).not.toContain('notification.priority.replace');
    expect(source).toContain("(notification.priority ?? 'normal').replace");
    expect(source).toContain("notification.subject ?? 'Broadcast notification'");
    expect(source).toContain("notification.authorName ?? 'Broadcast system'");
  });
});
