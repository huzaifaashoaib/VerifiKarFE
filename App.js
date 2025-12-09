import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import { FilterProvider, useFilters } from './context/FilterContext';
import DiscoverScreen from './screens/DiscoverScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import ReportScreen from './screens/ReportScreen';
import SettingsScreen from './screens/SettingsScreen';
import SignupScreen from './screens/SignupScreen';
import { ThemeProvider, useTheme } from './styles/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HeaderButtons() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const { colors } = useTheme();
  const {
    radiusKm,
    setRadiusKm,
    selectedCategories,
    minCredibility,
    setMinCredibility,
    maxDaysOld,
    setMaxDaysOld,
    toggleCategory,
  } = useFilters();

  const categories = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'Accident', name: 'Accident', icon: 'car-outline' },
    { id: 'Crime', name: 'Crime', icon: 'warning-outline' },
    { id: 'Infrastructure', name: 'Infrastructure', icon: 'construct-outline' },
    { id: 'Social', name: 'Social', icon: 'people-outline' },
    { id: 'Emergency', name: 'Emergency', icon: 'alert-circle-outline' },
  ];

  const handleFilter = () => {
    setFilterVisible(true);
  };

  const handleSearch = () => {
    setSearchVisible(true);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 15 }}>
        <TouchableOpacity onPress={handleFilter} style={{ padding: 8 }}>
          <Ionicons name="filter-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleSearch} style={{ padding: 8 }}>
          <Ionicons name="search-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ padding: 8 }}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: 16, 
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>
              Settings
            </Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <SettingsScreen />
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        animationType="slide"
        visible={searchVisible}
        transparent={true}
        onRequestClose={() => setSearchVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Search Posts</Text>
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.comingSoonText, { color: colors.gray }]}>
                Search functionality coming soon!
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal - Modern Bottom Sheet */}
      <Modal
        animationType="slide"
        visible={filterVisible}
        transparent={true}
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setFilterVisible(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.gray + '40' }]} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity 
                onPress={() => {
                  // Reset filters
                  setMinCredibility(0);
                  setMaxDaysOld(30);
                }}
              >
                <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Report Types Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="albums-outline" size={18} color={colors.primary} />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Report Types</Text>
                </View>
                <View style={styles.categoryGrid}>
                  {categories.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryChip,
                          { 
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border
                          }
                        ]}
                        onPress={() => toggleCategory(category.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={category.icon} 
                          size={16} 
                          color={isSelected ? '#fff' : colors.text} 
                        />
                        <Text style={[
                          styles.categoryText,
                          { color: isSelected ? '#fff' : colors.text }
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Trust Score Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Trust Score</Text>
                  <View style={[styles.sliderValueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.sliderValueBadgeText}>
                      {Math.round(minCredibility * 100)}%+
                    </Text>
                  </View>
                </View>
                <View style={[styles.sliderContainer, { backgroundColor: colors.background }]}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={minCredibility}
                    onValueChange={setMinCredibility}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={[styles.sliderLabelText, { color: colors.gray }]}>Any</Text>
                    <Text style={[styles.sliderLabelText, { color: colors.gray }]}>50%+</Text>
                    <Text style={[styles.sliderLabelText, { color: colors.gray }]}>100%</Text>
                  </View>
                </View>
              </View>

              {/* Posted Within Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Posted Within</Text>
                  <View style={[styles.sliderValueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.sliderValueBadgeText}>
                      {maxDaysOld === 1 ? 'Today' : `${maxDaysOld} days`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.sliderContainer, { backgroundColor: colors.background }]}>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={30}
                    step={1}
                    value={maxDaysOld}
                    onValueChange={setMaxDaysOld}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={[styles.sliderLabelText, { color: colors.gray }]}>Today</Text>
                    <Text style={[styles.sliderLabelText, { color: colors.gray }]}>2 weeks</Text>
                    <Text style={[styles.sliderLabelText, { color: colors.gray }]}>1 month</Text>
                  </View>
                </View>
              </View>

              {/* Apply Button */}
              <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={() => setFilterVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  const { colors } = useTheme();

  const HeaderTitle = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="shield-checkmark" size={24} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>Verifi</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>Kar</Text>
    </View>
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { 
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 20,
        },
        headerTitle: () => <HeaderTitle />,
        headerRight: () => <HeaderButtons />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Report') iconName = 'document-text-outline';
          else if (route.name === 'Discover') iconName = 'compass-outline';
          else if (route.name === 'Profile') iconName = 'person-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Report" component={ReportScreen} options={{ title: 'Report' }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Discover' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function InnerApp() {
  const { colors, navigationTheme } = useTheme();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <FilterProvider>
        <AuthProvider>
          <InnerApp />
        </AuthProvider>
      </FilterProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sliderContainer: {
    borderRadius: 14,
    padding: 16,
  },
  sliderValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sliderValueBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderValue: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sliderValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 11,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});