import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, ActivityIndicator, StyleSheet, Alert, TextInput, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';//import af google maps komponenten og marker til at vise lokationer på kortet
import * as Location from 'expo-location'; //expo location bruges til at hente brugerens lokation
import { database } from '../database/firebase'; // Import Firebase database
import { useAuth } from '../contexts/AuthContext';
import { exploreScreenStyles as styles } from '../styles/exploreScreenStyles';


// Helper function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Category constants for filtering
const PRIMARY_CATEGORIES = [
  'Bar', 'Restaurant', 'Pub', 'Club', 'Cafe', 'Brewery', 'Lounge', 
  'Wine Bar', 'Cocktail Bar', 'Sports Bar', 'Rooftop Bar', 'Hotel Bar'
];

const ACTIVITY_CATEGORIES = [
  'Live Music', 'DJ Sets', 'Karaoke', 'Quiz Night', 'Board Games', 
  'Pool/Billiards', 'Darts', 'Open Mic', 'Comedy Show', 'Trivia', 
  'Dance Floor', 'Live Sports', 'Wine Tasting', 'Craft Beer', 
  'Cocktail Specials', 'Happy Hour', 'Outdoor Seating', 'Rooftop', 
  'Private Events', 'Corporate Events', 'Birthday Parties', 'Live Band', 
  'Acoustic Music', 'Jazz Music', 'Rock Music', 'Electronic Music',
  'Food Specials', 'Brunch', 'Late Night', 'Themed Nights', 
  'Student Discounts', 'Group Bookings', 'VIP Area', 'Smoking Area'
];

export default function ExploreScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 500;

  const mapRef = useRef(null); // reference til map komponenten så vi kan styre det programmatisk
  const [region, setRegion] = useState(null); // state til at holde styr på den delen af kortet der vises
  const [loading, setLoading] = useState(true); // state til at vise om brugerens lokation stadig hentes
  const [venues, setVenues] = useState([]); // state til at holde styr på venues fra Firestore
  const [filteredVenues, setFilteredVenues] = useState([]); // filtered venue list
  const [userLocation, setUserLocation] = useState(null); // store user's location for distance calculations
  
  // Filter states
  const [distanceInput, setDistanceInput] = useState('');
  const [selectedDistance, setSelectedDistance] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

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
        const userCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        };
        setUserLocation(userCoords); // store for distance calculations
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
            const venue = {
              id: key,
              name: data.name,
              address: data.address,
              location: data.location,
              type: data.type,
              categories: data.categories || [],
              description: data.description,
              latitude: data.coordinates.latitude,
              longitude: data.coordinates.longitude,
            };
            
            // Calculate distance if user location is available
            if (userLocation) {
              venue.distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                venue.latitude,
                venue.longitude
              );
              venue.distanceText = venue.distance < 1 
                ? `${Math.round(venue.distance * 1000)}m`
                : `${venue.distance.toFixed(1)}km`;
            }
            
            venuesData.push(venue);
          }
        });
        
        // Sort venues by distance (closest first) if user location is available
        if (userLocation) {
          venuesData.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }
      }
      setVenues(venuesData);
      applyFilters(venuesData);
    }, (error) => {
      console.error('Error fetching venues:', error);
    });

    return () => venuesRef.off('value', unsubscribe);
  }, [userLocation]);
  
  // Apply filters to venue list
  const applyFilters = (venueList = venues) => {
    let filtered = [...venueList];
    
    // Distance filter
    if (selectedDistance && userLocation) {
      console.log(`Filtering by distance: ${selectedDistance}km`);
      filtered = filtered.filter(venue => {
        const hasDistance = venue.distance !== undefined && venue.distance !== null;
        const withinRange = hasDistance && venue.distance <= selectedDistance;
        console.log(`Venue ${venue.name}: distance=${venue.distance}, within range=${withinRange}`);
        return withinRange;
      });
    }
    
    // Category filter (includes both primary type and activity categories)
    if (selectedCategory) {
      console.log(`Filtering by category: ${selectedCategory}`);
      filtered = filtered.filter(venue => {
        // Check primary type
        if (venue.type === selectedCategory) return true;
        // Check activity categories
        if (venue.categories && venue.categories.includes(selectedCategory)) return true;
        return false;
      });
    }
    
    console.log(`Filtered venues: ${filtered.length} of ${venueList.length}`);
    setFilteredVenues(filtered);
  };
  
  // Update filters when selections change
  useEffect(() => {
    if (venues.length > 0) {
      applyFilters();
    }
  }, [selectedDistance, selectedCategory, venues, userLocation]);
  
  // Clear category filter
  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    setShowCategoryFilter(false);
  };
  
  // Handle distance input
  const handleDistanceInput = (text) => {
    setDistanceInput(text);
    const distance = parseFloat(text);
    if (!isNaN(distance) && distance > 0) {
      setSelectedDistance(distance);
    } else {
      setSelectedDistance(null);
    }
  };
  
  // Clear distance filter
  const clearDistanceFilter = () => {
    setSelectedDistance(null);
    setDistanceInput('');
    setShowDistanceFilter(false);
  };
  
  // Toggle dropdowns with mutual exclusion
  const toggleDistanceFilter = () => {
    if (showCategoryFilter) setShowCategoryFilter(false);
    setShowDistanceFilter(!showDistanceFilter);
  };
  
  const toggleCategoryFilter = () => {
    if (showDistanceFilter) setShowDistanceFilter(false);
    setShowCategoryFilter(!showCategoryFilter);
  }; // Re-run when user location changes

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

        {/* Filter Controls */}
        <View style={localStyles.filterContainer}>
          <View style={localStyles.filterRow}>
            <Text style={localStyles.filterTitle}>Filters:</Text>
            
            {/* Distance Filter */}
            <View style={localStyles.distanceInputContainer}>
              <Text style={localStyles.distanceLabel}>Within:</Text>
              <TextInput
                style={localStyles.distanceInput}
                value={distanceInput}
                onChangeText={handleDistanceInput}
                placeholder="km"
                placeholderTextColor="#9aa0a6"
                keyboardType="decimal-pad"
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                onBlur={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
              {distanceInput.length > 0 && (
                <TouchableOpacity 
                  style={localStyles.doneButton}
                  onPress={() => Keyboard.dismiss()}
                >
                  <Text style={localStyles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Category Filter */}
            <TouchableOpacity 
              style={[localStyles.filterButton, selectedCategory && localStyles.filterButtonActive]}
              onPress={toggleCategoryFilter}
            >
              <Text style={[localStyles.filterButtonText, selectedCategory && localStyles.filterButtonTextActive]}>
                {selectedCategory || 'Category'}
              </Text>
              <Text style={localStyles.filterArrow}>{showCategoryFilter ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            
            {/* Clear Filters */}
            {(distanceInput || selectedCategory) && (
              <TouchableOpacity 
                style={localStyles.clearFiltersButton}
                onPress={() => {
                  clearDistanceFilter();
                  clearCategoryFilter();
                }}
              >
                <Text style={localStyles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Category Dropdown */}
          {showCategoryFilter && (
            <View style={localStyles.dropdownContainer}>
              <ScrollView 
                style={localStyles.dropdownScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={localStyles.dropdownHeader}>Primary Types</Text>
                {PRIMARY_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      localStyles.dropdownItem,
                      selectedCategory === category && localStyles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryFilter(false);
                    }}
                  >
                    <Text style={[
                      localStyles.dropdownItemText,
                      selectedCategory === category && localStyles.dropdownItemTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                <Text style={localStyles.dropdownHeader}>Activities</Text>
                {ACTIVITY_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      localStyles.dropdownItem,
                      selectedCategory === category && localStyles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryFilter(false);
                    }}
                  >
                    <Text style={[
                      localStyles.dropdownItemText,
                      selectedCategory === category && localStyles.dropdownItemTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* venues i nærheden */}
        <View style={[styles.section, styles.listWrap]}>
          <Text style={localStyles.sectionTitle}>
            {selectedDistance || selectedCategory ? 'Filtered Venues' : 'Venues near you'}
            {(selectedDistance || selectedCategory) && (
              <Text style={localStyles.resultCount}> ({filteredVenues.length} of {venues.length})</Text>
            )}
          </Text>
          {/* klikbar card der kalder goToVenue og flytter kortet til venues lokation */}
          <FlatList
            data={filteredVenues}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPad}
            renderItem={({ item }) => (
              <View style={localStyles.card}>
                <TouchableOpacity onPress={() => goToVenue(item)} style={localStyles.cardContent}>
                  <View style={localStyles.cardHeader}>
                    <Text style={localStyles.cardTitle}>{item.name}</Text>
                    {item.distanceText && (
                      <Text style={localStyles.distanceText}>{item.distanceText}</Text>
                    )}
                  </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  distanceText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  // Filter styles
  filterContainer: {
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2b2b31',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTitle: {
    color: '#c9c9ce',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2b31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#0084ff',
  },
  filterButtonText: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterArrow: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  clearFiltersButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownContainer: {
    backgroundColor: '#2b2b31',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownHeader: {
    color: '#0084ff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1e',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#404040',
  },
  dropdownItemSelected: {
    backgroundColor: '#0084ff',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  resultCount: {
    color: '#0084ff',
    fontSize: 14,
    fontWeight: '500',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2b31',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#404040',
  },
  distanceLabel: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '500',
  },
  distanceInput: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 40,
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#0084ff',
  },
  doneButton: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
});
