import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Platform, 
  Pressable, Modal, TextInput, ScrollView, Alert, ActivityIndicator 
} from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

const palette = {
  bg: '#F4F1EA',
  primary: '#2F4F3C',
  text: '#1A1814',
  muted: '#6B6560',
  surface: '#FFFFFF',
  border: '#D9D4C8',
  highlight: '#E8E5DA',
  accent: '#7A9181'
};

export default function Calendar() {
  const [modalVisible, setModalVisible] = useState(false);
  const [formStep, setFormStep] = useState('choice'); 
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [allData, setAllData] = useState([]); // Combined seeds and events
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [brand, setBrand] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: seedsData } = await supabase.from('seeds').select('*');
      const { data: eventsData } = await supabase.from('events').select('*');
      
      // Combine for the list view, tagging them so we can style them differently
      const combined = [
        ...(seedsData || []).map(s => ({ ...s, type: 'seed' })),
        ...(eventsData || []).map(e => ({ ...e, type: 'event' }))
      ];
      setAllData(combined);

      // Create dots for the calendar
      const marks = {};
      combined.forEach(item => {
        if (item.date) {
          marks[item.date] = { marked: true, dotColor: palette.primary };
        }
      });
      setMarkedDates(marks);
    } catch (e) { 
      console.log("Calendar fetch error:", e); 
    } finally {
      setLoading(false);
    }
  }

  // Filter activities for the selected day
  const dailyActivities = useMemo(() => {
    return allData.filter(item => item.date === selectedDate);
  }, [allData, selectedDate]);

  const resetForm = () => {
    setModalVisible(false);
    setFormStep('choice');
    setTitle('');
    setLocation('');
    setNotes('');
    setBrand('');
    setShowPicker(false);
  };

  const handleSave = async () => {
    if (!title) return Alert.alert("Error", "Please enter a Name/Title");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = formStep === 'tray' 
        ? await supabase.from('seeds').insert({ brand, variety: title, date, user_id: user.id })
        : await supabase.from('events').insert({ title, date, location, notes, user_id: user.id });
      
      if (error) throw error;

      Alert.alert("Success", "Saved to Garden!");
      fetchData();
      resetForm();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>Garden Timeline</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.calendarWrapper}>
        <RNCalendar 
          theme={{ 
            calendarBackground: palette.bg,
            todayTextColor: palette.accent,
            arrowColor: palette.primary,
            selectedDayBackgroundColor: palette.primary,
            selectedDayTextColor: '#ffffff',
            dotColor: palette.primary,
          }} 
          markedDates={{
            ...markedDates,
            [selectedDate]: { ...markedDates[selectedDate], selected: true }
          }}
          onDayPress={(day) => setSelectedDate(day.dateString)}
        />
      </View>

      {/* AGENDA SECTION */}
      <View style={styles.agendaContainer}>
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>
            {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Schedule" : `Activities for ${selectedDate}`}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.agendaScroll}>
          {loading ? (
            <ActivityIndicator color={palette.primary} style={{ marginTop: 20 }} />
          ) : dailyActivities.length > 0 ? (
            dailyActivities.map((item, idx) => (
              <View key={item.id || idx} style={styles.activityCard}>
                <View style={[styles.typeIndicator, { backgroundColor: item.type === 'seed' ? palette.primary : palette.accent }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityName}>{item.variety || item.title}</Text>
                  <Text style={styles.activityMeta}>
                    {item.type === 'seed' ? `Planted • ${item.brand || 'No Brand'}` : `Event • ${item.location || 'No Location'}`}
                  </Text>
                  {item.notes && <Text style={styles.activityNotes}>{item.notes}</Text>}
                </View>
                <Ionicons 
                  name={item.type === 'seed' ? "leaf" : "calendar"} 
                  size={20} 
                  color={palette.border} 
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bed-outline" size={48} color={palette.border} />
              <Text style={styles.emptyText}>Nothing scheduled for this day.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL (Existing code below remained the same for form logic) */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        {/* ... (Your existing modal code) ... */}
        <View style={styles.overlay}>
          <View style={styles.modalBody}>
            {formStep === 'choice' ? (
              <View>
                <Text style={styles.mTitle}>What are we adding?</Text>
                <Pressable style={styles.option} onPress={() => setFormStep('event')}>
                  <Ionicons name="calendar-outline" size={24} color={palette.primary} />
                  <Text style={styles.optionText}>General Event</Text>
                </Pressable>
                <Pressable style={styles.option} onPress={() => setFormStep('tray')}>
                  <Ionicons name="leaf-outline" size={24} color={palette.primary} />
                  <Text style={styles.optionText}>New Tray Entry</Text>
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={resetForm}>
                  <Text style={styles.closeText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formHead}>
                  <Pressable onPress={() => setFormStep('choice')}>
                    <Ionicons name="arrow-back" size={24} color={palette.primary} />
                  </Pressable>
                  <Text style={styles.mTitleInline}>{formStep === 'event' ? 'New Event' : 'New Tray'}</Text>
                </View>

                <Text style={styles.label}>Date</Text>
                <Pressable style={[styles.dateSelector, showPicker && styles.activeSelector]} onPress={() => setShowPicker(!showPicker)}>
                  <Ionicons name="calendar" size={20} color={palette.primary} />
                  <Text style={styles.dateDisplay}>{date}</Text>
                  <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={18} color={palette.muted} />
                </Pressable>

                {showPicker && (
                  <View style={styles.pickerContainer}>
                    <RNCalendar 
                      onDayPress={(day) => { setDate(day.dateString); setShowPicker(false); }}
                      theme={{ calendarBackground: '#FAFAF8', selectedDayBackgroundColor: palette.primary }}
                      markedDates={{ [date]: { selected: true, selectedColor: palette.primary } }}
                    />
                  </View>
                )}

                <Text style={styles.label}>{formStep === 'event' ? 'Event Title' : 'Variety Name'}</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={formStep === 'event' ? "e.g. Garden Cleanup" : "e.g. Brandywine Tomato"} />

                {formStep === 'event' ? (
                  <>
                    <Text style={styles.label}>Location</Text>
                    <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Backyard, Greenhouse, etc." />
                    <Text style={styles.label}>Notes</Text>
                    <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline value={notes} onChangeText={setNotes} placeholder="Details about the task..." />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Seed Brand</Text>
                    <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="e.g. Baker Creek" />
                  </>
                )}

                <View style={styles.btnRow}>
                   <Pressable style={[styles.btn, styles.btnCancel]} onPress={resetForm}><Text style={styles.btnTextCancel}>Cancel</Text></Pressable>
                   <Pressable style={[styles.btn, styles.btnSave]} onPress={handleSave}><Text style={styles.btnTextSave}>Save Entry</Text></Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: palette.text },
  subtitle: { fontSize: 14, color: palette.muted },
  addButton: { backgroundColor: palette.primary, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  
  calendarWrapper: { backgroundColor: palette.bg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  
  agendaContainer: { flex: 1, padding: 20 },
  agendaHeader: { marginBottom: 15 },
  agendaTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  agendaScroll: { paddingBottom: 20 },
  
  activityCard: { 
    flexDirection: 'row', 
    backgroundColor: palette.surface, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  typeIndicator: { width: 4, height: '100%', borderRadius: 2, marginRight: 15 },
  activityContent: { flex: 1 },
  activityName: { fontSize: 16, fontWeight: '700', color: palette.text },
  activityMeta: { fontSize: 13, color: palette.muted, marginTop: 2 },
  activityNotes: { fontSize: 12, color: palette.muted, marginTop: 4, fontStyle: 'italic' },
  
  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { marginTop: 10, fontSize: 15, color: palette.muted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalBody: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, maxHeight: '90%' },
  mTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: palette.text },
  mTitleInline: { fontSize: 20, fontWeight: 'bold', color: palette.text },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  option: { flexDirection: 'row', padding: 20, backgroundColor: palette.highlight, marginBottom: 12, borderRadius: 16, alignItems: 'center' },
  optionText: { marginLeft: 12, fontWeight: '600', fontSize: 17, color: palette.primary },
  label: { fontSize: 12, fontWeight: '700', marginTop: 15, marginBottom: 5, color: palette.muted, textTransform: 'uppercase' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: palette.border, padding: 14, borderRadius: 12, backgroundColor: '#FAFAF8' },
  activeSelector: { borderColor: palette.primary },
  dateDisplay: { flex: 1, marginLeft: 12, fontSize: 16, color: palette.text },
  pickerContainer: { marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
  input: { borderWidth: 2, borderColor: palette.border, padding: 14, borderRadius: 12, fontSize: 16, backgroundColor: '#FAFAF8', color: palette.text },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 25, marginBottom: 10 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnSave: { backgroundColor: palette.primary },
  btnCancel: { backgroundColor: palette.highlight },
  btnTextSave: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnTextCancel: { color: palette.muted, fontWeight: 'bold', fontSize: 16 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: palette.muted, fontWeight: '600' }
});