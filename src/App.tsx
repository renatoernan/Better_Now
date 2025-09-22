
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Header from './components/public/Header';
import Hero from './components/public/Hero';
import Services from './components/public/Services';
import About from './components/public/About';
import Testimonials from './components/public/Testimonials';
import ContactForm from './components/public/ContactForm';
import Footer from './components/public/Footer';
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminClients from './components/admin/AdminClients';
import AdminEvents from './components/admin/AdminEvents';
import AdminTestimonials from './components/admin/AdminTestimonials';
import AdminSettings from './components/admin/AdminSettings';
import AdminSolicitations from './pages/admin/AdminSolicitations';
import ProtectedRoute from './components/shared/ProtectedRoute';
import WhatsAppButton from './components/public/WhatsAppButton';
import PublicEvents from './components/public/PublicEvents';
import EventDetails from './components/shared/EventDetails';

import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

// Componente da página principal
const HomePage: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 antialiased">
      <Header />
      <main>
        <Hero />
        <Services />
        <About />
        <Testimonials />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Rota principal */}
        <Route path="/" element={<HomePage />} />
        
        {/* Rota pública de eventos */}
        <Route path="/eventos" element={<PublicEvents />} />
        <Route path="/eventos/:id" element={<EventDetails />} />
        
        {/* Rotas administrativas */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="solicitations" element={<AdminSolicitations />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="" element={<AdminDashboard />} />
        </Route>
      </Routes>
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />
      <WhatsAppButton />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SettingsProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
