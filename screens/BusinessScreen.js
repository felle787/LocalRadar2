import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/BusinessScreenStyles';

export default function BusinessScreen() {
  // Autentifiseringskontekst
  const { currentUser, logout } = useAuth();
  // Tilstand for indlæsning af data
  const [loading, setLoading] = useState(false);
  // Tilstand for gemning af virksomhedsdata
  const [saving, setSaving] = useState(false);

  // Foruddefinerede kategorier - hovedkategorier for virksomhedstyp
  const PRIMARY_CATEGORIES = [
    'Bar', 'Restaurant', 'Pub', 'Club', 'Cafe', 'Brewery', 'Lounge', 
    'Wine Bar', 'Cocktail Bar', 'Sports Bar', 'Rooftop Bar', 'Hotel Bar', 'Store'
  ];
  
  // Aktivitetskategorier - specifikke tilbud og aktiviteter
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

  // Formularfelter - tilstandsvariabler for virksomhedsdata
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locationText, setLocationText] = useState('');
  const [type, setType] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [venueImage, setVenueImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  // UI tilstand for dropdown-menuer
  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);

  // Indlæs eksisterende virksomhedsdata ved komponentstart
  useEffect(() => {
    if (!currentUser) return;
    
    // Indlæs virksomhedsdata i baggrunden uden at blokere formularen
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
        // Fortsæt med tom formular
      });
  }, [currentUser]);

  // Gemmer virksomhedsdata til Firebase med validering og geocoding
  const onSave = async () => {
    // Tjekker om brugeren er logget ind
    if (!currentUser) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    // Validerer at virksomhedsnavn er udfyldt
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a business name.');
      return;
    }

    // Validerer at adresse er udfyldt
    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please enter the venue address.');
      return;
    }

    try {
      setSaving(true);
      
      // Opbygger data payload med alle virksomhedsoplysninger
      const payload = {
        ownerId: currentUser.uid,
        name: name.trim(),
        address: address.trim(),
        location: locationText.trim(),
        type: type || 'Bar', // Standardværdi hvis ingen type er valgt
        categories: selectedCategories,
        description: description.trim(),
        imageUrl: venueImage || null, // Base64 billede eller null
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Forsøger at geocode adressen automatisk for at få GPS-koordinater
      let coords = null;
      try {
        const fullAddress = `${address.trim()}, ${locationText.trim()}`;
        const geocodedLocation = await Location.geocodeAsync(fullAddress);
        
        // Hvis geocoding lykkes, gem koordinaterne
        if (geocodedLocation && geocodedLocation.length > 0) {
          coords = {
            latitude: geocodedLocation[0].latitude,
            longitude: geocodedLocation[0].longitude
          };
          console.log(`Geocoded address "${fullAddress}" to:`, coords);
        }
      } catch (geocodeError) {
        // Hvis geocoding fejler, fortsætter vi uden koordinater
        console.log('Geocoding failed:', geocodeError.message);
      }

      // Tilføjer koordinater til payload hvis de er fundet
      if (coords) {
        payload.coordinates = coords;
      }

      console.log('Saving venue:', payload);
      
      // Gemmer til Firebase med timeout beskyttelse (maks 10 sekunder)
      const savePromise = database.ref(`venues/${currentUser.uid}`).set(payload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 10000)
      );

      // Venter på enten save eller timeout - hvad der sker først
      await Promise.race([savePromise, timeoutPromise]);
      
      // Bekræft gemning og informer brugeren
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

  // Aktiverer/deaktiverer en kategori i listen af valgte kategorier
  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Hvis kategorien allerede er valgt, fjern den
        return prev.filter(c => c !== category);
      } else {
        // Hvis kategorien ikke er valgt, tilføj den
        return [...prev, category];
      }
    });
  };
  
  // Konverterer billede til base64 format til lagring i Firebase Realtime Database
  const uploadImage = async (imageUri) => {
    try {
      console.log('Converting image to base64:', imageUri);
      
      // Henter billedfil fra lokal URI
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      // Konverterer til blob
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size);
      
      // Validerer at filen ikke er tom
      if (blob.size === 0) {
        throw new Error('Image file is empty');
      }
      
      // Tjekker filstørrelse (maks 1MB for at undgå database begrænsninger)
      if (blob.size > 1024 * 1024) {
        throw new Error('Image too large. Please select an image smaller than 1MB.');
      }
      
      // Læser blob som base64 string
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          console.log('Image converted to base64, size:', base64String.length);
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob); // Konverterer til data URL (base64)
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      throw new Error(`Image processing failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Åbner billedvælger og uploader valgt billede til base64
  const pickImage = async () => {
    try {
      // Anmoder om tilladelse til at tilgå mediegalleriet
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Åbner billedvælgeren med 16:9 aspect ratio og 80% kvalitet
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Anbefalet format for business billeder
        quality: 0.8, // 80% kvalitet for at reducere filstørrelse
      });

      // Hvis brugeren har valgt et billede, konverter og gem det
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUploading(true);
        try {
          // Konverterer billede til base64 for lagring i database
          const base64Image = await uploadImage(result.assets[0].uri);
          setVenueImage(base64Image);
          setImageUploading(false);
        } catch (uploadError) {
          setImageUploading(false);
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', uploadError.message || 'Failed to upload image');
        }
      }
    } catch (error) {
      setImageUploading(false);
      Alert.alert('Error', 'Failed to pick image');
      console.log('Image picker error:', error);
    }
  };
  
  // Lukker alle åbne dropdown-menuer
  const closeDropdowns = () => {
    setShowPrimaryDropdown(false);
    setShowCategoriesDropdown(false);
  };
  
  // Håndterer logout med bekræftelsesdialog
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      {/* Overskrift og undertitel */}
      <Text style={styles.title}>My Business</Text>
      <Text style={styles.subtitle}>
        Add your business details
      </Text>

      {/* Virksomhedsnavn input */}
      <Text style={styles.label}>Business Name</Text>
      <TextInput 
        style={styles.input} 
        value={name} 
        onChangeText={setName} 
        placeholder="e.g. Cafe Carl" 
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

      {/* Billede upload sektion */}
      <Text style={styles.label}>Business Image</Text>
      <View style={styles.imageSection}>
        {/* Viser eksisterende billede med mulighed for at ændre det */}
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
        placeholder="e.g. Copenhagen, Aarhus, Odense" 
        placeholderTextColor="#9aa0a6"
        editable={true}
        selectTextOnFocus={true}
      />

      {/* Primær kategori dropdown */}
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
      
      {/* Dropdown liste med primære kategorier */}
      {showPrimaryDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView 
            style={styles.dropdownScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mapper gennem alle primære kategorier */}
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
      
      {/* Aktiviteter og kategorier multi-select dropdown */}
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



      {/* Viser valgte kategorier som tags der kan fjernes */}
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
      
      {/* Beskrivelse input (multiline) */}
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

      {/* Gem knap - deaktiveret under gemning */}
      <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Business'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}



