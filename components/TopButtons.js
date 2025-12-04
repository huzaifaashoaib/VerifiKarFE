
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView, Switch } from 'react-native';
import { typography } from '../styles/commonStyles';
import { useTheme } from '../styles/ThemeContext';

export default function TopButtons() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Filter states
  const [radiusKm, setRadiusKm] = useState(10);
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  const [minCredibility, setMinCredibility] = useState(0.5);
  const [maxDaysOld, setMaxDaysOld] = useState(7);

  const categories = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'Accident', name: 'Accident', icon: 'car-outline' },
    { id: 'Crime', name: 'Crime', icon: 'warning-outline' },
    { id: 'Infrastructure', name: 'Infrastructure', icon: 'construct-outline' },
    { id: 'Social', name: 'Social', icon: 'people-outline' },
    { id: 'Emergency', name: 'Emergency', icon: 'alert-circle-outline' },
  ];

  const radiusOptions = [5, 10, 15, 25, 50];
  const credibilityOptions = [0.3, 0.5, 0.7, 0.8, 0.9];
  const daysOptions = [1, 3, 7, 14, 30];

  const toggleCategory = (categoryId) => {
    if (categoryId === 'all') {
      setSelectedCategories(['all']);
    } else {
      const filtered = selectedCategories.filter(id => id !== 'all');
      if (filtered.includes(categoryId)) {
        const newSelection = filtered.filter(id => id !== categoryId);
        setSelectedCategories(newSelection.length === 0 ? ['all'] : newSelection);
      } else {
        setSelectedCategories([...filtered, categoryId]);
      }
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.appName, { color: colors.primary }]}>VerifiKar</Text>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={() => setShowSearchModal(true)}>
            <Ionicons name="search-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <Ionicons name="filter-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Search Posts</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
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
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Posts</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Radius */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>
                  Radius: {radiusKm}km
                </Text>
                <View style={styles.optionGrid}>
                  {radiusOptions.map(radius => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.optionChip,
                        { 
                          backgroundColor: radiusKm === radius ? colors.primary : colors.background,
                          borderColor: colors.border
                        }
                      ]}
                      onPress={() => setRadiusKm(radius)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: radiusKm === radius ? '#fff' : colors.text }
                      ]}>
                        {radius}km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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
                onPress={() => {
                  // TODO: Apply filters to feed
                  setShowFilterModal(false);
                }}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginHorizontal: 15,
  },
  appName: {
    ...typography.header,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
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
