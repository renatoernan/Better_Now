
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

// Layout Components (mantidos como imports diretos por serem críticos)
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AdminLayout from './components/layout/AdminLayout';

// Loading Component
import Loading from './components/ui/Loading';

// Lazy Loading Components
const Hero = React.lazy(() => import('./components/features/Hero'));
const Services = React.lazy(() => import('./components/features/Services'));
const About = React.lazy(() => import('./components/features/About'));
const Testimonials = React.lazy(() => import('./components/features/Testimonials'));
const ContactForm = React.lazy(() => import('./components/forms/ContactForm'));
const WhatsAppButton = React.lazy(() => import('./components/ui/WhatsAppButton'));
const PublicEvents = React.lazy(() => import('./components/features/PublicEvents'));
const EventDetails = React.lazy(() => import('./components/features/EventDetails'));

// Admin Components (Lazy Loading)
const AdminLogin = React.lazy(() => import('./components/forms/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./components/features/AdminDashboard'));
const AdminClients = React.lazy(() => import('./components/features/AdminClients'));
const AdminEvents = React.lazy(() => import('./components/features/AdminEvents'));
const AdminTestimonials = React.lazy(() => import('./components/features/AdminTestimonials'));
const AdminSettings = React.lazy(() => import('./components/features/AdminSettings'));
const AdminSolicitations = React.lazy(() => import('./components/features/AdminSolicitations'));

// Shared Components
const ProtectedRoute = React.lazy(() => import('./components/shared/ProtectedRoute'));

// Contexts
import { LanguageProvider } from './shared/contexts/contexts/LanguageContext';
import { AuthProvider } from './shared/contexts/contexts/AuthContext';
import { SettingsProvider } from './shared/contexts/contexts/SettingsContext';

// Loading Fallback Component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <Loading variant="pulse" size="lg" message={message} />
  </div>
);

// Componente da página principal
const HomePage: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 antialiased">
      <Header />
      <main>
        <Suspense fallback={<LoadingFallback message="Carregando página inicial..." />}>
          <Hero />
          <Services />
          <About />
          <Testimonials />
          <ContactForm />
        </Suspense>
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
        <Route 
          path="/" 
          element={
            <Suspense fallback={<LoadingFallback message="Carregando página inicial..." />}>
              <HomePage />
            </Suspense>
          } 
        />
        
        {/* Rota pública de eventos */}
        <Route 
          path="/eventos" 
          element={
            <Suspense fallback={<LoadingFallback message="Carregando eventos..." />}>
              <PublicEvents />
            </Suspense>
          } 
        />
        <Route 
          path="/eventos/:id" 
          element={
            <Suspense fallback={<LoadingFallback message="Carregando detalhes do evento..." />}>
              <EventDetails />
            </Suspense>
          } 
        />
        
        {/* Rotas administrativas */}
        <Route 
          path="/admin/login" 
          element={
            <Suspense fallback={<LoadingFallback message="Carregando login..." />}>
              <AdminLogin />
            </Suspense>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <Suspense fallback={<LoadingFallback message="Carregando área administrativa..." />}>
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            </Suspense>
          }
        >
          <Route 
            path="dashboard" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando dashboard..." />}>
                <AdminDashboard />
              </Suspense>
            } 
          />
          <Route 
            path="clients" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando clientes..." />}>
                <AdminClients />
              </Suspense>
            } 
          />
          <Route 
            path="events" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando eventos..." />}>
                <AdminEvents />
              </Suspense>
            } 
          />
          <Route 
            path="solicitations" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando solicitações..." />}>
                <AdminSolicitations />
              </Suspense>
            } 
          />
          <Route 
            path="testimonials" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando depoimentos..." />}>
                <AdminTestimonials />
              </Suspense>
            } 
          />
          <Route 
            path="settings" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando configurações..." />}>
                <AdminSettings />
              </Suspense>
            } 
          />
          <Route 
            path="" 
            element={
              <Suspense fallback={<LoadingFallback message="Carregando dashboard..." />}>
                <AdminDashboard />
              </Suspense>
            } 
          />
        </Route>
      </Routes>
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />
      <Suspense fallback={null}>
        <WhatsAppButton />
      </Suspense>
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
