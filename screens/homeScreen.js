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
  const [wallPosts, setWallPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('my-events'); // 'my-events', 'all', 'today', 'upcoming', 'this-week', 'past'
  const [viewMode, setViewMode] = useState('events'); // 'events' or 'my-wall'
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

    // For customers, get followed and suggested venues
    if (userProfile.userType === 'customer') {
      const venuesRef = database.ref('venues');
      venuesUnsubscribe = venuesRef.on('value', (snapshot) => {
        const allVenues = [];
        const followedList = [];
        if (snapshot.exists()) {
          const venuesData = snapshot.val();
          Object.keys(venuesData).forEach((key) => {
            const data = venuesData[key];
            const venueItem = { 
              id: key, 
              ...data,
              title: data.name,
              venue: data.address || data.location,
              date: data.isOpen ? 'Open Now' : 'Closed'
            };
            allVenues.push(venueItem);
            if (userProfile.followedVenues?.includes(key)) {
              followedList.push(venueItem);
            }
          });
        }
        setVenues(allVenues);
        setFollowedVenues(followedList);
        setLoading(false);
      });

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

  // Load posts and events from followed venues for "My Wall" view
  useEffect(() => {
    if (!userProfile?.followedVenues || userProfile.followedVenues.length === 0) {
      setWallPosts([]);
      return;
    }

    const combinedPosts = [];
    let completedRequests = 0;
    const totalVenues = userProfile.followedVenues.length;

    const loadEventsForWall = (posts) => {
      const eventsRef = database.ref('globalEvents');
      eventsRef.once('value', (eventSnapshot) => {
        if (eventSnapshot.exists()) {
          const allEvents = eventSnapshot.val();
          Object.keys(allEvents).forEach((eventId) => {
            const event = allEvents[eventId];
            if (userProfile.followedVenues.includes(event.venueId)) {
              posts.push({
                id: eventId,
                type: 'event',
                ...event,
                venueId: event.venueId
              });
            }
          });
        }
        
        // Sort combined posts and events by timestamp
        posts.sort((a, b) => {
          const timeA = a.timestamp || new Date(a.dateTime || a.createdAt || Date.now()).getTime();
          const timeB = b.timestamp || new Date(b.dateTime || b.createdAt || Date.now()).getTime();
          return timeB - timeA;
        });
        
        console.log('Wall posts loaded:', posts.length, 'items');
        console.log('Posts by type:', posts.filter(p => p.type === 'post').length, 'posts,', posts.filter(p => p.type === 'event').length, 'events');
        setWallPosts(posts);
      });
    };

    // Load posts from each followed venue
    userProfile.followedVenues.forEach((venueId) => {
      const postsRef = database.ref(`businessPosts/${venueId}`);
      postsRef.once('value', (snapshot) => {
        console.log(`Checking posts for venue ${venueId}:`, snapshot.exists());
        if (snapshot.exists()) {
          const posts = snapshot.val();
          console.log(`Found ${Object.keys(posts).length} posts for venue ${venueId}`);
          Object.keys(posts).forEach((postId) => {
            combinedPosts.push({
              id: postId,
              type: 'post',
              ...posts[postId],
              venueId: venueId
            });
          });
        }
        completedRequests++;
        
        // Once all posts are loaded, also load events
        if (completedRequests === totalVenues) {
          loadEventsForWall(combinedPosts);
        }
      });
    });
  }, [userProfile?.followedVenues]);
  
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
          return eventDay.getTime() === today.getTime() && eventDate >= now;
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
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          return userParticipations[event.id] === true && eventDate >= now;
        });
        break;
      case 'following':
        filtered = eventsList.filter(event => {
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          return userProfile?.followedVenues?.includes(event.venueId) && eventDate >= now;
        });
        break;
      case 'suggested':
        filtered = [];
        break;
      case 'past':
        filtered = eventsList.filter(event => {
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          return eventDate < now;
        });
        break;
      default:
        // 'all' shows only future events
        filtered = eventsList.filter(event => {
          const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
          return eventDate >= now;
        });
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
          <Image 
            source={require('../assets/LocalRadar.png')} 
            style={homeScreenStyles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* View Toggle for customers only */}
        {userProfile?.userType === 'customer' && (
          <View style={homeScreenStyles.viewToggle}>
            <TouchableOpacity
              style={[homeScreenStyles.toggleButton, viewMode === 'events' && homeScreenStyles.toggleButtonActive]}
              onPress={() => setViewMode('events')}
            >
              <Text style={[homeScreenStyles.toggleButtonText, viewMode === 'events' && homeScreenStyles.toggleButtonTextActive]}>
                Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeScreenStyles.toggleButton, viewMode === 'my-wall' && homeScreenStyles.toggleButtonActive]}
              onPress={() => setViewMode('my-wall')}
            >
              <Text style={[homeScreenStyles.toggleButtonText, viewMode === 'my-wall' && homeScreenStyles.toggleButtonTextActive]}>
                My Wall
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[homeScreenStyles.content, layout]}>
          {/* Different content based on user type */}
          {userProfile?.userType === 'customer' ? (
            viewMode === 'events' ? (
              <>
                <View style={[homeScreenStyles.section, homeScreenStyles.bottom]}>
                  <View style={homeScreenStyles.sectionHeader}>
                    <Text style={homeScreenStyles.sectionTitle}>Events and Venues</Text>
                    <ScrollView 
                      horizontal={true}
                      showsHorizontalScrollIndicator={false}
                      style={homeScreenStyles.filterScrollView}
                      contentContainerStyle={homeScreenStyles.filterRow}
                    >
                      {['following', 'suggested', 'my-events', 'all', 'today', 'upcoming', 'this-week', 'past'].map(filter => (
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
                                : filter === 'following'
                                  ? 'Following'
                                  : filter === 'suggested'
                                    ? 'Suggested'
                                    : filter.charAt(0).toUpperCase() + filter.slice(1)
                            }
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                    {eventFilter === 'suggested' ? (
                    (() => {
                      const suggestedVenues = venues.filter(v => !userProfile?.followedVenues?.includes(v.id));
                      return suggestedVenues.length > 0 ? (
                        <FlatList
                          data={suggestedVenues}
                          keyExtractor={(item) => item.id}
                          contentContainerStyle={{ paddingBottom: 24 }}
                          ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
                          renderItem={({ item }) => (
                            <View style={homeScreenStyles.venueCardItem}>
                                  <EstablishmentCard item={item} navigation={navigation} showFollowingBadge={false} />
                            </View>
                          )}
                        />
                      ) : (
                        <View style={homeScreenStyles.emptyState}>
                          <Text style={homeScreenStyles.emptyText}>
                            No suggested venues right now.
                          </Text>
                        </View>
                      );
                    })()
                  ) : eventFilter === 'following' ? (
                    followedVenues.length > 0 ? (
                      <FlatList
                        data={followedVenues}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
                        renderItem={({ item }) => (
                          <View style={homeScreenStyles.venueCardItem}>
                                <EstablishmentCard item={item} navigation={navigation} showFollowingBadge={true} />
                          </View>
                        )}
                      />
                    ) : (
                      <View style={homeScreenStyles.emptyState}>
                        <Text style={homeScreenStyles.emptyText}>
                          You're not following any venues yet.{"\n"}
                          Check out the Explore tab to discover local venues!
                        </Text>
                      </View>
                    )
                  ) : loading ? (
                    <Text style={homeScreenStyles.loadingText}>Loading...</Text>
                  ) : (
                    <FlatList
                      data={filteredEvents}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={{ paddingBottom: 24 }}
                      ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
                      renderItem={({ item }) => (
                        <View style={homeScreenStyles.venueCardItem}>
                          <EventCard item={item} navigation={navigation} />
                        </View>
                      )}
                      ListEmptyComponent={
                        <View style={homeScreenStyles.emptyState}>
                          <Text style={homeScreenStyles.emptyText}>
                            {events.length === 0 
                              ? "No events posted yet.\nFollow some venues to see their events!"
                              : eventFilter === 'my-events'
                                ? "You haven't joined any upcoming events yet.\nBrowse events and join the ones you like!"
                                : `No events found for "${eventFilter === 'this-week' ? 'This Week' : eventFilter.charAt(0).toUpperCase() + eventFilter.slice(1)}"`
                            }
                          </Text>
                        </View>
                      }
                    />
                  )}
                </View>
              </>
            ) : (
              <FlatList
                data={wallPosts}
                keyExtractor={(item) => item.id}
                style={homeScreenStyles.wallPostsList}
                contentContainerStyle={{ paddingBottom: 24 }}
                ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
                renderItem={({ item }) => (
                  item.type === 'post' ? (
                    <PostCard post={item} navigation={navigation} />
                  ) : (
                    <WallEventCard event={item} navigation={navigation} />
                  )
                )}
                ListEmptyComponent={
                  <View style={homeScreenStyles.emptyState}>
                    <Text style={homeScreenStyles.emptyText}>
                      No posts or events yet from the venues you follow.
                    </Text>
                  </View>
                }
              />
            )
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
                    renderItem={({ item }) => <EstablishmentCard item={item} navigation={navigation} />}
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

          {/* Bottom section for business owners only */}
          {userProfile?.userType !== 'customer' && (
          <View style={[homeScreenStyles.section, homeScreenStyles.bottom]}>
            <View style={homeScreenStyles.sectionHeader}>
              <Text style={homeScreenStyles.sectionTitle}>Quick Stats</Text>
            </View>
            <View style={homeScreenStyles.emptyState}>
              <Text style={homeScreenStyles.emptyText}>
                Manage your events in the Events tab
              </Text>
            </View>
          </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function EstablishmentCard({ item, navigation, showFollowingBadge = false }) {
  const handlePress = () => {
    navigation.navigate('BusinessPostWall', { 
      businessId: item.id || item.key,
      businessName: item.name || item.title 
    });
  };

  return (
    <TouchableOpacity style={homeScreenStyles.cardRow} onPress={handlePress}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={homeScreenStyles.thumb} />
      ) : item.img ? (
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
      {showFollowingBadge && (
        <View style={homeScreenStyles.badgeFollowing}>
          <Text style={homeScreenStyles.badgeText}>Following</Text>
        </View>
      )}
    </TouchableOpacity>
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
function PostCard({ post, navigation }) {
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (post.venueId) {
      database.ref(`venues/${post.venueId}`).once('value', (snapshot) => {
        if (snapshot.exists()) {
          setBusinessName(snapshot.val().name);
        }
      });
    }
  }, [post.venueId]);

  const handlePress = () => {
    navigation.navigate('BusinessPostWall', { 
      businessId: post.venueId,
      businessName: businessName 
    });
  };

  return (
    <TouchableOpacity style={homeScreenStyles.postCardItem} onPress={handlePress}>
      {businessName && (
        <Text style={homeScreenStyles.postCardBusinessName}>{businessName}</Text>
      )}
      {post.text && (
        <Text style={homeScreenStyles.postCardText}>{post.text}</Text>
      )}
      {(post.imageUrl || post.image) && (
        <Image 
          source={{ uri: post.imageUrl || post.image }} 
          style={homeScreenStyles.postCardImage}
          resizeMode="cover"
        />
      )}
      <Text style={homeScreenStyles.postCardDate}>
        {new Date(post.timestamp || post.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

function WallEventCard({ event, navigation }) {
  const handlePress = () => {
    navigation.navigate('EventDetails', { event });
  };

  return (
    <TouchableOpacity style={homeScreenStyles.postCardItem} onPress={handlePress}>
      <Text style={homeScreenStyles.eventTitle}>{event.title}</Text>
      <Text style={homeScreenStyles.subtle}>{event.venueName}</Text>
      <Text style={homeScreenStyles.eventDescription} numberOfLines={2}>
        {event.description}
      </Text>
      <View style={homeScreenStyles.rowBetween}>
        <Text style={homeScreenStyles.eventDate}>
          {event.date}{event.time ? ` • ${event.time}` : ''}
        </Text>
        {event.isFree ? (
          <View style={homeScreenStyles.freeBadge}>
            <Text style={homeScreenStyles.freeBadgeText}>FREE</Text>
          </View>
        ) : (
          <View style={homeScreenStyles.priceBadge}>
            <Text style={homeScreenStyles.priceBadgeText}>{event.ticketPrice} kr</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
