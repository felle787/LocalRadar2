import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  FlatList,
  Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { profileScreenStyles } from '../styles/profileScreenStyles';
import NotificationService from '../services/NotificationService';

export default function ProfileScreen({ navigation }) {
  const { currentUser, userProfile, logout } = useAuth();
  const [followedVenues, setFollowedVenues] = useState([]);
  const [favoriteVenues, setFavoriteVenues] = useState([]);
  const [totalVenues, setTotalVenues] = useState(0);
  const [newEventNotifications, setNewEventNotifications] = useState(true);
  const [dayBeforeReminders, setDayBeforeReminders] = useState(true);
  const [eventDayReminders, setEventDayReminders] = useState(true);

  useEffect(() => {
    if (currentUser && userProfile) {
      let followedUnsubscribe, favoritesUnsubscribe, totalUnsubscribe;

      // Get all venues and filter locally (Realtime DB doesn't support complex queries like Firestore)
      const venuesRef = database.ref('venues');
      
      totalUnsubscribe = venuesRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const venues = snapshot.val();
          const allVenues = Object.keys(venues).map(key => ({
            id: key,
            ...venues[key]
          }));

          // Set total venues count
          setTotalVenues(allVenues.length);

          // Filter followed venues
          if (userProfile.followedVenues && userProfile.followedVenues.length > 0) {
            const followed = allVenues.filter(venue => 
              userProfile.followedVenues.includes(venue.id)
            );
            setFollowedVenues(followed);
          } else {
            setFollowedVenues([]);
          }

          // Filter favorite venues
          if (userProfile.favoriteVenues && userProfile.favoriteVenues.length > 0) {
            const favorites = allVenues.filter(venue => 
              userProfile.favoriteVenues.includes(venue.id)
            );
            setFavoriteVenues(favorites);
          } else {
            setFavoriteVenues([]);
          }
        } else {
          setTotalVenues(0);
          setFollowedVenues([]);
          setFavoriteVenues([]);
        }
      });

      return () => {
        if (totalUnsubscribe) {
          venuesRef.off('value', totalUnsubscribe);
        }
      };
    }
  }, [currentUser, userProfile]);

  // Load notification preferences when user profile is available
  useEffect(() => {
    if (currentUser && userProfile) {
      loadNotificationPreferences();
    }
  }, [currentUser, userProfile]);

  const loadNotificationPreferences = async () => {
    try {
      const preferencesRef = database.ref(`users/${currentUser.uid}/notificationPreferences`);
      const snapshot = await preferencesRef.once('value');
      if (snapshot.exists()) {
        const prefs = snapshot.val();
        setNewEventNotifications(prefs.newEventNotifications !== false); // default true
        setDayBeforeReminders(prefs.dayBeforeReminders !== false); // default true
        setEventDayReminders(prefs.eventDayReminders !== false); // default true
      }
    } catch (error) {
      console.log('Error loading notification preferences:', error);
    }
  };

  const updateNotificationPreference = async (type, value) => {
    try {
      await database.ref(`users/${currentUser.uid}/notificationPreferences/${type}`).set(value);
      
      // Update notification service with new preferences
      const updatedPreferences = {
        newEventNotifications: type === 'newEventNotifications' ? value : newEventNotifications,
        dayBeforeReminders: type === 'dayBeforeReminders' ? value : dayBeforeReminders,
        eventDayReminders: type === 'eventDayReminders' ? value : eventDayReminders
      };
      
      await NotificationService.saveUserNotificationData(currentUser.uid, updatedPreferences);
      
      // If user enabled any reminder type, check for today's events
      if ((type === 'eventDayReminders' || type === 'dayBeforeReminders') && value) {
        await NotificationService.checkAndScheduleTodayEvents(currentUser.uid);
      }
      
    } catch (error) {
      console.error('Error updating notification preference:', error);
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const unfollowVenue = async (venueId) => {
    try {
      const updatedFollowed = userProfile.followedVenues.filter(id => id !== venueId);
      await database.ref(`users/${currentUser.uid}/followedVenues`).set(updatedFollowed);
      Alert.alert('Success', 'Venue unfollowed');
    } catch (error) {
      Alert.alert('Error', 'Failed to unfollow venue');
    }
  };

  const removeFavorite = async (venueId) => {
    try {
      const updatedFavorites = userProfile.favoriteVenues.filter(id => id !== venueId);
      await database.ref(`users/${currentUser.uid}/favoriteVenues`).set(updatedFavorites);
      Alert.alert('Success', 'Venue removed from favorites');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove favorite');
    }
  };

  const stats = {
    following: followedVenues.length,
    favorites: favoriteVenues.length,
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
          <Text style={profileScreenStyles.userType}>
            {userProfile?.userType === 'business' ? 'Business Account' : 'Customer Account'}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={profileScreenStyles.statsRow}>
          <StatCard label="Following" value={stats.following} />
          <StatCard label="Favorites" value={stats.favorites} />
          <StatCard label="Total Venues" value={stats.events} />
        </View>

        {/* Notification Settings */}
        <View style={profileScreenStyles.notificationSection}>
          <Text style={profileScreenStyles.sectionTitle}>Notification Settings</Text>
          
          <View style={profileScreenStyles.notificationItem}>
            <View style={profileScreenStyles.notificationTextContainer}>
              <Text style={profileScreenStyles.notificationTitle}>New Event Alerts</Text>
              <Text style={profileScreenStyles.notificationDescription}>
                Get notified when businesses you follow post new events
              </Text>
            </View>
            <Switch
              value={newEventNotifications}
              onValueChange={(value) => {
                setNewEventNotifications(value);
                updateNotificationPreference('newEventNotifications', value);
              }}
              trackColor={{ false: '#2b2b31', true: '#007AFF' }}
              thumbColor={newEventNotifications ? '#fff' : '#8e8e93'}
            />
          </View>

          <View style={profileScreenStyles.notificationItem}>
            <View style={profileScreenStyles.notificationTextContainer}>
              <Text style={profileScreenStyles.notificationTitle}>Day Before Reminders</Text>
              <Text style={profileScreenStyles.notificationDescription}>
                Get reminded 24 hours before events you're attending
              </Text>
            </View>
            <Switch
              value={dayBeforeReminders}
              onValueChange={(value) => {
                setDayBeforeReminders(value);
                updateNotificationPreference('dayBeforeReminders', value);
              }}
              trackColor={{ false: '#2b2b31', true: '#007AFF' }}
              thumbColor={dayBeforeReminders ? '#fff' : '#8e8e93'}
            />
          </View>

          <View style={profileScreenStyles.notificationItem}>
            <View style={profileScreenStyles.notificationTextContainer}>
              <Text style={profileScreenStyles.notificationTitle}>Event Day Reminders</Text>
              <Text style={profileScreenStyles.notificationDescription}>
                Get reminded 2 hours before events start
              </Text>
            </View>
            <Switch
              value={eventDayReminders}
              onValueChange={(value) => {
                setEventDayReminders(value);
                updateNotificationPreference('eventDayReminders', value);
              }}
              trackColor={{ false: '#2b2b31', true: '#007AFF' }}
              thumbColor={eventDayReminders ? '#fff' : '#8e8e93'}
            />
          </View>
        </View>

        {/* Followed Venues */}
        {followedVenues.length > 0 && (
          <View style={profileScreenStyles.venuesSection}>
            <Text style={profileScreenStyles.sectionTitle}>Following</Text>
            <FlatList
              data={followedVenues}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <VenueItem 
                  venue={item} 
                  onAction={() => unfollowVenue(item.id)}
                  actionText="Unfollow"
                />
              )}
              style={profileScreenStyles.venuesList}
            />
          </View>
        )}

        {/* Favorite Venues */}
        {favoriteVenues.length > 0 && (
          <View style={profileScreenStyles.venuesSection}>
            <Text style={profileScreenStyles.sectionTitle}>Favorites</Text>
            <FlatList
              data={favoriteVenues}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <VenueItem 
                  venue={item} 
                  onAction={() => removeFavorite(item.id)}
                  actionText="Remove"
                />
              )}
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

function VenueItem({ venue, onAction, actionText }) {
  return (
    <View style={profileScreenStyles.venueItem}>
      <View style={profileScreenStyles.venueInfo}>
        <Text style={profileScreenStyles.venueName}>{venue.name}</Text>
        <Text style={profileScreenStyles.venueType}>{venue.category || venue.type}</Text>
        <Text style={profileScreenStyles.venueLocation}>{venue.address || venue.location}</Text>
      </View>
      {onAction && (
        <TouchableOpacity 
          style={profileScreenStyles.actionButton}
          onPress={onAction}
        >
          <Text style={profileScreenStyles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}