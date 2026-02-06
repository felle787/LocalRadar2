import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,

  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/NotificationService';
import styles from '../styles/EventDetailsScreenStyles';

export default function EventDetailsScreen({ route, navigation }) {
  // henter event data fra route 
  const { event } = route.params;
  // henter nuværende bruger fra autentifiseringskontekst
  const { currentUser } = useAuth();
  // state for om bruger deltager i event
  const [isParticipating, setIsParticipating] = useState(false);
  // state for antal deltagende
  const [participantCount, setParticipantCount] = useState(event.currentAttendees || 0);
  // state for indlæsning
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Tjek om bruger allerede deltager i begivenheden
    if (currentUser) {
      checkParticipationStatus();
    }
    
    // Lyt efter realtids opdateringer af deltagende antal
    const eventRef = database.ref(`globalEvents/${event.id}`);
    const unsubscribe = eventRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const eventData = snapshot.val();
        const count = eventData.currentAttendees || 0;
        // Opdater deltagende antal
        setParticipantCount(count);
        
        // Initialiser currentAttendees felt hvis det ikke eksisterer
        if (eventData.currentAttendees === undefined) {
          eventRef.child('currentAttendees').set(0);
        }
      } else {
        setParticipantCount(0);
      }
    });
    
    return () => eventRef.off('value', unsubscribe);
  }, [currentUser, event.id]);

  const checkParticipationStatus = async () => {
    try {
      const participantRef = database.ref(`eventParticipants/${event.id}/${currentUser.uid}`);
      const snapshot = await participantRef.once('value');
      setIsParticipating(snapshot.exists());
    } catch (error) {
      console.log('Error checking participation status:', error);
    }
  };

  const handleParticipate = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to participate in events.');
      return;
    }

    // Tjek om event er fuldt, hvis brugeren ikke allerede deltager
    if (event.maxCapacity && participantCount >= event.maxCapacity) {
      Alert.alert('Event Full', 'Sorry, this event has reached maximum capacity.');
      return;
    }

    // Hvis brugeren allerede deltager, håndter afmelding
    if (isParticipating) {
      setLoading(true);
      
      try {
        const participantRef = database.ref(`eventParticipants/${event.id}/${currentUser.uid}`);
        const eventRef = database.ref(`globalEvents/${event.id}`);
        
        console.log(`Leaving event ${event.id}, current count: ${participantCount}`);
        
        // Fjern deltagelse
        await participantRef.remove();
        
        // Hent aktuelt antal fra databasen og opdater atomisk
        const currentCountSnapshot = await eventRef.child('currentAttendees').once('value');
        const currentCount = currentCountSnapshot.val() || 0;
        const newCount = Math.max(0, currentCount - 1);
        
        await eventRef.child('currentAttendees').set(newCount);
        console.log(`Updated participant count from ${currentCount} to ${newCount}`);
        
        // Fjern fra brugerens deltagelser og annuller alle påmindelser
        await database.ref(`users/${currentUser.uid}/eventParticipations/${event.id}`).remove();
        await NotificationService.cancelEventReminders(event.id);
        
        setIsParticipating(false);
        setLoading(false);
        Alert.alert('Success', 'You have been removed from this event.');
      } catch (error) {
        setLoading(false);
        console.error('Error leaving event:', error);
        Alert.alert('Error', 'Failed to leave event. Please try again.');
      }
      return;
    }

    // Hvis brugeren tilmelder sig et betalt event, naviger til betalingsskærm
    if (event.ticketPrice && parseFloat(event.ticketPrice) > 0) {
      navigation.navigate('Payment', {
        event: event,
        onPaymentSuccess: async () => {
          // Denne funktion vil blive kaldt efter en vellykket betaling
          await completeEventRegistration();
        }
      });
      return;
    }

    // For gratis events, tilmeld direkte
    await completeEventRegistration();
  };

  const completeEventRegistration = async () => {
    setLoading(true);
    
    try {
      const participantRef = database.ref(`eventParticipants/${event.id}/${currentUser.uid}`);
      const eventRef = database.ref(`globalEvents/${event.id}`);
      
      console.log(`Joining event ${event.id}, current count: ${participantCount}`);
      
      // Tilføj deltagelse
      await participantRef.set({
        userId: currentUser.uid,
        joinedAt: new Date().toISOString(),
        eventId: event.id,
      });
      
      // Hent aktuelt antal fra databasen og opdater atomisk
      const currentCountSnapshot = await eventRef.child('currentAttendees').once('value');
      const currentCount = currentCountSnapshot.val() || 0;
      const newCount = currentCount + 1;
      
      await eventRef.child('currentAttendees').set(newCount);
      console.log(`Updated participant count from ${currentCount} to ${newCount}`);
      
      // Gem også i brugerens eventdeltagelser
      await database.ref(`users/${currentUser.uid}/eventParticipations/${event.id}`).set(true);
      
      // Planlæg notifikationspåmindelser baseret på brugerpræferencer
      const userPrefsSnapshot = await database.ref(`users/${currentUser.uid}/notificationPreferences`).once('value');
      const userPrefs = userPrefsSnapshot.val() || {};
      
      // Planlæg påmindelse dagen før, hvis aktiveret (standard: true)
      if (userPrefs.dayBeforeReminders !== false) {
        console.log(`Scheduling day-before reminder for event on ${event.date || event.dateISO}`);
        try {
          await NotificationService.scheduleDayBeforeReminder(event);
        } catch (error) {
          console.log('Error scheduling day-before reminder:', error);
        }
      }
      
      // Planlæg påmindelse på eventdagen, hvis aktiveret (standard: true)  
      if (userPrefs.eventDayReminders !== false) {
        console.log(`Scheduling event-day reminder for event on ${event.date || event.dateISO}`);
        try {
          await NotificationService.scheduleEventDayReminder(event);
        } catch (error) {
          console.log('Error scheduling event-day reminder:', error);
        }
      }
      
      // Opdater lokal state for at reflektere deltagelse
      setIsParticipating(true);
      Alert.alert('Success', 'You have successfully joined this event!');
    } catch (error) {
      console.log('Error updating participation:', error);
      Alert.alert('Error', 'Failed to update participation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Funktion til at formatere dato og tid for eventet
  const formatDateTime = () => {
    if (event.dateTime) {
      const eventDate = new Date(event.dateTime);
      return eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return `${event.date}${event.time ? ` at ${event.time}` : ''}`;
  };

  const isEventFull = event.maxCapacity && participantCount >= event.maxCapacity;
  const isEventPast = event.timestamp && new Date(event.timestamp) < new Date();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event titel og pris */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
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
          <Text style={styles.venueInfo}>{event.venueName}</Text>
          {event.venueAddress && (
            <Text style={styles.addressText}>{event.venueAddress}</Text>
          )}
        </View>

        {/* Event Date & Time */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#0084ff" />
            <Text style={styles.sectionTitle}>Date & Time</Text>
          </View>
          <Text style={styles.dateTimeText}>{formatDateTime()}</Text>
        </View>

        {/* Capacity Information */}
        {event.maxCapacity && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#0084ff" />
              <Text style={styles.sectionTitle}>Capacity</Text>
            </View>
            <View style={styles.capacityContainer}>
              <Text style={styles.capacityText}>
                {participantCount} / {event.maxCapacity} participants
              </Text>
              <View style={styles.capacityBar}>
                <View 
                  style={[
                    styles.capacityFill, 
                    { 
                      width: `${Math.min(100, (participantCount / event.maxCapacity) * 100)}%`,
                      backgroundColor: isEventFull ? '#ff6b6b' : '#0084ff'
                    }
                  ]} 
                />
              </View>
              {isEventFull && (
                <Text style={styles.fullEventText}>Event is full!</Text>
              )}
            </View>
          </View>
        )}

        {/* Event beskrivelse */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#0084ff" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>
            {event.description || 'No description available.'}
          </Text>
        </View>

        {/* Venue information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#0084ff" />
            <Text style={styles.sectionTitle}>Venue</Text>
          </View>
          <Text style={styles.venueNameText}>{event.venueName}</Text>
          {event.venueAddress && (
            <Text style={styles.venueAddressText}>{event.venueAddress}</Text>
          )}
        </View>
      </ScrollView>

      {/* deltag knap */}
      {!isEventPast && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.participateButton,
              isParticipating && styles.participatingButton,
              (loading || isEventFull && !isParticipating) && styles.disabledButton,
            ]}
            onPress={handleParticipate}
            disabled={loading || (isEventFull && !isParticipating)}
          >
            <Text style={[
              styles.participateButtonText,
              isParticipating && styles.participatingButtonText
            ]}>
              {loading 
                ? 'Loading...' 
                : isParticipating 
                  ? 'Leave Event' 
                  : isEventFull 
                    ? 'Event Full' 
                    : event.isFree 
                      ? 'Join Event (Free)' 
                      : `Join Event (${event.ticketPrice} kr)`
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {isEventPast && (
        <View style={styles.buttonContainer}>
          <View style={styles.pastEventNotice}>
            <Text style={styles.pastEventText}>This event has ended</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

