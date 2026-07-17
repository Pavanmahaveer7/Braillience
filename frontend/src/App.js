import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import About from './components/About';
import Upload from './components/Upload';
import VoiceTutor from './components/VoiceTutor';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Braillience...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={user ? <Dashboard /> : <Home />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/about" element={<About />} />
          <Route path="/upload" element={user ? <Upload /> : <Navigate to="/login" />} />
          <Route path="/voice" element={user ? <VoiceTutor /> : <Navigate to="/login" />} />
        </Routes>
      </main>
      <Footer />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
