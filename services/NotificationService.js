import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { database } from '../database/firebase';

// Global notifikationsadfærd - definerer hvordan notifikationer vises
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // Vis alert når app er åben
    shouldPlaySound: true,     // Afspil lyd
    shouldSetBadge: false,     // Opdater ikke app badge
  }),
});

// Service til håndtering af push notifikationer og event påmindelser
class NotificationService {
  expoPushToken = null; // Gemmer Expo push token for denne enhed

  // Registrerer enheden til at modtage push notifikationer
  async registerForPushNotifications() {
    // Returner eksisterende token hvis allerede registreret
    if (this.expoPushToken) return this.expoPushToken;

    // Opsætter notifikationskanal for Android (påkrævet for Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // Push notifikationer virker kun på fysiske enheder, ikke emulatorer
    if (!Device.isDevice) {
      alert('Must use physical device for Push Notifications');
      return null;
    }

    // Tjekker om brugeren allerede har givet notifikationstilladelse
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Hvis ikke, anmod om tilladelse
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Hvis brugeren nægter tilladelse, kan vi ikke sende notifikationer
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return null;
    }

    // Genererer Expo push token til denne enhed
    let token;
    try {
      // Henter projekt ID fra Expo konfiguration
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (projectId) {
        // Henter rigtigt push token fra Expo servere
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
        // Fallback til development token hvis projekt ID ikke findes
        console.log('No project ID found, using development token');
        token = `ExpoToken[DEV-${Platform.OS}-${Date.now()}]`;
      }
    } catch (error) {
      // Hvis token generering fejler, brug fallback token
      console.log('Error getting push token, using fallback:', error);
      token = `ExpoToken[FALLBACK-${Platform.OS}-${Date.now()}]`;
    }
    this.expoPushToken = token;
    return token;
  }

  // Gemmer brugerens notifikationsdata og præferencer i Firebase
  async saveUserNotificationData(userId, preferences = {}) {
    try {
      // Sikrer at vi har et push token
      const token = this.expoPushToken || (await this.registerForPushNotifications());
      if (!token) return;

      // Gemmer token og præferencer i databasen
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

  // Hjælpefunktioner til datoparsing og scheduling

  // Parser event dato fra forskellige formater til Date objekt
  parseEventDate(event) {
    // Hvis dateTime er sat, brug den direkte
    if (event.dateTime) return new Date(event.dateTime);
    
    // Ellers kombiner date og time felter
    if (!event.date && !event.dateISO) return null;
    if (!event.time) return null;

    const dateStr = event.dateISO || event.date;
    return new Date(`${dateStr}T${event.time}:00`);
  }

  // Scheduler en notifikation til et specifikt tidspunkt (eller sender med det samme hvis tiden er passeret)
  async scheduleAt(date, content) {
    try {
      // Hvis ingen dato er angivet, send notifikationen med det samme
      if (!date) {
        console.log('Sending immediate notification');
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: null, // null trigger = send nu
        });
        return;
      }

      // Valider at datoen er gyldig
      if (isNaN(date.getTime())) return;

      const now = new Date();
      if (date <= now) {
        // Hvis tidspunktet allerede er passeret, send med det samme
        console.log('Scheduled time has passed, sending immediately');
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: null,
        });
        return;
      }

      // Beregn hvor mange sekunder der er til notifikationen skal sendes
      const seconds = Math.floor((date.getTime() - now.getTime()) / 1000);
      console.log(`Scheduling notification in ${seconds} seconds`);
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { seconds }, // Scheduler til fremtidigt tidspunkt
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Funktioner til at schedule forskellige typer notifikationer

  // Sender øjeblikkelig bekræftelse når bruger tilmelder sig et event
  async scheduleSignupNotification(event) {
    await this.scheduleAt(null, {
      title: 'Event Signup Confirmed! ✅',
      body: `You're signed up for ${event.title || event.name} at ${event.venueName}`,
      data: { eventId: event.id, type: 'signup_confirmation' },
    });
  }

  // Påmindelse dagen før event (sender kun hvis event er i morgen)
  async scheduleDayBeforeReminder(event) {
    const eventDate = this.parseEventDate(event);
    if (!eventDate) {
      console.log('No event date found for day-before reminder');
      return;
    }

    // Beregner datoer uden tidspunkter (kun dag/måned/år)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`Day-before check: Today=${today.toDateString()}, Event=${eventDay.toDateString()}, Tomorrow=${tomorrow.toDateString()}`);

    // Sender kun påmindelse hvis eventet er i morgen
    if (eventDay.getTime() !== tomorrow.getTime()) {
      console.log('Event is not tomorrow, skipping day-before reminder');
      return;
    }

    // Sender påmindelse med det samme
    console.log('Sending immediate day-before reminder for tomorrow event');
    await this.scheduleAt(null, {
      title: 'Event Reminder! 📅',
      body: `Don't forget: ${event.title || event.name} tomorrow at ${event.time} at ${event.venueName}`,
      data: { eventId: event.id, type: 'day_before_reminder' },
    });
  }

  // Påmindelse 2 timer før event (kun på selve event-dagen)
  async scheduleEventDayReminder(event) {
    const eventDate = this.parseEventDate(event);
    if (!eventDate) return;

    // Tjekker om eventet er i dag
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    // Scheduler kun hvis eventet er i dag
    if (eventDay.getTime() !== today.getTime()) return;

    // Tjekker om eventet er mindst 2 timer væk (med 5 min buffer)
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilEvent < 1.92) return; // Kræver mindst 1t 55m for at schedule 2t påmindelse

    // Beregner tidspunkt 2 timer før event
    const trigger = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);

    await this.scheduleAt(trigger, {
      title: 'Event Starting Soon! 🎉',
      body: `${event.title || event.name} starts in 2 hours at ${event.venueName}`,
      data: { eventId: event.id, type: 'event_day_reminder' },
    });
  }

  // Annullerer alle påmindelser for et specifikt event
  async cancelEventReminders(eventId) {
    try {
      // Henter alle schedulerede notifikationer
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      // Filtrerer og annullerer dem der matcher event ID
      await Promise.all(
        scheduled
          .filter((n) => n.content.data?.eventId === eventId)
          .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Scheduler notifikationer for alle events brugeren deltager i
  async scheduleUserNotifications(userId, preferences = {}) {
    try {
      // Henter alle events brugeren deltager i
      const snap = await database.ref(`users/${userId}/eventParticipations`).once('value');
      if (!snap.exists()) return;

      const participations = snap.val();
      const eventIds = Object.keys(participations);

      // Går gennem hvert event og scheduler påmindelser
      for (const eventId of eventIds) {
        // Rydder eksisterende notifikationer for dette event først
        await this.cancelEventReminders(eventId);
        
        // Prøver at hente event fra begge mulige steder i databasen
        let eventSnap = await database.ref(`events/${eventId}`).once('value');
        if (!eventSnap.exists()) {
          eventSnap = await database.ref(`globalEvents/${eventId}`).once('value');
        }
        if (!eventSnap.exists()) continue;

        const event = { id: eventId, ...eventSnap.val() };

        // Scheduler påmindelser baseret på brugerens præferencer
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

  // Opretter payload for ny event notifikation (normalt håndteret på backend)
  sendNewEventNotification(event) {
    return {
      title: 'New Event Posted! 🎪',
      body: `${event.venueName} just posted: ${event.title || event.name}`,
      data: { eventId: event.id, type: 'new_event' },
    };
  }

  // Tilføjer listener der kaldes når notifikation modtages mens app er åben
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Tilføjer listener der kaldes når bruger trykker på en notifikation
  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

// Eksporterer singleton instance af NotificationService
export default new NotificationService();
