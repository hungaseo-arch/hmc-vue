import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import a11y from 'eslint-plugin-vuejs-accessibility'

/*
  점검 보고서 P3. 접근성 문제를 사람 눈이 아니라 도구가 잡게 한다.
  vuejs-accessibility 가 alt 누락·라벨 없는 입력·클릭만 되는 div 같은 것을
  빌드 전에 걸러 준다. 이번에 손으로 고친 것들이 다시 새지 않게 하는 장치다.
*/
export default ts.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'src/lib/bibleBooks.ts'] },

  js.configs.recommended,
  ts.configs.recommended,
  vue.configs['flat/recommended'],
  a11y.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      // .vue 안의 <script lang="ts"> 를 TS 파서로 넘긴다.
      parserOptions: { parser: ts.parser },
    },
  },

  {
    rules: {
      // 미정의 식별자는 vue-tsc 가 이미 잡는다. eslint 는 브라우저·Node 전역을
      // 몰라서 window·console 까지 오탐한다.
      'no-undef': 'off',

      // 안 쓰는 변수는 잡되, _ 로 시작하면 의도적으로 버린 것으로 본다.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // 이 저장소는 한 파일에 한 컴포넌트 규칙을 따르고 파일명이 이미
      // PascalCase 다. 페이지 컴포넌트까지 두 단어를 강제할 이유가 없다.
      'vue/multi-word-component-names': 'off',

      // <script setup lang="ts"> 에서는 선택 prop 이 곧 undefined 다.
      // 굳이 기본값을 만들라고 하면 의미 없는 빈 문자열만 늘어난다.
      'vue/require-default-prop': 'off',

      // 기본값은 for(id)와 중첩을 둘 다 요구한다. 둘 중 하나면 화면 낭독기가
      // 라벨을 제대로 읽으므로 하나만 요구한다.
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],

      // 속성 줄바꿈·순서는 취향이라 경고로도 남기지 않는다. 지금 코드와
      // 충돌만 만들고 접근성·버그와는 무관하다.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
    },
  },

  {
    // 빌드 스크립트는 Node 에서 돈다.
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
