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

// Profilskærm for brugere, viser brugerinfo, fulgte virksomheder, mine events og notifikationsindstillinger
export default function ProfileScreen({ navigation }) {
  const { currentUser, userProfile, logout } = useAuth();
  const [followedVenues, setFollowedVenues] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [newEventNotifications, setNewEventNotifications] = useState(true);
  const [dayBeforeReminders, setDayBeforeReminders] = useState(true);
  const [eventDayReminders, setEventDayReminders] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  useEffect(() => {
    if (currentUser && userProfile) {
      let followedUnsubscribe, eventsUnsubscribe;

      // henter fulgte virksomheder for at vise i profilen
      const venuesRef = database.ref('venues');
      
      followedUnsubscribe = venuesRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const venues = snapshot.val();
          const allVenues = Object.keys(venues).map(key => ({
            id: key,
            ...venues[key]
          }));

          //filtrerer de virksomheder som brugeren følger for at vise i profilen
          if (userProfile.followedVenues && userProfile.followedVenues.length > 0) {
            const followed = allVenues.filter(venue => 
              userProfile.followedVenues.includes(venue.id)
            );
            setFollowedVenues(followed);
          } else {
            setFollowedVenues([]);
          }
        } else {
          setFollowedVenues([]);
        }
      });

      // Henter mine events (tilmeldte events der ikke er passeret)
      const eventsRef = database.ref('globalEvents');
      const participantsRef = database.ref('eventParticipants');
      
      eventsUnsubscribe = participantsRef.on('value', (participantsSnapshot) => {
        if (participantsSnapshot.exists()) {
          const participants = participantsSnapshot.val();
          const myEventIds = [];
          
          // finder alle eventIDs hvor den nuværende bruger er tilmeldt
          Object.keys(participants).forEach(eventId => {
            if (participants[eventId][currentUser.uid]) {
              myEventIds.push(eventId);
            }
          });
          
          // Henter detaljer for mine events
          eventsRef.once('value', (eventsSnapshot) => {
            if (eventsSnapshot.exists()) {
              const events = eventsSnapshot.val();
              const now = new Date();
              const upcomingEvents = [];
              
              myEventIds.forEach(eventId => {
                if (events[eventId]) {
                  const event = events[eventId];
                  const eventDate = new Date(event.timestamp || event.dateTime || event.createdAt);
                  
                  // Inkluder kun kommende events (ikke passerede)
                  if (eventDate >= now) {
                    upcomingEvents.push({
                      id: eventId,
                      ...event
                    });
                  }
                }
              });
              
              // Sorter efter dato
              upcomingEvents.sort((a, b) => {
                const dateA = new Date(a.timestamp || a.dateTime || a.createdAt);
                const dateB = new Date(b.timestamp || b.dateTime || b.createdAt);
                return dateA - dateB;
              });
              
              setMyEvents(upcomingEvents);
            } else {
              setMyEvents([]);
            }
          });
        } else {
          setMyEvents([]);
        }
      });

      return () => {
        if (followedUnsubscribe) {
          venuesRef.off('value', followedUnsubscribe);
        }
        if (eventsUnsubscribe) {
          participantsRef.off('value', eventsUnsubscribe);
        }
      };
    }
  }, [currentUser, userProfile]);

  // Indlæser notifikationspræferencer når brugerprofil er tilgængelig
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
        setNewEventNotifications(prefs.newEventNotifications !== false);
        setDayBeforeReminders(prefs.dayBeforeReminders !== false); 
        setEventDayReminders(prefs.eventDayReminders !== false); 
      }
    } catch (error) {
      console.log('Error loading notification preferences:', error);
    }
  };

  const updateNotificationPreference = async (type, value) => {
    try {
      await database.ref(`users/${currentUser.uid}/notificationPreferences/${type}`).set(value);
      
      // Opdaterer lokalt for at sikre at UI reflekterer ændringen med det samme
      const updatedPreferences = {
        newEventNotifications: type === 'newEventNotifications' ? value : newEventNotifications,
        dayBeforeReminders: type === 'dayBeforeReminders' ? value : dayBeforeReminders,
        eventDayReminders: type === 'eventDayReminders' ? value : eventDayReminders
      };
      
      await NotificationService.saveUserNotificationData(currentUser.uid, updatedPreferences);
      
      // Hvis det er en event reminder præference og den er slået til, så planlæg notifikationer for de events brugeren er tilmeldt
      if ((type === 'eventDayReminders' || type === 'dayBeforeReminders') && value) {
        await NotificationService.scheduleUserNotifications(currentUser.uid, updatedPreferences);
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
    myEvents: myEvents.length,
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

        {/* bruger mail */}
        <View style={profileScreenStyles.userSection}>
          <Text style={profileScreenStyles.userEmail}>{currentUser?.email}</Text>
          <Text style={profileScreenStyles.userType}>
            {userProfile?.userType === 'business' ? 'Business Account' : 'Customer Account'}
          </Text>
        </View>

        {/* Statistik række */}
        <View style={profileScreenStyles.statsRow}>
          <StatCard label="Following" value={stats.following} />
          <StatCard label="My Events" value={stats.myEvents} />
        </View>

        {/* Notifikationsindstillinger */}
        <View style={profileScreenStyles.notificationSection}>
          <TouchableOpacity
            style={profileScreenStyles.notificationHeader}
            onPress={() => setShowNotificationSettings(!showNotificationSettings)}
          >
            <Text style={profileScreenStyles.sectionTitle}>Notification Settings</Text>
            <Text style={profileScreenStyles.notificationChevron}>
              {showNotificationSettings ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {/* vis notifikationsindstillinger */}
          {showNotificationSettings && (
            <>
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
            </>
          )}
        </View>

        {/* Fulgte Venues */}
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