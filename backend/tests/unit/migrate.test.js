import { diffVersions } from '../../src/scripts/migrate.js';

describe('migration tracker (F5.2)', () => {
  const manifests = [
    { module: 'base', version: '1.0.0', checksum: 'aaa' },
    { module: 'sms', version: '1.0.0', checksum: 'bbb' },
    { module: 'mail', version: '1.1.0', checksum: 'ccc' },
  ];

  test('classifies applied, pending, and drifted modules', () => {
    const recorded = [
      { module: 'base', version: '1.0.0', checksum: 'aaa' },
      { module: 'sms', version: '0.9.0', checksum: 'zzz' },
    ];
    const diff = diffVersions(manifests, recorded);
    expect(diff.find((d) => d.module === 'base').state).toBe('applied');
    expect(diff.find((d) => d.module === 'sms')).toMatchObject({ state: 'drifted', recordedVersion: '0.9.0' });
    expect(diff.find((d) => d.module === 'mail')).toMatchObject({ state: 'pending', recordedVersion: null });
  });

  test('checksum changes flag drift even at equal versions', () => {
    const diff = diffVersions(
      [{ module: 'base', version: '1.0.0', checksum: 'new' }],
      [{ module: 'base', version: '1.0.0', checksum: 'old' }]
    );
    expect(diff[0].state).toBe('drifted');
  });

  test('empty database means everything pending', () => {
    expect(diffVersions(manifests, []).every((d) => d.state === 'pending')).toBe(true);
  });
});
