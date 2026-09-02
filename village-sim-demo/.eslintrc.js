module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
    'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    'complexity': ['warn', 15],
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      // Test-specific rules
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off', // Allow require() in tests for migrations
        'max-lines-per-function': 'off', // Tests can be longer
        'complexity': 'off', // Tests can be more complex
      }
    }
  ],
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.config.js']
};
