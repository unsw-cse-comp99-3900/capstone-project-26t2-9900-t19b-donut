import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../../..');
const domain = 'capstone-project-26t2-9900-t19b-don.vercel.app';
const appId = '2V86F43APL.com.shiftopia.app';

describe('iOS Universal Links configuration', () => {
  it('associates release builds with the production domain without requiring it for debug signing', () => {
    const entitlements = readFileSync(
      resolve(root, 'ios/App/App/App.entitlements'),
      'utf8',
    );
    const project = readFileSync(
      resolve(root, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8',
    );

    expect(entitlements).toContain(`<string>applinks:${domain}</string>`);

    const debugConfiguration = project.match(
      /504EC3171FED79650016851F \/\* Debug \*\/ = \{.*?name = Debug;\s+\};/s,
    )?.[0];
    const releaseConfiguration = project.match(
      /504EC3181FED79650016851F \/\* Release \*\/ = \{.*?name = Release;\s+\};/s,
    )?.[0];

    expect(debugConfiguration).toBeDefined();
    expect(debugConfiguration).not.toContain('CODE_SIGN_ENTITLEMENTS');
    expect(releaseConfiguration).toContain(
      'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;',
    );
    expect(project).not.toContain('com.apple.Push');
  });

  it('publishes an AASA rule for shared shift paths', () => {
    const aasa = JSON.parse(readFileSync(
      resolve(root, 'public/.well-known/apple-app-site-association'),
      'utf8',
    ));

    expect(aasa.applinks.details[0].appIDs).toContain(appId);
    expect(aasa.applinks.details[0].components).toContainEqual(
      expect.objectContaining({ '/': '/shifts/*' }),
    );
  });

  it('serves the extensionless AASA file as JSON on Vercel', () => {
    const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
    const aasaHeaders = vercel.headers.find(
      (entry: { source: string }) =>
        entry.source === '/.well-known/apple-app-site-association',
    );

    expect(aasaHeaders?.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/json',
    });
  });
});
