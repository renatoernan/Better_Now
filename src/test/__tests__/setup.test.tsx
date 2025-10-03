import React from 'react';
import { render, screen } from '@testing-library/react';

// Teste simples para verificar se a configuração está funcionando
describe('Test Setup', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello Test</div>;
    
    render(<TestComponent />);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });

  it('should have React available globally', () => {
    expect(React).toBeDefined();
    expect(React.createElement).toBeDefined();
  });
});