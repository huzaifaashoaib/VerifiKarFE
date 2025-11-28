import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.log('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Login started for:', email);
      
      // OAuth2 password flow requires application/x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append('username', email.trim()); // OAuth2 uses 'username' field
      formData.append('password', password);
      formData.append('grant_type', 'password');
      
      // Send login request to backend using OAuth2 format
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Login response:', response.status, data);

      if (response.ok) {
        // Success - Store token and user data from the response
        const tokenData = data.details || data;
        
        if (tokenData.access_token) {
          await AsyncStorage.setItem('authToken', tokenData.access_token);
        }
        
        // Store user data
        const userData = {
          email: email,
          // Add any additional user data from backend if available
        };
        
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
        
        console.log('Login successful!');
        return { success: true };
      } else {
        // Server returned an error
        const errorDetail = data.detail || {};
        const errorMessage = errorDetail.details?.message || errorDetail.message || 'Invalid email or password';
        console.log('Login failed:', errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.log('Login error:', error);
      return { 
        success: false, 
        message: 'Unable to connect to the server. Please check your internet connection.' 
      };
    }
  };

  const signup = async (name, email, password) => {
    try {
      console.log('Signup started for:', email);
      
      // Send signup request to backend
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();
      console.log('Signup response:', response.status, data);

      if (response.ok) {
        // Success - Store token and user data
        if (data.access_token) {
          await AsyncStorage.setItem('authToken', data.access_token);
        }
        
        // Store user data (if backend returns user info)
        const userData = {
          user_id: data.user_id || data.id,
          name: name,
          email: email,
          createdAt: new Date().toISOString(),
          ...data.user, // Include any additional user data from backend
        };
        
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
        
        console.log('Signup successful!');
        return { success: true };
      } else {
        // Server returned an error
        const errorMessage = data.detail || data.message || 'Signup failed. Please try again.';
        console.log('Signup failed:', errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.log('Signup error:', error);
      return { 
        success: false, 
        message: 'Unable to connect to the server. Please check your internet connection.' 
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
