const makeConfig = require('../../app.config');
const { expo } = require('../../app.json');

function withVariant(variant, fn) {
  const before = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;else process.env.APP_VARIANT = variant;
  try {
    return fn(makeConfig({ config: JSON.parse(JSON.stringify(expo)) }));
  } finally {
    if (before === undefined) delete process.env.APP_VARIANT;else process.env.APP_VARIANT = before;
  }
}
const devClient = c => c.plugins.find(p => Array.isArray(p) && p[0] === 'expo-dev-client');

test('store_build_keeps_its_identity_and_drops_the_dev_client_scheme', () => withVariant(undefined, c => {
  expect(c.android.package).toBe('kr.co.woorimalcontest.app');
  expect(c.scheme).toBe('woorimal');
  expect(c.name).toBe('우리말 곳간');
  expect(devClient(c)).toEqual(['expo-dev-client', { addGeneratedScheme: false }]);
}));

test('development_build_uses_its_own_package_and_scheme_so_both_can_be_installed', () => withVariant('development', c => {
  expect(c.android.package).toBe('kr.co.woorimalcontest.app.dev');
  expect(c.scheme).toBe('woorimal-dev');
  expect(c.name).toBe('우리말 곳간 (개발)');
  expect(devClient(c)).toBeUndefined();
}));
