/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
    // Transform ESM-only node_modules (chalk v5, ora, boxen, etc.)
    '^.+\\.jsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Resolve chalk v5 subpath imports
    '#ansi-styles': '<rootDir>/node_modules/chalk/source/vendor/ansi-styles/index.js',
    '#supports-color': '<rootDir>/node_modules/chalk/source/vendor/supports-color/index.js',
  },
  // ESM-only packages that must be transformed by ts-jest
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ansi-styles|supports-color|log-symbols|is-unicode-supported|boxen|string-width|strip-ansi|ansi-regex|widest-line|wrap-ansi|emoji-regex|eastasianwidth|camelcase|cli-boxes|ora|cli-spinners|cli-cursor|restore-cursor|onetime|mimic-function|stdin-discarder|is-interactive|get-east-asian-width)/)',
  ],
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__tests__/**',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  testTimeout: 15000,
};
