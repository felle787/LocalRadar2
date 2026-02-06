import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  FlatList,

  Animated,
  Easing 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../styles/EventsScreenStyles';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function EventsScreen() {
  const { currentUser, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formular kollaps tilstand
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Formularfelter for nyt event
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  
  // Formater datoer til visning og lagring
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
  
  // Skift formularudvidelse med animation
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

  // Hent eksisterende events for dette venue
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
        // Sorter efter oprettelsesdato, nyeste først
        eventsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      setEvents(eventsList);
      setLoading(false);
    });

    return () => eventsRef.off('value', unsubscribe);
  }, [currentUser]);

  // Anvend filter, når events eller filter ændres
  useEffect(() => {
    const now = new Date();
    let filtered = [];

    if (eventFilter === 'upcoming') {
      filtered = events.filter(event => {
        const eventDate = new Date(event.dateTime || event.createdAt);
        return eventDate >= now;
      });
    } else if (eventFilter === 'past') {
      filtered = events.filter(event => {
        const eventDate = new Date(event.dateTime || event.createdAt);
        return eventDate < now;
      });
    } else {
      filtered = events;
    }

    setFilteredEvents(filtered);
  }, [events, eventFilter]);

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

    // Dato og tid er nu altid sat fra pickere, så der er ikke behov for validering af tomme værdier
    const eventDateTime = new Date(selectedDate);
    eventDateTime.setHours(selectedTime.getHours());
    eventDateTime.setMinutes(selectedTime.getMinutes());
    
    // Tjek om event er i fortiden
    if (eventDateTime < new Date()) {
      Alert.alert('Invalid Date', 'Event date and time cannot be in the past.');
      return;
    }
    
    // Valider kapacitet
    if (maxCapacity.trim() && (isNaN(maxCapacity) || parseInt(maxCapacity) < 1)) {
      Alert.alert('Invalid Capacity', 'Maximum capacity must be a positive number.');
      return;
    }
    
    // Valider pris
    if (!isFreeEvent && ticketPrice.trim() && (isNaN(ticketPrice) || parseFloat(ticketPrice) < 0)) {
      Alert.alert('Invalid Price', 'Ticket price must be a valid number.');
      return;
    }
    
    // Valider kapacitet
    if (maxCapacity.trim() && (isNaN(maxCapacity) || parseInt(maxCapacity) < 1)) {
      Alert.alert('Invalid Capacity', 'Maximum capacity must be a positive number.');
      return;
    }
    
    // Valider pris
    if (!isFreeEvent && ticketPrice.trim() && (isNaN(ticketPrice) || parseFloat(ticketPrice) < 0)) {
      Alert.alert('Invalid Price', 'Ticket price must be a valid number.');
      return;
    }

    try {
      setSaving(true);
      
      // Hent venue information først
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

      // Opret nyt event med auto-genereret ID
      const newEventRef = database.ref(`events/${currentUser.uid}`).push();
      await newEventRef.set(eventData);

      // Tilføj også til globale events til forsiden
      await database.ref(`globalEvents/${newEventRef.key}`).set({
        ...eventData,
        eventId: newEventRef.key,
        userId: currentUser.uid
      });

      // Ryd formular
      setTitle('');
      setDescription('');
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setMaxCapacity('');
      setTicketPrice('');
      setIsFreeEvent(true);
      
      // lukker formular efter succesfuld oprettelse
      toggleForm();
      setMaxCapacity('');
      setTicketPrice('');
      setIsFreeEvent(true);
      
      // lukker formular efter succesfuld oprettelse
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* formular til at Oprette Event Formular */}
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
          
          {isFormExpanded && (
          <Animated.View style={[
            styles.formContainer,
            {
              opacity: slideAnim,
            }
          ]}>
          
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(text) => {
              console.log('Title input changed:', text);
              setTitle(text);
            }}
            onFocus={() => console.log('Title input focused')}
            onBlur={() => console.log('Title input blurred')}
            placeholder="e.g. Live Jazz Night"
            placeholderTextColor="#9aa0a6"
            editable={true}
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
          
          {/* Kapacitetssektion */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Capacity (Optional)</Text>
            <TextInput
              style={styles.input}
              value={maxCapacity}
              onChangeText={setMaxCapacity}
              placeholder="e.g. 50"
              placeholderTextColor="#9aa0a6"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
          
          {/* Prissektion til event om det skal være gratis eller betalt */}
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
          )}
        </View>

        {/* Eksisterende Events */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={styles.sectionTitle}>Your Events</Text>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterButton, eventFilter === 'all' && styles.filterButtonActive]}
                onPress={() => setEventFilter('all')}
              >
                <Text style={[styles.filterButtonText, eventFilter === 'all' && styles.filterButtonTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, eventFilter === 'upcoming' && styles.filterButtonActive]}
                onPress={() => setEventFilter('upcoming')}
              >
                <Text style={[styles.filterButtonText, eventFilter === 'upcoming' && styles.filterButtonTextActive]}>Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, eventFilter === 'past' && styles.filterButtonActive]}
                onPress={() => setEventFilter('past')}
              >
                <Text style={[styles.filterButtonText, eventFilter === 'past' && styles.filterButtonTextActive]}>Past</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
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
                <Text style={styles.capacityInfo}>
                  Participants: {event.currentAttendees || 0}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
                </Text>
                <Text style={styles.eventCreated}>
                  Posted: {new Date(event.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {events.length === 0 
                  ? 'No events posted yet'
                  : eventFilter === 'upcoming'
                    ? 'No upcoming events'
                    : eventFilter === 'past'
                      ? 'No past events'
                      : 'No events found'
                }
              </Text>
              {events.length === 0 && (
                <Text style={styles.emptySubtext}>
                  Create your first event to engage with customers!
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

