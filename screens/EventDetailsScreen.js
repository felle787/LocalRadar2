import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function EventDetailsScreen({ route, navigation }) {
  const { event } = route.params;
  const { currentUser } = useAuth();
  const [isParticipating, setIsParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(event.currentAttendees || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already participating
    if (currentUser) {
      checkParticipationStatus();
    }
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

    // Check if event is at capacity
    if (event.maxCapacity && participantCount >= event.maxCapacity) {
      Alert.alert('Event Full', 'Sorry, this event has reached maximum capacity.');
      return;
    }

    setLoading(true);
    
    try {
      const participantRef = database.ref(`eventParticipants/${event.id}/${currentUser.uid}`);
      const eventRef = database.ref(`globalEvents/${event.id}`);
      
      if (isParticipating) {
        // Remove participation
        await participantRef.remove();
        await eventRef.child('currentAttendees').set(Math.max(0, participantCount - 1));
        setIsParticipating(false);
        setParticipantCount(prev => Math.max(0, prev - 1));
        Alert.alert('Success', 'You have been removed from this event.');
      } else {
        // Add participation
        await participantRef.set({
          userId: currentUser.uid,
          joinedAt: new Date().toISOString(),
          eventId: event.id,
        });
        await eventRef.child('currentAttendees').set(participantCount + 1);
        setIsParticipating(true);
        setParticipantCount(prev => prev + 1);
        Alert.alert('Success', 'You have successfully joined this event!');
      }
    } catch (error) {
      console.log('Error updating participation:', error);
      Alert.alert('Error', 'Failed to update participation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Event Title and Pricing */}
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

        {/* Event Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#0084ff" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>
            {event.description || 'No description available.'}
          </Text>
        </View>

        {/* Venue Information */}
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

      {/* Participate Button */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b31',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  freeBadge: {
    backgroundColor: '#00c851',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  venueInfo: {
    color: '#0084ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateTimeText: {
    color: '#c9c9ce',
    fontSize: 16,
    lineHeight: 24,
  },
  capacityContainer: {
    gap: 8,
  },
  capacityText: {
    color: '#c9c9ce',
    fontSize: 16,
    fontWeight: '500',
  },
  capacityBar: {
    height: 8,
    backgroundColor: '#2b2b31',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  fullEventText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    color: '#c9c9ce',
    fontSize: 16,
    lineHeight: 24,
  },
  venueNameText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  venueAddressText: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2b2b31',
  },
  participateButton: {
    backgroundColor: '#0084ff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  participatingButton: {
    backgroundColor: '#2b2b31',
  },
  disabledButton: {
    opacity: 0.6,
  },
  participateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participatingButtonText: {
    color: '#ff6b6b',
  },
  pastEventNotice: {
    backgroundColor: '#2b2b31',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pastEventText: {
    color: '#9aa0a6',
    fontSize: 16,
    fontWeight: '500',
  },
});