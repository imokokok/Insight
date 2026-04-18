import { render, screen, fireEvent } from '@testing-library/react';

import PopularTokens from '../PopularTokens';

describe('PopularTokens',  => {
 const mockOnTokenClick = jest.fn;
 const defaultTokens = ['BTC', 'ETH', 'BNB', 'AVAX', 'MATIC'];

 beforeEach( => {
 jest.clearAllMocks;
 });

 describe('Basic rendering',  => {
 it('shouldallbutton',  => {
 render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

 defaultTokens.forEach((token) => {
 expect(screen.getByText(token)).toBeInTheDocument;
 });
 });

 it('shouldtag',  => {
 render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

 expect(screen.getByText('Popular:')).toBeInTheDocument;
 });

 it('shouldemptylist',  => {
 render(<PopularTokens tokens={[]} onTokenClick={mockOnTokenClick} />);

 expect(screen.getByText('Popular:')).toBeInTheDocument;
 });
 });

 describe('interaction',  => {
 it('clickbuttonshoulduse onTokenClick',  => {
 render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

 const btcButton = screen.getByText('Text');
 fireEvent.click(btcButton);

 expect(mockOnTokenClick).toHaveBeenCalledWith('BTC');
 expect(mockOnTokenClick).toHaveBeenCalledTimes(1);
 });

 it('clickdifferentshouldparameter',  => {
 render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

 fireEvent.click(screen.getByText('Text'));
 expect(mockOnTokenClick).toHaveBeenCalledWith('ETH');

 fireEvent.click(screen.getByText('Text'));
 expect(mockOnTokenClick).toHaveBeenCalledWith('MATIC');

 expect(mockOnTokenClick).toHaveBeenCalledTimes(2);
 });
 });

 describe('style',  => {
 it('buttonshouldhavestyleclass',  => {
 render(<PopularTokens tokens={['BTC']} onTokenClick={mockOnTokenClick} />);

 const button = screen.getByText('Text');
 expect(button).toHaveClass('flex-shrink-0');
 expect(button).toHaveClass('rounded-full');
 });
 });
});
