import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  Pressable, Modal, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView, Keyboard
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
  accent: '#7A9181',
  success: '#4A6741',
  danger: '#A63D40'
};

export default function TrayTracker() {
  // --- STATE ---
  const [trays, setTrays] = useState([]); 
  const [search, setSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState(['Basil', 'Tomato', 'Arugula']); 
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [germModalVisible, setGermModalVisible] = useState(false);
  
  const [editingId, setEditingId] = useState(null); 
  const [trayName, setTrayName] = useState('');
  const [variety, setVariety] = useState('');
  const [brand, setBrand] = useState('');
  const [seedCount, setSeedCount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isExperiment, setIsExperiment] = useState(false);
  const [experimentNotes, setExperimentNotes] = useState('');
  
  const [selectedTray, setSelectedTray] = useState(null);
  const [sproutCount, setSproutCount] = useState('');
  const [germDate, setGermDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGermPicker, setShowGermPicker] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrays();
  }, []);

  async function fetchTrays() {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('seeds')
        .select(`*, germination_logs (sprout_count, log_date)`)
        .order('date', { ascending: false });
      if (error) throw error;
      const processed = (data || []).map(tray => calculateGerm(tray));
      setTrays(processed); 
    } catch (e) { console.error("Fetch Error:", e.message); } 
    finally { setIsFetching(false); }
  }

  const calculateGerm = (tray) => {
    if (!tray) return {};
    const logs = tray.germination_logs || [];
    const latestLog = [...logs].sort((a, b) => new Date(b.log_date) - new Date(a.log_date))[0];
    let germPercent = null;
    if (latestLog && tray.seed_count > 0) {
      germPercent = Math.round((latestLog.sprout_count / tray.seed_count) * 100);
    }
    return { ...tray, latestGermPercent: germPercent };
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(trays)) return [];
    return trays.filter(item => {
      const term = search.toLowerCase();
      return (item?.variety || "").toLowerCase().includes(term) || 
             (item?.tray_name || "").toLowerCase().includes(term);
    });
  }, [trays, search]);

  const recentlyAdded = useMemo(() => Array.isArray(trays) ? trays.slice(0, 5) : [], [trays]);

  const addToRecentSearches = (term) => {
    if (!term || term.trim() === '') return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== term.trim().toLowerCase());
      return [term.trim(), ...filtered].slice(0, 5);
    });
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditingId(null);
    setTrayName('');
    setVariety('');
    setBrand('');
    setSeedCount('');
    setIsExperiment(false);
    setExperimentNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowPicker(false);
    setLoading(false);
  };

  async function handleDeleteTray(id) {
    Alert.alert("Delete", "Are you sure you want to delete this tray?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.from('seeds').delete().eq('id', id);
            if (error) throw error;
            setTrays(prev => prev.filter(t => t.id !== id));
            resetForm();
          } catch (e) { Alert.alert("Error", e.message); } 
          finally { setLoading(false); }
      }}
    ]);
  }

  async function handleSaveTray() {
    if (!variety) return Alert.alert("Error", "Variety is required.");
    setLoading(true);
    const payload = { 
      tray_name: trayName, variety, brand, date, 
      seed_count: parseInt(seedCount || 0),
      is_experiment: isExperiment,
      experiment_notes: experimentNotes
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('seeds').update(payload).eq('id', editingId);
        if (error) throw error;
        setTrays(prev => prev.map(t => t.id === editingId ? calculateGerm({ ...t, ...payload }) : t));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from('seeds').insert([{ ...payload, user_id: user.id }]).select();
        if (error) throw error;
        if (data) setTrays(prev => [calculateGerm(data[0]), ...prev]);
      }
      resetForm();
    } catch (error) { Alert.alert("Error", error.message); } 
    finally { setLoading(false); }
  }

  async function handleSaveGermination() {
    if (!sproutCount) return Alert.alert("Error", "Enter sprout count.");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newLog = { seed_id: selectedTray.id, log_date: germDate, sprout_count: parseInt(sproutCount), user_id: user.id };
      const { error } = await supabase.from('germination_logs').insert([newLog]);
      if (error) throw error;
      setTrays(prev => prev.map(t => {
        if (t.id === selectedTray.id) {
          const updatedLogs = [...(t.germination_logs || []), newLog];
          return calculateGerm({ ...t, germination_logs: updatedLogs });
        }
        return t;
      }));
      setGermModalVisible(false);
    } catch (e) { Alert.alert("Error", e.message); } 
    finally { setLoading(false); }
  }

  const handleEditPress = (item) => {
    if (search) addToRecentSearches(search);
    setEditingId(item.id);
    setTrayName(item.tray_name || '');
    setVariety(item.variety || '');
    setBrand(item.brand || '');
    setSeedCount(item.seed_count ? item.seed_count.toString() : '');
    setIsExperiment(item.is_experiment || false);
    setExperimentNotes(item.experiment_notes || '');
    setDate(item.date);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{trays.length} Trays Growing</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        <View style={styles.stickyContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={palette.muted} />
            <TextInput 
              placeholder="Search variety..." 
              style={styles.searchInput} 
              value={search} 
              onChangeText={setSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onSubmitEditing={() => addToRecentSearches(search)}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => { setSearch(''); Keyboard.dismiss(); }}>
                <Ionicons name="close-circle" size={20} color={palette.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {(isSearchFocused || search.length > 0) && (
          <View style={styles.helperArea}>
            <Text style={styles.sectionTitleAligned}>Recent Searches</Text>
            <View style={styles.tagCloud}>
              {recentSearches.map((term, index) => (
                <Pressable key={index} style={styles.searchTag} onPress={() => setSearch(term)}>
                  <Text style={styles.tagText}>{term}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionTitleAligned, { marginTop: 20 }]}>Recently Added</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
              {recentlyAdded.map(item => (
                <Pressable key={item.id} style={styles.recentCard} onPress={() => handleEditPress(item)}>
                  <Text style={styles.recentVariety} numberOfLines={1}>{item.variety}</Text>
                  <Text style={styles.recentMeta}>{item.date}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.divider} />
          </View>
        )}

        <View style={styles.listSection}>
          <Text style={styles.sectionTitleAligned}>{search ? 'Results' : 'Active Trays'}</Text>
          {filteredData.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => handleEditPress(item)}>
              <View style={styles.cardTopRow}>
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems:'center'}}>
                    <Text style={styles.cardVariety} numberOfLines={1}>{item.variety}</Text>
                    {item.is_experiment && <Ionicons name="flask" size={16} color={palette.accent} style={{marginLeft: 8}} />}
                  </View>
                  <Text style={styles.cardBrand}>{item.brand || 'Generic'}</Text>
                </View>
                <View style={styles.germContainer}>
                  <Text style={styles.germValue}>{item.latestGermPercent !== null ? `${item.latestGermPercent}%` : '--'}</Text>
                  <Text style={styles.germLabel}>GERM</Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.latestGermPercent || 0}%` }]} />
              </View>
              <View style={styles.cardBottomRow}>
                <View style={styles.metadataGroup}>
                  <View style={styles.metaChip}><Ionicons name="location-outline" size={12} color={palette.muted} /><Text style={styles.metaText}>{item.tray_name || 'Tray'}</Text></View>
                  <View style={styles.metaChip}><Ionicons name="leaf-outline" size={12} color={palette.muted} /><Text style={styles.metaText}>{item.seed_count || 0}</Text></View>
                  <View style={styles.metaChip}><Ionicons name="calendar-outline" size={12} color={palette.muted} /><Text style={styles.metaText}>{item.date}</Text></View>
                </View>
                <Pressable 
                  style={styles.miniGermButton} 
                  onPress={() => { setSelectedTray(item); setSproutCount(''); setGermDate(new Date().toISOString().split('T')[0]); setGermModalVisible(true); }}
                >
                  <Ionicons name="trending-up" size={18} color={palette.primary} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* TALL FORM MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalContainer}
          >
            <View style={styles.modalBody}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.mTitle}>{editingId ? "Edit Details" : "New Tray"}</Text>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    {editingId && (
                        <Pressable onPress={() => handleDeleteTray(editingId)} style={{marginRight: 20}}>
                            <Ionicons name="trash-outline" size={24} color={palette.danger} />
                        </Pressable>
                    )}
                    <Pressable onPress={resetForm}><Ionicons name="close" size={28} color={palette.muted} /></Pressable>
                </View>
              </View>
              
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{flex: 1}}
                contentContainerStyle={{paddingBottom: 40}}
              >
                <Text style={styles.label}>Tray Name / Location</Text>
                <TextInput style={styles.input} placeholder="Shelf A" value={trayName} onChangeText={setTrayName} />
                
                <Text style={styles.label}>Variety Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Genovese Basil" value={variety} onChangeText={setVariety} />

                <Text style={styles.label}>Seed Brand</Text>
                <TextInput style={styles.input} placeholder="e.g. Baker Creek" value={brand} onChangeText={setBrand} />
                
                <Text style={styles.label}>Seeds Planted</Text>
                <TextInput style={styles.input} placeholder="72" keyboardType="numeric" value={seedCount} onChangeText={setSeedCount} />
                
                <Text style={styles.label}>Date Planted</Text>
                <Pressable style={styles.dateSelector} onPress={() => setShowPicker(!showPicker)}>
                  <Text style={styles.dateDisplay}>{date}</Text>
                  <Ionicons name="calendar" size={20} color={palette.primary} />
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

                <View style={styles.experimentToggleRow}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="flask-outline" size={18} color={palette.primary} style={{marginRight: 8}} />
                    <Text style={styles.labelNoMargin}>Use as Experiment?</Text>
                  </View>
                  <Pressable 
                    onPress={() => setIsExperiment(!isExperiment)}
                    style={[styles.toggleBase, isExperiment && styles.toggleActive]}
                  >
                    <View style={[styles.toggleThumb, isExperiment && styles.toggleThumbActive]} />
                  </Pressable>
                </View>

                {isExperiment && (
                  <View style={styles.experimentSection}>
                    <Text style={styles.label}>Method / Variables</Text>
                    <TextInput 
                      style={[styles.input, styles.textArea]} 
                      multiline
                      numberOfLines={4}
                      placeholder="Testing heat mat vs no heat, different soil, etc."
                      value={experimentNotes}
                      onChangeText={setExperimentNotes}
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.btnRow}>
                <Pressable style={[styles.btn, styles.btnSave]} onPress={handleSaveTray} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTextSave}>Save Tray</Text>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* GERM MODAL */}
      <Modal visible={germModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.overlay, {justifyContent: 'center', padding: 20}]}>
          <View style={[styles.modalBody, {maxHeight: '70%', borderRadius: 24}]}>
            <View style={styles.modalHeaderRow}>
               <Text style={styles.mTitle}>Log Germination</Text>
               <Pressable onPress={() => setGermModalVisible(false)}><Ionicons name="close" size={24} color={palette.muted}/></Pressable>
            </View>
            <Text style={styles.subtitle}>{selectedTray?.variety}</Text>
            
            <Text style={styles.label}>Date Observed</Text>
            <Pressable style={styles.dateSelector} onPress={() => setShowGermPicker(!showGermPicker)}>
              <Text style={styles.dateDisplay}>{germDate}</Text>
              <Ionicons name="calendar" size={20} color={palette.primary} />
            </Pressable>
            {showGermPicker && (
               <View style={styles.pickerContainer}>
                  <RNCalendar onDayPress={(day) => { setGermDate(day.dateString); setShowGermPicker(false); }} theme={{ calendarBackground: '#FAFAF8', selectedDayBackgroundColor: palette.primary }} />
               </View>
            )}

            <Text style={styles.label}>Total Sprouted</Text>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <TextInput style={[styles.input, {flex:1}]} placeholder="0" keyboardType="numeric" value={sproutCount} onChangeText={setSproutCount} />
                <Text style={{marginLeft: 15, fontSize: 18, fontWeight:'600'}}>/ {selectedTray?.seed_count || 0}</Text>
            </View>
            <View style={[styles.btnRow, {marginTop: 20, flexDirection:'row', gap: 10, borderTopWidth:0}]}>
              <Pressable style={[styles.btn, {backgroundColor: palette.highlight, flex: 1}]} onPress={() => setGermModalVisible(false)}><Text style={{color: palette.muted, fontWeight:'bold'}}>Cancel</Text></Pressable>
              <Pressable style={[styles.btn, {flex: 2, backgroundColor: palette.primary}]} onPress={handleSaveGermination} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontWeight:'bold'}}>Save Log</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: palette.text },
  subtitle: { fontSize: 14, color: palette.muted },
  addButton: { backgroundColor: palette.primary, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  stickyContainer: { backgroundColor: palette.bg, paddingHorizontal: 20, paddingBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  helperArea: { backgroundColor: palette.bg },
  sectionTitleAligned: { fontSize: 18, fontWeight: '700', color: palette.text, marginBottom: 12, marginLeft: 20 },
  divider: { height: 1, backgroundColor: palette.border, marginHorizontal: 20, marginTop: 25, marginBottom: 10 },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  searchTag: { backgroundColor: palette.highlight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: palette.border },
  tagText: { color: palette.primary, fontWeight: '600', fontSize: 13 },
  recentScroll: { paddingLeft: 20, paddingRight: 10, gap: 12 },
  recentCard: { backgroundColor: palette.primary, padding: 15, borderRadius: 18, width: 140 },
  recentVariety: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  recentMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 },
  listSection: { padding: 20, paddingTop: 10 },
  card: { backgroundColor: palette.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardVariety: { fontSize: 20, fontWeight: '800', color: palette.text, marginBottom: 2 },
  cardBrand: { fontSize: 13, color: palette.muted, fontWeight: '600', textTransform: 'uppercase' },
  germContainer: { alignItems: 'center', backgroundColor: palette.highlight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 60 },
  germValue: { fontSize: 18, fontWeight: '900', color: palette.primary },
  germLabel: { fontSize: 8, fontWeight: '800', color: palette.muted },
  progressBarBg: { height: 4, backgroundColor: palette.highlight, borderRadius: 2, marginBottom: 16 },
  progressBarFill: { height: '100%', backgroundColor: palette.success, borderRadius: 2 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metadataGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#EEEEEE' },
  metaText: { fontSize: 11, fontWeight: '600', color: palette.muted, marginLeft: 4 },
  miniGermButton: { backgroundColor: palette.highlight, width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: palette.border },

  /* MODAL POSITIONING */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { width: '100%', height: '95%' },
  modalBody: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  mTitle: { fontSize: 22, fontWeight: 'bold', color: palette.text },
  label: { fontSize: 11, fontWeight: '800', marginTop: 15, color: palette.muted, textTransform: 'uppercase' },
  labelNoMargin: { fontSize: 11, fontWeight: '800', color: palette.muted, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: palette.border, padding: 14, borderRadius: 12, marginTop: 5, backgroundColor: '#FAFAF8', fontSize: 16, color: palette.text },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.border, padding: 14, borderRadius: 12, marginTop: 5, backgroundColor: '#FAFAF8' },
  dateDisplay: { fontSize: 16, color: palette.text },
  pickerContainer: { marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
  btnRow: { paddingTop: 15, borderTopWidth: 1, borderTopColor: palette.border },
  btn: { padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: palette.primary },
  btnTextSave: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  experimentToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  toggleBase: { width: 44, height: 24, borderRadius: 12, backgroundColor: palette.border, padding: 2 },
  toggleActive: { backgroundColor: palette.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  experimentSection: { marginTop: 5, backgroundColor: '#F9F8F4', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: palette.accent },
  textArea: { height: 120, textAlignVertical: 'top' },
});