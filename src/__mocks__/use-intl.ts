export const useIntl = () => ({
  formatMessage: ({ id }: { id: string }) => id,
  formatDate: () => '',
  formatNumber: () => '',
  formatTime: () => '',
  formatRelativeTime: () => '',
});

export const IntlProvider = ({ children }: { children: React.ReactNode }) => children;

const useIntlMock = {
  useIntl,
  IntlProvider,
};

export default useIntlMock;
