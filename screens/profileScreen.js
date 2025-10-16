import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { profileScreenStyles } from '../styles/profileScreenStyles';

export default function ProfileScreen({ navigation }) {
  const { currentUser, userProfile, logout } = useAuth();
  const [followedVenues, setFollowedVenues] = useState([]);
  const [favoriteVenues, setFavoriteVenues] = useState([]);
  const [totalVenues, setTotalVenues] = useState(0);

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