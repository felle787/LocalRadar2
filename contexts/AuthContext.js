import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from '../database/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadingStatus, setProfileLoadingStatus] = useState('');

  const signup = async (email, password, userType = 'customer') => {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Create user profile in Realtime Database
    await database.ref(`users/${user.uid}`).set({
      email: email,
      userType: userType, // 'customer' or 'business'
      createdAt: new Date().toISOString(),
      followedVenues: [],
      favoriteVenues: []
    });
    
    return userCredential;
  };

  const login = async (email, password) => {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUserProfile(null);
    return auth.signOut();
  };

  useEffect(() => {
    let userUnsubscribe = null;
    let timeoutId = null;
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      // Clean up previous user subscription
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }
      
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (user) {
        setProfileLoadingStatus('Loading profile...');
        
        // Set a timeout to handle slow connections
        timeoutId = setTimeout(() => {
          console.log('Profile loading timeout - creating fallback profile');
          setProfileLoadingStatus('Connection slow, creating profile...');
          
          // Create a fallback profile if loading takes too long
          const fallbackProfile = {
            email: user.email,
            userType: 'customer',
            createdAt: new Date(),
            followedVenues: [],
            favoriteVenues: []
          };
          
          // Try to create the profile in Firebase, but don't wait for it
          database.ref(`users/${user.uid}`).set({
            ...fallbackProfile,
            createdAt: new Date().toISOString()
          }).catch(console.error);
          
          setUserProfile(fallbackProfile);
          setProfileLoadingStatus('');
          setLoading(false);
        }, 8000); // 8 second timeout
        
        // Subscribe to user profile for real-time updates
        const userRef = database.ref(`users/${user.uid}`);
        userUnsubscribe = userRef.on('value', async (snapshot) => {
            // Clear timeout since we got a response
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            if (snapshot.exists()) {
              setUserProfile(snapshot.val());
              setProfileLoadingStatus('');
              setLoading(false);
            } else {
              // Profile doesn't exist - create default profile
              console.log('No user profile found for user:', user.email, '- creating default profile');
              setProfileLoadingStatus('Creating profile...');
              
              try {
                const defaultProfile = {
                  email: user.email,
                  userType: 'customer',
                  createdAt: new Date().toISOString(),
                  followedVenues: [],
                  favoriteVenues: []
                };
                await database.ref(`users/${user.uid}`).set(defaultProfile);
                setUserProfile(defaultProfile);
                setProfileLoadingStatus('');
                setLoading(false);
              } catch (error) {
                console.error('Error creating user profile:', error);
                // If we can't create profile, still allow them to continue
                setUserProfile({
                  email: user.email,
                  userType: 'customer',
                  createdAt: new Date().toISOString(),
                  followedVenues: [],
                  favoriteVenues: []
                });
                setProfileLoadingStatus('');
                setLoading(false);
              }
            }
          }, (error) => {
            console.error('Error fetching user profile:', error);
            
            // Clear timeout since we got an error response
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            // Create a fallback profile on error
            setUserProfile({
              email: user.email,
              userType: 'customer',
              createdAt: new Date().toISOString(),
              followedVenues: [],
              favoriteVenues: []
            });
            setProfileLoadingStatus('');
            setLoading(false);
          });
      } else {
        setUserProfile(null);
        setProfileLoadingStatus('');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsubscribe) {
        database.ref(`users/${currentUser?.uid}`).off('value', userUnsubscribe);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    profileLoadingStatus,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};