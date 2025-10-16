import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function BusinessScreen() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields with simple state management
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locationText, setLocationText] = useState('');
  const [type, setType] = useState('');
  const [categories, setCategories] = useState('');
  const [description, setDescription] = useState('');

  // Load existing venue data only once on mount, without blocking
  useEffect(() => {
    if (!currentUser) return;
    
    // Try to load existing venue in background, don't block the form
    database.ref(`venues/${currentUser.uid}`).once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setName(data.name || '');
          setAddress(data.address || '');
          setLocationText(data.location || '');
          setType(data.type || '');
          setCategories(Array.isArray(data.categories) ? data.categories.join(', ') : (data.categories || ''));
          setDescription(data.description || '');
        }
      })
      .catch(error => {
        console.log('Could not load venue data:', error.message);
        // Just continue with empty form
      });
  }, [currentUser]);

  const onSave = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a venue name.');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please enter the venue address.');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        ownerId: currentUser.uid,
        name: name.trim(),
        address: address.trim(),
        location: locationText.trim(),
        type: type.trim() || 'Bar',
        categories: categories.trim() ? categories.split(',').map(c => c.trim()).filter(Boolean) : [],
        description: description.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Attempt to geocode the address automatically
      let coords = null;
      try {
        const fullAddress = `${address.trim()}, ${locationText.trim()}`;
        const geocodedLocation = await Location.geocodeAsync(fullAddress);
        
        if (geocodedLocation && geocodedLocation.length > 0) {
          coords = {
            latitude: geocodedLocation[0].latitude,
            longitude: geocodedLocation[0].longitude
          };
          console.log(`Geocoded address "${fullAddress}" to:`, coords);
        }
      } catch (geocodeError) {
        console.log('Geocoding failed:', geocodeError.message);
      }

      if (coords) {
        payload.coordinates = coords;
      }

      console.log('Saving venue:', payload);
      
      // Save with timeout protection
      const savePromise = database.ref(`venues/${currentUser.uid}`).set(payload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      
      if (coords) {
        Alert.alert('Success!', 'Your venue has been saved and will appear on the map for customers to find!');
      } else {
        Alert.alert('Venue Saved', 'Your venue has been saved, but we couldn\'t determine its location. Add coordinates manually to make it appear on the map.');
      }
    } catch (error) {
      console.error('Save error:', error);
      if (error.message.includes('timed out')) {
        Alert.alert('Connection Timeout', 'The save is taking too long. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Could not save venue. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Venue</Text>
      <Text style={styles.subtitle}>
        Add your venue details
      </Text>

      <Text style={styles.label}>Venue Name</Text>
      <TextInput 
        style={styles.input} 
        value={name} 
        onChangeText={setName} 
        placeholder="e.g. Blue Note" 
        placeholderTextColor="#9aa0a6"
        editable={true}
        selectTextOnFocus={true}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput 
        style={styles.input} 
        value={address} 
        onChangeText={setAddress} 
        placeholder="Street, Number, City" 
        placeholderTextColor="#9aa0a6"
        editable={true}
        selectTextOnFocus={true}
      />

      <Text style={styles.label}>Location (Area/City)</Text>
      <TextInput 
        style={styles.input} 
        value={locationText} 
        onChangeText={setLocationText} 
        placeholder="e.g. Soho, NYC" 
        placeholderTextColor="#9aa0a6"
        editable={true}
        selectTextOnFocus={true}
      />

      <Text style={styles.label}>Primary Category</Text>
      <TextInput 
        style={styles.input} 
        value={type} 
        onChangeText={(text) => {
          console.log('Type input changed:', text);
          setType(text);
        }}
        placeholder="Bar, Restaurant, Club, Cafe, Pub" 
        placeholderTextColor="#9aa0a6"
        autoCapitalize="words"
        autoCorrect={false}
        editable={true}
        selectTextOnFocus={true}
      />
      
      <Text style={styles.label}>Categories (comma-separated)</Text>
      <TextInput 
        style={styles.input} 
        value={categories} 
        onChangeText={(text) => {
          console.log('Categories input changed:', text);
          setCategories(text);
        }}
        placeholder="e.g. Live Music, Craft Beer" 
        placeholderTextColor="#9aa0a6"
        autoCapitalize="words"
        autoCorrect={false}
        editable={true}
        selectTextOnFocus={true}
      />



      <Text style={styles.label}>Description</Text>
      <TextInput 
        style={[styles.input, styles.multiline]} 
        value={description} 
        onChangeText={setDescription} 
        placeholder="Short description" 
        placeholderTextColor="#9aa0a6" 
        multiline 
        numberOfLines={4}
        editable={true}
        selectTextOnFocus={true}
      />

      <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Venue'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0c',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#c9c9ce',
    marginBottom: 16,
  },
  label: {
    color: '#c9c9ce',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#1a1a1e',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b2b31',
  },
  multiline: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0c',
  },
  loadingText: {
    color: '#e0e0ff',
    marginTop: 8,
  },
});

