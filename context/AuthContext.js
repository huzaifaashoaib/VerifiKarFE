import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

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
      // Mock authentication - remove this when you have a real backend
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user exists in local storage
      const existingUsers = await AsyncStorage.getItem('registeredUsers');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      
      const foundUser = users.find(u => u.email === email && u.password === password);
      
      if (foundUser) {
        const { password: _, ...userWithoutPassword } = foundUser;
        const token = 'mock-token-' + Date.now();
        
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userWithoutPassword));
        setUser(userWithoutPassword);
        return { success: true };
      } else {
        return { success: false, message: 'Invalid email or password' };
      }
    } catch (error) {
      return { success: false, message: 'An error occurred. Please try again.' };
    }
  };

  const signup = async (name, email, password) => {
    try {
      console.log('Signup started for:', email);
      
      // Mock authentication - remove this when you have a real backend
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if email already exists
      const existingUsers = await AsyncStorage.getItem('registeredUsers');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      
      console.log('Existing users count:', users.length);
      
      if (users.find(u => u.email === email)) {
        console.log('Email already exists');
        return { success: false, message: 'Email already registered' };
      }

      // Create new user with unique ID
      const newUser = {
        user_id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name,
        email,
        password, // In real app, this would be hashed on backend
        createdAt: new Date().toISOString(),
      };

      console.log('Creating new user with ID:', newUser.user_id);

      // Save to local storage
      users.push(newUser);
      await AsyncStorage.setItem('registeredUsers', JSON.stringify(users));

      // Login the user
      const { password: _, ...userWithoutPassword } = newUser;
      const token = 'mock-token-' + Date.now();
      
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      
      console.log('Signup successful!');
      return { success: true };
    } catch (error) {
      console.log('Signup error:', error);
      return { success: false, message: 'An error occurred: ' + error.message };
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
