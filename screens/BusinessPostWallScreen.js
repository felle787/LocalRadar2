import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,

  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { database, storage } from '../database/firebase';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/BusinessPostWallScreenStyles';

export default function BusinessPostWallScreen({ route, navigation }) {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [events, setEvents] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  // Check if this is a business owner viewing their own wall or a customer viewing a business
  const isBusinessOwner = userProfile?.userType === 'business';
  const businessId = route?.params?.businessId || (isBusinessOwner ? currentUser?.uid : null);
  const businessName = route?.params?.businessName || userProfile?.businessName || 'Business';

  // Combine posts and events, sorted by timestamp
  // Only show events to customers viewing business walls, not to business owners on their own wall
  const dataToShow = isBusinessOwner ? posts : [...posts, ...events];
  const combinedData = dataToShow.sort((a, b) => {
    let aTime, bTime;
    
    // Handle item A
    try {
      if (a.timestamp) {
        aTime = a.timestamp;
      } else if (a.dateTime || a.date) {
        let dateInput = a.dateTime || a.date;
        if (typeof dateInput === 'string') {
          const currentYear = new Date().getFullYear();
          if (!dateInput.includes(currentYear.toString()) && !dateInput.match(/\d{4}/)) {
            dateInput = `${dateInput}, ${currentYear}`;
          }
        }
        const date = new Date(dateInput);
        aTime = isNaN(date.getTime()) ? Date.now() : date.getTime();
      } else {
        aTime = Date.now();
      }
    } catch {
      aTime = Date.now();
    }
    
    // Handle item B
    try {
      if (b.timestamp) {
        bTime = b.timestamp;
      } else if (b.dateTime || b.date) {
        let dateInput = b.dateTime || b.date;
        if (typeof dateInput === 'string') {
          const currentYear = new Date().getFullYear();
          if (!dateInput.includes(currentYear.toString()) && !dateInput.match(/\d{4}/)) {
            dateInput = `${dateInput}, ${currentYear}`;
          }
        }
        const date = new Date(dateInput);
        bTime = isNaN(date.getTime()) ? Date.now() : date.getTime();
      } else {
        bTime = Date.now();
      }
    } catch {
      bTime = Date.now();
    }
    
    return bTime - aTime;
  });

  useEffect(() => {
    if (!businessId) return;

    if (!isBusinessOwner && userProfile?.followedVenues && businessId) {
      setIsFollowing(userProfile.followedVenues.includes(businessId));
    }

    // Fetch business info if not business owner
    if (!isBusinessOwner && businessId) {
      const businessRef = database.ref(`venues/${businessId}`);
      businessRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
          setBusinessInfo(snapshot.val());
        }
      });
    }

    // Fetch business events
    const eventsRef = database.ref(`events/${businessId}`);
    const eventsUnsubscribe = eventsRef.on('value', (snapshot) => {
      const eventsData = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(key => {
          eventsData.push({
            id: key,
            ...data[key],
            type: 'event'
          });
        });
      }
      setEvents(eventsData);
    });

    const postsRef = database.ref(`businessPosts/${businessId}`);
    setLoading(true);
    
    const unsubscribe = postsRef.on('value', (snapshot) => {
      const postsData = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(key => {
          postsData.push({
            id: key,
            ...data[key]
          });
        });
        // Add type to posts
        postsData.forEach(post => post.type = 'post');
        // Sort by timestamp (newest first)
        postsData.sort((a, b) => b.timestamp - a.timestamp);
      }
      setPosts(postsData);
      setLoading(false);
    });

    return () => {
      postsRef.off('value', unsubscribe);
      eventsRef.off('value', eventsUnsubscribe);
    };
  }, [businessId, isBusinessOwner]);

  const handleToggleFollow = async () => {
    if (!currentUser || !userProfile || !businessId) return;

    try {
      const currentFollowed = userProfile.followedVenues || [];
      const updatedFollowed = isFollowing
        ? currentFollowed.filter(id => id !== businessId)
        : [...currentFollowed, businessId];

      await database.ref(`users/${currentUser.uid}/followedVenues`).set(updatedFollowed);
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  // Convert image to base64 and store in database (workaround for Storage billing requirement)
  const uploadImage = async (imageUri) => {
    try {
      console.log('Converting image to base64:', imageUri);
      
      // Convert image to base64
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Image file is empty');
      }
      
      // Check file size (limit to 1MB for database storage)
      if (blob.size > 1024 * 1024) {
        throw new Error('Image too large. Please select an image smaller than 1MB.');
      }
      
      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          console.log('Image converted to base64, size:', base64String.length);
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      throw new Error(`Image processing failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Create new post
  const createPost = async () => {
    if (!newPostText.trim() && !selectedImage) {
      Alert.alert('Error', 'Please add some text or select an image');
      return;
    }

    if (!businessId || !currentUser) {
      Alert.alert('Error', 'Unable to create post. Please try again.');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      
      if (selectedImage) {
        try {
          imageUrl = await uploadImage(selectedImage.uri);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert('Upload Failed', 'Failed to upload image. Creating text-only post instead.');
          // Continue with text-only post if image upload fails
        }
      }

      const postData = {
        text: newPostText.trim(),
        imageUrl,
        businessId,
        businessName,
        timestamp: Date.now(),
        createdBy: currentUser.uid
      };

      await database.ref(`businessPosts/${businessId}`).push(postData);
      
      setNewPostText('');
      setSelectedImage(null);
      setShowCreateModal(false);
      Alert.alert('Success', 'Text post created successfully!');
      
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete post function
  const deletePost = async (postId) => {
    if (!businessId) return;
    
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await database.ref(`businessPosts/${businessId}/${postId}`).remove();
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  // Render individual post
  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postTitleContainer}>
          <View>
            <Text style={styles.businessName}>{String(item.businessName || 'Business')}</Text>
            <Text style={styles.postDate}>
              {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'No date'}
            </Text>
          </View>
        </View>
        {isBusinessOwner && (
          <TouchableOpacity 
            onPress={() => deletePost(item.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    
      {item.text ? (
        <Text style={styles.postText}>{String(item.text)}</Text>
      ) : null}
      
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      ) : null}
    </View>
  );

  // Render individual event
  const renderEvent = ({ item }) => {
    let eventDate;
    let isEventOver = false;
    let dateString = 'Date not available';
    
    try {
      let dateInput = item.dateTime || item.date || item.timestamp;
      
      // Handle incomplete dates like "December 15" or "31 december"
      if (typeof dateInput === 'string') {
        // If the date doesn't contain a year, add current year
        const currentYear = new Date().getFullYear();
        if (!dateInput.includes(currentYear.toString()) && !dateInput.match(/\d{4}/)) {
          dateInput = `${dateInput}, ${currentYear}`;
        }
      }
      
      // Try to parse the date
      eventDate = new Date(dateInput);
      
      // Check if date is valid
      if (isNaN(eventDate.getTime())) {
        console.warn('Could not parse event date:', item.dateTime || item.date || item.timestamp);
        // Use the original string as display text instead of parsing
        dateString = String(item.dateTime || item.date || 'Date not available');
        isEventOver = false; // Can't determine if it's over
      } else {
        isEventOver = eventDate < new Date();
        
        // Format date safely
        dateString = eventDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Add time if available
        if (item.time) {
          dateString += ` at ${String(item.time)}`;
        }
      }
    } catch (error) {
      console.error('Error processing event date:', error);
      dateString = String(item.dateTime || item.date || 'Invalid date');
      isEventOver = false;
    }
    
    const handleEventPress = () => {
      navigation.navigate('EventDetails', { event: item });
    };

    return (
      <TouchableOpacity onPress={handleEventPress} activeOpacity={0.7}>
        <View style={[styles.postCard, styles.eventCard]}>
          <View style={styles.postHeader}>
            <Text style={styles.eventTitle}>{String(item.title || 'Untitled Event')}</Text>
            <View style={styles.eventStatusContainer}>
              {isEventOver ? (
                <Text style={styles.eventOverText}>Event Over</Text>
              ) : (
                <Text style={styles.eventUpcomingText}>Upcoming</Text>
              )}
            </View>
          </View>
          
          <Text style={styles.eventDate}>
            {String(dateString)}
          </Text>
          
          {item.description && (
            <Text style={styles.postText}>{String(item.description)}</Text>
          )}
          
          {(item.ticketPrice || item.isFree !== undefined) && (
            <Text style={styles.eventPrice}>
              {String(item.isFree ? 'FREE' : `${String(item.ticketPrice)} kr`)}
            </Text>
          )}
          
        </View>
      </TouchableOpacity>
    );
  };

  // Render item based on type
  const renderItem = ({ item }) => {
    if (item.type === 'event') {
      return renderEvent({ item });
    }
    return renderPost({ item });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{String(businessName)} Posts</Text>
        {isBusinessOwner && (
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>+ Post</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.postsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !isBusinessOwner && businessInfo ? (
            <View style={styles.businessInfoSection}>
              <Text style={styles.businessInfoName}>{String(businessInfo.name || 'Business Name')}</Text>
              {businessInfo.address && (
                <Text style={styles.businessInfoAddress}>📍 {String(businessInfo.address)}</Text>
              )}
              {(businessInfo.imageUrl || businessInfo.image) && (
                <Image 
                  source={{ uri: businessInfo.imageUrl || businessInfo.image }} 
                  style={styles.businessInfoImage} 
                />
              )}
              {!isBusinessOwner && currentUser && (
                <TouchableOpacity
                  onPress={handleToggleFollow}
                  style={[
                    styles.followButton,
                    isFollowing && styles.followButtonActive
                  ]}
                >
                  <Text style={styles.followButtonText}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
              {businessInfo.description && (
                <Text style={styles.businessInfoDescription}>{String(businessInfo.description)}</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              {String(isBusinessOwner 
                ? "Create your first post to share updates with customers!"
                : "Check back later for updates from this business"
              )}
            </Text>
          </View>
        }
      />

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setNewPostText('');
                setSelectedImage(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Post</Text>
            <TouchableOpacity
              onPress={createPost}
              disabled={uploading}
            >
              <Text style={[styles.postButtonText, uploading && styles.disabledText]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createPostContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="What's happening at your business?"
              placeholderTextColor="#8E8E93"
              multiline
              value={newPostText}
              onChangeText={setNewPostText}
              maxLength={500}
            />

            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>📷 Add Photo</Text>
              </TouchableOpacity>
              
              <Text style={styles.characterCount}>
                {newPostText.length}/500
              </Text>
            </View>
          </View>

          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.uploadingText}>Creating post...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}


