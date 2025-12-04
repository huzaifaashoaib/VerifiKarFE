import { Ionicons } from '@expo/vector-icons';
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

  const credibilityOptions = [0.3, 0.5, 0.7, 0.8, 0.9];
  const daysOptions = [1, 3, 7, 14, 30];

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

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        visible={filterVisible}
        transparent={true}
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Posts</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Categories */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Categories</Text>
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
                            borderColor: colors.border
                          }
                        ]}
                        onPress={() => toggleCategory(category.id)}
                      >
                        <Ionicons 
                          name={category.icon} 
                          size={18} 
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

              {/* Min Credibility */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>
                  Min Credibility: {Math.round(minCredibility * 100)}%
                </Text>
                <View style={styles.optionGrid}>
                  {credibilityOptions.map(cred => (
                    <TouchableOpacity
                      key={cred}
                      style={[
                        styles.optionChip,
                        { 
                          backgroundColor: minCredibility === cred ? colors.primary : colors.background,
                          borderColor: colors.border
                        }
                      ]}
                      onPress={() => setMinCredibility(cred)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: minCredibility === cred ? '#fff' : colors.text }
                      ]}>
                        {Math.round(cred * 100)}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Max Days Old */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>
                  Max Age: {maxDaysOld} days
                </Text>
                <View style={styles.optionGrid}>
                  {daysOptions.map(days => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.optionChip,
                        { 
                          backgroundColor: maxDaysOld === days ? colors.primary : colors.background,
                          borderColor: colors.border
                        }
                      ]}
                      onPress={() => setMaxDaysOld(days)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: maxDaysOld === days ? '#fff' : colors.text }
                      ]}>
                        {days}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
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
        headerTitle: 'VerifiKar',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});