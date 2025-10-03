import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Fechar modal');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies custom size class', () => {
    render(<Modal {...defaultProps} size="lg" />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-w-2xl');
  });

  it('does not render close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);
    
    expect(screen.queryByLabelText('Fechar modal')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Modal {...defaultProps} className="custom-class" />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<Modal {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});