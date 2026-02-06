import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/BusinessDetailsScreenStyles';

export default function BusinessDetailsScreen({ route, navigation }) {
  const { venue } = route.params;
  const { currentUser, userProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBusinessEvents();
    checkFollowStatus();
  }, [venue.id]);

  const loadBusinessEvents = async () => {
    try {
      const eventsSnapshot = await database.ref(`events/${venue.id}`).once('value');
      if (eventsSnapshot.exists()) {
        const eventsData = [];
        const eventsObj = eventsSnapshot.val();
        Object.keys(eventsObj).forEach(key => {
          const event = { id: key, ...eventsObj[key] };
          // Kun vis fremtidige begivenheder
          const eventDate = new Date(event.dateTime || event.timestamp);
          if (eventDate >= new Date()) {
            eventsData.push(event);
          }
        });
        // Sorter events efter dato (nærmeste først)
        eventsData.sort((a, b) => {
          const dateA = new Date(a.dateTime || a.timestamp);
          const dateB = new Date(b.dateTime || b.timestamp);
          return dateA - dateB;
        });
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading business events:', error);
    }
  };
// Tjek om den nuværende bruger følger virksomheden
  const checkFollowStatus = () => {
    if (currentUser && userProfile) {
      const isFollowed = userProfile.followedVenues?.includes(venue.id) || false;
      setIsFollowing(isFollowed);
    }
  };
// Håndter følg/unfollow logik
  const toggleFollow = async () => {
    if (!currentUser || !userProfile) {
      Alert.alert('Login Required', 'Please log in to follow businesses');
      return;
    }

    if (userProfile.userType === 'business') {
      Alert.alert('Feature Unavailable', 'Business accounts cannot follow venues');
      return;
    }
// Opdater følgetilstand i databasen
    setLoading(true);
    try {
      let updatedFollowed;
      if (isFollowing) {
        updatedFollowed = userProfile.followedVenues.filter(id => id !== venue.id);
        Alert.alert('Unfollowed', `You unfollowed ${venue.name}`);
      } else {
        updatedFollowed = [...(userProfile.followedVenues || []), venue.id];
        Alert.alert('Following', `You are now following ${venue.name}!`);
      }

      await database.ref(`users/${currentUser.uid}/followedVenues`).set(updatedFollowed);
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following/unfollowing venue:', error);
      Alert.alert('Error', 'Failed to update following status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* header til virksomhedsdetaljer */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{venue.name}</Text>
        {currentUser && userProfile?.userType === 'customer' && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={toggleFollow}
            disabled={loading}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
        )}
        {(!currentUser || userProfile?.userType !== 'customer') && <View style={styles.headerSpacer} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* virksomhedsinfo */}
        <View style={styles.section}>
          <Text style={styles.businessName}>{venue.name}</Text>
          <Text style={styles.businessType}>{venue.type}</Text>
          {venue.address && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={16} color="#9aa0a6" />
              <Text style={styles.addressText}>{venue.address}</Text>
            </View>
          )}
          {venue.distanceText && (
            <Text style={styles.distanceText}>📍 {venue.distanceText} away</Text>
          )}
        </View>

        {/* beskrivelse */}
        {venue.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{venue.description}</Text>
          </View>
        )}

        {/* kategorier */}
        {venue.categories && venue.categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What we offer</Text>
            <View style={styles.categoriesContainer}>
              {venue.categories.map((category, index) => (
                <View key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events ({events.length})</Text>
          {events.length > 0 ? (
            events.map((event) => {
              const eventDate = new Date(event.dateTime || event.timestamp);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate('EventDetails', { event: { ...event, venueName: venue.name, venueAddress: venue.address } })}
                >
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noEventsText}>No upcoming events</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}