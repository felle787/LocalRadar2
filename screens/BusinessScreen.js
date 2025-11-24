import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function BusinessScreen() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Predefined categories
  const PRIMARY_CATEGORIES = [
    'Bar', 'Restaurant', 'Pub', 'Club', 'Cafe', 'Brewery', 'Lounge', 
    'Wine Bar', 'Cocktail Bar', 'Sports Bar', 'Rooftop Bar', 'Hotel Bar', 'Store'
  ];
  
  const ACTIVITY_CATEGORIES = [
    'Live Music', 'DJ Sets', 'Karaoke', 'Quiz Night', 'Board Games', 
    'Pool/Billiards', 'Darts', 'Open Mic', 'Comedy Show', 'Trivia', 
    'Dance Floor', 'Live Sports', 'Wine Tasting', 'Craft Beer', 
    'Cocktail Specials', 'Happy Hour', 'Outdoor Seating', 'Rooftop', 
    'Private Events', 'Corporate Events', 'Birthday Parties', 'Live Band', 
    'Acoustic Music', 'Jazz Music', 'Rock Music', 'Electronic Music',
    'Food Specials', 'Brunch', 'Late Night', 'Themed Nights', 
    'Student Discounts', 'Group Bookings', 'VIP Area', 'Smoking Area',
    'Clothes', 'Food & Groceries', 'Electronics', 'Books', 'Home & Garden',
    'Beauty & Health', 'Sports & Fitness', 'Toys & Games', 'Outlet',
    'Sale', 'Vintage', 'Handmade', 'Local Products', 'Organic', 'Tech Repair'
  ];

  // Form fields with simple state management
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locationText, setLocationText] = useState('');
  const [type, setType] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [venueImage, setVenueImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  // UI state for dropdowns
  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);

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
          setSelectedCategories(Array.isArray(data.categories) ? data.categories : []);
          setDescription(data.description || '');
          setVenueImage(data.imageUrl || null);
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
      Alert.alert('Missing Name', 'Please enter a business name.');
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
        type: type || 'Bar',
        categories: selectedCategories,
        description: description.trim(),
        imageUrl: venueImage || null,
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
        Alert.alert('Business Saved', 'Your business has been saved, but we couldn\'t determine its location. Add coordinates manually to make it appear on the map.');
      }
    } catch (error) {
      console.error('Save error:', error);
      if (error.message.includes('timed out')) {
        Alert.alert('Connection Timeout', 'The save is taking too long. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Could not save business. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUploading(true);
        // In a real app, you'd upload to Firebase Storage here
        // For now, we'll just store the local URI
        setVenueImage(result.assets[0].uri);
        setImageUploading(false);
      }
    } catch (error) {
      setImageUploading(false);
      Alert.alert('Error', 'Failed to pick image');
      console.log('Image picker error:', error);
    }
  };
  
  // Close dropdowns when touching outside
  const closeDropdowns = () => {
    setShowPrimaryDropdown(false);
    setShowCategoriesDropdown(false);
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Business</Text>
      <Text style={styles.subtitle}>
        Add your business details
      </Text>

      <Text style={styles.label}>Business Name</Text>
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

      <Text style={styles.label}>Business Image</Text>
      <View style={styles.imageSection}>
        {venueImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: venueImage }} style={styles.venueImage} />
            <TouchableOpacity 
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={imageUploading}
            >
              <Text style={styles.changeImageText}>
                {imageUploading ? 'Uploading...' : 'Change Image'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addImageButton}
            onPress={pickImage}
            disabled={imageUploading}
          >
            <Text style={styles.addImageText}>
              {imageUploading ? 'Uploading...' : '+ Add Business Image'}
            </Text>
            <Text style={styles.addImageSubtext}>
              Recommended: 16:9 aspect ratio
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
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
      <TouchableOpacity 
        style={styles.dropdown}
        onPress={() => setShowPrimaryDropdown(!showPrimaryDropdown)}
      >
        <Text style={[styles.dropdownText, !type && styles.placeholderText]}>
          {type || 'Select primary category'}
        </Text>
        <Text style={styles.dropdownArrow}>{showPrimaryDropdown ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {showPrimaryDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView 
            style={styles.dropdownScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {PRIMARY_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.dropdownItem, type === category && styles.dropdownItemSelected]}
                onPress={() => {
                  setType(category);
                  setShowPrimaryDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, type === category && styles.dropdownItemTextSelected]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <Text style={styles.label}>Categories & Activities</Text>
      <TouchableOpacity 
        style={styles.dropdown}
        onPress={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
      >
        <Text style={[styles.dropdownText, selectedCategories.length === 0 && styles.placeholderText]}>
          {selectedCategories.length === 0 
            ? 'Select categories & activities'
            : `${selectedCategories.length} selected: ${selectedCategories.slice(0, 2).join(', ')}${selectedCategories.length > 2 ? '...' : ''}`
          }
        </Text>
        <Text style={styles.dropdownArrow}>{showCategoriesDropdown ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {showCategoriesDropdown && (
        <View style={styles.dropdownList}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Select Categories</Text>
            <TouchableOpacity 
              style={styles.dropdownCloseButton}
              onPress={() => setShowCategoriesDropdown(false)}
            >
              <Text style={styles.dropdownCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.dropdownScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {ACTIVITY_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.dropdownItem, selectedCategories.includes(category) && styles.dropdownItemSelected]}
                onPress={() => toggleCategory(category)}
              >
                <Text style={[styles.dropdownItemText, selectedCategories.includes(category) && styles.dropdownItemTextSelected]}>
                  {category}
                </Text>
                {selectedCategories.includes(category) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}



      {selectedCategories.length > 0 && (
        <View style={styles.selectedCategoriesContainer}>
          <Text style={styles.selectedCategoriesTitle}>Selected Categories:</Text>
          <View style={styles.selectedCategoriesTags}>
            {selectedCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.categoryTag}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.categoryTagText}>{category}</Text>
                <Text style={styles.categoryTagRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
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
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Business'}</Text>
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
  dropdown: {
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b2b31',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: '#9aa0a6',
  },
  dropdownArrow: {
    color: '#9aa0a6',
    fontSize: 16,
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#1a1a1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b2b31',
    marginTop: 4,
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownScrollView: {
    maxHeight: 180,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b31',
    backgroundColor: '#2b2b31',
  },
  dropdownHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownCloseButton: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dropdownCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2b2b31',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  dropdownItemSelected: {
    backgroundColor: '#0084ff',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedCategoriesContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  selectedCategoriesTitle: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedCategoriesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTagRemove: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageSection: {
    marginBottom: 16,
  },
  imageContainer: {
    alignItems: 'center',
    gap: 12,
  },
  venueImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#2b2b31',
  },
  changeImageButton: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addImageButton: {
    backgroundColor: '#2b2b31',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#404040',
    borderStyle: 'dashed',
  },
  addImageText: {
    color: '#0084ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addImageSubtext: {
    color: '#9aa0a6',
    fontSize: 12,
  },
});

