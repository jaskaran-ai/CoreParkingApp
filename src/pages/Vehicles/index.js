import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Icon} from 'react-native-elements';
import api from '../../api/services';
import Layout from '../Layout';
import {COLORS, FONTS} from '../../constants';
import {formatPlateForDisplay, normalizePlate} from '../../utils/plateNumber';
import {sessionImageUrl} from '../../utils/storageUrl';

function formatCheckedInAt(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function PhotoThumb({uri, label}) {
  const [failed, setFailed] = React.useState(false);

  if (!uri || failed) {
    return (
      <View style={styles.thumbPlaceholder}>
        <Icon name="image" type="font-awesome" size={14} color={COLORS.darkgray} />
        <Text style={styles.thumbLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{uri}}
      style={styles.thumb}
      onError={() => setFailed(true)}
    />
  );
}

const Index = () => {
  const navigation = useNavigation();
  const [sessions, setSessions] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadVehicles = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.getActiveVehicles();
      setSessions(response?.data?.data?.sessions || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load parked vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadVehicles();
    }, [loadVehicles]),
  );

  const filtered = React.useMemo(() => {
    const raw = String(query || '').trim();
    if (!raw) {
      return sessions;
    }

    const slipNeedle = /^\d+$/.test(raw) ? raw : '';
    const plateNeedle = normalizePlate(raw);

    return sessions.filter(session => {
      const slip = String(session.slip_number || session.bill_number || '');
      const plate = normalizePlate(session.plate_number || session.vehicle_number);

      if (slipNeedle && slip.includes(slipNeedle)) {
        return true;
      }

      return plateNeedle ? plate.includes(plateNeedle) : false;
    });
  }, [query, sessions]);

  function openCheckout(session) {
    navigation.navigate({
      name: 'Outs',
      params: {
        plateNumber: session.plate_number || session.vehicle_number,
        openedAt: Date.now(),
      },
      merge: true,
    });
  }

  function renderVehicle({item}) {
    const plate = formatPlateForDisplay(item.plate_number || item.vehicle_number);
    const entryMethod = item.entry_method || 'Manual';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => openCheckout(item)}>
        <View style={styles.photoRow}>
          <PhotoThumb
            uri={sessionImageUrl(item, 'vehicle')}
            label="Vehicle"
          />
          <PhotoThumb
            uri={sessionImageUrl(item, 'plate')}
            label="Plate"
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.plate}>{plate || '—'}</Text>
          <Text style={styles.meta}>
            {[
              item.slip_number || item.bill_number
                ? `Slip ${item.slip_number || item.bill_number}`
                : null,
              item.vehicle_type,
              entryMethod,
              formatCheckedInAt(item.checked_in_at || item.entry_date),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Icon name="chevron-right" type="font-awesome" size={14} color={COLORS.darkgray} />
      </TouchableOpacity>
    );
  }

  return (
    <Layout>
      <View style={styles.header}>
        <Text style={styles.countLabel}>Currently parked</Text>
        <Text style={styles.count}>{sessions.length}</Text>
      </View>
      <View style={styles.searchWrap}>
        <Icon name="search" type="font-awesome" size={14} color={COLORS.darkgray} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search slip or vehicle number"
          placeholderTextColor={COLORS.darkgray}
          autoCapitalize="characters"
          style={styles.searchInput}
        />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id || item.plate_number)}
          renderItem={renderVehicle}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadVehicles(true)}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error ||
                (query
                  ? 'No parked vehicle matches that number.'
                  : 'No vehicles are currently parked.')}
            </Text>
          }
        />
      )}
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
  },
  countLabel: {
    ...FONTS.body4,
    color: COLORS.darkgray,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  count: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    color: COLORS.darkTransparent,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  photoRow: {
    flexDirection: 'row',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: COLORS.lightGray,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.darkgray,
  },
  cardBody: {
    flex: 1,
    marginLeft: 6,
  },
  plate: {
    ...FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.darkTransparent,
  },
  meta: {
    marginTop: 4,
    color: COLORS.darkgray,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: COLORS.darkgray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default Index;
