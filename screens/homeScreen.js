import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  useWindowDimensions,
  TextInput,
  TouchableOpacity,
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
  const [loading, setLoading] = useState(true);
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
          // Sort by creation date, newest first
          eventsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        setEvents(eventsList);
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
            <Text style={homeScreenStyles.sectionTitle}>
              {userProfile?.userType === 'customer' ? 'Upcoming Events' : 'Quick Stats'}
            </Text>
            {loading ? (
              <Text style={homeScreenStyles.loadingText}>Loading...</Text>
            ) : userProfile?.userType === 'customer' ? (
              events.length > 0 ? (
                <FlatList
                  data={events.slice(0, 5)} // Show latest 5 events
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={homeScreenStyles.listPad}
                  showsHorizontalScrollIndicator={false}
                  horizontal={true}
                  renderItem={({ item }) => <EventCard item={item} />}
                />
              ) : (
                <View style={homeScreenStyles.emptyState}>
                  <Text style={homeScreenStyles.emptyText}>
                    No events posted yet.{'\n'}
                    Follow some venues to see their events!
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

function EventCard({ item }) {
  return (
    <View style={homeScreenStyles.cardCol}>
      <View style={homeScreenStyles.rowBetween}>
        <Text style={homeScreenStyles.eventTitle}>{item.title}</Text>
      </View>
      <Text style={homeScreenStyles.subtle}>{item.venueName}</Text>
      <Text style={homeScreenStyles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={homeScreenStyles.eventDate}>
        {item.date}{item.time ? ` • ${item.time}` : ''}
      </Text>
    </View>
  );
}