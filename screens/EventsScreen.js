import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  FlatList,
  StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function EventsScreen() {
  const { currentUser, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields for new event
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Load existing events for this venue
  useEffect(() => {
    if (!currentUser) return;
    
    const eventsRef = database.ref(`events/${currentUser.uid}`);
    const unsubscribe = eventsRef.on('value', (snapshot) => {
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
      setLoading(false);
    });

    return () => eventsRef.off('value', unsubscribe);
  }, [currentUser]);

  const handlePostEvent = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter an event description.');
      return;
    }

    if (!date.trim()) {
      Alert.alert('Missing Date', 'Please enter the event date.');
      return;
    }

    try {
      setSaving(true);
      
      // Get venue information first
      const venueSnapshot = await database.ref(`venues/${currentUser.uid}`).once('value');
      const venueData = venueSnapshot.val();
      
      if (!venueData) {
        Alert.alert('Error', 'Please set up your venue first in the Business tab');
        setSaving(false);
        return;
      }

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        time: time.trim(),
        venueId: currentUser.uid,
        venueName: venueData.name,
        venueAddress: venueData.address,
        venueLocation: venueData.location,
        createdAt: new Date().toISOString(),
      };

      // Create new event with auto-generated ID
      const newEventRef = database.ref(`events/${currentUser.uid}`).push();
      await newEventRef.set(eventData);

      // Also add to global events for homepage
      await database.ref(`globalEvents/${newEventRef.key}`).set({
        ...eventData,
        eventId: newEventRef.key
      });

      // Clear form
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');

      Alert.alert('Success!', 'Your event has been posted!');
    } catch (error) {
      console.error('Error posting event:', error);
      Alert.alert('Error', 'Failed to post event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await database.ref(`events/${currentUser.uid}/${eventId}`).remove();
              await database.ref(`globalEvents/${eventId}`).remove();
              Alert.alert('Success', 'Event deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Event Creation Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Create New Event</Text>
          
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Live Jazz Night"
            placeholderTextColor="#9aa0a6"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your event..."
            placeholderTextColor="#9aa0a6"
            multiline
            numberOfLines={4}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="e.g. Dec 15, 2025"
                placeholderTextColor="#9aa0a6"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Time (Optional)</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="e.g. 8:00 PM"
                placeholderTextColor="#9aa0a6"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, saving && styles.buttonDisabled]} 
            onPress={handlePostEvent}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Posting...' : 'Post Event'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Your Events</Text>
          
          {events.length > 0 ? (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <TouchableOpacity 
                    onPress={() => handleDeleteEvent(event.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <Text style={styles.eventDate}>
                  {event.date}{event.time ? ` • ${event.time}` : ''}
                </Text>
                <Text style={styles.eventCreated}>
                  Posted: {new Date(event.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events posted yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first event to engage with customers!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 32,
  },
  eventsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    color: '#c9c9ce',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1a1a1e',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b2b31',
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: '#1a1a1e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b2b31',
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDescription: {
    color: '#c9c9ce',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  eventDate: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventCreated: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#c9c9ce',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9aa0a6',
    fontSize: 14,
    textAlign: 'center',
  },
});