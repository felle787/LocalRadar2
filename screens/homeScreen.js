import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  useWindowDimensions,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { homeScreenStyles } from '../styles/homeScreenStyles';

// Sample followed venues (static data)
const FOLLOWED = [
  {
    id: 'est-1',
    name: 'Dj Bar',
    category: 'Music',
    distance: '0.4 km',
    img: require('../assets/dj.webp'),
  },
  {
    id: 'est-2',
    name: 'Karaoke Bar',
    category: 'Music',
    distance: '0.9 km',
    img: require('../assets/karaoke.jpg'),
  },
  {
    id: 'est-3',
    name: 'Cafe Nexus',
    category: 'Students Bar',
    distance: '1.1 km',
    img: require('../assets/nexus.jpg'),
  },
  {
    id: 'est-4',
    name: 'Jerrys Pub',
    category: 'Pub',
    distance: '1.6 km',
    img: require('../assets/pub.webp'),
  },
];

export default function HomeScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const layout = useMemo(
    () => (isNarrow ? homeScreenStyles.stack : homeScreenStyles.rows),
    [isNarrow]
  );

  useEffect(() => {
    // Subscribe to venues collection for events
    const unsubscribe = db.collection('venues')
      .orderBy('name')
      .onSnapshot((querySnapshot) => {
        const venuesList = [];
        querySnapshot.forEach((doc) => {
          venuesList.push({ 
            id: doc.id, 
            ...doc.data(),
            title: doc.data().name,
            venue: doc.data().location,
            date: 'Today • 19:00' // Sample date
          });
        });
        setVenues(venuesList);
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

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
          <Text style={homeScreenStyles.title}>LocalRadar</Text>
          <TouchableOpacity onPress={handleLogout} style={homeScreenStyles.logoutButton}>
            <Text style={homeScreenStyles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={homeScreenStyles.search}
          placeholder="Search..."
          placeholderTextColor="#aaa"
        />

        <View style={[homeScreenStyles.content, layout]}>
          {/* Top section: Followed venues */}
          <View style={[homeScreenStyles.section, homeScreenStyles.top]}>
            <Text style={homeScreenStyles.sectionTitle}>Followed</Text>
            <FlatList
              data={FOLLOWED}
              keyExtractor={(item) => item.id}
              contentContainerStyle={homeScreenStyles.listPad}
              showsHorizontalScrollIndicator={false}
              horizontal={true}
              renderItem={({ item }) => <EstablishmentCard item={item} />}
            />
          </View>

          {/* Bottom section: Upcoming events from Firebase */}
          <View style={[homeScreenStyles.section, homeScreenStyles.bottom]}>
            <Text style={homeScreenStyles.sectionTitle}>Upcoming Events</Text>
            {loading ? (
              <Text style={homeScreenStyles.loadingText}>Loading...</Text>
            ) : (
              <FlatList
                data={venues}
                keyExtractor={(item) => item.id}
                contentContainerStyle={homeScreenStyles.listPad}
                showsHorizontalScrollIndicator={false}
                horizontal={true}
                renderItem={({ item }) => <EventCard item={item} />}
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function EstablishmentCard({ item }) {
  return (
    <View style={homeScreenStyles.cardRow}>
      <Image source={item.img} style={homeScreenStyles.thumb} />
      <Text style={homeScreenStyles.cardTitle}>{item.name}</Text>
      <Text style={homeScreenStyles.subtle}>{item.category}</Text>
      <Text style={homeScreenStyles.distance}>{item.distance}</Text>
      <View style={homeScreenStyles.badgeFollowing}>
        <Text style={homeScreenStyles.badgeText}>Following</Text>
      </View>
    </View>
  );
}

function EventCard({ item }) {
  return (
    <View style={homeScreenStyles.cardCol}>
      <View style={homeScreenStyles.rowBetween}>
        <Text style={homeScreenStyles.eventTitle}>{item.title}</Text>
      </View>
      <Text style={homeScreenStyles.subtle}>{item.venue}</Text>
      <Text style={homeScreenStyles.eventDate}>{item.date}</Text>
    </View>
  );
}