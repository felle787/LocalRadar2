import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { database } from '../database/firebase';

// Global notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  expoPushToken = null;

  // --- PUSH TOKEN SETUP ------------------------------------------------------

  async registerForPushNotifications() {
    if (this.expoPushToken) return this.expoPushToken;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    if (!Device.isDevice) {
      alert('Must use physical device for Push Notifications');
      return null;
    }

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

    let token;
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
        // Fallback for development - create a mock token
        console.log('No project ID found, using development token');
        token = `ExpoToken[DEV-${Platform.OS}-${Date.now()}]`;
      }
    } catch (error) {
      console.log('Error getting push token, using fallback:', error);
      token = `ExpoToken[FALLBACK-${Platform.OS}-${Date.now()}]`;
    }
    this.expoPushToken = token;
    return token;
  }

  async saveUserNotificationData(userId, preferences = {}) {
    try {
      const token = this.expoPushToken || (await this.registerForPushNotifications());
      if (!token) return;

      await database.ref(`users/${userId}/notificationData`).set({
        pushToken: token,
        preferences: {
          newEventNotifications: preferences.newEventNotifications !== false,
          dayBeforeReminders: preferences.dayBeforeReminders !== false,
          eventDayReminders: preferences.eventDayReminders !== false,
          ...preferences,
        },
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Error saving notification data:', error);
    }
  }

  // --- HELPERS ---------------------------------------------------------------

  parseEventDate(event) {
    if (event.dateTime) return new Date(event.dateTime);
    if (!event.date && !event.dateISO) return null;
    if (!event.time) return null;

    const dateStr = event.dateISO || event.date;
    return new Date(`${dateStr}T${event.time}:00`);
  }

  // Schedule at a specific Date (or send now if in the past)
  async scheduleAt(date, content) {
    try {
      // If date is null, send immediately
      if (!date) {
        console.log('Sending immediate notification');
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: null,
        });
        return;
      }

      if (isNaN(date.getTime())) return;

      const now = new Date();
      if (date <= now) {
        // Just send immediately if the time has passed
        console.log('Scheduled time has passed, sending immediately');
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: null,
        });
        return;
      }

      const seconds = Math.floor((date.getTime() - now.getTime()) / 1000);
      console.log(`Scheduling notification in ${seconds} seconds`);
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { seconds },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // --- NOTIFICATIONS ---------------------------------------------------------

  async scheduleSignupNotification(event) {
    await this.scheduleAt(null, {
      title: 'Event Signup Confirmed! ✅',
      body: `You're signed up for ${event.title || event.name} at ${event.venueName}`,
      data: { eventId: event.id, type: 'signup_confirmation' },
    });
  }

  // Day-before reminder
  async scheduleDayBeforeReminder(event) {
    const eventDate = this.parseEventDate(event);
    if (!eventDate) {
      console.log('No event date found for day-before reminder');
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`Day-before check: Today=${today.toDateString()}, Event=${eventDay.toDateString()}, Tomorrow=${tomorrow.toDateString()}`);

    // Only schedule if event is tomorrow
    if (eventDay.getTime() !== tomorrow.getTime()) {
      console.log('Event is not tomorrow, skipping day-before reminder');
      return;
    }

    console.log('Sending immediate day-before reminder for tomorrow event');
    await this.scheduleAt(null, {
      title: 'Event Reminder! 📅',
      body: `Don't forget: ${event.title || event.name} tomorrow at ${event.time} at ${event.venueName}`,
      data: { eventId: event.id, type: 'day_before_reminder' },
    });
  }

  // 2 hours before event (only on event day)
  async scheduleEventDayReminder(event) {
    const eventDate = this.parseEventDate(event);
    if (!eventDate) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    // Only schedule if event is today
    if (eventDay.getTime() !== today.getTime()) return;

    // Check if event is at least 2 hours away (with 5 min buffer)
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilEvent < 1.92) return; // Need at least 1h 55m to schedule 2h reminder

    const trigger = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);

    await this.scheduleAt(trigger, {
      title: 'Event Starting Soon! 🎉',
      body: `${event.title || event.name} starts in 2 hours at ${event.venueName}`,
      data: { eventId: event.id, type: 'event_day_reminder' },
    });
  }

  // Cancel all reminders for a given event
  async cancelEventReminders(eventId) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((n) => n.content.data?.eventId === eventId)
          .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Schedule for all events a user participates in
  async scheduleUserNotifications(userId, preferences = {}) {
    try {
      const snap = await database.ref(`users/${userId}/eventParticipations`).once('value');
      if (!snap.exists()) return;

      const participations = snap.val();
      const eventIds = Object.keys(participations);

      for (const eventId of eventIds) {
        // Clear existing notifications for this event first
        await this.cancelEventReminders(eventId);
        
        // Try both locations for events
        let eventSnap = await database.ref(`events/${eventId}`).once('value');
        if (!eventSnap.exists()) {
          eventSnap = await database.ref(`globalEvents/${eventId}`).once('value');
        }
        if (!eventSnap.exists()) continue;

        const event = { id: eventId, ...eventSnap.val() };

        if (preferences.dayBeforeReminders !== false) {
          await this.scheduleDayBeforeReminder(event);
        }
        if (preferences.eventDayReminders !== false) {
          await this.scheduleEventDayReminder(event);
        }
      }
    } catch (error) {
      console.error('Error scheduling user notifications:', error);
    }
  }

  // This would normally be done on backend
  sendNewEventNotification(event) {
    return {
      title: 'New Event Posted! 🎪',
      body: `${event.venueName} just posted: ${event.title || event.name}`,
      data: { eventId: event.id, type: 'new_event' },
    };
  }

  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new NotificationService();
