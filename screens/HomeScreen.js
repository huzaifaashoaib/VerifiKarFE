import { StyleSheet, Text, View } from 'react-native';
import { layout, typography } from '../styles/commonStyles';
import { useTheme } from '../styles/ThemeContext';

export default function HomeScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <Text style={[styles.text, { color: colors.text }]}>Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: layout.screen,
  text: {
    ...typography.header,
    textAlign: 'center',
    marginTop: 20,
  },
});
