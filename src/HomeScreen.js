import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Platform, ScrollView, 
  Dimensions, ActivityIndicator 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 40; 
const CHART_HEIGHT = 160; 
const HORIZONTAL_OFFSET = 50; 

const palette = {
  bg: '#F4F1EA',
  text: '#1A1814',
  muted: '#6B6560',
  primary: '#2F4F3C',
  surface: '#FFFFFF',
  border: '#D9D4C8',
  accent: '#7A9181',
  highlight: '#E8E5DA',
  success: '#4A6741'
};

export default function HomeScreen() {
  const [rawTrays, setRawTrays] = useState([]); 
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSeeds: 0, totalSprouts: 0 });

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  // Aggregation Logic - Added protective checks to prevent render errors
  const gardenOverview = useMemo(() => {
    if (!rawTrays || rawTrays.length === 0) return [];

    const summary = {};
    rawTrays.forEach(tray => {
      const varietyName = tray.variety ? tray.variety.trim() : 'Unknown Variety';
      if (!summary[varietyName]) {
        summary[varietyName] = { totalSeeds: 0, trayCount: 0, germSum: 0, germCount: 0 };
      }
      summary[varietyName].trayCount += 1;
      summary[varietyName].totalSeeds += (tray.seed_count || 0);
      
      const logs = tray.germination_logs || [];
      if (logs.length > 0 && tray.seed_count > 0) {
        // Sort to get the most recent log
        const sortedLogs = [...logs].sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
        const latestSprouts = sortedLogs[0].sprout_count || 0;
        summary[varietyName].germSum += (latestSprouts / tray.seed_count) * 100;
        summary[varietyName].germCount += 1;
      }
    });

    return Object.keys(summary).map(name => ({
      variety: name,
      trayCount: summary[name].trayCount,
      totalSeeds: summary[name].totalSeeds,
      avgGerm: summary[name].germCount > 0 ? Math.round(summary[name].germSum / summary[name].germCount) : null
    })).sort((a, b) => b.totalSeeds - a.totalSeeds);
  }, [rawTrays]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seeds')
        .select(`id, variety, date, seed_count, germination_logs (sprout_count, log_date)`)
        .order('date', { ascending: true });

      if (error) throw error;
      const validData = data || [];
      setRawTrays(validData);

      if (validData.length === 0) {
        setPoints([]);
        setStats({ totalSeeds: 0, totalSprouts: 0 });
        return;
      }

      // Graph Logic
      const allDates = new Set();
      validData.forEach(tray => {
        allDates.add(tray.date);
        (tray.germination_logs || []).forEach(log => allDates.add(log.log_date));
      });
      const sortedDates = [...allDates].sort();

      const graphData = [];
      let finalSeeds = 0;
      let finalSprouts = 0;

      sortedDates.forEach(currentDate => {
        let trayPercentages = [];
        let runningSeeds = 0;
        let runningSprouts = 0;

        validData.forEach(tray => {
          if (tray.date <= currentDate) {
            runningSeeds += (tray.seed_count || 0);
            const logs = (tray.germination_logs || [])
              .filter(l => l.log_date <= currentDate)
              .sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
            const currentSprouts = logs.length > 0 ? logs[0].sprout_count : 0;
            runningSprouts += currentSprouts;
            if (tray.seed_count > 0) trayPercentages.push((currentSprouts / tray.seed_count) * 100);
          }
        });

        if (trayPercentages.length > 0) {
          graphData.push({
            date: currentDate.split('-').slice(1).join('/'),
            value: trayPercentages.reduce((a, b) => a + b, 0) / trayPercentages.length
          });
        }
        finalSeeds = runningSeeds;
        finalSprouts = runningSprouts;
      });

      setPoints(graphData);
      setStats({ totalSeeds: finalSeeds, totalSprouts: finalSprouts });
    } catch (e) {
      console.error("Analytics Error:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Overview</Text>
        <Text style={styles.title}>Bloom Dashboard</Text>
        <Text style={styles.subtitle}>Historical growth data.</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Seeds</Text>
          <Text style={styles.statValue}>{stats.totalSeeds}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current Sprouts</Text>
          <Text style={styles.statValue}>{stats.totalSprouts}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Avg. Germination Rate (%)</Text>
      <View style={styles.chartCard}>
        {loading ? (
          <ActivityIndicator size="large" color={palette.primary} />
        ) : points.length > 1 ? (
          <View style={{ width: CHART_WIDTH, alignItems: 'center' }}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 80} viewBox={`0 -60 ${CHART_WIDTH} ${CHART_HEIGHT + 80}`}>
              {[0, 25, 50, 75, 100].map(g => (
                <Path key={g} d={`M ${HORIZONTAL_OFFSET} ${CHART_HEIGHT - (g/100)*CHART_HEIGHT} L ${CHART_WIDTH - HORIZONTAL_OFFSET} ${CHART_HEIGHT - (g/100)*CHART_HEIGHT}`} stroke={palette.border} strokeWidth="1" />
              ))}
              <Path 
                d={points.map((p, i) => {
                  const x = (i / (points.length - 1)) * (CHART_WIDTH - (HORIZONTAL_OFFSET * 2)) + HORIZONTAL_OFFSET;
                  const y = CHART_HEIGHT - (p.value / 100) * CHART_HEIGHT;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')} 
                fill="none" stroke={palette.primary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              />
              {points.map((p, i) => {
                const x = (i / (points.length - 1)) * (CHART_WIDTH - (HORIZONTAL_OFFSET * 2)) + HORIZONTAL_OFFSET;
                const y = CHART_HEIGHT - (p.value / 100) * CHART_HEIGHT;
                return (
                  <React.Fragment key={i}>
                    <SvgText x={x} y={y - 15} fill={palette.primary} fontSize="14" fontWeight="900" textAnchor={i===0?'start':i===points.length-1?'end':'middle'}>{`${Math.round(p.value)}%`}</SvgText>
                    <Circle cx={x} cy={y} r="6" fill={palette.surface} stroke={palette.primary} strokeWidth="3" />
                  </React.Fragment>
                );
              })}
            </Svg>
            <View style={styles.labelRow}>
              <Text style={styles.labelText}>{points[0]?.date || ''}</Text>
              <Text style={styles.labelText}>{points[points.length - 1]?.date || ''}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>Record more logs to see trend.</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Garden Overview</Text>
      
      {/* Added check for empty overview */}
      {gardenOverview.length === 0 && !loading && (
        <Text style={styles.noDataText}>No seed types to display yet.</Text>
      )}

      {gardenOverview.map((group, idx) => (
        <View key={`group-${idx}`} style={styles.overviewCard}>
          <View style={styles.cardTopRow}>
            <View style={{flex: 1}}>
              <Text style={styles.cardVariety}>{group.variety}</Text>
              <Text style={styles.cardMeta}>{group.trayCount} {group.trayCount === 1 ? 'Tray' : 'Trays'}</Text>
            </View>
            <View style={styles.germBadge}>
              <Text style={styles.germValue}>{group.avgGerm !== null ? `${group.avgGerm}%` : '--'}</Text>
              <Text style={styles.germLabel}>AVG GERM</Text>
            </View>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${group.avgGerm || 0}%` }]} />
          </View>

          <View style={styles.cardBottomRow}>
            <View style={styles.metaChip}>
              <Ionicons name="leaf-outline" size={14} color={palette.muted} />
              <Text style={styles.metaText}>{group.totalSeeds} Total Seeds</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 25 },
  kicker: { fontSize: 12, fontWeight: '800', color: palette.accent, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '800', color: palette.text },
  subtitle: { fontSize: 16, color: palette.muted, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: palette.surface, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: palette.border, elevation: 2 },
  statLabel: { fontSize: 11, fontWeight: '700', color: palette.muted, textTransform: 'uppercase' },
  statValue: { fontSize: 28, fontWeight: '900', color: palette.primary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: palette.text, marginBottom: 12, marginLeft: 4 },
  chartCard: { backgroundColor: palette.surface, borderRadius: 28, borderWidth: 1, borderColor: palette.border, paddingVertical: 20, alignItems: 'center', minHeight: 340, justifyContent: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', width: CHART_WIDTH - (HORIZONTAL_OFFSET * 2), marginTop: 10 },
  labelText: { fontSize: 10, color: palette.muted, fontWeight: '800' },
  noDataText: { color: palette.muted, textAlign: 'center', padding: 20 },
  overviewCard: { backgroundColor: palette.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardVariety: { fontSize: 20, fontWeight: '800', color: palette.text },
  cardMeta: { fontSize: 13, color: palette.muted, fontWeight: '600' },
  germBadge: { alignItems: 'center', backgroundColor: palette.highlight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 65 },
  germValue: { fontSize: 18, fontWeight: '900', color: palette.primary },
  germLabel: { fontSize: 8, fontWeight: '800', color: palette.muted },
  progressBarBg: { height: 6, backgroundColor: palette.highlight, borderRadius: 3, marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: palette.success, borderRadius: 3 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center' },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  metaText: { fontSize: 12, fontWeight: '700', color: palette.muted, marginLeft: 6 },
});