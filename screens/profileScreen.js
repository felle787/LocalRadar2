import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  ScrollView,
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firebase from 'firebase/compat/app';
import { db } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { profileScreenStyles } from '../styles/profileScreenStyles';

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const [userVenues, setUserVenues] = useState([]);
  const [totalVenues, setTotalVenues] = useState(0);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenue, setNewVenue] = useState({
    name: '',
    type: 'Bar',
    location: ''
  });

  const venueTypes = ['Bar', 'Restaurant', 'Club', 'Cafe', 'Pub'];

  useEffect(() => {
    if (currentUser) {
      // Subscribe to user's venues
      const unsubscribe = db.collection('venues')
        .where('createdBy', '==', currentUser.uid)
        .onSnapshot((querySnapshot) => {
          const venuesList = [];
          querySnapshot.forEach((doc) => {
            venuesList.push({ id: doc.id, ...doc.data() });
          });
          setUserVenues(venuesList);
        });

      // Get total venues count
      const totalUnsubscribe = db.collection('venues')
        .onSnapshot((querySnapshot) => {
          setTotalVenues(querySnapshot.size);
        });

      return () => {
        unsubscribe();
        totalUnsubscribe();
      };
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const handleAddVenue = async () => {
    if (!newVenue.name.trim() || !newVenue.location.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await db.collection('venues').add({
        name: newVenue.name.trim(),
        type: newVenue.type,
        location: newVenue.location.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.uid
      });
      
      setNewVenue({ name: '', type: 'Bar', location: '' });
      setShowAddVenue(false);
      Alert.alert('Success', 'Venue added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add venue');
    }
  };

  const stats = {
    following: userVenues.length,
    favorites: Math.floor(userVenues.length * 0.6), // Sample data
    events: totalVenues,
  };

  return (
    <SafeAreaView style={profileScreenStyles.safe}>
      <View style={profileScreenStyles.container}>
        <View style={profileScreenStyles.header}>
          <Text style={profileScreenStyles.title}>My Profile</Text>
          <TouchableOpacity onPress={handleLogout} style={profileScreenStyles.logoutButton}>
            <Text style={profileScreenStyles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* User Email */}
        <View style={profileScreenStyles.userSection}>
          <Text style={profileScreenStyles.userEmail}>{currentUser?.email}</Text>
        </View>

        {/* Stats Row */}
        <View style={profileScreenStyles.statsRow}>
          <StatCard label="My Venues" value={stats.following} />
          <StatCard label="Favorites" value={stats.favorites} />
          <StatCard label="Total Events" value={stats.events} />
        </View>

        {/* Add Venue Button */}
        <TouchableOpacity
          style={profileScreenStyles.addButton}
          onPress={() => setShowAddVenue(!showAddVenue)}
        >
          <Text style={profileScreenStyles.addButtonText}>
            {showAddVenue ? 'Cancel' : 'Add Venue'}
          </Text>
        </TouchableOpacity>

        {/* Add Venue Form */}
        {showAddVenue && (
          <View style={profileScreenStyles.addVenueForm}>
            <TextInput
              style={profileScreenStyles.input}
              placeholder="Venue Name"
              placeholderTextColor="#666"
              value={newVenue.name}
              onChangeText={(text) => setNewVenue({ ...newVenue, name: text })}
            />
            
            <View style={profileScreenStyles.typeContainer}>
              {venueTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    profileScreenStyles.typeButton,
                    newVenue.type === type && profileScreenStyles.selectedType
                  ]}
                  onPress={() => setNewVenue({ ...newVenue, type })}
                >
                  <Text style={[
                    profileScreenStyles.typeText,
                    newVenue.type === type && profileScreenStyles.selectedTypeText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={profileScreenStyles.input}
              placeholder="Location"
              placeholderTextColor="#666"
              value={newVenue.location}
              onChangeText={(text) => setNewVenue({ ...newVenue, location: text })}
            />
            
            <TouchableOpacity style={profileScreenStyles.submitButton} onPress={handleAddVenue}>
              <Text style={profileScreenStyles.submitButtonText}>Add Venue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* My Venues List */}
        {userVenues.length > 0 && (
          <View style={profileScreenStyles.venuesSection}>
            <Text style={profileScreenStyles.sectionTitle}>My Venues</Text>
            <FlatList
              data={userVenues}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <VenueItem venue={item} />}
              style={profileScreenStyles.venuesList}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={profileScreenStyles.card}>
      <Text style={profileScreenStyles.value}>{value}</Text>
      <Text
        style={profileScreenStyles.label}
        numberOfLines={1}
        ellipsizeMode="clip"  
        adjustsFontSizeToFit  
        minimumFontScale={0.85}    
      >
        {label}
      </Text>
    </View>
  );
}

function VenueItem({ venue }) {
  return (
    <View style={profileScreenStyles.venueItem}>
      <Text style={profileScreenStyles.venueName}>{venue.name}</Text>
      <Text style={profileScreenStyles.venueType}>{venue.type}</Text>
      <Text style={profileScreenStyles.venueLocation}>{venue.location}</Text>
    </View>
  );
}