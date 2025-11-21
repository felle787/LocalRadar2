import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  useWindowDimensions,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { homeScreenStyles } from '../styles/homeScreenStyles';



export default function HomeScreen({ navigation }) {
  const { currentUser, userProfile, logout } = useAuth();
  const [venues, setVenues] = useState([]);
  const [followedVenues, setFollowedVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all'); // 'all', 'today', 'upcoming', 'this-week', 'my-events'
  const [userParticipations, setUserParticipations] = useState({});
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const layout = useMemo(
    () => (isNarrow ? homeScreenStyles.stack : homeScreenStyles.rows),
    [isNarrow]
  );

  useEffect(() => {
    if (!userProfile) return;

    let venuesUnsubscribe, eventsUnsubscribe;

    // For customers, get followed venues
    if (userProfile.userType === 'customer') {
      if (userProfile.followedVenues && userProfile.followedVenues.length > 0) {
        const venuesRef = database.ref('venues');
        venuesUnsubscribe = venuesRef.on('value', (snapshot) => {
          const venuesList = [];
          if (snapshot.exists()) {
            const venues = snapshot.val();
            Object.keys(venues).forEach((key) => {
              if (userProfile.followedVenues.includes(key)) {
                const data = venues[key];
                venuesList.push({ 
                  id: key, 
                  ...data,
                  title: data.name,
                  venue: data.address || data.location,
                  date: data.isOpen ? 'Open Now' : 'Closed'
                });
              }
            });
          }
          setFollowedVenues(venuesList);
          setLoading(false);
        });
      } else {
        setFollowedVenues([]);
        setLoading(false);
      }

      // Load events for customers
      const eventsRef = database.ref('globalEvents');
      eventsUnsubscribe = eventsRef.limitToLast(10).on('value', (snapshot) => {
        const eventsList = [];
        if (snapshot.exists()) {
          const eventsData = snapshot.val();
          Object.keys(eventsData).forEach((key) => {
            eventsList.push({
              id: key,
              ...eventsData[key]
            });
          });
          // Sort by event date, soonest first
          eventsList.sort((a, b) => {
            const dateA = a.timestamp || new Date(a.dateTime || a.createdAt).getTime();
            const dateB = b.timestamp || new Date(b.dateTime || b.createdAt).getTime();
            return dateA - dateB;
          });
        }
        setEvents(eventsList);
        applyEventFilter(eventsList, eventFilter);
      });

    } else {
      // For business owners, get all venues for discovery (limited to 10)
      const venuesRef = database.ref('venues');
      venuesUnsubscribe = venuesRef.limitToFirst(10).on('value', (snapshot) => {
        const venuesList = [];
        if (snapshot.exists()) {
          const venues = snapshot.val();
          Object.keys(venues).forEach((key) => {
            const data = venues[key];
            venuesList.push({ 
              id: key, 
              ...data,
              title: data.name,
              venue: data.address || data.location,
              date: data.isOpen ? 'Open Now' : 'Closed'
            });
          });
        }
        setVenues(venuesList);
        setLoading(false);
      });
    }

    return () => {
      if (venuesUnsubscribe) {
        database.ref('venues').off('value', venuesUnsubscribe);
      }
      if (eventsUnsubscribe) {
        database.ref('globalEvents').off('value', eventsUnsubscribe);
      }
    };
  }, [userProfile]);
  
  // Load user's event participations
  useEffect(() => {
    if (!currentUser) {
      setUserParticipations({});
      return;
    }

    const participationsRef = database.ref('eventParticipants');
    const unsubscribe = participationsRef.on('value', (snapshot) => {
      const participations = {};
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(eventId => {
          if (data[eventId][currentUser.uid]) {
            participations[eventId] = true;
          }
        });
      }
      setUserParticipations(participations);
    });

    return () => {
      participationsRef.off('value', unsubscribe);
    };
  }, [currentUser]);
  
  // Filter events based on selected filter
  const applyEventFilter = (eventsList, filter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let filtered = eventsList;
    
    switch (filter) {
      case 'today':
        filtered = eventsList.filter(event => {
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          return eventDay.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        filtered = eventsList.filter(event => {
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          return eventDate >= now;
        });
        break;
      case 'this-week':
        filtered = eventsList.filter(event => {
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          return eventDate >= now && eventDate <= weekFromNow;
        });
        break;
      case 'my-events':
        filtered = eventsList.filter(event => {
          return userParticipations[event.id] === true;
        });
        break;
      default:
        filtered = eventsList;
    }
    
    setFilteredEvents(filtered);
  };
  
  // Update filtered events when filter changes
  useEffect(() => {
    applyEventFilter(events, eventFilter);
  }, [events, eventFilter, userParticipations]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <SafeAreaView style={homeScreenStyles.safe}>
      <View style={homeScreenStyles.screen}>
        <View style={homeScreenStyles.header}>
          <Text style={homeScreenStyles.title}>LocalRadar</Text>
          <TouchableOpacity onPress={handleLogout} style={homeScreenStyles.logoutButton}>
            <Text style={homeScreenStyles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={homeScreenStyles.search}
          placeholder="Search..."
          placeholderTextColor="#aaa"
        />

        <View style={[homeScreenStyles.content, layout]}>
          {/* Different content based on user type */}
          {userProfile?.userType === 'customer' ? (
            <>
              {/* Customer view: Followed venues */}
              <View style={[homeScreenStyles.section, homeScreenStyles.top]}>
                <Text style={homeScreenStyles.sectionTitle}>
                  {followedVenues.length > 0 ? 'Following' : 'Discover Venues'}
                </Text>
                {followedVenues.length > 0 ? (
                  <FlatList
                    data={followedVenues}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={homeScreenStyles.listPad}
                    showsHorizontalScrollIndicator={false}
                    horizontal={true}
                    renderItem={({ item }) => <EstablishmentCard item={item} />}
                  />
                ) : (
                  <View style={homeScreenStyles.emptyState}>
                    <Text style={homeScreenStyles.emptyText}>
                      You're not following any venues yet.{'\n'}
                      Check out the Explore tab to discover local venues!
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Business owner view: Other venues for inspiration */}
              <View style={[homeScreenStyles.section, homeScreenStyles.top]}>
                <Text style={homeScreenStyles.sectionTitle}>Other Venues</Text>
                {venues.length > 0 ? (
                  <FlatList
                    data={venues}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={homeScreenStyles.listPad}
                    showsHorizontalScrollIndicator={false}
                    horizontal={true}
                    renderItem={({ item }) => <EstablishmentCard item={item} />}
                  />
                ) : (
                  <View style={homeScreenStyles.emptyState}>
                    <Text style={homeScreenStyles.emptyText}>
                      No other venues to display.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Bottom section: Recent events or quick stats */}
          <View style={[homeScreenStyles.section, homeScreenStyles.bottom]}>
            <View style={homeScreenStyles.sectionHeader}>
              <Text style={homeScreenStyles.sectionTitle}>
                {userProfile?.userType === 'customer' ? 'Events' : 'Quick Stats'}
              </Text>
              {userProfile?.userType === 'customer' && (
                <ScrollView 
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={homeScreenStyles.filterScrollView}
                  contentContainerStyle={homeScreenStyles.filterRow}
                >
                  {['all', 'today', 'upcoming', 'this-week', 'my-events'].map(filter => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        homeScreenStyles.filterButton,
                        eventFilter === filter && homeScreenStyles.filterButtonActive
                      ]}
                      onPress={() => setEventFilter(filter)}
                    >
                      <Text style={[
                        homeScreenStyles.filterButtonText,
                        eventFilter === filter && homeScreenStyles.filterButtonTextActive
                      ]}>
                        {filter === 'this-week' 
                          ? 'This Week' 
                          : filter === 'my-events' 
                            ? 'My Events' 
                            : filter.charAt(0).toUpperCase() + filter.slice(1)
                        }
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            {loading ? (
              <Text style={homeScreenStyles.loadingText}>Loading...</Text>
            ) : userProfile?.userType === 'customer' ? (
              filteredEvents.length > 0 ? (
                <FlatList
                  data={filteredEvents.slice(0, 8)} // Show up to 8 filtered events
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={homeScreenStyles.listPad}
                  showsHorizontalScrollIndicator={false}
                  horizontal={true}
                  renderItem={({ item }) => <EventCard item={item} navigation={navigation} />}
                />
              ) : (
                <View style={homeScreenStyles.emptyState}>
                  <Text style={homeScreenStyles.emptyText}>
                    {events.length === 0 
                      ? "No events posted yet.\nFollow some venues to see their events!"
                      : eventFilter === 'my-events'
                        ? "You haven't joined any events yet.\nBrowse events and join the ones you like!"
                        : `No events found for "${eventFilter === 'this-week' ? 'This Week' : eventFilter.charAt(0).toUpperCase() + eventFilter.slice(1)}"`
                    }
                  </Text>
                </View>
              )
            ) : (
              <View style={homeScreenStyles.emptyState}>
                <Text style={homeScreenStyles.emptyText}>
                  Manage your events in the Events tab
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function EstablishmentCard({ item }) {
  return (
    <View style={homeScreenStyles.cardRow}>
      {item.img ? (
        <Image source={item.img} style={homeScreenStyles.thumb} />
      ) : item.image ? (
        <Image source={{ uri: item.image }} style={homeScreenStyles.thumb} />
      ) : (
        <View style={[homeScreenStyles.thumb, homeScreenStyles.placeholderImage]}>
          <Text style={homeScreenStyles.placeholderText}>
            {(item.name || item.title || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={homeScreenStyles.cardTitle}>{item.name || item.title}</Text>
      <Text style={homeScreenStyles.subtle}>{item.type || item.category}</Text>
      <Text style={homeScreenStyles.distance}>{item.location || item.address}</Text>
      <View style={homeScreenStyles.badgeFollowing}>
        <Text style={homeScreenStyles.badgeText}>Following</Text>
      </View>
    </View>
  );
}

function EventCard({ item, navigation }) {
  const handlePress = () => {
    navigation.navigate('EventDetails', { event: item });
  };

  return (
    <TouchableOpacity style={homeScreenStyles.cardCol} onPress={handlePress}>
      <View style={homeScreenStyles.rowBetween}>
        <Text style={homeScreenStyles.eventTitle}>{item.title}</Text>
        {item.isFree ? (
          <View style={homeScreenStyles.freeBadge}>
            <Text style={homeScreenStyles.freeBadgeText}>FREE</Text>
          </View>
        ) : (
          <View style={homeScreenStyles.priceBadge}>
            <Text style={homeScreenStyles.priceBadgeText}>{item.ticketPrice} kr</Text>
          </View>
        )}
      </View>
      <Text style={homeScreenStyles.subtle}>{item.venueName}</Text>
      <Text style={homeScreenStyles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={homeScreenStyles.eventDate}>
        {item.date}{item.time ? ` • ${item.time}` : ''}
      </Text>
      {item.maxCapacity && (
        <Text style={homeScreenStyles.capacityInfo}>
          {item.currentAttendees || 0}/{item.maxCapacity} participants
        </Text>
      )}
    </TouchableOpacity>
  );
}