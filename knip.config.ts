import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Files to exclude from Knip analysis
  ignore: [
    'checkly.config.ts',
    'src/libs/I18n.ts',
    'src/scripts/**',
    'src/types/I18n.ts',
    'tests/**/*.ts',
    '.storybook/**',
    'src/templates/BaseTemplate.stories.tsx',
  ],
  // Dependencies to ignore during analysis
  ignoreDependencies: [
    '@commitlint/types',
    '@swc/helpers', // Avoid error in CI
    'conventional-changelog-conventionalcommits',
    'vite',
    'csv-parse',
    'pdf-parse',
    '@types/pdf-parse',
    '@next/eslint-plugin-next',
    'storybook',
    /@storybook\/.*/,
    'webpack',
  ],
  // Binaries to ignore during analysis
  ignoreBinaries: [
    'production', // False positive raised with dotenv-cli
  ],
  storybook: false,
  rules: {
    exports: 'off',
    types: 'off',
  },
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
};

export default config;
