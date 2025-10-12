import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions,
  SafeAreaView,
  Alert 
} from 'react-native';
import firebase from 'firebase/compat/app';
import { db } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { exploreScreenStyles } from '../styles/exploreScreenStyles';

export default function ExploreScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const layout = useMemo(
    () => (isNarrow ? exploreScreenStyles.stack : exploreScreenStyles.rows),
    [isNarrow]
  );

  const categories = ['All', 'Bar', 'Restaurant', 'Club', 'Cafe', 'Pub'];

  useEffect(() => {
    // Subscribe to venues collection
    const unsubscribe = db.collection('venues')
      .onSnapshot((querySnapshot) => {
        const venuesList = [];
        querySnapshot.forEach((doc) => {
          venuesList.push({ 
            id: doc.id, 
            ...doc.data(),
            title: doc.data().name,
            venue: doc.data().location,
            time: 'Tonight • 21:00' // Sample time
          });
        });
        setVenues(venuesList);
        setFilteredVenues(venuesList);
      });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = venues;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(venue => venue.type === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(venue => 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVenues(filtered);
  }, [venues, selectedCategory, searchQuery]);

  const CategoryButton = ({ category }) => (
    <TouchableOpacity
      style={[
        exploreScreenStyles.categoryButton,
        selectedCategory === category && exploreScreenStyles.selectedCategory
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        exploreScreenStyles.categoryText,
        selectedCategory === category && exploreScreenStyles.selectedCategoryText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  const VenueCard = ({ item }) => (
    <TouchableOpacity style={exploreScreenStyles.card}>
      <Text style={exploreScreenStyles.cardTitle}>{item.title}</Text>
      <Text style={exploreScreenStyles.subtle}>{item.venue}</Text>
      <Text style={exploreScreenStyles.time}>{item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={exploreScreenStyles.screen}>
      <Text style={exploreScreenStyles.title}>Explore</Text>
      
      <TextInput
        style={exploreScreenStyles.search}
        placeholder="Search venues..."
        placeholderTextColor="#aaa"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Categories */}
      <View style={exploreScreenStyles.categoriesSection}>
        <Text style={exploreScreenStyles.sectionTitle}>Categories</Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={exploreScreenStyles.categoriesList}
          renderItem={({ item }) => <CategoryButton category={item} />}
        />
      </View>

      <View style={[exploreScreenStyles.content, layout]}>
        {/* Venues List */}
        <View style={[exploreScreenStyles.section, exploreScreenStyles.listWrap]}>
          <Text style={exploreScreenStyles.sectionTitle}>
            {selectedCategory === 'All' ? 'All Venues' : selectedCategory + 's'} ({filteredVenues.length})
          </Text>
          
          {filteredVenues.length === 0 ? (
            <Text style={exploreScreenStyles.noResults}>No venues found</Text>
          ) : (
            <FlatList
              data={filteredVenues}
              keyExtractor={(item) => item.id}
              contentContainerStyle={exploreScreenStyles.listPad}
              renderItem={({ item }) => <VenueCard item={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}