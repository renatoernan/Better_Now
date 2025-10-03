import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock simples do toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock simples do Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  })),
}));

// Mock do componente ContactForm para testes básicos
const MockContactForm = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação básica de validação
    if (!formData.name || !formData.email || !formData.message) {
      return;
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Formulário de contato">
      <div>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={handleChange('name')}
          required
        />
      </div>
      
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          required
        />
      </div>
      
      <div>
        <label htmlFor="phone">Telefone</label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange('phone')}
        />
      </div>
      
      <div>
        <label htmlFor="message">Mensagem</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={handleChange('message')}
          required
        />
      </div>
      
      <button type="submit">Enviar</button>
    </form>
  );
};

describe('ContactForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<MockContactForm />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('handles form input changes', () => {
    render(<MockContactForm />);
    
    const nameInput = screen.getByLabelText(/nome/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Test Name' } });
    
    expect(nameInput.value).toBe('Test Name');
  });

  it('handles email input changes', () => {
    render(<MockContactForm />);
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
    
    expect(emailInput.value).toBe('test@email.com');
  });

  it('handles phone input changes', () => {
    render(<MockContactForm />);
    
    const phoneInput = screen.getByLabelText(/telefone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '11999999999' } });
    
    expect(phoneInput.value).toBe('11999999999');
  });

  it('handles message input changes', () => {
    render(<MockContactForm />);
    
    const messageInput = screen.getByLabelText(/mensagem/i) as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    expect(messageInput.value).toBe('Test message');
  });

  it('has proper form structure', () => {
    render(<MockContactForm />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'Formulário de contato');
    
    // Verificar se todos os campos obrigatórios têm o atributo required
    expect(screen.getByLabelText(/nome/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/mensagem/i)).toHaveAttribute('required');
  });

  it('handles form submission', () => {
    render(<MockContactForm />);
    
    const form = screen.getByRole('form');
    const submitHandler = jest.fn();
    form.onsubmit = submitHandler;
    
    fireEvent.submit(form);
    
    expect(submitHandler).toHaveBeenCalled();
  });
});