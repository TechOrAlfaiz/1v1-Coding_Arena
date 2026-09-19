/**
 * AuthContext
 * Provides authentication state to all components.
 * Stores JWT token in localStorage and user info in React state.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

// Global request interceptor to dynamically inject token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('arena_token') || localStorage.getItem('token');
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global response interceptor to handle stale tokens
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('arena_token');
      localStorage.removeItem('arena_user');
      delete axios.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // True while checking stored token

  // On mount: check if there's a stored token and validate it with server
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('arena_token');
      const storedUser = localStorage.getItem('arena_user');

      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Verify with backend to prevent stale user ID across server restarts
          const res = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('arena_user', JSON.stringify(res.data.user));
          }
        } catch (e) {
          localStorage.removeItem('arena_token');
          localStorage.removeItem('arena_user');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register a new account
  const register = async (username, email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      username, email, password,
    });
    const { token, user: userData } = response.data;
    storeAuth(token, userData);
    return userData;
  };

  // Login with existing account
  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email, password,
    });
    const { token, user: userData } = response.data;
    storeAuth(token, userData);
    return userData;
  };

  // Store token and user in localStorage
  const storeAuth = (token, userData) => {
    localStorage.setItem('arena_token', token);
    localStorage.setItem('arena_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  // Update user data (e.g., after ELO changes)
  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('arena_user', JSON.stringify(updated));
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('arena_token');
    localStorage.removeItem('arena_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Get current token
  const getToken = () => localStorage.getItem('arena_token');

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
