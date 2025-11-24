import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  Easing 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function EventsScreen() {
  const { currentUser, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form collapse state
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Form fields for new event
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  
  // Format dates for display and storage
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (time) => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  const formatDateISO = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Toggle form expansion with animation
  const toggleForm = () => {
    const toValue = isFormExpanded ? 0 : 1;
    setIsFormExpanded(!isFormExpanded);
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

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

    // Date and time are now always set from pickers, so no validation needed for empty values
    const eventDateTime = new Date(selectedDate);
    eventDateTime.setHours(selectedTime.getHours());
    eventDateTime.setMinutes(selectedTime.getMinutes());
    
    // Check if event is in the past
    if (eventDateTime < new Date()) {
      Alert.alert('Invalid Date', 'Event date and time cannot be in the past.');
      return;
    }
    
    // Validate capacity
    if (maxCapacity.trim() && (isNaN(maxCapacity) || parseInt(maxCapacity) < 1)) {
      Alert.alert('Invalid Capacity', 'Maximum capacity must be a positive number.');
      return;
    }
    
    // Validate price
    if (!isFreeEvent && ticketPrice.trim() && (isNaN(ticketPrice) || parseFloat(ticketPrice) < 0)) {
      Alert.alert('Invalid Price', 'Ticket price must be a valid number.');
      return;
    }
    
    // Validate capacity
    if (maxCapacity.trim() && (isNaN(maxCapacity) || parseInt(maxCapacity) < 1)) {
      Alert.alert('Invalid Capacity', 'Maximum capacity must be a positive number.');
      return;
    }
    
    // Validate price
    if (!isFreeEvent && ticketPrice.trim() && (isNaN(ticketPrice) || parseFloat(ticketPrice) < 0)) {
      Alert.alert('Invalid Price', 'Ticket price must be a valid number.');
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

      const eventDateTime = new Date(selectedDate);
      eventDateTime.setHours(selectedTime.getHours());
      eventDateTime.setMinutes(selectedTime.getMinutes());
      
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: formatDate(selectedDate),
        time: formatTime(selectedTime),
        dateISO: formatDateISO(selectedDate),
        dateTime: eventDateTime.toISOString(),
        timestamp: eventDateTime.getTime(),
        maxCapacity: maxCapacity.trim() ? parseInt(maxCapacity) : null,
        isFree: isFreeEvent,
        ticketPrice: isFreeEvent ? 0 : (ticketPrice.trim() ? parseFloat(ticketPrice) : 0),
        currentAttendees: 0,
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
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setMaxCapacity('');
      setTicketPrice('');
      setIsFreeEvent(true);
      
      // Collapse form after successful creation
      toggleForm();
      setMaxCapacity('');
      setTicketPrice('');
      setIsFreeEvent(true);
      
      // Collapse form after successful creation
      toggleForm();

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Create New Event</Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={toggleForm}
            >
              <Text style={[styles.toggleIcon, { transform: [{ rotate: isFormExpanded ? '45deg' : '0deg' }] }]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
          
          <Animated.View style={[
            styles.formContainer,
            {
              maxHeight: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 800],
              }),
              opacity: slideAnim,
            }
          ]}>
          
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
              <Text style={styles.label}>Event Date *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setShowTimePicker(false);
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Event Time *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.dateTimeText}>{formatTime(selectedTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  if (date) setSelectedDate(date);
                }}
                style={styles.datePicker}
                textColor="#ffffff"
                themeVariant="dark"
              />
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {showTimePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={(event, time) => {
                  if (time) setSelectedTime(time);
                }}
                style={styles.datePicker}
                textColor="#ffffff"
                themeVariant="dark"
              />
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Capacity Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Capacity (Optional)</Text>
            <TextInput
              style={styles.input}
              value={maxCapacity}
              onChangeText={setMaxCapacity}
              placeholder="e.g. 50"
              placeholderTextColor="#9aa0a6"
              keyboardType="numeric"
            />
          </View>
          
          {/* Pricing Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Pricing</Text>
            <View style={styles.pricingToggle}>
              <TouchableOpacity
                style={[styles.pricingOption, isFreeEvent && styles.pricingOptionActive]}
                onPress={() => setIsFreeEvent(true)}
              >
                <Text style={[styles.pricingOptionText, isFreeEvent && styles.pricingOptionTextActive]}>
                  Free Event
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingOption, !isFreeEvent && styles.pricingOptionActive]}
                onPress={() => setIsFreeEvent(false)}
              >
                <Text style={[styles.pricingOptionText, !isFreeEvent && styles.pricingOptionTextActive]}>
                  Paid Event
                </Text>
              </TouchableOpacity>
            </View>
            
            {!isFreeEvent && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={ticketPrice}
                onChangeText={setTicketPrice}
                placeholder="Enter price (e.g. 150.00 DKK)"
                placeholderTextColor="#9aa0a6"
                keyboardType="decimal-pad"
              />
            )}
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
          </Animated.View>
        </View>

        {/* Existing Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Your Events</Text>
          
          {events.length > 0 ? (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventTitleContainer}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.isFree ? (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                      </View>
                    ) : (
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceBadgeText}>{event.ticketPrice} kr</Text>
                      </View>
                    )}
                  </View>
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
                {event.maxCapacity && (
                  <Text style={styles.capacityInfo}>
                    Capacity: {event.currentAttendees || 0}/{event.maxCapacity}
                  </Text>
                )}
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
  dateTimeButton: {
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b2b31',
    alignItems: 'center',
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: '#2a2a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a3e',
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 8,
  },
  datePicker: {
    backgroundColor: '#1a1a1e',
    color: '#fff',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b31',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0084ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  formContainer: {
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  pricingToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#2b2b31',
    padding: 2,
  },
  pricingOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  pricingOptionActive: {
    backgroundColor: '#0084ff',
  },
  pricingOptionText: {
    color: '#9aa0a6',
    fontWeight: '600',
    fontSize: 14,
  },
  pricingOptionTextActive: {
    color: '#fff',
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
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  freeBadge: {
    backgroundColor: '#00c851',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  capacityInfo: {
    color: '#9aa0a6',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});