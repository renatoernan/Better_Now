import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input Component', () => {
  it('renders correctly', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('handles value changes', async () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays placeholder text', () => {
    render(<Input placeholder="Enter text here" />);
    
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  it('applies error styles when error prop is true', () => {
    render(<Input error={true} data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-red-500');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled={true} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('disabled');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles different input types', () => {
    render(<Input type="email" data-testid="email-input" />);
    
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('handles focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });

  it('supports controlled input', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('');
      return (
        <Input 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          data-testid="controlled-input"
        />
      );
    };
    
    render(<TestComponent />);
    
    const input = screen.getByTestId('controlled-input') as HTMLInputElement;
    expect(input.value).toBe('');
    
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(input.value).toBe('new value');
  });
});