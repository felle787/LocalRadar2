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

export default function ExploreScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 500;

  const mapRef = useRef(null); // reference til map komponenten så vi kan styre det programmatisk
  const [region, setRegion] = useState(null); // state til at holde styr på den delen af kortet der vises
  const [loading, setLoading] = useState(true); // state til at vise om brugerens lokation stadig hentes
  const [venues, setVenues] = useState([]); // state til at holde styr på venues fra Firestore
  const [filteredVenues, setFilteredVenues] = useState([]); // filtered venue list
  const [events, setEvents] = useState([]); // state for events
  const [filteredEvents, setFilteredEvents] = useState([]); // filtered events list
  const [userLocation, setUserLocation] = useState(null); // store user's location for distance calculations
  
  // View toggle state
  const [viewMode, setViewMode] = useState('businesses'); // 'businesses' or 'events'
  
  // Filter states
  const [distanceInput, setDistanceInput] = useState('');
  const [selectedDistance, setSelectedDistance] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all'); // 'all', 'today', 'tomorrow', 'this_week'
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

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
              imageUrl: data.imageUrl,
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
  }, []);

  // Fetch events from global events
  useEffect(() => {
    const eventsRef = database.ref('globalEvents');
    
    const unsubscribe = eventsRef.on('value', async (snapshot) => {
      const eventsData = [];
      if (snapshot.exists()) {
        const events = snapshot.val();
        console.log('Global events structure:', Object.keys(events).length, 'events found');
        
        for (const [eventId, eventInfo] of Object.entries(events)) {
          try {
            // Try to get userId from eventInfo or use venueId as fallback
            let userId = eventInfo.userId || eventInfo.venueId;
            if (!userId) {
              console.log('No userId or venueId found in eventInfo for event:', eventId);
              continue;
            }
            
            // Fetch the actual event data
            const eventSnapshot = await database.ref(`events/${userId}/${eventId}`).once('value');
            if (eventSnapshot.exists()) {
              const eventData = eventSnapshot.val();
              
              // Fetch venue data for location
              const venueSnapshot = await database.ref(`venues/${userId}`).once('value');
              if (venueSnapshot.exists()) {
                const venueData = venueSnapshot.val();
                
                if (venueData.coordinates && venueData.coordinates.latitude && venueData.coordinates.longitude) {
                  const event = {
                    id: eventId,
                    ...eventData,
                    venueId: userId,
                    venueName: venueData.name,
                    venueAddress: venueData.address,
                    latitude: venueData.coordinates.latitude,
                    longitude: venueData.coordinates.longitude,
                  };
                  
                  // Calculate distance if user location is available
                  if (userLocation) {
                    event.distance = calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      event.latitude,
                      event.longitude
                    );
                    event.distanceText = event.distance < 1 
                      ? `${Math.round(event.distance * 1000)}m`
                      : `${event.distance.toFixed(1)}km`;
                  }
                  
                  eventsData.push(event);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching event data:', error);
          }
        }
        
        // Sort events by date (soonest first)
        eventsData.sort((a, b) => {
          try {
            const dateA = new Date(a.dateTime || a.timestamp || a.date || 0);
            const dateB = new Date(b.dateTime || b.timestamp || b.date || 0);
            
            // Handle invalid dates by pushing them to the end
            const isValidA = !isNaN(dateA.getTime());
            const isValidB = !isNaN(dateB.getTime());
            
            if (!isValidA && !isValidB) return 0;
            if (!isValidA) return 1;
            if (!isValidB) return -1;
            
            return dateA - dateB;
          } catch (error) {
            console.log('Error sorting events by date:', error);
            return 0;
          }
        });
        

        setEvents(eventsData);
        // Apply initial filtering
        if (eventsData.length > 0) {
          // We need to call the filter function directly with the new data
          // since the state hasn't updated yet
          let filtered = [...eventsData];
          
          // Filter out expired events (always apply this filter)
          const now = new Date();
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.dateTime || event.timestamp);
            return eventDate >= now; // Only show future events
          });
          
          // Distance filter
          if (selectedDistance && userLocation) {
            filtered = filtered.filter(event => {
              const hasDistance = event.distance !== undefined && event.distance !== null;
              const withinRange = hasDistance && event.distance <= selectedDistance;
              return withinRange;
            });
          }
          
          // Date filter
          if (selectedDateFilter && selectedDateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            
            filtered = filtered.filter(event => {
              const eventDate = new Date(event.dateTime || event.timestamp);
              const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
              
              switch (selectedDateFilter) {
                case 'today':
                  return eventDay.getTime() === today.getTime();
                case 'tomorrow':
                  return eventDay.getTime() === tomorrow.getTime();
                case 'this_week':
                  return eventDate >= now && eventDate <= weekFromNow;
                default:
                  return true;
              }
            });
          }
          

          setFilteredEvents(filtered);
        }
      } else {
        console.log('No events found in globalEvents');
        setEvents([]);
      }
    });
    
    return () => eventsRef.off('value', unsubscribe);
  }, []);
  
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
    

    setFilteredVenues(filtered);
  };

  // Apply filters to events list
  const applyEventsFilters = (eventList = events) => {
    let filtered = [...eventList];
    
    // Distance filter
    if (selectedDistance && userLocation) {
      filtered = filtered.filter(event => {
        const hasDistance = event.distance !== undefined && event.distance !== null;
        const withinRange = hasDistance && event.distance <= selectedDistance;
        return withinRange;
      });
    }
    
    // Filter out expired events (always apply this filter)
    const now = new Date();
    filtered = filtered.filter(event => {
      try {
        const dateSource = event.dateTime || event.timestamp || event.date;
        if (!dateSource) return false; // No date information
        
        const eventDate = new Date(dateSource);
        if (isNaN(eventDate.getTime())) return false; // Invalid date
        
        return eventDate >= now; // Only show future events
      } catch (error) {
        console.log('Error filtering expired events for event:', event.id, error);
        return false; // Exclude events with date parsing errors
      }
    });
    
    // Date filter
    if (selectedDateFilter && selectedDateFilter !== 'all') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      filtered = filtered.filter(event => {
        try {
          const dateSource = event.dateTime || event.timestamp || event.date;
          if (!dateSource) return false;
          
          const eventDate = new Date(dateSource);
          if (isNaN(eventDate.getTime())) return false;
          
          const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          
          switch (selectedDateFilter) {
            case 'today':
              return eventDay.getTime() === today.getTime();
            case 'tomorrow':
              return eventDay.getTime() === tomorrow.getTime();
            case 'this_week':
              return eventDate >= now && eventDate <= weekFromNow;
            default:
              return true;
          }
        } catch (error) {
          console.log('Error filtering events by date for event:', event.id, error);
          return false;
        }
      });
    }
    

    setFilteredEvents(filtered);
  };
  
  // Update filters when selections change
  useEffect(() => {
    if (venues.length > 0) {
      applyFilters();
    }
  }, [selectedDistance, selectedCategory, venues]);

  // Separate useEffect for location-based updates
  useEffect(() => {
    if (venues.length > 0 && userLocation) {
      applyFilters();
    }
    if (events.length > 0 && userLocation) {
      applyEventsFilters();
    }
  }, [userLocation]);
  
  useEffect(() => {
    if (events.length > 0) {
      applyEventsFilters();
    }
  }, [selectedDistance, selectedDateFilter, events]);
  
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
      } else {
        // Follow venue
        updatedFollowed = [...(userProfile.followedVenues || []), venue.id];
      }

      await database.ref(`users/${currentUser.uid}/followedVenues`).set(updatedFollowed);
    } catch (error) {
      console.error('Error following/unfollowing venue:', error);
      Alert.alert('Error', 'Failed to update venue following status');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.subtitle}>Discover local {viewMode === 'businesses' ? 'businesses' : 'events'}</Text>
        
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'businesses' && styles.toggleButtonActive]}
            onPress={() => {
              setViewMode('businesses');
              // Close all dropdowns when switching modes
              setShowDateFilter(false);
              setShowDistanceFilter(false);
            }}
          >
            <Text style={[styles.toggleButtonText, viewMode === 'businesses' && styles.toggleButtonTextActive]}>
              Businesses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'events' && styles.toggleButtonActive]}
            onPress={() => {
              setViewMode('events');
              // Close all dropdowns when switching modes
              setShowCategoryFilter(false);
              setShowDistanceFilter(false);
            }}
          >
            <Text style={[styles.toggleButtonText, viewMode === 'events' && styles.toggleButtonTextActive]}>
              Events
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, layout]}>
        {/* Map */}
        <View style={[styles.section, styles.mapWrap]}>
          {loading || !region ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Finding your location...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
            >
              {viewMode === 'businesses' ? 
                filteredVenues.map((venue) => (
                  <Marker
                    key={venue.id}
                    coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                    title={venue.name}
                    description={`${venue.type} • ${venue.location || venue.address}`}
                    onPress={() => navigation.navigate('Business', { venue })}
                  />
                )) :
                filteredEvents.map((event) => (
                  <Marker
                    key={event.id}
                    coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                    title={event.title || event.name}
                    description={`${event.venueName} • ${new Date(event.dateTime || event.timestamp).toLocaleDateString()}`}
                    pinColor="#FF6B6B"
                    onPress={() => navigation.navigate('EventDetails', { event })}
                  />
                ))
              }
            </MapView>
          )}
        </View>

        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterTitle}>Filters:</Text>
            
            {/* Distance Filter */}
            <View style={styles.distanceInputContainer}>
              <Text style={styles.distanceLabel}>Within:</Text>
              <TextInput
                style={styles.distanceInput}
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
                  style={styles.doneButton}
                  onPress={() => Keyboard.dismiss()}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {viewMode === 'businesses' ? (
              /* Category Filter for businesses */
              <TouchableOpacity 
                style={[styles.filterButton, selectedCategory && styles.filterButtonActive]}
                onPress={toggleCategoryFilter}
              >
                <Text style={[styles.filterButtonText, selectedCategory && styles.filterButtonTextActive]}>
                  {selectedCategory || 'Category'}
                </Text>
                <Text style={styles.filterArrow}>{showCategoryFilter ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            ) : (
              /* Date Filter for events */
              <TouchableOpacity 
                style={[styles.filterButton, selectedDateFilter !== 'all' && styles.filterButtonActive]}
                onPress={() => setShowDateFilter(!showDateFilter)}
              >
                <Text style={[styles.filterButtonText, selectedDateFilter !== 'all' && styles.filterButtonTextActive]}>
                  {selectedDateFilter === 'all' ? 'Date' : 
                   selectedDateFilter === 'today' ? 'Today' :
                   selectedDateFilter === 'tomorrow' ? 'Tomorrow' :
                   selectedDateFilter === 'this_week' ? 'This Week' : 'Date'}
                </Text>
                <Text style={styles.filterArrow}>{showDateFilter ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}
            
            {/* Clear Filters */}
            {(distanceInput || selectedCategory || selectedDateFilter !== 'all') && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  clearDistanceFilter();
                  if (viewMode === 'businesses') {
                    clearCategoryFilter();
                  } else {
                    setSelectedDateFilter('all');
                    setShowDateFilter(false);
                  }
                }}
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Category Dropdown */}
          {showCategoryFilter && (
            <View style={styles.dropdownContainer}>
              <ScrollView 
                style={styles.dropdownScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.dropdownHeader}>Primary Types</Text>
                {PRIMARY_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.dropdownItem,
                      selectedCategory === category && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryFilter(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedCategory === category && styles.dropdownItemTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                <Text style={styles.dropdownHeader}>Activities</Text>
                {ACTIVITY_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.dropdownItem,
                      selectedCategory === category && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryFilter(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedCategory === category && styles.dropdownItemTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Date Filter Dropdown */}
          {showDateFilter && (
            <View style={styles.dropdownContainer}>
              <ScrollView 
                style={styles.dropdownScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedDateFilter === 'all' && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDateFilter('all');
                    setShowDateFilter(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedDateFilter === 'all' && styles.dropdownItemTextSelected
                  ]}>
                    All Dates
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedDateFilter === 'today' && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDateFilter('today');
                    setShowDateFilter(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedDateFilter === 'today' && styles.dropdownItemTextSelected
                  ]}>
                    Today
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedDateFilter === 'tomorrow' && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDateFilter('tomorrow');
                    setShowDateFilter(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedDateFilter === 'tomorrow' && styles.dropdownItemTextSelected
                  ]}>
                    Tomorrow
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedDateFilter === 'this_week' && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDateFilter('this_week');
                    setShowDateFilter(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedDateFilter === 'this_week' && styles.dropdownItemTextSelected
                  ]}>
                    This Week
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>

        {/* List Section */}
        <View style={styles.listWrap}>
          {viewMode === 'businesses' ? (
            <>
              <Text style={styles.sectionTitle}>
                {selectedDistance || selectedCategory ? 'Filtered Businesses' : 'Businesses near you'}
                {(selectedDistance || selectedCategory) && (
                  <Text style={styles.resultCount}> ({filteredVenues.length} of {venues.length})</Text>
                )}
              </Text>
              <FlatList
                data={filteredVenues}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listPad, { paddingBottom: 0 }]}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <TouchableOpacity onPress={() => goToVenue(item)} style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        {item.distanceText && (
                          <Text style={styles.distanceText}>{item.distanceText}</Text>
                        )}
                      </View>
                      <Text style={styles.cardSubtitle}>{item.type} • {item.location || item.address}</Text>
                      {item.description ? (
                        <Text style={styles.cardDescription}>{item.description}</Text>
                      ) : null}
                      {item.categories && item.categories.length > 0 ? (
                        <Text style={styles.cardCategories}>{item.categories.join(' • ')}</Text>
                      ) : null}
                    </TouchableOpacity>
                    
                    {currentUser && userProfile?.userType === 'customer' && (
                      <TouchableOpacity 
                        onPress={() => toggleFollowVenue(item)}
                        style={[
                          styles.followButton,
                          isVenueFollowed(item.id) && styles.followButtonActive
                        ]}
                      >
                        <Text style={[
                          styles.followButtonText,
                          isVenueFollowed(item.id) && styles.followButtonTextActive
                        ]}>
                          {isVenueFollowed(item.id) ? '✓ Following' : '+ Follow'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No businesses found</Text>
                    <Text style={styles.emptySubtext}>Business owners can add their venues to appear here</Text>
                  </View>
                }
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {selectedDistance || selectedDateFilter !== 'all' ? 'Filtered Events' : 'Events near you'}
                {(selectedDistance || selectedDateFilter !== 'all') && (
                  <Text style={styles.resultCount}> ({filteredEvents.length} of {events.length})</Text>
                )}
              </Text>
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listPad, { paddingBottom: 0 }]}
                renderItem={({ item }) => {
                  let dateText = 'Date TBD';
                  
                  try {
                    // Safe date parsing with multiple fallbacks
                    let eventDate;
                    
                    if (item.dateTime) {
                      eventDate = new Date(item.dateTime);
                    } else if (item.timestamp) {
                      eventDate = new Date(item.timestamp);
                    } else if (item.dateISO && item.time) {
                      eventDate = new Date(item.dateISO + 'T' + item.time + ':00');
                    } else if (item.date) {
                      // Handle various date formats
                      eventDate = new Date(item.date);
                    }
                    
                    // Check if date is valid and format it
                    if (eventDate && !isNaN(eventDate.getTime())) {
                      dateText = eventDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                      
                      // Add time if available
                      if (item.time) {
                        dateText += ` • ${item.time}`;
                      }
                    } else if (item.date) {
                      // If parsing failed but we have a date string, show it as is
                      dateText = item.date;
                      if (item.time) {
                        dateText += ` • ${item.time}`;
                      }
                    }
                  } catch (error) {
                    console.log('Error parsing event date for event:', item.id, error);
                    // Fallback to raw date string if available
                    if (item.date) {
                      dateText = item.date;
                      if (item.time) {
                        dateText += ` • ${item.time}`;
                      }
                    }
                  }
                  
                  return (
                    <TouchableOpacity 
                      style={styles.eventCard}
                      onPress={() => navigation.navigate('EventDetails', { event: item })}
                    >
                      <View style={styles.eventHeader}>
                        <View style={styles.eventMainInfo}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{item.title || item.name || 'Untitled Event'}</Text>
                          <Text style={styles.eventVenue} numberOfLines={1}>{item.venueName || 'Unknown Venue'}</Text>
                        </View>
                        <View style={styles.eventSideInfo}>
                          <Text style={styles.eventDate}>
                            {dateText}
                          </Text>
                          {item.distanceText && (
                            <Text style={styles.eventDistance}>{item.distanceText}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No events found</Text>
                    <Text style={styles.emptySubtext}>Check back later for new events</Text>
                  </View>
                }
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}


