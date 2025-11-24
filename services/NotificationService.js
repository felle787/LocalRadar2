import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { database } from '../database/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.tokenRequested = false;
  }

  // Register for push notifications and get Expo push token
  async registerForPushNotifications() {
    // Return existing token if already requested
    if (this.tokenRequested && this.expoPushToken) {
      return this.expoPushToken;
    }
    
    this.tokenRequested = true;
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        // For development, we can use a fallback method
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        
        if (projectId) {
          token = (await Notifications.getExpoPushTokenAsync({
            projectId,
          })).data;
        } else {
          // Development fallback - create a mock token for testing
          token = `ExpoToken[DEV-${Platform.OS}-${Device.osName}-${Date.now()}]`;
        }
      } catch (e) {
        token = `ExpoToken[FALLBACK-${Platform.OS}-${Device.osName}-${Date.now()}]`;
      }
    } else {
      alert('Must use physical device for Push Notifications');
    }

    this.expoPushToken = token;
    return token;
  }

  // Save user's push token and notification preferences to Firebase
  async saveUserNotificationData(userId, preferences = {}) {
    try {
      const token = this.expoPushToken || await this.registerForPushNotifications();
      
      await database.ref(`users/${userId}/notificationData`).set({
        pushToken: token,
        preferences: {
          newEventNotifications: preferences.newEventNotifications !== false,
          dayBeforeReminders: preferences.dayBeforeReminders !== false,
          eventDayReminders: preferences.eventDayReminders !== false,
          ...preferences
        },
        lastUpdated: Date.now()
      });
      

    } catch (error) {
      console.error('Error saving notification data:', error);
    }
  }

  // Schedule a day-before event reminder
  async scheduleDayBeforeReminder(event) {
    try {
      // Parse the event date and time - use dateISO for reliable parsing
      const dateString = event.dateISO || event.date;
      const [hours, minutes] = event.time.split(':').map(Number);
      
      // Create event datetime in Danish timezone
      const eventDate = new Date(dateString + 'T' + event.time + ':00');
      
      // Check if event is tomorrow or later (not today)
      const today = new Date();
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Schedule day-before reminder if event is tomorrow or later
      if (eventDateOnly > todayDateOnly) {
        // Set notification for 9:00 AM the day before the event
        const dayBefore = new Date(eventDate);
        dayBefore.setDate(dayBefore.getDate() - 1); // Go back one day
        dayBefore.setHours(9, 0, 0, 0); // Set to 9:00 AM
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Event Tomorrow! 📅",
            body: `Don't forget: ${event.title || event.name} is tomorrow at ${event.time} at ${event.venueName}`,
            data: {
              eventId: event.id,
              type: 'day_before_reminder'
            },
          },
          trigger: {
            date: dayBefore,
          },
        });
      }
    } catch (error) {
      console.error('Error scheduling day-before reminder:', error);
    }
  }

  // Schedule a 2-hour before event reminder
  async scheduleEventDayReminder(event) {
    try {
      // Parse the event date and time - use dateISO for reliable parsing
      const dateString = event.dateISO || event.date;
      const [hours, minutes] = event.time.split(':').map(Number);
      
      // Create event datetime in Danish timezone
      const eventDate = new Date(dateString + 'T' + event.time + ':00');
      
      // Calculate current time and event time difference
      const currentTime = new Date();
      const timeDifferenceMs = eventDate.getTime() - currentTime.getTime();
      const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);
      
      // Check if event is today (same date)
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const todayDateOnly = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
      const isEventToday = eventDateOnly.getTime() === todayDateOnly.getTime();
      
      // Only schedule 2-hour reminder if event is TODAY and more than 2 hours away
      if (isEventToday && timeDifferenceHours > 2) {
        // Calculate 2 hours before
        const twoHoursBeforeDate = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Event Starting Soon! 🎉",
            body: `${event.title || event.name} starts in 2 hours at ${event.venueName}`,
            data: {
              eventId: event.id,
              type: 'event_day_reminder'
            },
          },
          trigger: {
            date: twoHoursBeforeDate,
          },
        });
      }
    } catch (error) {
      console.error('❌ Error scheduling event-day reminder:', error);
    }
  }

  // Cancel scheduled notifications for an event
  async cancelEventReminders(eventId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.eventId === eventId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);

        }
      }
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Check for events and schedule all appropriate reminders
  async checkAndScheduleTodayEvents(userId) {
    try {
      // Get user's notification preferences
      const preferencesRef = database.ref(`users/${userId}/notificationPreferences`);
      const preferencesSnapshot = await preferencesRef.once('value');
      const preferences = preferencesSnapshot.val() || {};
      
      // Get user's event participations
      const participationsRef = database.ref(`users/${userId}/eventParticipations`);
      const participationsSnapshot = await participationsRef.once('value');
      
      if (!participationsSnapshot.exists()) return;
      
      const participations = participationsSnapshot.val();
      
      // Check each event the user is participating in
      for (const eventId of Object.keys(participations)) {
        const eventRef = database.ref(`events/${eventId}`);
        const eventSnapshot = await eventRef.once('value');
        
        if (eventSnapshot.exists()) {
          const event = eventSnapshot.val();
          const eventWithId = { id: eventId, ...event };
          
          // Schedule day-before reminder if enabled
          if (preferences.dayBeforeReminders !== false) {
            await this.scheduleDayBeforeReminder(eventWithId);
          }
          
          // Schedule event day reminder if enabled
          if (preferences.eventDayReminders !== false) {
            await this.scheduleEventDayReminder(eventWithId);
          }
        }
      }
    } catch (error) {
      console.error('Error checking and scheduling events:', error);
    }
  }

  // Send push notification to users following a venue (would be called from a backend)
  async sendNewEventNotification(venueId, event) {
    try {
      // In a real app, this would be called from your backend server
      // Here's how you would structure the data to send to your notification server
      
      const notificationData = {
        venueId: venueId,
        event: event,
        title: "New Event Posted! 🎪",
        body: `${event.venueName} just posted: ${event.name}`,
        data: {
          eventId: event.id,
          venueId: venueId,
          type: 'new_event'
        }
      };
      

      
      // In production, you would send this to your backend server
      // which would then send push notifications to all users following this venue
      
      return notificationData;
    } catch (error) {
      console.error('Error preparing new event notification:', error);
    }
  }

  // Add notification listener
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new NotificationService();
