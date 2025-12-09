import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../styles/ThemeContext";

export default function ReportScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef(null);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 24.8607,
    longitude: 67.0099,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [errors, setErrors] = useState({
    description: "",
    location: "",
  });

  // Check for pending reports on mount and retry them
  useEffect(() => {
    const retryPendingReports = async () => {
      try {
        const pendingReports = JSON.parse(await AsyncStorage.getItem("@verifikar_pending_reports") || "[]");
        if (pendingReports.length === 0) return;
        
        setPendingCount(pendingReports.length);
        
        const successfulIds = [];
        
        for (const report of pendingReports) {
          try {
            const formData = new FormData();
            formData.append("raw_text", report.descriptionText);
            formData.append("location", JSON.stringify(report.locationData));

            const images = report.mediaItems.filter((item) => item.type === "image");
            const videos = report.mediaItems.filter((item) => item.type === "video");

            images.forEach((image, index) => {
              const uriParts = image.uri.split(".");
              const fileType = uriParts[uriParts.length - 1];
              formData.append("images", { uri: image.uri, name: `image_${index}.${fileType}`, type: `image/${fileType}` });
            });

            videos.forEach((video, index) => {
              const uriParts = video.uri.split(".");
              const fileType = uriParts[uriParts.length - 1];
              formData.append("videos", { uri: video.uri, name: `video_${index}.${fileType}`, type: `video/${fileType}` });
            });

            const response = await fetch(`${API_BASE_URL}/reports/submit`, {
              method: "POST",
              headers: { Authorization: `Bearer ${report.token}` },
              body: formData,
            });

            if (response.ok) {
              successfulIds.push(report.id);
            }
          } catch (err) {
            // Keep in queue for next retry
          }
        }

        if (successfulIds.length > 0) {
          const remaining = pendingReports.filter(r => !successfulIds.includes(r.id));
          await AsyncStorage.setItem("@verifikar_pending_reports", JSON.stringify(remaining));
          setPendingCount(remaining.length);
          
          if (remaining.length === 0) {
            // All pending reports submitted successfully - subtle notification
          }
        }
      } catch (error) {
        console.log("Error retrying pending reports:", error);
      }
    };

    retryPendingReports();
  }, []);

  // Templates to help users quickly describe incidents
  const templates = [
    { id: 1, icon: "car", label: "Accident", color: "#64748b", template: "I witnessed a traffic accident involving..." },
    { id: 2, icon: "flame", label: "Fire", color: "#f97316", template: "There is a fire at..." },
    { id: 3, icon: "water", label: "Flood", color: "#3b82f6", template: "Flooding has occurred due to..." },
    { id: 4, icon: "construct", label: "Infrastructure", color: "#8b5cf6", template: "There is damage to infrastructure..." },
    { id: 5, icon: "people", label: "Gathering", color: "#10b981", template: "A large gathering is taking place at..." },
    { id: 6, icon: "warning", label: "Emergency", color: "#ef4444", template: "Emergency situation reported..." },
    { id: 7, icon: "megaphone", label: "Protest", color: "#eab308", template: "A protest is happening at..." },
    { id: 8, icon: "ellipsis-horizontal", label: "Other", color: "#6b7280", template: "" },
  ];

  // ============ MEDIA HANDLERS ============
  const handleImageFromGallery = async () => {
    if (media.length >= 5) {
      Alert.alert("Limit Reached", "You can add up to 5 photos or videos.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - media.length,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type,
      }));
      setMedia([...media, ...newMedia].slice(0, 5));
    }
  };

  const handleImageFromCamera = async () => {
    if (media.length >= 5) {
      Alert.alert("Limit Reached", "You can add up to 5 photos or videos.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Camera access is required to take photos.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newItem = {
        uri: result.assets[0].uri,
        type: result.assets[0].type,
      };
      setMedia([...media, newItem]);
    }
  };

  // ============ LOCATION HANDLERS ============
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "Location access helps us show your report in the right area.");
        return;
      }

      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 10000,
          timeout: 10000,
        });
        const { latitude, longitude } = currentLocation.coords;
        setSelectedCoordinates({ latitude, longitude });
        setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });

        try {
          const address = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (address[0]) {
            const addressParts = [];
            if (address[0].street) addressParts.push(address[0].street);
            if (address[0].district) addressParts.push(address[0].district);
            if (address[0].city) addressParts.push(address[0].city);
            const addressString = addressParts.filter((p) => p).join(", ") || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setLocation(addressString);
          }
        } catch (geocodeError) {
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
      } catch (locError) {
        // Try last known location
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (lastKnown) {
          const { latitude, longitude } = lastKnown.coords;
          setSelectedCoordinates({ latitude, longitude });
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } else {
          Alert.alert("Location Unavailable", "Please use the map to select a location.", [
            { text: "Open Map", onPress: () => setShowMapModal(true) },
            { text: "OK" },
          ]);
        }
      }
    } catch (error) {
      console.error("Location error:", error);
    }
  };

  const searchLocation = async (text) => {
    setLocation(text);
    if (text.length > 2) {
      try {
        const results = await Location.geocodeAsync(text);
        if (results.length > 0) {
          const suggestions = await Promise.all(
            results.slice(0, 5).map(async (result) => {
              try {
                const address = await Location.reverseGeocodeAsync({
                  latitude: result.latitude,
                  longitude: result.longitude,
                });
                if (address[0]) {
                  const addr = address[0];
                  const parts = [addr.street, addr.district, addr.city, addr.country].filter(Boolean);
                  return {
                    address: parts.join(", "),
                    coords: { latitude: result.latitude, longitude: result.longitude },
                  };
                }
              } catch (err) {}
              return null;
            })
          );
          const valid = suggestions.filter((s) => s !== null);
          setLocationSuggestions(valid);
          setShowSuggestions(valid.length > 0);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
    if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
  };

  const selectLocationSuggestion = (suggestion) => {
    setLocation(suggestion.address);
    setSelectedCoordinates(suggestion.coords);
    setShowSuggestions(false);
    setLocationSuggestions([]);
    Keyboard.dismiss();
    if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
  };

  const openMapPicker = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Location access helps position the map.");
    }

    let initialCoords = { latitude: 24.8607, longitude: 67.0099 };
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 10000,
        timeout: 10000,
      });
      initialCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    } catch (error) {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000 });
        if (lastKnown) {
          initialCoords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
        }
      } catch (fallbackError) {}
    }

    setMapRegion({ ...initialCoords, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });
    setSelectedCoordinates(initialCoords);

    try {
      const addresses = await Location.reverseGeocodeAsync(initialCoords);
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const fullAddress = [addr.name, addr.street, addr.district, addr.city].filter(Boolean).join(", ");
        if (fullAddress) setLocation(fullAddress);
      }
    } catch (geocodeError) {}

    setShowMapModal(true);
  };

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoordinates({ latitude, longitude });

    try {
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address[0]) {
        const addr = address[0];
        const parts = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean);
        setLocation(parts.join(", "));
      }
    } catch (error) {
      setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  const confirmMapLocation = () => {
    if (selectedCoordinates && location) {
      setShowMapModal(false);
      if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
    } else {
      Alert.alert("Select Location", "Tap on the map to choose a location.");
    }
  };

  // ============ FORM VALIDATION & SUBMISSION ============
  const validateForm = () => {
    let isValid = true;
    const newErrors = { description: "", location: "" };

    if (!description.trim()) {
      newErrors.description = "Please tell us what happened";
      isValid = false;
    }

    if (!location.trim()) {
      newErrors.location = "We need to know where this happened";
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

  // Background submit function - runs after optimistic success shown
  const submitReportInBackground = async (reportData) => {
    try {
      const { token, locationData, descriptionText, mediaItems } = reportData;
      
      const formData = new FormData();
      formData.append("raw_text", descriptionText);
      formData.append("location", JSON.stringify(locationData));

      const images = mediaItems.filter((item) => item.type === "image");
      const videos = mediaItems.filter((item) => item.type === "video");

      images.forEach((image, index) => {
        const uriParts = image.uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        formData.append("images", { uri: image.uri, name: `image_${index}.${fileType}`, type: `image/${fileType}` });
      });

      videos.forEach((video, index) => {
        const uriParts = video.uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        formData.append("videos", { uri: video.uri, name: `video_${index}.${fileType}`, type: `video/${fileType}` });
      });

      const response = await fetch(`${API_BASE_URL}/reports/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Store failed report for retry
        const pendingReports = JSON.parse(await AsyncStorage.getItem("@verifikar_pending_reports") || "[]");
        pendingReports.push({
          id: Date.now(),
          ...reportData,
          failedAt: new Date().toISOString(),
          error: data.detail?.message || "Submission failed",
        });
        await AsyncStorage.setItem("@verifikar_pending_reports", JSON.stringify(pendingReports));
        
        // Show subtle notification that submission failed
        Alert.alert(
          "Submission Queued", 
          "Your report was saved and will be submitted when connection improves.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      // Store for retry on network failure
      const pendingReports = JSON.parse(await AsyncStorage.getItem("@verifikar_pending_reports") || "[]");
      pendingReports.push({
        id: Date.now(),
        ...reportData,
        failedAt: new Date().toISOString(),
        error: "Network error",
      });
      await AsyncStorage.setItem("@verifikar_pending_reports", JSON.stringify(pendingReports));
      
      Alert.alert(
        "Saved Offline", 
        "Your report was saved and will be submitted when you're back online.",
        [{ text: "OK" }]
      );
    }
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    
    // Validate token first (must be synchronous check before optimistic success)
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      Alert.alert("Sign In Required", "Please sign in to submit your report.");
      return;
    }

    // Validate location data
    let locationData;
    if (selectedCoordinates) {
      locationData = { lat: selectedCoordinates.latitude, lon: selectedCoordinates.longitude };
    } else {
      try {
        const results = await Location.geocodeAsync(location);
        if (results && results.length > 0) {
          locationData = { lat: results[0].latitude, lon: results[0].longitude };
        } else {
          Alert.alert("Location Issue", "Please select a location using the map.");
          return;
        }
      } catch (error) {
        Alert.alert("Location Issue", "We couldn't find this location.");
        return;
      }
    }

    // Capture current form data for background submission
    const reportData = {
      token,
      locationData,
      descriptionText: description,
      mediaItems: [...media],
    };

    // OPTIMISTIC: Clear form and show success immediately
    setDescription("");
    setLocation("");
    setMedia([]);
    setSelectedCoordinates(null);
    setSelectedCategory(null);
    setErrors({ description: "", location: "" });
    setShowSuccessModal(true);

    // Submit in background - user doesn't wait
    submitReportInBackground(reportData);
  };

  // ============ RENDER ============
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Calming Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Share What You Saw</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>
            Take your time. Your report helps keep the community safe.
          </Text>
        </View>

        {/* Pending Reports Indicator */}
        {pendingCount > 0 && (
          <View style={[styles.pendingNotice, { backgroundColor: isDark ? "rgba(251, 191, 36, 0.1)" : "rgba(251, 191, 36, 0.08)" }]}>
            <View style={[styles.safetyIcon, { backgroundColor: "#fbbf2420" }]}>
              <Ionicons name="cloud-upload-outline" size={20} color="#f59e0b" />
            </View>
            <View style={styles.safetyTextContainer}>
              <Text style={[styles.safetyTitle, { color: colors.text }]}>
                {pendingCount} report{pendingCount > 1 ? 's' : ''} uploading
              </Text>
              <Text style={[styles.safetyText, { color: colors.gray }]}>
                Will be submitted when connection is available
              </Text>
            </View>
          </View>
        )}

        {/* Safety Notice - Calming design */}
        <View style={[styles.safetyNotice, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)" }]}>
          <View style={[styles.safetyIcon, { backgroundColor: "#10b98120" }]}>
            <Ionicons name="heart" size={20} color="#10b981" />
          </View>
          <View style={styles.safetyTextContainer}>
            <Text style={[styles.safetyTitle, { color: colors.text }]}>You're safe here</Text>
            <Text style={[styles.safetyText, { color: colors.gray }]}>
              Your identity stays private. Reports are anonymous.
            </Text>
          </View>
        </View>

        {/* Step 1: Category Selection */}
        {/* Templates - Optional Helper */}
        <View style={styles.section}>
          <View style={styles.templateHeader}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.templateTitle, { color: colors.text }]}>Quick start with a template</Text>
              <Text style={[styles.stepSubtitle, { color: colors.gray }]}>Optional • Tap to auto-fill</Text>
            </View>
          </View>

          <View style={styles.categoryGrid}>
            {templates.map((tmpl) => (
              <TouchableOpacity
                key={tmpl.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: selectedCategory === tmpl.id ? tmpl.color + "20" : isDark ? "#1e1e1e" : "#f8f9fa",
                    borderColor: selectedCategory === tmpl.id ? tmpl.color : isDark ? "#333" : "#e5e5e5",
                  },
                ]}
                onPress={() => {
                  if (selectedCategory === tmpl.id) {
                    setSelectedCategory(null);
                    setDescription("");
                  } else {
                    setSelectedCategory(tmpl.id);
                    setDescription(tmpl.template);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={tmpl.icon} size={24} color={selectedCategory === tmpl.id ? tmpl.color : colors.gray} />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: selectedCategory === tmpl.id ? tmpl.color : colors.text },
                  ]}
                >
                  {tmpl.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 1: Description */}
        <View style={styles.section}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>1</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What happened?</Text>
          </View>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDark ? "#1a1a1a" : "#f8f9fa",
                color: colors.text,
                borderColor: errors.description ? "#ef4444" : isDark ? "#333" : "#e5e5e5",
              },
            ]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
            }}
            onFocus={() => setTimeout(() => scrollViewRef.current?.scrollTo({ y: 350, animated: true }), 100)}
            placeholder="Describe what you saw in your own words..."
            placeholderTextColor={colors.gray}
            multiline
            textAlignVertical="top"
          />
          {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
        </View>

        {/* Step 2: Location */}
        <View style={styles.section}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>2</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Where did it happen?</Text>
          </View>

          <View style={{ position: "relative", zIndex: 1000 }}>
            <View
              style={[
                styles.locationInput,
                {
                  backgroundColor: isDark ? "#1a1a1a" : "#f8f9fa",
                  borderColor: errors.location ? "#ef4444" : isDark ? "#333" : "#e5e5e5",
                },
              ]}
            >
              <Ionicons name="search" size={20} color={colors.gray} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: 15 }}
                value={location}
                onChangeText={searchLocation}
                onFocus={() => setTimeout(() => scrollViewRef.current?.scrollTo({ y: 500, animated: true }), 100)}
                placeholder="Search or type a location..."
                placeholderTextColor={colors.gray}
              />
            </View>

            {showSuggestions && locationSuggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface }]}>
                {locationSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectLocationSuggestion(item)}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={2}>
                      {item.address}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

          {/* Location Quick Actions */}
          <View style={styles.locationActions}>
            <TouchableOpacity
              style={[styles.locationBtn, { backgroundColor: isDark ? "#1e1e1e" : "#f0f9ff", borderColor: colors.primary + "30" }]}
              onPress={getCurrentLocation}
            >
              <Ionicons name="locate" size={18} color={colors.primary} />
              <Text style={[styles.locationBtnText, { color: colors.primary }]}>Use my location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationBtn, { backgroundColor: isDark ? "#1e1e1e" : "#f0f9ff", borderColor: colors.primary + "30" }]}
              onPress={openMapPicker}
            >
              <Ionicons name="map" size={18} color={colors.primary} />
              <Text style={[styles.locationBtnText, { color: colors.primary }]}>Pick on map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 4: Media (Optional) */}
        <View style={styles.section}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>4</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Add photos or video</Text>
            <Text style={[styles.optional, { color: colors.gray }]}>Optional</Text>
          </View>

          <Text style={[styles.mediaHelper, { color: colors.gray }]}>
            Visual evidence helps verify reports. Only share what you're comfortable with.
          </Text>

          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: isDark ? "#1e1e1e" : "#f8f9fa", borderColor: isDark ? "#333" : "#e5e5e5" }]}
              onPress={handleImageFromCamera}
              disabled={media.length >= 5}
            >
              <View style={[styles.mediaBtnIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="camera" size={22} color={media.length >= 5 ? colors.gray : colors.primary} />
              </View>
              <Text style={[styles.mediaBtnText, { color: media.length >= 5 ? colors.gray : colors.text }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: isDark ? "#1e1e1e" : "#f8f9fa", borderColor: isDark ? "#333" : "#e5e5e5" }]}
              onPress={handleImageFromGallery}
              disabled={media.length >= 5}
            >
              <View style={[styles.mediaBtnIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="images" size={22} color={media.length >= 5 ? colors.gray : colors.primary} />
              </View>
              <Text style={[styles.mediaBtnText, { color: media.length >= 5 ? colors.gray : colors.text }]}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {media.length > 0 && (
            <View style={styles.mediaPreview}>
              <Text style={[styles.mediaCount, { color: colors.gray }]}>{media.length}/5 added</Text>
              <View style={styles.mediaGrid}>
                {media.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
                    {item.type === "video" && (
                      <View style={styles.videoOverlay}>
                        <Ionicons name="play-circle" size={24} color="#fff" />
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeMedia} onPress={() => setMedia(media.filter((_, i) => i !== index))}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} activeOpacity={0.8}>
          <Ionicons name="paper-plane" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.submitText}>Submit Report</Text>
        </TouchableOpacity>

        {/* Reassuring footer */}
        <Text style={[styles.footerText, { color: colors.gray }]}>
          Your report will be reviewed and shared to help others stay informed.
        </Text>
      </ScrollView>

      {/* ============ MODALS ============ */}

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent={true} animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="send" size={32} color={colors.primary} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Ready to submit?</Text>
            <Text style={[styles.modalText, { color: colors.gray }]}>
              Your anonymous report will help keep the community informed.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" }]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtnPrimary, { backgroundColor: colors.primary }]} onPress={confirmSubmit}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal visible={showMapModal} animationType="slide" onRequestClose={() => setShowMapModal(false)}>
        <View style={{ flex: 1 }}>
          <View style={[styles.mapHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.mapClose}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.mapTitle, { color: colors.text }]}>Select Location</Text>
            <View style={{ width: 40 }} />
          </View>

          <MapView style={{ flex: 1 }} region={mapRegion} onPress={handleMapPress} showsUserLocation={true} showsMyLocationButton={false}>
            {selectedCoordinates && <Marker coordinate={selectedCoordinates} draggable onDragEnd={handleMapPress} />}
          </MapView>

          <TouchableOpacity
            style={[styles.myLocationBtn, { backgroundColor: colors.background }]}
            onPress={async () => {
              try {
                const currentLocation = await Location.getCurrentPositionAsync({});
                const coords = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude };
                setSelectedCoordinates(coords);
                setMapRegion({ ...coords, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });
                const addresses = await Location.reverseGeocodeAsync(coords);
                if (addresses && addresses.length > 0) {
                  const addr = addresses[0];
                  const fullAddress = [addr.name, addr.street, addr.district, addr.city].filter(Boolean).join(", ");
                  setLocation(fullAddress);
                }
              } catch (error) {
                Alert.alert("Error", "Could not get location");
              }
            }}
          >
            <Ionicons name="locate" size={22} color={colors.primary} />
          </TouchableOpacity>

          <View style={[styles.mapFooter, { backgroundColor: colors.background }]}>
            {location ? (
              <View style={styles.selectedLocation}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={[styles.selectedLocationText, { color: colors.text }]} numberOfLines={2}>
                  {location}
                </Text>
              </View>
            ) : (
              <Text style={[styles.mapHint, { color: colors.gray }]}>Tap on the map to select a location</Text>
            )}
            <TouchableOpacity style={[styles.confirmLocationBtn, { backgroundColor: colors.primary }]} onPress={confirmMapLocation}>
              <Text style={styles.confirmLocationText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent={true} animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>

            <Text style={[styles.successTitle, { color: colors.text }]}>Thank You!</Text>
            <Text style={[styles.successText, { color: colors.gray }]}>
              Your report is being submitted in the background. It will be reviewed and shared to help keep our community informed.
            </Text>

            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  safetyNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  safetyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  safetyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 28,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  stepSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  optional: {
    fontSize: 12,
    fontStyle: "italic",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
  textArea: {
    height: 120,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1.5,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 14,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 0.5,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  locationActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  locationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  locationBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  mediaHelper: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  mediaButtons: {
    flexDirection: "row",
    gap: 12,
  },
  mediaBtn: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  mediaBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  mediaBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  mediaPreview: {
    marginTop: 16,
  },
  mediaCount: {
    fontSize: 13,
    marginBottom: 10,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeMedia: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Map Modal
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  mapClose: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  myLocationBtn: {
    position: "absolute",
    right: 16,
    bottom: 160,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mapFooter: {
    padding: 20,
  },
  selectedLocation: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },
  selectedLocationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mapHint: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  confirmLocationBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmLocationText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Loading Modal
  loadingCard: {
    width: "80%",
    maxWidth: 280,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  // Success Modal
  successCard: {
    width: "90%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  successBtn: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  successBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
