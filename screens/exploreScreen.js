import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';//import af google maps komponenten og marker til at vise lokationer på kortet
import * as Location from 'expo-location'; //expo location bruges til at hente brugerens lokation
import { database } from '../database/firebase'; // Import Firebase database
import { useAuth } from '../contexts/AuthContext';
import { exploreScreenStyles as styles } from '../styles/exploreScreenStyles';


export default function ExploreScreen() {
  const { currentUser, userProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 500;

  const mapRef = useRef(null); // reference til map komponenten så vi kan styre det programmatisk
  const [region, setRegion] = useState(null); // state til at holde styr på den delen af kortet der vises
  const [loading, setLoading] = useState(true); // state til at vise om brugerens lokation stadig hentes
  const [venues, setVenues] = useState([]); // state til at holde styr på venues fra Firestore

  // henter brugerens lokation når komponenten bliver loadet
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // hvis tilladelsen ikke gives falder kortet tilbage til at vise København
          setRegion({ //københavn koordinater
            latitude: 55.6761,
            longitude: 12.5683,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          });
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({ // sætter region til brugerens nuværende lokation
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        });
      } catch (e) {
        setRegion({ 
          latitude: 55.6761,
          longitude: 12.5683,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch venues from Realtime Database in real-time
  useEffect(() => {
    const venuesRef = database.ref('venues');
    
    const unsubscribe = venuesRef.on('value', (snapshot) => {
      const venuesData = [];
      if (snapshot.exists()) {
        const venues = snapshot.val();
        Object.keys(venues).forEach((key) => {
          const data = venues[key];
          // Only include venues that have coordinates
          if (data.coordinates && data.coordinates.latitude && data.coordinates.longitude) {
            venuesData.push({
              id: key,
              name: data.name,
              address: data.address,
              location: data.location,
              type: data.type,
              categories: data.categories || [],
              description: data.description,
              latitude: data.coordinates.latitude,
              longitude: data.coordinates.longitude,
            });
          }
        });
      }
      setVenues(venuesData);
    }, (error) => {
      console.error('Error fetching venues:', error);
    });

    return () => venuesRef.off('value', unsubscribe);
  }, []);

  const layout = useMemo( // useMemo bruges til at huske en værdi mellem rendering, så den ikke skal genberegnes hver gang
    () => (isNarrow ? styles.stack : styles.columns),
    [isNarrow]
  );

  const goToVenue = (venue) => {// funktion der flytter kortet til den valgte venues lokation, dette kan klikkes på i listen
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: venue.latitude,
        longitude: venue.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      500
    );
  };

  const isVenueFollowed = (venueId) => {
    return userProfile?.followedVenues?.includes(venueId) || false;
  };

  const toggleFollowVenue = async (venue) => {
    if (!currentUser || !userProfile) {
      Alert.alert('Login Required', 'Please log in to follow venues');
      return;
    }

    if (userProfile.userType === 'business') {
      Alert.alert('Feature Unavailable', 'Business accounts cannot follow venues');
      return;
    }

    try {
      const isFollowing = isVenueFollowed(venue.id);
      let updatedFollowed;

      if (isFollowing) {
        // Unfollow venue
        updatedFollowed = userProfile.followedVenues.filter(id => id !== venue.id);
        Alert.alert('Unfollowed', `You unfollowed ${venue.name}`);
      } else {
        // Follow venue
        updatedFollowed = [...(userProfile.followedVenues || []), venue.id];
        Alert.alert('Following', `You are now following ${venue.name}!`);
      }

      await database.ref(`users/${currentUser.uid}/followedVenues`).set(updatedFollowed);
    } catch (error) {
      console.error('Error following/unfollowing venue:', error);
      Alert.alert('Error', 'Failed to update venue following status');
    }
  };

  return (
    <SafeAreaView style={localStyles.container}>
      <View style={localStyles.header}>
        <Text style={localStyles.title}>Explore</Text>
        <Text style={localStyles.subtitle}>Find venues near you</Text>
      </View>

      <View style={[styles.content, layout]}>
        {/* Map */}
        <View style={[styles.section, styles.mapWrap]}>
          {loading || !region ? (
            <View style={localStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={localStyles.loadingText}>Finding your location...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
            >
              {venues.map((venue) => (
                <Marker
                  key={venue.id}
                  coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                  title={venue.name}
                  description={`${venue.type} • ${venue.location || venue.address}`}
                />
              ))}
            </MapView>
          )}
        </View>

        {/* venues i nærheden */}
        <View style={[styles.section, styles.listWrap]}>
          <Text style={localStyles.sectionTitle}>Venues near you</Text>
          {/* klikbar card der kalder goToVenue og flytter kortet til venues lokation */}
          <FlatList
            data={venues}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPad}
            renderItem={({ item }) => (
              <View style={localStyles.card}>
                <TouchableOpacity onPress={() => goToVenue(item)} style={localStyles.cardContent}>
                  <Text style={localStyles.cardTitle}>{item.name}</Text>
                  <Text style={localStyles.cardSubtitle}>{item.type} • {item.location || item.address}</Text>
                  {item.description ? (
                    <Text style={localStyles.cardDescription}>{item.description}</Text>
                  ) : null}
                  {item.categories && item.categories.length > 0 ? (
                    <Text style={localStyles.cardCategories}>{item.categories.join(' • ')}</Text>
                  ) : null}
                </TouchableOpacity>
                
                {currentUser && userProfile?.userType === 'customer' && (
                  <TouchableOpacity 
                    onPress={() => toggleFollowVenue(item)}
                    style={[
                      localStyles.followButton,
                      isVenueFollowed(item.id) && localStyles.followButtonActive
                    ]}
                  >
                    <Text style={[
                      localStyles.followButtonText,
                      isVenueFollowed(item.id) && localStyles.followButtonTextActive
                    ]}>
                      {isVenueFollowed(item.id) ? '✓ Following' : '+ Follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyText}>No venues found</Text>
                <Text style={localStyles.emptySubtext}>Business owners can add their venues to appear here</Text>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// Local styles to match other screens' aesthetic
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0c',
  },
  header: {
    padding: 16,
    paddingBottom: 0,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#c9c9ce',
    fontSize: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1e',
  },
  loadingText: {
    color: '#c9c9ce',
    marginTop: 12,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1a1a1e',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b2b31',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#c9c9ce',
    fontSize: 14,
    marginBottom: 6,
  },
  cardDescription: {
    color: '#9aa0a6',
    fontSize: 14,
    marginBottom: 6,
  },
  cardCategories: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  followButton: {
    backgroundColor: '#2b2b31',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2b2b31',
  },
  followButtonActive: {
    backgroundColor: '#007AFF',
  },
  followButtonText: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#c9c9ce',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#9aa0a6',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
