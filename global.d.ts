type Messages = typeof import('./i18n/en.json');

declare global {
  interface IntlMessages extends Messages {}
}
