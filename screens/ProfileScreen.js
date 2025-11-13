import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { layout } from '../styles/commonStyles';
import { useTheme } from '../styles/ThemeContext';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="person-circle" size={80} color={colors.primary} />
        <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'User'}</Text>
        <Text style={[styles.email, { color: colors.gray }]}>{user?.email || 'email@example.com'}</Text>
        {user?.user_id && (
          <Text style={[styles.userId, { color: colors.gray }]}>
            ID: {user.user_id}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={22} color="#ff4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
    alignItems: 'center',
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  userId: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
