const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Use node environment by default (can be overridden per file)
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  // Transform TypeScript and JSX files
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['next/dist/build/swc/jest-transformer.js', {}],
  },
  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(isomorphic-dompurify|parse5|jsdom|entities)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
