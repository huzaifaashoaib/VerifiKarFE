import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Location from 'expo-location';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config';
import { useFilters } from '../context/FilterContext';
import { useTheme } from '../styles/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============ API FUNCTIONS ============

/**
 * Interact with a post (upvote, downvote, or flag)
 * @param {string} postId - The ID of the post
 * @param {string} interactionType - 'upvote' | 'downvote' | 'flag'
 * @returns {Promise<{success: boolean, details: {message: string, new_upvotes: number, new_downvotes: number, new_flags: number}}>}
 */
async function interactWithPost(postId, interactionType) {
  let token = await AsyncStorage.getItem('authToken');
  
  console.log('[InteractWithPost] Raw token:', token);
  console.log('[InteractWithPost] Token type:', typeof token);
  console.log('[InteractWithPost] Token length:', token ? token.length : 0);
  
  // Clean up token (remove any whitespace/newlines)
  if (token) {
    token = token.trim();
  }
  
  if (!token) {
    throw new Error('Please log in to interact with posts');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  console.log(`[InteractWithPost] POST ${API_BASE_URL}/posts/${postId}/interact`);
  console.log('[InteractWithPost] Headers:', JSON.stringify(headers, null, 2));

  const response = await fetch(`${API_BASE_URL}/posts/${postId}/interact`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ interaction_type: interactionType }),
  });

  const data = await response.json().catch(() => null);
  console.log('[InteractWithPost] Response:', response.status, data);

  if (!response.ok) {
    // Handle structured error responses from backend
    let errorMessage = `Failed to ${interactionType} post`;
    if (data?.detail) {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (data.detail?.details?.message) {
        errorMessage = data.detail.details.message;
      }
    }
    throw new Error(errorMessage);
  }

  return data;
}

// ============ POST INTERACTIONS COMPONENT ============

/**
 * Reddit-style voting component with optimistic updates
 */
const PostInteractions = memo(({ 
  postId, 
  initialUpvotes = 0, 
  initialDownvotes = 0, 
  initialFlags = 0,
  initialUserVote = null, // 'upvote' | 'downvote' | null
  initialUserFlagged = false,
  colors,
  onInteractionError,
}) => {
  // Local state
  const [isUpvoted, setIsUpvoted] = useState(initialUserVote === 'upvote');
  const [isDownvoted, setIsDownvoted] = useState(initialUserVote === 'downvote');
  const [isFlagged, setIsFlagged] = useState(initialUserFlagged);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [flags, setFlags] = useState(initialFlags);
  const [isLoading, setIsLoading] = useState(false);

  // Animation for button press feedback
  const upvoteScale = useRef(new Animated.Value(1)).current;
  const downvoteScale = useRef(new Animated.Value(1)).current;
  const flagScale = useRef(new Animated.Value(1)).current;

  const animatePress = (scaleValue) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleUpvote = async () => {
    if (isLoading) return;
    
    animatePress(upvoteScale);
    
    // Store previous state for rollback
    const prevUpvoted = isUpvoted;
    const prevDownvoted = isDownvoted;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    // Optimistic update
    if (isUpvoted) {
      // Toggle off
      setIsUpvoted(false);
      setUpvotes(prev => prev - 1);
    } else {
      // Toggle on
      setIsUpvoted(true);
      setUpvotes(prev => prev + 1);
      if (isDownvoted) {
        // Switch from downvote to upvote
        setIsDownvoted(false);
        setDownvotes(prev => prev - 1);
      }
    }

    try {
      setIsLoading(true);
      const response = await interactWithPost(postId, 'upvote');
      
      if (response.success) {
        // Sync with server response
        setUpvotes(response.details.new_upvotes);
        setDownvotes(response.details.new_downvotes);
        setFlags(response.details.new_flags);
      }
    } catch (error) {
      // Rollback on error
      setIsUpvoted(prevUpvoted);
      setIsDownvoted(prevDownvoted);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      onInteractionError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (isLoading) return;
    
    animatePress(downvoteScale);
    
    // Store previous state for rollback
    const prevUpvoted = isUpvoted;
    const prevDownvoted = isDownvoted;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    // Optimistic update
    if (isDownvoted) {
      // Toggle off
      setIsDownvoted(false);
      setDownvotes(prev => prev - 1);
    } else {
      // Toggle on
      setIsDownvoted(true);
      setDownvotes(prev => prev + 1);
      if (isUpvoted) {
        // Switch from upvote to downvote
        setIsUpvoted(false);
        setUpvotes(prev => prev - 1);
      }
    }

    try {
      setIsLoading(true);
      const response = await interactWithPost(postId, 'downvote');
      
      if (response.success) {
        // Sync with server response
        setUpvotes(response.details.new_upvotes);
        setDownvotes(response.details.new_downvotes);
        setFlags(response.details.new_flags);
      }
    } catch (error) {
      // Rollback on error
      setIsUpvoted(prevUpvoted);
      setIsDownvoted(prevDownvoted);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      onInteractionError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlag = async () => {
    if (isLoading) return;
    
    animatePress(flagScale);
    
    // Store previous state for rollback
    const prevFlagged = isFlagged;
    const prevFlags = flags;

    // Optimistic update (flag is independent of votes)
    if (isFlagged) {
      setIsFlagged(false);
      setFlags(prev => prev - 1);
    } else {
      setIsFlagged(true);
      setFlags(prev => prev + 1);
    }

    try {
      setIsLoading(true);
      const response = await interactWithPost(postId, 'flag');
      
      if (response.success) {
        // Sync with server response
        setUpvotes(response.details.new_upvotes);
        setDownvotes(response.details.new_downvotes);
        setFlags(response.details.new_flags);
      }
    } catch (error) {
      // Rollback on error
      setIsFlagged(prevFlagged);
      setFlags(prevFlags);
      onInteractionError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Colors for active states
  const upvoteColor = isUpvoted ? '#FF6B35' : colors.gray; // Orange when active
  const downvoteColor = isDownvoted ? '#3B82F6' : colors.gray; // Blue when active
  const flagColor = isFlagged ? '#EF4444' : colors.gray; // Red when active

  return (
    <View style={styles.postFooter}>
      <View style={styles.votingContainer}>
        {/* Upvote Button */}
        <Animated.View style={{ transform: [{ scale: upvoteScale }] }}>
          <TouchableOpacity 
            style={styles.voteButton} 
            onPress={handleUpvote}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"} 
              size={24} 
              color={upvoteColor} 
            />
            <Text style={[styles.voteText, { color: isUpvoted ? upvoteColor : colors.text }]}>
              {upvotes}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Downvote Button */}
        <Animated.View style={{ transform: [{ scale: downvoteScale }] }}>
          <TouchableOpacity 
            style={styles.voteButton} 
            onPress={handleDownvote}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isDownvoted ? "arrow-down-circle" : "arrow-down-circle-outline"} 
              size={24} 
              color={downvoteColor} 
            />
            <Text style={[styles.voteText, { color: isDownvoted ? downvoteColor : colors.text }]}>
              {downvotes}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Comment Button */}
        <TouchableOpacity style={styles.commentButton}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Flag Button */}
        <Animated.View style={{ transform: [{ scale: flagScale }] }}>
          <TouchableOpacity 
            style={styles.flagButton} 
            onPress={handleFlag}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isFlagged ? "flag" : "flag-outline"} 
              size={20} 
              color={flagColor} 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
});

// ============ SKELETON COMPONENTS ============

// Skeleton shimmer component
const SkeletonPlaceholder = ({ width, height, style, colors }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.border,
          borderRadius: 8,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton card component
const SkeletonCard = ({ colors }) => (
  <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    {/* Header skeleton */}
    <View style={styles.topRow}>
      <View style={styles.locationHeader}>
        <SkeletonPlaceholder width={16} height={16} colors={colors} style={{ borderRadius: 8 }} />
        <SkeletonPlaceholder width={120} height={14} colors={colors} />
        <SkeletonPlaceholder width={40} height={14} colors={colors} />
      </View>
      <SkeletonPlaceholder width={70} height={24} colors={colors} style={{ borderRadius: 12 }} />
    </View>

    {/* Credibility bar skeleton */}
    <View style={{ marginBottom: 12 }}>
      <SkeletonPlaceholder width="100%" height={6} colors={colors} style={{ marginBottom: 6 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SkeletonPlaceholder width={14} height={14} colors={colors} style={{ borderRadius: 7 }} />
        <SkeletonPlaceholder width={80} height={12} colors={colors} />
        <View style={{ flex: 1 }} />
        <SkeletonPlaceholder width={50} height={12} colors={colors} />
      </View>
    </View>

    {/* Content skeleton */}
    <SkeletonPlaceholder width="100%" height={14} colors={colors} style={{ marginBottom: 8 }} />
    <SkeletonPlaceholder width="90%" height={14} colors={colors} style={{ marginBottom: 8 }} />
    <SkeletonPlaceholder width="75%" height={14} colors={colors} style={{ marginBottom: 12 }} />

    {/* Media skeleton */}
    <SkeletonPlaceholder width="100%" height={200} colors={colors} style={{ marginBottom: 12 }} />

    {/* Footer skeleton */}
    <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
      <View style={styles.votingContainer}>
        <SkeletonPlaceholder width={50} height={24} colors={colors} style={{ borderRadius: 12 }} />
        <SkeletonPlaceholder width={50} height={24} colors={colors} style={{ borderRadius: 12 }} />
        <SkeletonPlaceholder width={80} height={24} colors={colors} style={{ borderRadius: 12 }} />
      </View>
    </View>
  </View>
);

// Fast image component - minimal state, maximum performance
const SmartImage = memo(({ uri, style, colors }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={[style, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="image-outline" size={28} color={colors.gray} />
      </View>
    );
  }

  return (
    <View style={[style, { backgroundColor: colors.border }]}>
      <Image
        source={{ uri }}
        style={[style, { opacity: loaded ? 1 : 0 }]}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </View>
  );
});

// Video thumbnail component - tries to show first frame from video URL
const VideoThumbnail = memo(({ uri, style, colors, onPress }) => {
  const [thumbnailUri, setThumbnailUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const generateThumbnail = async () => {
      if (!uri) {
        setIsLoading(false);
        setHasError(true);
        return;
      }
      
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: 1000, // Get frame at 1 second
          quality: 0.7,
        });
        
        if (isMounted) {
          setThumbnailUri(thumbUri);
          setIsLoading(false);
        }
      } catch (error) {
        console.log('Thumbnail generation failed:', error.message);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };
    
    generateThumbnail();
    
    return () => {
      isMounted = false;
    };
  }, [uri]);

  return (
    <TouchableOpacity 
      style={[style, { overflow: 'hidden', backgroundColor: '#1a1a2e' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Generated thumbnail */}
      {thumbnailUri && (
        <Image
          source={{ uri: thumbnailUri }}
          style={[StyleSheet.absoluteFill]}
          resizeMode="cover"
        />
      )}
      
      {/* Fallback background if thumbnail generation fails */}
      {(hasError || (!thumbnailUri && !isLoading)) && (
        <View style={[StyleSheet.absoluteFill, { 
          backgroundColor: '#1a1a2e',
          justifyContent: 'center',
          alignItems: 'center',
        }]}>
          <Ionicons name="videocam" size={60} color="rgba(255,255,255,0.15)" />
        </View>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, { 
          backgroundColor: '#1a1a2e',
          justifyContent: 'center',
          alignItems: 'center',
        }]}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
        </View>
      )}
      
      {/* Dark overlay for better play button visibility */}
      {!isLoading && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />}
      
      {/* Play button overlay */}
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          borderRadius: 35, 
          width: 70, 
          height: 70, 
          justifyContent: 'center', 
          alignItems: 'center',
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.3)',
        }}>
          <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
        </View>
      </View>
      
      {/* Video badge */}
      <View style={{
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}>
        <Ionicons name="videocam" size={12} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>VIDEO</Text>
      </View>
    </TouchableOpacity>
  );
});

// Video Player Modal Component using new expo-video API
const VideoPlayerModal = ({ visible, uri, onClose, colors }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Create video player with the new API
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
    player.play();
  });

  // Reset states when modal opens/closes
  useEffect(() => {
    if (visible && uri) {
      setIsLoading(true);
      setError(false);
    }
  }, [visible, uri]);

  // Listen to player status
  useEffect(() => {
    if (!player) return;
    
    const subscription = player.addListener('statusChange', (status) => {
      if (status === 'readyToPlay') {
        setIsLoading(false);
      } else if (status === 'error') {
        setError(true);
        setIsLoading(false);
      }
    });

    return () => subscription?.remove();
  }, [player]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.videoModalContainer}>
        {/* Close button */}
        <TouchableOpacity style={styles.videoCloseButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {error ? (
          <View style={styles.videoErrorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#fff" />
            <Text style={styles.videoErrorText}>Failed to load video</Text>
            <TouchableOpacity style={styles.videoRetryButton} onPress={onClose}>
              <Text style={styles.videoRetryText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.videoWrapper}>
            <VideoView
              player={player}
              style={styles.videoPlayer}
              contentFit="contain"
              nativeControls={true}
              allowsPictureInPicture={true}
            />
            {isLoading && (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: '#fff', marginTop: 12 }}>Loading video...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { selectedCategories, minCredibility, maxDaysOld, getActiveCategory } = useFilters();
  
  // State management
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [error, setError] = useState(null);
  const [isUsingRealLocation, setIsUsingRealLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationName, setLocationName] = useState('Loading...');
  const [locationCache, setLocationCache] = useState({});
  
  // Video player state
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUri, setCurrentVideoUri] = useState(null);

  // Function to play video
  const playVideo = useCallback((uri) => {
    setCurrentVideoUri(uri);
    setVideoModalVisible(true);
  }, []);

  // Reverse geocode coordinates to get location name
  const getLocationName = async (lat, lon) => {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    
    // Check cache first
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }
    
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon
      });
      
      if (result && result.length > 0) {
        const loc = result[0];
        // Build a readable location string
        let locationStr = '';
        if (loc.district) {
          locationStr = loc.district;
        } else if (loc.subregion) {
          locationStr = loc.subregion;
        } else if (loc.name) {
          locationStr = loc.name;
        }
        
        if (loc.city && loc.city !== locationStr) {
          locationStr = locationStr ? `${locationStr}, ${loc.city}` : loc.city;
        }
        
        if (!locationStr) {
          locationStr = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
        
        // Cache the result
        setLocationCache(prev => ({ ...prev, [cacheKey]: locationStr }));
        return locationStr;
      }
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
    }
    
    // Fallback to coordinates
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  };
  
  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadFeed();
    }
  }, [userLocation, selectedCategories, minCredibility, maxDaysOld]);

  const requestLocationPermission = async (showAlert = true) => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 5000,
            timeout: 10000,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          setIsUsingRealLocation(true);
          setLocationName('Your Location');
          console.log('Using real location:', location.coords);
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
              setIsUsingRealLocation(true);
              setLocationName('Last Known Location');
              console.log('Using last known location');
            } else {
              // Use a default location (Karachi, Pakistan) if all fails
              setUserLocation({
                latitude: 24.8607,
                longitude: 67.0099
              });
              setIsUsingRealLocation(false);
              setLocationName('Karachi (Default)');
              console.log('Using default location (Karachi)');
              if (showAlert) {
                Alert.alert(
                  'Location Unavailable',
                  'Could not get your location. Showing posts from Karachi. Tap the location button to try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          } catch (fallbackError) {
            // Last fallback - use default location
            setUserLocation({
              latitude: 24.8607,
              longitude: 67.0099
            });
            setIsUsingRealLocation(false);
            setLocationName('Karachi (Default)');
            console.log('Using default location after all attempts failed');
          }
        }
      } else {
        // Permission denied - use default location
        setUserLocation({
          latitude: 24.8607,
          longitude: 67.0099
        });
        setIsUsingRealLocation(false);
        setLocationName('Karachi (Default)');
        if (showAlert) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location to see posts near you. Using default location.',
            [
              { text: 'Enable', onPress: () => Location.requestForegroundPermissionsAsync() },
              { text: 'OK' }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      // Use default on any error
      setUserLocation({
        latitude: 24.8607,
        longitude: 67.0099
      });
      setIsUsingRealLocation(false);
      setLocationName('Karachi (Default)');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Manual location refresh
  const refreshLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 0,
          timeout: 15000,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        setIsUsingRealLocation(true);
        setLocationName('Your Location');
        console.log('Location refreshed:', location.coords);
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error refreshing location:', error);
      Alert.alert(
        'Location Error',
        'Could not get your location. Make sure location services are enabled in your device settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Fetch feed from API
  const fetchFeed = useCallback(async () => {
    if (!userLocation) return [];

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('lat', userLocation.latitude.toString());
      queryParams.append('lon', userLocation.longitude.toString());
      queryParams.append('radius_km', '50');
      queryParams.append('max_days_old', maxDaysOld.toString());
      
      // Add category filter if not 'all'
      const activeCategory = getActiveCategory();
      if (activeCategory) {
        queryParams.append('category', activeCategory);
      }
      
      // Add credibility filter
      if (minCredibility) {
        queryParams.append('min_credibility', minCredibility.toString());
      }
      
      queryParams.append('skip', '0');
      queryParams.append('limit', '20');
      
      console.log('Fetching feed with params:', queryParams.toString());
      
      const response = await fetch(`${API_BASE_URL}/feed?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Feed API error:', response.status, errorText);
        throw new Error(`Failed to fetch feed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Feed API response:', data);
      
      if (data.success && data.details?.posts) {
        // Sort posts by created_at from latest to earliest
        const sortedPosts = data.details.posts.sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        return sortedPosts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  }, [userLocation, maxDaysOld, minCredibility, getActiveCategory]);

  // Batch geocode locations in background (non-blocking)
  const batchGeocodeLocations = useCallback(async (postsToGeocode) => {
    const uncachedPosts = postsToGeocode.filter(post => {
      const cacheKey = `${post.location_lat.toFixed(4)},${post.location_lon.toFixed(4)}`;
      return !locationCache[cacheKey];
    });

    // Only geocode first 5 unique locations to avoid rate limiting
    const uniqueLocations = [];
    const seen = new Set();
    for (const post of uncachedPosts) {
      const key = `${post.location_lat.toFixed(4)},${post.location_lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLocations.push({ lat: post.location_lat, lon: post.location_lon, key });
        if (uniqueLocations.length >= 5) break;
      }
    }

    // Geocode in background without blocking UI
    for (const loc of uniqueLocations) {
      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: loc.lat,
          longitude: loc.lon
        });
        if (result && result.length > 0) {
          const r = result[0];
          const name = r.district || r.subregion || r.city || r.name || `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`;
          setLocationCache(prev => ({ ...prev, [loc.key]: name }));
        }
      } catch (e) {
        // Silently fail - coordinates will be shown
      }
    }
  }, [locationCache]);

  const loadFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const feedData = await fetchFeed();
      setPosts(feedData);
      // Start background geocoding after posts are set
      setTimeout(() => batchGeocodeLocations(feedData), 100);
    } catch (error) {
      console.error('Error loading feed:', error);
      setError(error.message || 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Refresh location
      if (locationPermission) {
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
          console.log('Location refresh failed, using existing location');
        }
      }
      
      const feedData = await fetchFeed();
      setPosts(feedData);
    } catch (error) {
      console.error('Error refreshing feed:', error);
      setError(error.message || 'Failed to refresh feed');
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

  const renderPost = useCallback(({ item }) => {
    let distance = null;
    if (userLocation) {
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.location_lat,
        item.location_lon
      );
    }

    // Get location name from cache or use coordinates (no async calls during render)
    const cacheKey = `${item.location_lat.toFixed(4)},${item.location_lon.toFixed(4)}`;
    const incidentLocation = locationCache[cacheKey] || `${item.location_lat.toFixed(2)}°, ${item.location_lon.toFixed(2)}°`;

    return (
      <View style={[styles.postCard, { 
        backgroundColor: colors.surface,
        borderColor: colors.border 
      }]}>
        {/* Location and Category Header */}
        <View style={styles.topRow}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
              {incidentLocation}
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

        {/* Media Grid - Show up to 3 images */}
        {item.media_items && item.media_items.length > 0 && (() => {
          // Get up to 3 media items
          const mediaToShow = item.media_items.slice(0, 3);
          const totalMedia = item.media_items.length;
          const extraCount = totalMedia - 3;

          // Helper to get media URL and type
          const getMediaInfo = (media) => {
            const mediaUrl = typeof media === 'string' 
              ? media 
              : (media?.media_url || media?.storage_url);
            const mediaType = typeof media === 'string' 
              ? 'image' 
              : (media?.media_type || 'image');
            return { mediaUrl, mediaType };
          };

          // Check if media is an image type
          const isImageType = (type) => 
            type === 'image' || type === 'ImageMediaEnum' || type?.includes('image');
          
          // Check if media is a video type
          const isVideoType = (type) => 
            type === 'video' || type?.includes('video');

          // Single media item
          if (mediaToShow.length === 1) {
            const { mediaUrl, mediaType } = getMediaInfo(mediaToShow[0]);
            if (mediaUrl && isImageType(mediaType)) {
              return (
                <SmartImage 
                  uri={mediaUrl}
                  style={styles.mediaImage}
                  colors={colors}
                />
              );
            }
            if (mediaUrl && isVideoType(mediaType)) {
              return (
                <VideoThumbnail 
                  uri={mediaUrl}
                  style={styles.mediaImage}
                  colors={colors}
                  onPress={() => playVideo(mediaUrl)}
                />
              );
            }
          }

          // Two media items - side by side
          if (mediaToShow.length === 2) {
            return (
              <View style={styles.mediaGrid2}>
                {mediaToShow.map((media, index) => {
                  const { mediaUrl, mediaType } = getMediaInfo(media);
                  if (mediaUrl && isImageType(mediaType)) {
                    return (
                      <SmartImage 
                        key={index}
                        uri={mediaUrl}
                        style={styles.mediaGrid2Item}
                        colors={colors}
                      />
                    );
                  }
                  if (mediaUrl && isVideoType(mediaType)) {
                    return (
                      <VideoThumbnail 
                        key={index}
                        uri={mediaUrl}
                        style={styles.mediaGrid2Item}
                        colors={colors}
                        onPress={() => playVideo(mediaUrl)}
                      />
                    );
                  }
                  return null;
                })}
              </View>
            );
          }

          // Three or more media items - 1 large + 2 small
          if (mediaToShow.length >= 3) {
            const { mediaUrl: url1, mediaType: type1 } = getMediaInfo(mediaToShow[0]);
            const { mediaUrl: url2, mediaType: type2 } = getMediaInfo(mediaToShow[1]);
            const { mediaUrl: url3, mediaType: type3 } = getMediaInfo(mediaToShow[2]);

            return (
              <View style={styles.mediaGrid3}>
                {/* Large image on the left */}
                <View style={styles.mediaGrid3Left}>
                  {url1 && isImageType(type1) ? (
                    <SmartImage 
                      uri={url1}
                      style={styles.mediaGrid3Large}
                      colors={colors}
                    />
                  ) : url1 && isVideoType(type1) ? (
                    <VideoThumbnail 
                      uri={url1}
                      style={styles.mediaGrid3Large}
                      colors={colors}
                      onPress={() => playVideo(url1)}
                    />
                  ) : null}
                </View>
                
                {/* Two small images on the right */}
                <View style={styles.mediaGrid3Right}>
                  {url2 && isImageType(type2) ? (
                    <SmartImage 
                      uri={url2}
                      style={styles.mediaGrid3Small}
                      colors={colors}
                    />
                  ) : url2 && isVideoType(type2) ? (
                    <VideoThumbnail 
                      uri={url2}
                      style={styles.mediaGrid3Small}
                      colors={colors}
                      onPress={() => playVideo(url2)}
                    />
                  ) : null}
                  
                  <View style={styles.mediaGrid3SmallWrapper}>
                    {url3 && isImageType(type3) ? (
                      <SmartImage 
                        uri={url3}
                        style={styles.mediaGrid3Small}
                        colors={colors}
                      />
                    ) : url3 && isVideoType(type3) ? (
                      <VideoThumbnail 
                        uri={url3}
                        style={styles.mediaGrid3Small}
                        colors={colors}
                        onPress={() => playVideo(url3)}
                      />
                    ) : null}
                    
                    {/* Show "+X" overlay if more than 3 media items */}
                    {extraCount > 0 && (
                      <View style={styles.mediaOverlay}>
                        <Text style={styles.mediaOverlayText}>+{extraCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }

          return null;
        })()}

        {/* Footer - Voting & Interactions */}
        <PostInteractions
          postId={item.id}
          initialUpvotes={item.upvotes || 0}
          initialDownvotes={item.downvotes || 0}
          initialFlags={item.flags || 0}
          initialUserVote={item.user_vote || null}
          initialUserFlagged={item.user_flagged || false}
          colors={colors}
          onInteractionError={(message) => Alert.alert('Error', message)}
        />
      </View>
    );
  }, [userLocation, locationCache, colors, playVideo]);

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Location Bar (same as main view) */}
        <View style={[styles.locationBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.locationInfo}>
            <Ionicons 
              name="location-outline" 
              size={18} 
              color={colors.gray} 
            />
            <SkeletonPlaceholder width={120} height={16} colors={colors} />
          </View>
          <View style={[styles.locationButton, { backgroundColor: colors.border }]}>
            <SkeletonPlaceholder width={100} height={16} colors={colors} />
          </View>
        </View>
        
        {/* Skeleton Cards */}
        <FlatList
          data={[1, 2, 3, 4]}
          renderItem={() => <SkeletonCard colors={colors} />}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.feedList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  // Error state
  if (error && posts.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#E74C3C" />
        <Text style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>
          Failed to load feed
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.gray, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadFeed}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Location Bar */}
      <View style={[styles.locationBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.locationInfo}>
          <Ionicons 
            name={isUsingRealLocation ? "location" : "location-outline"} 
            size={18} 
            color={isUsingRealLocation ? colors.primary : colors.gray} 
          />
          <Text style={[styles.locationBarText, { color: colors.text }]}>
            {locationName}
          </Text>
          {!isUsingRealLocation && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>Default</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.locationButton, { backgroundColor: colors.primary }]}
          onPress={refreshLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.locationButtonText}>Use My Location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedList}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
        updateCellsBatchingPeriod={100}
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
            <Ionicons name="newspaper-outline" size={64} color={colors.gray} />
            <Text style={[styles.emptyText, { color: colors.gray }]}>
              No posts found nearby
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.gray }]}>
              Be the first to report something in your area!
            </Text>
          </View>
        }
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={videoModalVisible}
        uri={currentVideoUri}
        onClose={() => {
          setVideoModalVisible(false);
          setCurrentVideoUri(null);
        }}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  locationBarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
  // Two image grid
  mediaGrid2: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  mediaGrid2Item: {
    flex: 1,
    height: 150,
    borderRadius: 8,
  },
  // Three image grid
  mediaGrid3: {
    flexDirection: 'row',
    gap: 4,
    height: 200,
    marginBottom: 12,
  },
  mediaGrid3Left: {
    flex: 2,
  },
  mediaGrid3Large: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mediaGrid3Right: {
    flex: 1,
    gap: 4,
  },
  mediaGrid3Small: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mediaGrid3SmallWrapper: {
    flex: 1,
    position: 'relative',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
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
  commentButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  flagButton: {
    padding: 4,
    marginLeft: 8,
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
  // Video Modal Styles
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  videoErrorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  videoRetryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  videoRetryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
