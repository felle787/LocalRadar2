import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, ActivityIndicator, StyleSheet, Alert, TextInput, ScrollView, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';//import af google maps komponenten og marker til at vise lokationer på kortet
import * as Location from 'expo-location'; //expo location bruges til at hente brugerens lokation
import { database } from '../database/firebase'; // Import Firebase database
import { useAuth } from '../contexts/AuthContext';
import { exploreScreenStyles as styles } from '../styles/exploreScreenStyles';


// hjælper med at beregne afstand mellem brugerens lokation og venues/events for at kunne sortere og filtrere baseret på afstand
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // retunerer afstand i kilometer
};

// kategori til at filtrere på både primær kategori og aktivitetskategori
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
  const venuesRef = useRef([]); // ref til venues for at undgå infinite loops
  const eventsRef = useRef([]); // ref til events for at undgå infinite loops
  const [region, setRegion] = useState(null); // state til at holde styr på den delen af kortet der vises
  const [loading, setLoading] = useState(true); // state til at vise om brugerens lokation stadig hentes
  const [venues, setVenues] = useState([]); // state til at holde styr på venues fra Firestore
  const [filteredVenues, setFilteredVenues] = useState([]); // filtered venue list
  const [events, setEvents] = useState([]); // state for events
  const [filteredEvents, setFilteredEvents] = useState([]); // filtered events list
  
  // Opdater refs når state ændres
  useEffect(() => {
    venuesRef.current = venues;
  }, [venues]);
  
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  
  const [userLocation, setUserLocation] = useState(null); // store user's location for distance calculations
  
  // sate til at holde styr på hvilken view mode brugeren er i
  const [viewMode, setViewMode] = useState('businesses'); // 'businesses' or 'events'
  
  // Filter states
  const [distanceInput, setDistanceInput] = useState('1');
  const [selectedDistance, setSelectedDistance] = useState(1); // Default 1 km
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
        setUserLocation(userCoords); // gemmer brugerens lokation i for senere brug i afstandsberegninger
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

  // henter venues fra Firestore og lytter efter ændringer i realtid, beregner afstand til hver venue og sorterer dem baseret på afstand
  useEffect(() => {
    const venuesDbRef = database.ref('venues');
    
    const unsubscribe = venuesDbRef.on('value', (snapshot) => {
      const venuesData = [];
      if (snapshot.exists()) {
        const venues = snapshot.val();
        Object.keys(venues).forEach((key) => {
          const data = venues[key];
          // Tjek at koordinater findes og er gyldige før vi prøver at beregne afstand
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
            
            // Beregn afstand hvis brugerens lokation er tilgængelig
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
        
        // sorterer på distance (tættest først) hvis brugerens lokation er tilgængelig
        if (userLocation) {
          venuesData.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }
      }
      
      setVenues(venuesData);
    }, (error) => {
      console.error('Error fetching venues:', error);
    });

    return () => venuesDbRef.off('value', unsubscribe);
  }, []);

  // genberegner afstande når brugerens lokation ændres eller venues loader
  useEffect(() => {
    if (userLocation && venues.length > 0) {
      // Tjek om nogen venues mangler distance
      const needsDistanceCalc = venues.some(v => v.distance === undefined || v.distance === null);
      if (needsDistanceCalc) {
        const updatedVenues = venues.map(venue => {
          if (venue.distance !== undefined) return venue; // Spring over hvis allerede beregnet
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            venue.latitude,
            venue.longitude
          );
          return {
            ...venue,
            distance,
            distanceText: distance < 1 
              ? `${Math.round(distance * 1000)}m`
              : `${distance.toFixed(1)}km`
          };
        });
        updatedVenues.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        setVenues(updatedVenues);
      }
    }
  }, [userLocation, venues]);

  // Filtrer venues når data eller filters ændrer
  useEffect(() => {
    if (venues.length > 0) {
      applyFilters(venues);
    }
  }, [venues, selectedDistance, selectedCategory]);

  // genberegner afstande til events når brugerens lokation ændres eller events loader
  useEffect(() => {
    if (userLocation && events.length > 0) {
      // Tjek om nogen events mangler distance
      const needsDistanceCalc = events.some(e => e.distance === undefined || e.distance === null);
      if (needsDistanceCalc) {
        const updatedEvents = events.map(event => {
          if (event.distance !== undefined) return event; // Spring over hvis allerede beregnet
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            event.latitude,
            event.longitude
          );
          return {
            ...event,
            distance,
            distanceText: distance < 1 
              ? `${Math.round(distance * 1000)}m`
              : `${distance.toFixed(1)}km`
          };
        });
        // sorterer på distance med tættest først
        updatedEvents.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        setEvents(updatedEvents);
      }
    }
  }, [userLocation, events]);

  // Filtrer events når filter settings ændrer
  useEffect(() => {
    if (events.length > 0) {
      applyEventsFilters(events);
    }
  }, [events, selectedDistance, selectedDateFilter]);

  // genberegner afstande når events loader efter userLocation allerede er sat
  useEffect(() => {
    const eventsDbRef = database.ref('globalEvents');
    
    const unsubscribe = eventsDbRef.on('value', async (snapshot) => {
      const eventsData = [];
      if (snapshot.exists()) {
        const events = snapshot.val();
        console.log('Global events structure:', Object.keys(events).length, 'events found');
        
        for (const [eventId, eventInfo] of Object.entries(events)) {
          try {
            // eventInfo indeholder enten userId eller venueId for at kunne finde den tilhørende event data
            let userId = eventInfo.userId || eventInfo.venueId;
            if (!userId) {
              console.log('No userId or venueId found in eventInfo for event:', eventId);
              continue;
            }
            
            // Henter den faktiske event data
            const eventSnapshot = await database.ref(`events/${userId}/${eventId}`).once('value');
            if (eventSnapshot.exists()) {
              const eventData = eventSnapshot.val();
              
              // Henter venue data for lokation
              const venueSnapshot = await database.ref(`venues/${userId}`).once('value');
              if (venueSnapshot.exists()) {
                const venueData = venueSnapshot.val();
                
                if (venueData.coordinates && venueData.coordinates.latitude && venueData.coordinates.longitude) {
                  const latitude = Number(venueData.coordinates.latitude);
                  const longitude = Number(venueData.coordinates.longitude);

                  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    continue;
                  }

                  const event = {
                    ...eventData,
                    venueId: userId,
                    venueName: venueData.name,
                    venueAddress: venueData.address,
                    latitude,
                    longitude,
                    id: eventId,
                  };
                  
                  // Beregn afstand hvis brugerens lokation er tilgængelig
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
        
        // sorterer på distance hvis brugerens lokation er tilgængelig
        eventsData.sort((a, b) => {
          try {
            const dateA = new Date(a.dateTime || a.timestamp || a.date || 0);
            const dateB = new Date(b.dateTime || b.timestamp || b.date || 0);
            
            // Håndter ugyldige datoer ved at placere dem til sidst
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
      } else {
        console.log('No events found in globalEvents');
        setEvents([]);
      }
    });
    
    return () => eventsDbRef.off('value', unsubscribe);
  }, []);
  
  // funktion til at anvende både distance og kategori filter på venues listen, kaldes når venues opdateres eller når filtervalg ændres
  const applyFilters = useCallback((venueList) => {
    const listToFilter = venueList || venuesRef.current;
    let filtered = [...listToFilter];
    
    if (selectedDistance && userLocation) {
      filtered = filtered.filter(venue => {
        const hasDistance = venue.distance !== undefined && venue.distance !== null;
        const withinRange = hasDistance && venue.distance <= selectedDistance;
        return withinRange;
      });
    }
    
    // hvis kategorifilter er valgt, filtrer både på primær kategori og aktivitetskategori
    if (selectedCategory) {
      filtered = filtered.filter(venue => {
        // tjek primær kategori
        if (venue.type === selectedCategory) return true;
        // tjek aktivitetskategorier
        if (venue.categories && venue.categories.includes(selectedCategory)) return true;
        return false;
      });
    }
  

    setFilteredVenues(filtered);
  }, [selectedDistance, selectedCategory, userLocation]);

  // funktion til at anvende filtre på events listen
  const applyEventsFilters = useCallback((eventList) => {
    const listToFilter = eventList || eventsRef.current;
    let filtered = [...listToFilter];
    
    // distance filter
    if (selectedDistance && userLocation) {
      filtered = filtered.filter(event => {
        const hasDistance = event.distance !== undefined && event.distance !== null;
        const withinRange = hasDistance && event.distance <= selectedDistance;
        return withinRange;
      });
    }
    
    // Filtrer udløbne events (anvend altid dette filter)
    const now = new Date();
    filtered = filtered.filter(event => {
      try {
        const dateSource = event.dateTime || event.timestamp || event.date;
        if (!dateSource) return false;
        
        const eventDate = new Date(dateSource);
        if (isNaN(eventDate.getTime())) return false; // Invalid dato
        
        return eventDate >= now; // ikke udløbne events
      } catch (error) {
        console.log('Error filtering expired events for event:', event.id, error);
        return false; // ekskluder events med fejl i dato parsing
      }
    });
    
    // Dato filter
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
  }, [selectedDistance, selectedDateFilter, userLocation]);
  
  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    setShowCategoryFilter(false);
  };
  
  // hændterer ændringer i distance input
  const handleDistanceInput = (text) => {
    setDistanceInput(text);
    const distance = parseFloat(text);
    if (!isNaN(distance) && distance > 0) {
      setSelectedDistance(distance);
    } else {
      setSelectedDistance(null);
    }
  };
  
  const clearDistanceFilter = () => {
    setSelectedDistance(null);
    setDistanceInput('');
    setShowDistanceFilter(false);
  };
  
  // funktioner til at håndtere visning af filter dropdowns, sørger for at kun en dropdown er åben ad gangen
  const toggleDistanceFilter = () => {
    if (showCategoryFilter) setShowCategoryFilter(false);
    setShowDistanceFilter(!showDistanceFilter);
  };
  
  const toggleCategoryFilter = () => {
    if (showDistanceFilter) setShowDistanceFilter(false);
    setShowCategoryFilter(!showCategoryFilter);
  };

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
        // følg venue
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Explore</Text>
              <Text style={styles.subtitle}>Discover local {viewMode === 'businesses' ? 'businesses' : 'events'}</Text>
              
              {/* visnings Toggle */}
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.toggleButton, viewMode === 'businesses' && styles.toggleButtonActive]}
                  onPress={() => {
                    setViewMode('businesses');
                    // lukker alle dropdowns når man skifter visning
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
              {/* Brugerens position marker */}
              {userLocation && (
                <Marker
                  coordinate={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude
                  }}
                  title="your position"
                  description="you are here"
                  pinColor="#007AFF"
                />
              )}
              
              {viewMode === 'businesses' ? 
                filteredVenues.map((venue) => {
                  const latitude = Number(venue.latitude);
                  const longitude = Number(venue.longitude);
                  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
                  return (
                    <Marker
                      key={venue.id}
                      coordinate={{ latitude, longitude }}
                      title={venue.name}
                      description={`${venue.type} • ${venue.location || venue.address}`}
                      onPress={() => navigation.navigate('Business', { venue })}
                    />
                  );
                }) :
                filteredEvents.map((event) => {
                  const latitude = Number(event.latitude);
                  const longitude = Number(event.longitude);
                  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
                  let dateStr = '';
                  try {
                    const date = new Date(event.dateTime || event.timestamp);
                    dateStr = date.toLocaleDateString();
                  } catch (e) {
                    dateStr = 'Date TBD';
                  }
                  return (
                    <Marker
                      key={event.id}
                      coordinate={{ latitude, longitude }}
                      title={event.title || event.name || 'Event'}
                      description={`${event.venueName || 'Venue'} • ${dateStr}`}
                      pinColor="#FF6B6B"
                      onPress={() => navigation.navigate('EventDetails', { event })}
                    />
                  );
                })
              }
            </MapView>
          )}
        </View>

        {/* Filter kontrol */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterTitle}>Filters:</Text>
            
            {/* Distance filter */}
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
            </View>
            
            {viewMode === 'businesses' ? (
              /* kategori filter til virksomheder */
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
              /* Dato filter til events */
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
            
            {/* Ryd filtre */}
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
          
          {/* kategori dropdown */}
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
          
          {/* Dato filter dropdown */}
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

        {/* Liste sektion med virksomheder */}
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
                scrollEnabled={false}
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
                // vis en tom tilstand hvis ingen venues matches filtrene
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No businesses found</Text>
                    <Text style={styles.emptySubtext}>Apply a filter or business owners can add their venues to appear here</Text>
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
                scrollEnabled={false}
                renderItem={({ item }) => {
                  let dateText = 'Date TBD';
                  
                  try {
                    // håndterer forskellige mulige dato/tid felter og formater, prøver at parse dem
                    let eventDate;
                    
                    if (item.dateTime) {
                      eventDate = new Date(item.dateTime);
                    } else if (item.timestamp) {
                      eventDate = new Date(item.timestamp);
                    } else if (item.dateISO && item.time) {
                      eventDate = new Date(item.dateISO + 'T' + item.time + ':00');
                    } else if (item.date) {
                      // håndterer forskellige datoformater, prøver først ISO format, så almindelig dato
                      eventDate = new Date(item.date);
                    }
                    
                    // tjek om datoen er gyldig
                    if (eventDate && !isNaN(eventDate.getTime())) {
                      dateText = eventDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                      
                      // tilføj tid hvis den er tilgængelig
                      if (item.time) {
                        dateText += ` • ${item.time}`;
                      }
                    } else if (item.date) {
                      // hvis parsing fejler, så brug rå dato tekst
                      dateText = item.date;
                      if (item.time) {
                        dateText += ` • ${item.time}`;
                      }
                    }
                  } catch (error) {
                    console.log('Error parsing event date for event:', item.id, error);
                    if (item.date) {
                      dateText = item.date;
                      if (item.time) {
                        dateText += ` • ${item.time}`;
                      }
                    }
                  }
                  
                  return (
                    <TouchableOpacity // gør hele kortet klikbart for at gå til event detaljer
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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


