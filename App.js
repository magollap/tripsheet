import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArrowDownToLine, ArrowRight, BarChart3, Clock3, Fuel, Gauge, History, Plus, Route, X } from 'lucide-react-native';
import { chartBuckets, fuelEfficiencies, makeRecord, overlapsTrip, toCsv, totalMiles, tripMiles } from './mileage.mjs';

const ink = '#122C24';
const muted = '#52665D';
const green = '#17463A';
const lime = '#DDF7AB';
const storageKey = 'tripsheet.records.v1';
const periods = ['Daily', 'Weekly', 'Monthly'];
const tabs = [
  ['Overview', Gauge], ['Analytics', BarChart3], ['History', History],
];
const format = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function recordDate(record) {
  const date = new Date(Date.parse(record.timestamp) + record.utcOffsetMinutes * 60000);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

function MileageChart({ records, period, onPeriod }) {
  const buckets = chartBuckets(records, period);
  const max = Math.max(1, ...buckets.map(({ miles }) => miles));
  return (
    <View style={s.card}>
      <View style={s.segment}>
        {periods.map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }}
            onPress={() => onPeriod(value)} style={[s.segmentItem, period === value && s.segmentActive]}>
            <Text style={[s.segmentText, period === value && s.segmentTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.chart}>
        {buckets.map((bucket, index) => (
          <View key={bucket.key} style={s.bucket} accessible accessibilityLabel={`${bucket.key}: ${format(bucket.miles)} miles`}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.barValue}>{format(bucket.miles)}</Text>
            <View style={s.barTrack}>
              <View style={[s.bar, {
                height: Math.max(3, 84 * bucket.miles / max),
                backgroundColor: bucket.miles === 0 ? '#D7E4D7' : index === buckets.length - 1 ? green : '#A3C58C',
              }]} />
            </View>
            <Text style={s.barLabel}>{bucket.label}</Text>
          </View>
        ))}
      </View>
      <View style={s.chartFooter}>
        <Text style={s.detail}>{period === 'Daily' ? 'Last 7 days' : period === 'Weekly' ? 'Last 6 weeks · Monday start' : 'Last 6 months'}</Text>
        <Text style={s.chartTotal}>{format(buckets.reduce((sum, b) => sum + b.miles, 0))} mi</Text>
      </View>
    </View>
  );
}

function RecordList({ records, efficiencies, onDelete }) {
  if (!records.length) {
    return (
      <View style={[s.card, s.empty]}>
        <View style={s.rowIcon}><Route size={20} color={green} /></View>
        <Text style={s.rowTitle}>No records yet</Text>
        <Text style={s.detail}>Log a trip or fill-up to start your history.</Text>
      </View>
    );
  }
  return (
    <View style={s.card}>
      {records.map((record, index) => {
        const isTrip = record.type === 'trip';
        const mpg = efficiencies.get(record.id);
        return (
          <Pressable key={record.id} disabled={!onDelete} onPress={() => onDelete(record)}
            accessibilityRole={onDelete ? 'button' : undefined}
            accessibilityHint={onDelete ? 'Opens options for this record' : undefined}
            style={[s.record, index > 0 && s.recordBorder]}>
            <View style={s.rowIcon}>{isTrip ? <Route size={19} color={green} /> : <Fuel size={19} color={green} />}</View>
            <View style={s.recordBody}>
              <Text style={s.rowTitle}>{isTrip ? 'Trip' : record.full ? 'Full fill-up' : 'Partial fill-up'}</Text>
              <Text style={s.detail}>{recordDate(record)}</Text>
              <Text style={s.detail}>{isTrip ? `${format(record.start)} to ${format(record.end)} mi` : `Odometer ${format(record.odometer)} mi`}</Text>
            </View>
            <View style={s.recordMetric}>
              <Text style={s.rowTitle}>{isTrip ? `${format(tripMiles(record))} mi` : `${format(record.gallons)} gal`}</Text>
              {mpg !== undefined && <Text style={s.detail}>{format(mpg)} MPG</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function EntryForm({ type, close, save, busy }) {
  const isTrip = type === 'trip';
  const [fields, setFields] = useState({ start: '', end: '', odometer: '', gallons: '', full: true });
  const [error, setError] = useState('');
  const update = (key, value) => {
    setError('');
    setFields((current) => ({ ...current, [key]: value }));
  };
  const input = (key, label, placeholder) => (
    <View style={s.field}>
      <Text style={s.rowTitle}>{label}</Text>
      <TextInput accessibilityLabel={label} style={s.input} keyboardType="decimal-pad"
        placeholder={placeholder} placeholderTextColor={muted} value={fields[key]}
        editable={!busy} onChangeText={(value) => update(key, value)} />
    </View>
  );
  return (
    <Modal visible animationType="slide" onRequestClose={() => { if (!busy) close(); }}>
      <SafeAreaView style={s.root}>
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.form}>
            <View style={s.sectionHeading}>
              <Text style={s.heading}>{isTrip ? 'Log a trip' : 'Log a fill-up'}</Text>
              <Pressable style={s.iconButton} accessibilityRole="button" accessibilityLabel="Close"
                disabled={busy} onPress={close}><X size={23} color={green} /></Pressable>
            </View>
            <View style={s.timeNote}>
              <Clock3 size={18} color={green} />
              <Text style={s.detail}>Your device date and time are recorded when you save.</Text>
            </View>
            {isTrip ? (
              <>{input('start', 'Starting odometer (mi)', 'e.g. 24560')}{input('end', 'Ending odometer (mi)', 'e.g. 24612.5')}</>
            ) : (
              <>
                {input('odometer', 'Odometer at fill-up (mi)', 'e.g. 24612.5')}
                {input('gallons', 'Fuel added (US gal)', 'e.g. 10.25')}
                <View style={s.switchRow}>
                  <View style={s.recordBody}>
                    <Text style={s.rowTitle}>Filled to full</Text>
                    <Text style={s.detail}>MPG is calculated between full tanks.</Text>
                  </View>
                  <Switch accessibilityLabel="Filled to full" trackColor={{ true: '#87B77D' }}
                    value={fields.full} disabled={busy} onValueChange={(value) => update('full', value)} />
                </View>
              </>
            )}
            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Pressable style={[s.primaryButton, busy && s.disabled]} accessibilityRole="button" disabled={busy}
              onPress={async () => {
                setError('');
                try { await save(makeRecord(type, fields)); }
                catch (err) { setError(err.message); }
              }}>
              <Text style={s.primaryText}>{busy ? 'Saving…' : isTrip ? 'Save trip' : 'Save fill-up'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Tripsheet() {
  const [records, setRecords] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [period, setPeriod] = useState('Weekly');
  const [sharing, setSharing] = useState(false);
  const writeLock = React.useRef(false);

  async function load() {
    setLoadError(false);
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const saved = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(saved)) throw new Error('Invalid stored data');
      setRecords(saved);
      setReady(true);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function persist(next) {
    if (writeLock.current) throw new Error('Another change is being saved. Try again.');
    writeLock.current = true;
    setBusy(true);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
    } catch {
      throw new Error('Could not save to this device. Please try again.');
    } finally {
      writeLock.current = false;
      setBusy(false);
    }
  }

  async function save(record) {
    if (overlapsTrip(record, records)) throw new Error('This trip overlaps a recorded odometer range.');
    const latestFuel = records.find((item) => item.type === 'fuel');
    if (record.type === 'fuel' && latestFuel && record.odometer < latestFuel.odometer) {
      throw new Error('Odometer must be at least the previous fill-up reading.');
    }
    await persist([record, ...records]);
    setForm(null);
  }

  function deleteRecord(record) {
    Alert.alert('Delete record?', 'This removes the record and recalculates your totals.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(records.filter((r) => r.id !== record.id))
        .catch((error) => Alert.alert('Could not delete', error.message)) },
    ]);
  }

  async function share() {
    if (sharing) return;
    setSharing(true);
    let file;
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
      const cache = new Directory(Paths.cache, 'tripsheet-exports');
      cache.create({ idempotent: true });
      const name = 'Tripsheet-' + new Date().toISOString().slice(0, 10) + '.csv';
      file = new File(cache, name);
      file.create({ overwrite: true });
      file.write(toCsv(records));
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Share Tripsheet records' });
    } catch (error) {
      Alert.alert('Export unavailable', error.message);
    } finally {
      setSharing(false);
    }
  }

  const efficiencies = fuelEfficiencies(records);
  const latestMpg = records.find((r) => efficiencies.has(r.id));
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <View style={s.brand}><View style={s.logo}><Gauge size={23} color={lime} /></View><Text style={s.brandText}>Tripsheet</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Export and share CSV"
          style={[s.iconButton, (!ready || sharing || !records.length) && s.disabled]}
          disabled={!ready || sharing || !records.length} onPress={share}>
          <ArrowDownToLine size={22} color={green} />
        </Pressable>
      </View>
      {!ready ? (
        <View style={s.loading}>
          {loadError ? <><Text style={s.rowTitle}>Could not load saved records.</Text>
            <Pressable accessibilityRole="button" onPress={load} style={s.iconButton}><Text style={s.link}>Retry</Text></Pressable></>
            : <ActivityIndicator color={green} accessibilityLabel="Loading records" />}
        </View>
      ) : (
        <ScrollView key={tab} contentContainerStyle={s.content}>
          {tab === 'Overview' && (
            <>
              <View style={s.hero}>
                <View style={s.heroTop}><Text style={s.heroLabel}>TOTAL MILES TRAVELLED</Text><Route size={25} color={lime} /></View>
                <Text style={s.heroNumber}>{format(totalMiles(records))}<Text style={s.heroUnit}> mi</Text></Text>
                <View style={s.heroBottom}>
                  <Text style={s.heroMeta}>{records.filter((r) => r.type === 'trip').length} trips logged</Text>
                  <Text style={s.heroMeta}>{latestMpg ? `Latest fuel economy · ${format(efficiencies.get(latestMpg.id))} MPG` : 'MPG after two full tanks'}</Text>
                </View>
              </View>
              <View style={s.actions}>
                <Pressable style={[s.action, s.tripAction]} accessibilityRole="button" onPress={() => setForm('trip')}>
                  <Plus size={21} color={ink} /><Text style={s.actionText}>Log trip</Text>
                </Pressable>
                <Pressable style={s.action} accessibilityRole="button" onPress={() => setForm('fuel')}>
                  <Fuel size={19} color={green} /><Text style={s.actionText}>Log fill-up</Text>
                </Pressable>
              </View>
            </>
          )}
          {tab !== 'History' && (
            <>
              <Text style={s.heading}>Miles travelled</Text>
              <MileageChart records={records} period={period} onPeriod={setPeriod} />
            </>
          )}
          {tab !== 'Analytics' && (
            <>
              <View style={s.sectionHeading}>
                <Text style={s.heading}>{tab === 'History' ? 'Record history' : 'Recent activity'}</Text>
                {tab === 'Overview' && <Pressable style={s.viewAll} accessibilityRole="button" onPress={() => setTab('History')}>
                  <Text style={s.link}>View all</Text><ArrowRight size={15} color={green} />
                </Pressable>}
              </View>
              <RecordList records={tab === 'History' ? records : records.slice(0, 3)}
                efficiencies={efficiencies} onDelete={tab === 'History' && !busy ? deleteRecord : undefined} />
            </>
          )}
          {tab === 'Analytics' && <View style={s.card}>
            <Text style={s.rowTitle}>Fuel economy</Text>
            <Text style={s.detail}>{latestMpg
              ? `${format(efficiencies.get(latestMpg.id))} MPG on ${recordDate(latestMpg)}`
              : 'Log two full tanks and any partial fills between them to calculate MPG.'}</Text>
          </View>}
        </ScrollView>
      )}
      <View style={s.nav}>
        {tabs.map(([label, Icon]) => <Pressable key={label} style={s.navItem} accessibilityRole="tab"
          accessibilityState={{ selected: tab === label }} onPress={() => setTab(label)}>
          <View style={[s.navIcon, tab === label && s.navSelected]}><Icon size={21} color={tab === label ? green : muted} /></View>
          <Text style={[s.navLabel, tab === label && s.navLabelSelected]}>{label}</Text>
        </Pressable>)}
      </View>
      {form && <EntryForm type={form} close={() => setForm(null)} save={save} busy={busy} />}
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><Tripsheet /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 21, paddingVertical: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 39, height: 39, borderRadius: 12, backgroundColor: green, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.9 },
  iconButton: { minWidth: 46, minHeight: 46, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#E7EDE4', justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.42 },
  content: { paddingHorizontal: 20, paddingTop: 9, paddingBottom: 24, gap: 13, width: '100%', maxWidth: 640, alignSelf: 'center' },
  hero: { backgroundColor: '#103A32', borderRadius: 24, padding: 20, gap: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroLabel: { color: '#D8E9D9', fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  heroNumber: { color: 'white', fontSize: 52, fontWeight: '800', letterSpacing: -2.7 },
  heroUnit: { color: '#DDF7AB', fontSize: 20, fontWeight: '700', letterSpacing: 0 },
  heroBottom: { borderTopWidth: 1, borderTopColor: '#41675D', paddingTop: 12, marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  heroMeta: { color: '#D3E4D6', fontSize: 12, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  action: { flex: 1, minHeight: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, backgroundColor: '#E7EDE4' },
  tripAction: { backgroundColor: lime },
  actionText: { fontSize: 15, fontWeight: '800', color: ink, flexShrink: 1 },
  heading: { color: ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.55, flexShrink: 1 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4EAE0', borderRadius: 20, padding: 14, gap: 8 },
  segment: { flexDirection: 'row', gap: 4, backgroundColor: '#EFF3EB', padding: 4, borderRadius: 12 },
  segmentItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: green },
  segmentText: { color: muted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: 'white' },
  chart: { flexDirection: 'row', marginTop: 2, gap: 4, alignItems: 'flex-end' },
  bucket: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 },
  barTrack: { width: '80%', maxWidth: 38, height: 84, justifyContent: 'flex-end', borderRadius: 6, backgroundColor: '#F0F4ED' },
  bar: { borderRadius: 6, width: '100%' },
  barValue: { color: green, fontSize: 11, fontWeight: '700', maxWidth: '100%' },
  barLabel: { color: muted, fontSize: 11 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderColor: '#E9EEE5' },
  chartTotal: { color: green, fontWeight: '800', fontSize: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  viewAll: { minHeight: 44, flexDirection: 'row', gap: 5, alignItems: 'center' },
  link: { color: green, fontWeight: '800', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 20 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 57, paddingVertical: 5 },
  recordBorder: { borderTopWidth: 1, borderTopColor: '#E9EEE5', paddingTop: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#E8F0E2', alignItems: 'center', justifyContent: 'center' },
  recordBody: { flex: 1, gap: 3 },
  recordMetric: { alignItems: 'flex-end', gap: 3, maxWidth: '34%' },
  rowTitle: { color: ink, fontSize: 15, fontWeight: '700' },
  detail: { color: muted, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  nav: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E4EAE0' },
  navItem: { flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIcon: { width: 44, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  navSelected: { backgroundColor: lime },
  navLabel: { color: muted, fontSize: 11, fontWeight: '600' },
  navLabelSelected: { color: green, fontWeight: '800' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  form: { gap: 20, padding: 22, width: '100%', maxWidth: 640, alignSelf: 'center' },
  timeNote: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E8F0E2', padding: 12, borderRadius: 12 },
  field: { gap: 7 },
  input: { borderWidth: 1, borderColor: '#C9D6CA', backgroundColor: 'white', borderRadius: 13, padding: 13, color: ink, fontSize: 16, minHeight: 52 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  error: { color: '#A32927', fontWeight: '700' },
  primaryButton: { backgroundColor: green, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
