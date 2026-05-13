import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';

export default function Tasks() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>Daily farm chores.</Text>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>All caught up!</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1814',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6560',
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#2F4F3C',
    fontWeight: '600',
    fontSize: 18,
  }
});