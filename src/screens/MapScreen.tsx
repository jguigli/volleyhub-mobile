/**
 * MapScreen — react-native-maps.
 * Points bleus = terrains du référentiel uniquement. Les matchs sur lieu « pin » n’ont pas de point bleu.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapStackParamList } from '../navigation/types';
import { useLocation } from '../hooks/useLocation';
import { useNearbyMatches } from '../hooks/useMatches';
import { MatchBottomSheet } from '../components/MatchBottomSheet';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, useMapViewDarkModeProps } from '../theme';
import type { NearbyMatch } from '../types';

function matchMarkerBackground(match: NearbyMatch, isFull: boolean): string {
  if (isFull) {
    return colors.error;
  }
  if (match.event_format === 'tournament') {
    return colors.matchTournament;
  }
  const vt = match.volley_type ?? 'classic';
  if (vt === 'beach') {
    return colors.matchVolleyBeach;
  }
  if (vt === 'green') {
    return colors.matchVolleyGreen;
  }
  return colors.matchOrange;
}

type Props = NativeStackScreenProps<MapStackParamList, 'Map'>;

const DEFAULT_LAT = 48.8566;
const DEFAULT_LNG = 2.3522;
const DEFAULT_RADIUS = 15000;
const DEFAULT_DELTA = 0.15;

export function MapScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { mapProps: mapThemeProps, mapThemeKey } = useMapViewDarkModeProps();
  const { lat, lng, loading: locationLoading } = useLocation();
  const mapRef = useRef<MapView>(null);

  const [selectedMatch, setSelectedMatch] = useState<NearbyMatch | null>(null);

  const userLat = lat ?? DEFAULT_LAT;
  const userLng = lng ?? DEFAULT_LNG;

  const [mapRegionCenter, setMapRegionCenter] = useState(() => ({
    latitude: userLat,
    longitude: userLng,
  }));
  const [mapZoomDelta, setMapZoomDelta] = useState(DEFAULT_DELTA);

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

  const dynamicRadius = useMemo(
    () =>
      Math.max(
        DEFAULT_RADIUS,
        Math.min(1200000, Math.round(mapZoomDelta * 111000 * 0.9)),
      ),
    [mapZoomDelta],
  );

  const { data: matches, isLoading: matchesLoading } = useNearbyMatches({
    lat: mapRegionCenter.latitude,
    lng: mapRegionCenter.longitude,
    radius: dynamicRadius,
  });

  const matchMarkers = useMemo(() => {
    return (matches ?? []).map((m) => ({
      ...m,
      marker_lat: Number(m.court_lat),
      marker_lng: Number(m.court_lng),
    }));
  }, [matches]);

  const clusterCellSize = useMemo(
    () => Math.max(0.01, mapZoomDelta / 7),
    [mapZoomDelta],
  );
  const shouldCluster = mapZoomDelta > 0.08;
  const clustered = useMemo(() => {
    if (!shouldCluster) {
      return [];
    }
    const buckets = new Map<
      string,
      { lat: number; lng: number; count: number; matches: (NearbyMatch & { marker_lat: number; marker_lng: number })[] }
    >();
    for (const m of matchMarkers) {
      const r = Math.floor(m.marker_lat / clusterCellSize);
      const c = Math.floor(m.marker_lng / clusterCellSize);
      const k = `${r}:${c}`;
      const cur = buckets.get(k);
      if (!cur) {
        buckets.set(k, { lat: m.marker_lat, lng: m.marker_lng, count: 1, matches: [m] });
      } else {
        cur.count += 1;
        cur.lat = (cur.lat * (cur.count - 1) + m.marker_lat) / cur.count;
        cur.lng = (cur.lng * (cur.count - 1) + m.marker_lng) / cur.count;
        cur.matches.push(m);
      }
    }
    return Array.from(buckets.values());
  }, [clusterCellSize, matchMarkers, shouldCluster]);

  const recenterMap = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      },
      500,
    );
  }, [userLat, userLng]);

  useFocusEffect(
    useCallback(() => {
      const focusLat = route.params?.focusLat;
      const focusLng = route.params?.focusLng;
      if (
        focusLat == null ||
        focusLng == null ||
        !Number.isFinite(focusLat) ||
        !Number.isFinite(focusLng)
      ) {
        return undefined;
      }
      const tmr = setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: focusLat,
            longitude: focusLng,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          },
          450,
        );
        navigation.setParams({ focusLat: undefined, focusLng: undefined });
      }, 200);
      return () => clearTimeout(tmr);
    }, [navigation, route.params?.focusLat, route.params?.focusLng]),
  );

  const handleMapPress = () => {
    setSelectedMatch(null);
  };

  const handlePickPinFromFab = () => {
    setSelectedMatch(null);
    navigation.navigate('CreateMatch', {
      openMapPicker: true,
      pickerLat: mapRegionCenter.latitude,
      pickerLng: mapRegionCenter.longitude,
    });
  };

  const isLoading = matchesLoading || locationLoading;

  return (
    <View style={styles.container}>
      <MapView
        key={mapThemeKey}
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        pitchEnabled={false}
        onPress={handleMapPress}
        onRegionChangeComplete={(region) => {
          setMapRegionCenter({
            latitude: region.latitude,
            longitude: region.longitude,
          });
          setMapZoomDelta(region.latitudeDelta);
        }}
        {...mapThemeProps}
      >
        {!shouldCluster &&
          matchMarkers.map((match) => {
          const isFull = match.status === 'full';
          const isSelected = selectedMatch?.id === match.id;
          return (
            <Marker
              key={`match-${match.id}`}
              coordinate={{
                latitude: match.marker_lat,
                longitude: match.marker_lng,
              }}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedMatch(match);
              }}
            >
              <View
                style={[
                  styles.matchMarker,
                  isSelected && styles.matchMarkerSelected,
                  { backgroundColor: matchMarkerBackground(match, isFull) },
                ]}
              >
                <Text style={styles.matchMarkerText}>
                  {match.current_players}/{match.max_players}
                </Text>
              </View>
            </Marker>
          );
        })}

        {shouldCluster &&
          clustered.map((group, idx) =>
            group.count <= 1 ? (
              <Marker
                key={`single-${group.matches[0].id}`}
                coordinate={{
                  latitude: group.matches[0].marker_lat,
                  longitude: group.matches[0].marker_lng,
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedMatch(group.matches[0]);
                }}
              >
                <View
                  style={[
                    styles.matchMarker,
                    { backgroundColor: matchMarkerBackground(group.matches[0], group.matches[0].status === 'full') },
                  ]}
                >
                  <Text style={styles.matchMarkerText}>
                    {group.matches[0].current_players}/{group.matches[0].max_players}
                  </Text>
                </View>
              </Marker>
            ) : (
              <Marker
                key={`cluster-${idx}`}
                coordinate={{ latitude: group.lat, longitude: group.lng }}
                onPress={(e) => {
                  e.stopPropagation();
                  mapRef.current?.animateToRegion(
                    {
                      latitude: group.lat,
                      longitude: group.lng,
                      latitudeDelta: Math.max(0.02, mapZoomDelta * 0.55),
                      longitudeDelta: Math.max(0.02, mapZoomDelta * 0.55),
                    },
                    320,
                  );
                }}
              >
                <View style={styles.clusterMarker}>
                  <Text style={styles.clusterText}>{group.count}</Text>
                </View>
              </Marker>
            ),
          )}
      </MapView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      <View style={styles.recenterWrap} pointerEvents="box-none">
        <Pressable
          style={styles.recenterButton}
          onPress={recenterMap}
        >
          <Ionicons name="locate" size={22} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.matchOrange }]} />
          <Text style={styles.legendText}>{t('map.legendVolley')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.matchVolleyBeach }]} />
          <Text style={styles.legendText}>{t('map.legendBeachVolley')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.matchVolleyGreen }]} />
          <Text style={styles.legendText}>{t('map.legendGreenVolley')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.matchTournament }]} />
          <Text style={styles.legendText}>{t('map.legendTournament')}</Text>
        </View>
      </View>

      <View style={styles.fabColumn} pointerEvents="box-none">
        <Pressable style={styles.fab} onPress={handlePickPinFromFab}>
          <Ionicons name="pin" size={26} color={colors.white} />
        </Pressable>
      </View>

      {selectedMatch && (
        <MatchBottomSheet
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onTeamsPress={() => {
            navigation.navigate('MatchTeamsBoard', { matchId: selectedMatch.id });
            setSelectedMatch(null);
          }}
          onScorePress={() => {
            navigation.navigate('EventScore', { matchId: selectedMatch.id });
            setSelectedMatch(null);
          }}
          onCourtsPress={() => {
            navigation.navigate('TournamentCourts', { matchId: selectedMatch.id });
            setSelectedMatch(null);
          }}
          onViewMatch={() => {
            navigation.navigate('MatchDetail', { matchId: selectedMatch.id });
            setSelectedMatch(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  clusterMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  clusterText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  matchMarker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  matchMarkerSelected: {
    transform: [{ scale: 1.14 }],
    borderWidth: 3,
    borderColor: colors.warning,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  matchMarkerText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  callout: {
    padding: 8,
    minWidth: 140,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
  },
  calloutSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  recenterWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recenterButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  legend: {
    position: 'absolute',
    top: 60,
    left: 16,
    maxWidth: 200,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '600',
  },
  fabColumn: {
    position: 'absolute',
    top: 0,
    right: 20,
    bottom: 0,
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  fab: {
    position: 'absolute',
    top: '50%',
    right: 0,
    transform: [{ translateY: -29 }],
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
