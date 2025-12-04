import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config';
import { useFilters } from '../context/FilterContext';
import { useTheme } from '../styles/ThemeContext';

// Dummy posts matching exact backend schema
// Using current timestamps to ensure they pass the date filter
const getDummyPosts = () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Major traffic accident reported on Main Street. Multiple vehicles involved, emergency services on scene.',
      credibility_score: 0.85,
      event_category: 'Accident',
      location_lat: 31.5204,
      location_lon: 74.3587,
      created_at: oneHourAgo.toISOString(),
      media_items: ['https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Accident+Scene'],
      upvotes: 24,
      downvotes: 2
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      content: 'Road construction causing delays near University Avenue. Expect 20-30 minute delays.',
      credibility_score: 0.92,
      event_category: 'Infrastructure',
      location_lat: 31.5497,
      location_lon: 74.3436,
      created_at: twoHoursAgo.toISOString(),
      media_items: [],
      upvotes: 18,
      downvotes: 1
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      content: 'Suspicious activity reported in Model Town area. Police investigating.',
      credibility_score: 0.68,
      event_category: 'Crime',
      location_lat: 31.4824,
      location_lon: 74.3210,
      created_at: threeHoursAgo.toISOString(),
      media_items: ['https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Crime+Scene'],
      upvotes: 45,
      downvotes: 8
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      content: 'Community cleanup drive happening at Liberty Market this weekend. Volunteers welcome!',
      credibility_score: 0.95,
      event_category: 'Social',
      location_lat: 31.5207,
      location_lon: 74.3480,
      created_at: oneDayAgo.toISOString(),
      media_items: ['https://via.placeholder.com/400x300/95E1D3/FFFFFF?text=Community+Event'],
      upvotes: 67,
      downvotes: 3
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      content: 'Power outage affecting several blocks in DHA Phase 5. Expected restoration in 2 hours.',
      credibility_score: 0.78,
      event_category: 'Infrastructure',
      location_lat: 31.4697,
      location_lon: 74.4042,
      created_at: oneDayAgo.toISOString(),
      media_items: [],
      upvotes: 31,
      downvotes: 5
    }
  ];
};

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid-outline' },
  { id: 'Accident', name: 'Accident', icon: 'car-outline' },
  { id: 'Crime', name: 'Crime', icon: 'warning-outline' },
  { id: 'Infrastructure', name: 'Infrastructure', icon: 'construct-outline' },
  { id: 'Social', name: 'Social', icon: 'people-outline' },
  { id: 'Emergency', name: 'Emergency', icon: 'alert-circle-outline' },
];

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { selectedCategories, minCredibility, maxDaysOld, getActiveCategory } = useFilters();
  
  // State management
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  
  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadFeed();
    }
  }, [userLocation, selectedCategories, minCredibility, maxDaysOld]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            maximumAge: 10000,
            timeout: 5000,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        } catch (locError) {
          console.error('Error getting location:', locError);
          // Try to get last known location as fallback
          try {
            const lastKnown = await Location.getLastKnownPositionAsync({
              maxAge: 60000,
            });
            if (lastKnown) {
              setUserLocation({
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude
              });
              console.log('Using last known location');
            } else {
              // Use a default location (Lahore, Pakistan) if all fails
              setUserLocation({
                latitude: 31.5204,
                longitude: 74.3587
              });
              console.log('Using default location (Lahore)');
              Alert.alert(
                'Location Unavailable',
                'Using default location. Enable location services for accurate nearby posts.',
                [{ text: 'OK' }]
              );
            }
          } catch (fallbackError) {
            // Last fallback - use default location
            setUserLocation({
              latitude: 31.5204,
              longitude: 74.3587
            });
            console.log('Using default location after all attempts failed');
          }
        }
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location to see posts near you.',
          [
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
            { text: 'Cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  // Future-ready API fetch function
  const fetchFeed = async () => {
    if (!userLocation) return [];

    // TODO: Uncomment when backend is ready
    // try {
    //   const token = await AsyncStorage.getItem('authToken');
    //   const queryParams = new URLSearchParams();
    //   
    //   queryParams.append('latitude', userLocation.latitude);
    //   queryParams.append('longitude', userLocation.longitude);
    //   queryParams.append('radius_km', radiusKm);
    //   queryParams.append('max_days_old', maxDaysOld);
    //   
    //   const activeCategory = getActiveCategory();
    //   if (activeCategory) {
    //     queryParams.append('category', activeCategory);
    //   }
    //   
    //   queryParams.append('min_credibility', minCredibility);
    //   queryParams.append('skip', 0);
    //   queryParams.append('limit', 20);
    //   
    //   const response = await fetch(`${API_BASE_URL}/posts/feed?${queryParams}`, {
    //     headers: {
    //       'Authorization': `Bearer ${token}`
    //     }
    //   });
    //   
    //   if (!response.ok) throw new Error('Failed to fetch feed');
    //   const data = await response.json();
    //   return data;
    // } catch (error) {
    //   console.error('Error fetching feed:', error);
    //   throw error;
    // }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Filter dummy data based on filters from context
    let filteredPosts = getDummyPosts();
    
    console.log('Before filters:', filteredPosts.length, 'posts');
    console.log('Active filters:', { minCredibility, maxDaysOld, activeCategory: getActiveCategory() });
    
    // Apply category filter
    const activeCategory = getActiveCategory();
    if (activeCategory) {
      filteredPosts = filteredPosts.filter(post => post.event_category === activeCategory);
      console.log('After category filter:', filteredPosts.length, 'posts');
    }
    
    // Apply credibility filter
    filteredPosts = filteredPosts.filter(post => post.credibility_score >= minCredibility);
    console.log('After credibility filter:', filteredPosts.length, 'posts');
    
    // Apply max days filter
    const now = new Date();
    filteredPosts = filteredPosts.filter(post => {
      const postDate = new Date(post.created_at);
      const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= maxDaysOld;
    });
    console.log('After days filter:', filteredPosts.length, 'posts');
    
    console.log('Final filtered posts:', filteredPosts.length);
    return filteredPosts;
  };

  const loadFeed = async () => {
    try {
      setIsLoading(true);
      const feedData = await fetchFeed();
      setPosts(feedData);
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      // Refresh location
      if (locationPermission) {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
      
      const feedData = await fetchFeed();
      setPosts(feedData);
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getCategoryColor = (category) => {
    const categoryColors = {
      Accident: '#FF6B6B',
      Crime: '#E74C3C',
      Infrastructure: '#3498DB',
      Social: '#2ECC71',
      Emergency: '#E67E22',
      Weather: '#9B59B6',
      default: colors.primary
    };
    return categoryColors[category] || categoryColors.default;
  };

  const getCredibilityColor = (score) => {
    if (score >= 0.8) return '#2ECC71';
    if (score >= 0.6) return '#F39C12';
    return '#E74C3C';
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const renderPost = ({ item }) => {
    let distance = null;
    if (userLocation) {
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.location_lat,
        item.location_lon
      );
    }

    return (
      <View style={[styles.postCard, { 
        backgroundColor: colors.surface,
        borderColor: colors.border 
      }]}>
        {/* Location and Category Header */}
        <View style={styles.topRow}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.text }]}>
              Model Town, Lahore
            </Text>
            {distance && (
              <Text style={[styles.distanceText, { color: colors.gray }]}>
                • {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </Text>
            )}
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.event_category) + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(item.event_category) }]}>
              {item.event_category}
            </Text>
          </View>
        </View>

        {/* Credibility Score Bar */}
        <View style={styles.credibilityBar}>
          <View style={styles.credibilityBarBg}>
            <View 
              style={[
                styles.credibilityBarFill, 
                { 
                  width: `${item.credibility_score * 100}%`,
                  backgroundColor: getCredibilityColor(item.credibility_score)
                }
              ]} 
            />
          </View>
          <View style={styles.credibilityInfo}>
            <Ionicons 
              name="shield-checkmark" 
              size={14} 
              color={getCredibilityColor(item.credibility_score)} 
            />
            <Text style={[styles.credibilityPercentText, { 
              color: getCredibilityColor(item.credibility_score) 
            }]}>
              {Math.round(item.credibility_score * 100)}% credible
            </Text>
            <Text style={[styles.timeText, { color: colors.gray, marginLeft: 'auto' }]}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={[styles.contentText, { color: colors.text }]}>
          {item.content}
        </Text>

        {/* Media */}
        {item.media_items && item.media_items.length > 0 && (
          <Image 
            source={{ uri: item.media_items[0] }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        )}

        {/* Footer - Voting Only */}
        <View style={styles.postFooter}>
          <View style={styles.votingContainer}>
            <TouchableOpacity style={styles.voteButton}>
              <Ionicons name="arrow-up-circle" size={24} color={colors.primary} />
              <Text style={[styles.voteText, { color: colors.text }]}>
                {item.upvotes}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.voteButton}>
              <Ionicons name="arrow-down-circle" size={24} color={colors.gray} />
              <Text style={[styles.voteText, { color: colors.text }]}>
                {item.downvotes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voteButton}>
              <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
              <Text style={[styles.voteText, { color: colors.text }]}>
                Comment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!locationPermission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="location-outline" size={64} color={colors.gray} />
        <Text style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>
          Location Permission Required
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.gray, marginTop: 8 }]}>
          Enable location to see posts near you
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={requestLocationPermission}
        >
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && posts.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.gray }]}>
          Loading nearby posts...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Feed List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.gray} />
            <Text style={[styles.emptyText, { color: colors.gray }]}>
              No posts found nearby
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.gray }]}>
              Try changing the category or radius
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 15,
  },
  filterButton: {
    padding: 10,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryContainer: {
    maxHeight: 60,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedList: {
    padding: 16,
  },
  postCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  credibilityBar: {
    marginBottom: 12,
  },
  credibilityBarBg: {
    height: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  credibilityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  credibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  credibilityPercentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
