import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../styles/ThemeContext';

export default function ReportScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [media, setMedia] = useState([]); // Changed from image to media array
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [errors, setErrors] = useState({
    description: '',
    location: ''
  });

  // News report templates
  const templates = [
    { id: 1, icon: 'car-sport', label: 'Accident', text: 'A traffic accident occurred at this location. ' },
    { id: 2, icon: 'flame', label: 'Fire', text: 'A fire has been reported at this location. ' },
    { id: 3, icon: 'water', label: 'Flooding', text: 'Flooding has been observed in this area. ' },
    { id: 4, icon: 'construct', label: 'Infrastructure', text: 'Infrastructure issue reported: ' },
    { id: 5, icon: 'people', label: 'Public Event', text: 'A public event is taking place at this location. ' },
    { id: 6, icon: 'warning', label: 'Emergency', text: 'Emergency situation reported: ' },
    { id: 7, icon: 'megaphone', label: 'Protest', text: 'A protest or demonstration is occurring at this location. ' },
    { id: 8, icon: 'alert-circle', label: 'Other', text: '' },
  ];

  const handleImageFromGallery = async () => {
    if (media.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 photos or videos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 10 - media.length,
    });
    
    if (!result.canceled) {
      const newMedia = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type,
      }));
      setMedia([...media, ...newMedia].slice(0, 10));
    }
  };

  const handleImageFromCamera = async () => {
    if (media.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 photos or videos.');
      return;
    }

    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      const newItem = {
        uri: result.assets[0].uri,
        type: result.assets[0].type,
      };
      setMedia([...media, newItem]);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to use this feature.');
        return;
      }

      Alert.alert('Getting Location', 'Please wait...');
      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      
      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address[0]) {
        const addressParts = [];
        if (address[0].street) addressParts.push(address[0].street);
        if (address[0].city) addressParts.push(address[0].city);
        if (address[0].region) addressParts.push(address[0].region);
        if (address[0].country) addressParts.push(address[0].country);
        
        const addressString = addressParts.join(', ');
        setLocation(addressString);
        if (errors.location) {
          setErrors(prev => ({ ...prev, location: '' }));
        }
      } else {
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
      
      Alert.alert('Success', 'Current location captured!');
    } catch (error) {
      Alert.alert('Error', 'Unable to fetch current location. Please try again.');
      console.error(error);
    }
  };

  const searchLocation = async (text) => {
    setLocation(text);
    
    if (text.length > 2) {
      try {
        // Use geocoding with the search text
        const results = await Location.geocodeAsync(text);
        
        if (results.length > 0) {
          // Get more detailed addresses for each result
          const suggestions = await Promise.all(
            results.slice(0, 8).map(async (result) => {
              try {
                const address = await Location.reverseGeocodeAsync({
                  latitude: result.latitude,
                  longitude: result.longitude
                });
                
                if (address[0]) {
                  const addr = address[0];
                  const addressParts = [];
                  
                  // Build detailed address string
                  if (addr.name) addressParts.push(addr.name);
                  if (addr.street) addressParts.push(addr.street);
                  if (addr.streetNumber) addressParts.push(addr.streetNumber);
                  if (addr.district) addressParts.push(addr.district);
                  if (addr.city) addressParts.push(addr.city);
                  if (addr.region) addressParts.push(addr.region);
                  if (addr.country) addressParts.push(addr.country);
                  if (addr.postalCode) addressParts.push(addr.postalCode);
                  
                  // Create full address
                  const fullAddress = addressParts.join(', ');
                  
                  return {
                    address: fullAddress,
                    shortAddress: `${addr.street || addr.name || ''}, ${addr.city || ''}, ${addr.country || ''}`.replace(/^, |, $/g, ''),
                    coords: { 
                      latitude: result.latitude, 
                      longitude: result.longitude 
                    }
                  };
                }
              } catch (err) {
                console.log('Error getting address:', err);
              }
              return null;
            })
          );
          
          // Filter out nulls and duplicates
          const validSuggestions = suggestions
            .filter(s => s !== null && s.address.length > 0)
            .filter((item, index, self) => 
              index === self.findIndex((t) => t.address === item.address)
            );
          
          setLocationSuggestions(validSuggestions);
          setShowSuggestions(validSuggestions.length > 0);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.log('Search error:', error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
    
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: '' }));
    }
  };

  const selectLocationSuggestion = (suggestion) => {
    setLocation(suggestion.address);
    setSelectedCoordinates(suggestion.coords);
    setShowSuggestions(false);
    setLocationSuggestions([]);
    Keyboard.dismiss();
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: '' }));
    }
  };

  const openMapPicker = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable location permissions to use maps.');
      return;
    }

    // Always get current location and place marker
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      
      setMapRegion({
        ...coords,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      // Always set marker at current location when map opens
      setSelectedCoordinates(coords);
      
      // Get address for the current location
      const addresses = await Location.reverseGeocodeAsync(coords);
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const fullAddress = [
          addr.name,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
          addr.country
        ].filter(Boolean).join(', ');
        setLocation(fullAddress);
      }
    } catch (error) {
      console.log('Could not get current location for map');
      Alert.alert('Error', 'Could not get your current location. Please try again.');
      return;
    }

    setShowMapModal(true);
  };

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoordinates({ latitude, longitude });

    // Reverse geocode to get address
    try {
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address[0]) {
        const addr = address[0];
        const addressParts = [];
        
        if (addr.name) addressParts.push(addr.name);
        if (addr.street) addressParts.push(addr.street);
        if (addr.city) addressParts.push(addr.city);
        if (addr.region) addressParts.push(addr.region);
        if (addr.country) addressParts.push(addr.country);
        
        setLocation(addressParts.join(', '));
      }
    } catch (error) {
      setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  const confirmMapLocation = () => {
    if (selectedCoordinates && location) {
      setShowMapModal(false);
      if (errors.location) {
        setErrors(prev => ({ ...prev, location: '' }));
      }
    } else {
      Alert.alert('No location selected', 'Please tap on the map to select a location.');
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      description: '',
      location: ''
    };

    if (!description.trim()) {
      newErrors.description = 'Please describe what happened';
      isValid = false;
    }

    if (!location.trim()) {
      newErrors.location = 'Location is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const confirmSubmit = async () => {
    try {
      setIsSubmitting(true);
      setShowConfirmModal(false);

      // 1. Retrieve JWT token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to submit a report.');
        setIsSubmitting(false);
        return;
      }

      // 2. Prepare location data in the format backend expects: {"lat": number, "lon": number}
      let locationData;
      if (selectedCoordinates) {
        locationData = {
          lat: selectedCoordinates.latitude,
          lon: selectedCoordinates.longitude
        };
      } else {
        // If no coordinates selected, try to geocode the location string
        try {
          const results = await Location.geocodeAsync(location);
          if (results && results.length > 0) {
            locationData = {
              lat: results[0].latitude,
              lon: results[0].longitude
            };
          } else {
            Alert.alert('Invalid Location', 'Please select a valid location or use the map picker.');
            setIsSubmitting(false);
            return;
          }
        } catch (error) {
          Alert.alert('Location Error', 'Unable to determine coordinates for this location.');
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Prepare FormData with multipart/form-data
      const formData = new FormData();
      formData.append('raw_text', description);
      formData.append('location', JSON.stringify(locationData));

      // 4. Separate media into images and videos arrays
      const images = media.filter(item => item.type === 'image');
      const videos = media.filter(item => item.type === 'video');

      // 5. Append image files
      images.forEach((image, index) => {
        const uriParts = image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('images', {
          uri: image.uri,
          name: `image_${index}.${fileType}`,
          type: `image/${fileType}`,
        });
      });

      // 6. Append video files
      videos.forEach((video, index) => {
        const uriParts = video.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('videos', {
          uri: video.uri,
          name: `video_${index}.${fileType}`,
          type: `video/${fileType}`,
        });
      });

      // 7. Send POST request to backend
      console.log('Submitting report to backend...');
      const response = await fetch(`${API_BASE_URL}/reports/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header - fetch will set it automatically with boundary for multipart/form-data
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Submit response:', response.status, data);

      // 8. Handle response
      if (response.ok) {
        const reportDetails = data.details || data;
        const reportId = reportDetails.raw_report_id || reportDetails.id;
        
        Alert.alert(
          'Success!',
          `Report submitted successfully!\nReport ID: ${reportId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setDescription('');
                setLocation('');
                setMedia([]);
                setSelectedCoordinates(null);
                setErrors({ description: '', location: '' });
              }
            }
          ]
        );
      } else {
        // Handle validation errors from backend
        const errorDetail = data.detail || {};
        const errorMessage = errorDetail.details || errorDetail.message || 'Failed to submit report. Please try again.';
        Alert.alert('Submission Failed', errorMessage);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Report an Issue</Text>

      {/* Anonymous Notice */}
      <View style={{
        backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(37, 99, 235, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 }}>
            Anonymous Reporting
          </Text>
          <Text style={{ color: colors.gray, fontSize: 13, lineHeight: 18 }}>
            Your identity will be protected. All reports are submitted anonymously.
          </Text>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>What happened?</Text>
      
      {/* Template Selector */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.gray, fontSize: 13, marginBottom: 8 }}>Quick Templates:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={{
                backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDark ? '#404040' : '#d0d0d0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }}
              onPress={() => {
                setDescription(template.text);
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }));
                }
              }}
            >
              <Ionicons name={template.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text, fontSize: 13 }}>{template.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { 
            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
            color: colors.text,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#ddd',
          },
          errors.description ? styles.inputError : null
        ]}
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          if (errors.description) {
            setErrors(prev => ({ ...prev, description: '' }));
          }
        }}
        placeholder="Describe what happened..."
        placeholderTextColor={colors.gray}
        multiline
      />
      {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}

      <Text style={[styles.label, { color: colors.text }]}>Location</Text>
      <View style={{ position: 'relative', zIndex: 1000 }}>
        <View style={[
          styles.input,
          { 
            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
            flexDirection: 'row', 
            alignItems: 'center',
            paddingVertical: 0,
            marginBottom: 15,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#ddd',
          },
          errors.location ? styles.inputError : null
        ]}>
          <TextInput
            style={{ 
              flex: 1, 
              color: colors.text, 
              fontSize: 15,
              paddingVertical: 12
            }}
            value={location}
            onChangeText={searchLocation}
            placeholder="Search location..."
            placeholderTextColor={colors.gray}
          />
          <TouchableOpacity 
            style={{ padding: 8 }}
            onPress={openMapPicker}
          >
            <Ionicons name="location-sharp" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {showSuggestions && locationSuggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface }]}>
            {locationSuggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => selectLocationSuggestion(item)}
              >
                <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggestionMainText, { color: colors.text }]} numberOfLines={2}>
                    {item.address}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

      <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>
        Add Photos/Videos ({media.length}/10)
      </Text>
      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity 
          style={[
            styles.uploadBtn, 
            { 
              backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
              borderWidth: 1,
              borderColor: isDark ? '#333' : '#ddd',
              flex: 1, 
              marginRight: 8 
            }
          ]} 
          onPress={handleImageFromCamera}
          disabled={media.length >= 10}
        >
          <Ionicons name="camera-outline" size={22} color={media.length >= 10 ? colors.gray : colors.primary} />
          <Text style={[styles.uploadText, { color: media.length >= 10 ? colors.gray : colors.primary }]}>
            Camera
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.uploadBtn, 
            { 
              backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
              borderWidth: 1,
              borderColor: isDark ? '#333' : '#ddd',
              flex: 1 
            }
          ]} 
          onPress={handleImageFromGallery}
          disabled={media.length >= 10}
        >
          <Ionicons name="image-outline" size={22} color={media.length >= 10 ? colors.gray : colors.primary} />
          <Text style={[styles.uploadText, { color: media.length >= 10 ? colors.gray : colors.primary }]}>
            Gallery
          </Text>
        </TouchableOpacity>
      </View>

      {media.length > 0 && (
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          marginBottom: 15,
          gap: 8
        }}>
          {media.map((item, index) => (
            <View 
              key={index} 
              style={{ 
                width: '31%', 
                aspectRatio: 1,
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: colors.surface
              }}
            >
              <Image 
                source={{ uri: item.uri }} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="cover"
              />
              {item.type === 'video' && (
                <View style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <Ionicons name="play" size={16} color="#fff" />
                </View>
              )}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setMedia(media.filter((_, i) => i !== index))}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit Report</Text>
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: 20 
        }}>
          <View style={{ 
            backgroundColor: colors.background, 
            borderRadius: 16, 
            padding: 24,
            width: '85%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
            </View>
            
            <Text style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: colors.text,
              textAlign: 'center',
              marginBottom: 8
            }}>
              Submit Report?
            </Text>
            
            <Text style={{ 
              fontSize: 14, 
              color: colors.gray,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20
            }}>
              Your report will be submitted anonymously and reviewed by our team.
            </Text>

            {isSubmitting ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ 
                  marginTop: 12, 
                  fontSize: 14, 
                  color: colors.gray 
                }}>
                  Submitting report...
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? '#404040' : '#ddd',
                  }}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={confirmSubmit}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: 16, 
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
              Select Location on Map
            </Text>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {selectedCoordinates && (
              <Marker 
                coordinate={selectedCoordinates}
                draggable
                onDragEnd={handleMapPress}
              />
            )}
          </MapView>

          {/* Custom My Location Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 16,
              bottom: 140,
              backgroundColor: colors.background,
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
            onPress={async () => {
              try {
                const currentLocation = await Location.getCurrentPositionAsync({});
                const coords = {
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                };
                setSelectedCoordinates(coords);
                setMapRegion({
                  ...coords,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                });
                
                // Get address for the location
                const addresses = await Location.reverseGeocodeAsync(coords);
                if (addresses && addresses.length > 0) {
                  const addr = addresses[0];
                  const fullAddress = [
                    addr.name,
                    addr.street,
                    addr.district,
                    addr.city,
                    addr.region,
                    addr.country
                  ].filter(Boolean).join(', ');
                  setLocation(fullAddress);
                }
              } catch (error) {
                Alert.alert('Error', 'Could not get current location');
              }
            }}
          >
            <Ionicons name="locate" size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={{ padding: 16, backgroundColor: colors.background }}>
            {location ? (
              <Text style={{ color: colors.text, marginBottom: 12, fontSize: 14 }}>
                📍 {location}
              </Text>
            ) : null}
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]} 
              onPress={confirmMapLocation}
            >
              <Text style={styles.submitText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  content: {
    paddingVertical: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 5,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 15,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    maxHeight: 250,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
  },
  suggestionMainText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  locationBtnText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
