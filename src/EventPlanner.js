import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const palette = {
  bg: '#F4F1EA',
  surface: '#FFFFFF',
  primary: '#2F4F3C',
  primaryMuted: '#4A6B58',
  border: '#D9D4C8',
  text: '#1A1814',
  muted: '#6B6560',
};

export default function EventPlanner() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Field & market</Text>
          <Text style={styles.title}>Event planner</Text>
          <Text style={styles.subtitle}>
            Keep u-picks, markets, and workshops on one list so the crew stays aligned.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Event name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Saturday farmers market — downtown"
              placeholderTextColor={palette.muted}
              value={eventName}
              onChangeText={setEventName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Event date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.muted}
              value={eventDate}
              onChangeText={setEventDate}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => {}}
          >
            <Text style={styles.buttonText}>Add event</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  header: { marginBottom: 20 },
  kicker: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.primaryMuted,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: palette.muted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  field: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.text,
    backgroundColor: '#FAFAF8',
  },
  button: {
    marginTop: 8,
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
