import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['client/dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'react/jsx-uses-vars': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },
    settings: { react: { version: 'detect' } }
  }
];
