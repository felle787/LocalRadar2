import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from '../database/firebase';

// Opretter authentication context til at dele brugerdata gennem hele appen
const AuthContext = createContext();

// Custom hook til at få adgang til auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider component - wrapper der giver adgang til auth state i hele appen
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);           // Firebase auth bruger
  const [userProfile, setUserProfile] = useState(null);           // Brugerprofil fra database
  const [loading, setLoading] = useState(true);                   // Indlæsningsstatus
  const [profileLoadingStatus, setProfileLoadingStatus] = useState(''); // Statusbesked

  // Opretter ny bruger med email og password
  const signup = async (email, password, userType = 'customer') => {
    // Opretter Firebase authentication bruger
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Opretter brugerprofil i Realtime Database med standardværdier
    await database.ref(`users/${user.uid}`).set({
      email: email,
      userType: userType, // 'customer' (kunde) eller 'business' (virksomhed)
      createdAt: new Date().toISOString(),
      followedVenues: [],      // Liste over fulgte venues
      favoriteVenues: []       // Liste over favorit venues
    });
    
    return userCredential;
  };

  // Logger bruger ind med email og password
  const login = async (email, password) => {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logger bruger ud og rydder profil data
  const logout = () => {
    setUserProfile(null);
    return auth.signOut();
  };

  // Lytter til auth state ændringer og indlæser brugerprofil
  useEffect(() => {
    let userUnsubscribe = null;  // Holder styr på database subscription
    let timeoutId = null;        // Timeout ID til at håndtere langsomme forbindelser
    
    // Firebase auth state listener - kaldes når bruger logger ind/ud
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      // Rydder tidligere bruger subscription
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }
      
      // Rydder eksisterende timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Hvis bruger er logget ind, indlæs deres profil
      if (user) {
        setProfileLoadingStatus('Loading profile...');
        
        // Sætter timeout til at håndtere langsomme forbindelser (8 sekunder)
        timeoutId = setTimeout(() => {
          console.log('Profile loading timeout - creating fallback profile');
          setProfileLoadingStatus('Connection slow, creating profile...');
          
          // Opretter fallback profil hvis indlæsning tager for lang tid
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
        
        // Subscriber til brugerprofil for real-time opdateringer fra Firebase
        const userRef = database.ref(`users/${user.uid}`);
        userUnsubscribe = userRef.on('value', async (snapshot) => {
            // Rydder timeout da vi fik et svar
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            // Hvis profil eksisterer, brug den
            if (snapshot.exists()) {
              setUserProfile(snapshot.val());
              setProfileLoadingStatus('');
              setLoading(false);
            } else {
              // Profil eksisterer ikke - opret standard profil
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
            
            // Rydder timeout da vi fik en fejlbesked
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            // Opretter fallback profil ved fejl så brugeren kan fortsætte
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
        // Hvis ingen bruger, ryd profil data
        setUserProfile(null);
        setProfileLoadingStatus('');
        setLoading(false);
      }
    });

    // Cleanup funktion - afmelder listeners når component unmountes
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