import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { MatchesStackParamList } from '../navigation/types';
import { useCreateMatch } from '../hooks/useMatches';
import { useCreateCourt } from '../hooks/useCourts';
import { useLocation } from '../hooks/useLocation';
import {
  appleTimePickerLocale,
  localeToAppleLocale,
  localeToBcp47,
  prefers24HourClock,
  useTranslation,
} from '../i18n';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  useMapViewDarkModeProps,
} from '../theme';
import type { SkillLevel, Court, TournamentSystem } from '../types';
import { formatMatchCoords } from '../utils/matchDisplay';

type Props = NativeStackScreenProps<MatchesStackParamList, 'CreateMatch'>;

type CustomPinPlaceInfo = {
  lat: number;
  lng: number;
  city: string | null;
  /** "12 Rue de la Paix" (ou équivalent) */
  streetLine: string | null;
  department: string | null;
  country: string | null;
};

function isCustomCourt(c: Court | null | undefined): boolean {
  return c != null && c.isRegistry === false;
}

const SKILL_LEVELS: {
  value: SkillLevel;
  labelKey: 'auth.skills.beginner' | 'auth.skills.intermediate' | 'auth.skills.advanced';
  color: string;
}[] = [
  { value: 'beginner', labelKey: 'auth.skills.beginner', color: colors.skillBeginner },
  {
    value: 'intermediate',
    labelKey: 'auth.skills.intermediate',
    color: colors.skillIntermediate,
  },
  { value: 'advanced', labelKey: 'auth.skills.advanced', color: colors.skillAdvanced },
];

const VOLLEY_VALUES = ['classic', 'beach', 'green'] as const;
const TEAM_COUNT_OPTIONS = [4, 6, 8, 12, 16] as const;
const TOURNAMENT_COURT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const TOURNAMENT_SYSTEM_DEFS: ReadonlyArray<{
  value: TournamentSystem;
  titleKey: string;
}> = [
  {
    value: 'single_elimination',
    titleKey: 'createMatch.tournamentSystemSingleElimTitle',
  },
  {
    value: 'pools_finals',
    titleKey: 'createMatch.tournamentSystemPoolsTitle',
  },
  {
    value: 'round_robin',
    titleKey: 'createMatch.tournamentSystemRoundRobinTitle',
  },
];

function tournamentSystemInfoBlockKeys(
  system: TournamentSystem,
): { section: string; body: string }[] {
  switch (system) {
    case 'single_elimination':
      return [
        {
          section: 'createMatch.tournamentSystemDetailSectionPrinciple',
          body: 'createMatch.tournamentSystemDetailSinglePrinciple',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionExample',
          body: 'createMatch.tournamentSystemDetailSingleExample',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionPros',
          body: 'createMatch.tournamentSystemDetailSinglePros',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionCons',
          body: 'createMatch.tournamentSystemDetailSingleCons',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionWhen',
          body: 'createMatch.tournamentSystemDetailSingleWhen',
        },
      ];
    case 'pools_finals':
      return [
        {
          section: 'createMatch.tournamentSystemDetailSectionPrinciple',
          body: 'createMatch.tournamentSystemDetailPoolsPrinciple',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionPros',
          body: 'createMatch.tournamentSystemDetailPoolsPros',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionCons',
          body: 'createMatch.tournamentSystemDetailPoolsCons',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionWhen',
          body: 'createMatch.tournamentSystemDetailPoolsWhen',
        },
      ];
    case 'round_robin':
      return [
        {
          section: 'createMatch.tournamentSystemDetailSectionPrinciple',
          body: 'createMatch.tournamentSystemDetailRRPrinciple',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionPros',
          body: 'createMatch.tournamentSystemDetailRRPros',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionCons',
          body: 'createMatch.tournamentSystemDetailRRCons',
        },
        {
          section: 'createMatch.tournamentSystemDetailSectionWhen',
          body: 'createMatch.tournamentSystemDetailRRWhen',
        },
      ];
    default:
      return [];
  }
}
const MATCH_SET_OPTIONS = [3, 5] as const;
const MATCH_POINTS_OPTIONS = [15, 21, 25] as const;

function playerOptionsForVolley(v: (typeof VOLLEY_VALUES)[number]): number[] {
  if (v === 'beach') {
    return [4, 6, 8];
  }
  return [4, 6, 8, 12];
}

function teamSizeOptionsForVolley(
  v: (typeof VOLLEY_VALUES)[number],
): readonly number[] {
  if (v === 'beach') {
    return [2, 3, 4];
  }
  return [2, 3, 4, 5, 6];
}

function formatDateTimeLocal(date: Date, localeTag: string): string {
  return date.toLocaleDateString(localeTag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function CreateMatchScreen({ navigation, route }: Props) {
  const { t, locale } = useTranslation();
  const { mapProps: mapThemeProps, mapThemeKey } = useMapViewDarkModeProps();
  const localeTag = localeToBcp47(locale);
  const use24HourClock = prefers24HourClock(locale);
  const openMapPickerParam = route.params?.openMapPicker;
  const pickerLatParam = route.params?.pickerLat;
  const pickerLngParam = route.params?.pickerLng;

  const { lat, lng } = useLocation();

  const mapPickerFocusLat = useMemo(() => {
    const fromMapViewport =
      openMapPickerParam &&
      typeof pickerLatParam === 'number' &&
      !Number.isNaN(pickerLatParam) &&
      typeof pickerLngParam === 'number' &&
      !Number.isNaN(pickerLngParam);
    if (fromMapViewport) {
      return pickerLatParam;
    }
    return pickerLatParam ?? lat ?? null;
  }, [openMapPickerParam, pickerLatParam, pickerLngParam, lat]);

  const mapPickerFocusLng = useMemo(() => {
    const fromMapViewport =
      openMapPickerParam &&
      typeof pickerLatParam === 'number' &&
      !Number.isNaN(pickerLatParam) &&
      typeof pickerLngParam === 'number' &&
      !Number.isNaN(pickerLngParam);
    if (fromMapViewport) {
      return pickerLngParam;
    }
    return pickerLngParam ?? lng ?? null;
  }, [openMapPickerParam, pickerLatParam, pickerLngParam, lng]);

  const mapPickerRef = useRef<MapView | null>(null);

  const createMatch = useCreateMatch();
  const createCourt = useCreateCourt();

  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [openedFromMapIntent, setOpenedFromMapIntent] = useState(
    Boolean(openMapPickerParam),
  );
  const [mapPickedPoint, setMapPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [customPinPlaceInfo, setCustomPinPlaceInfo] = useState<CustomPinPlaceInfo | null>(null);

  const handleCloseMapPicker = () => {
    if (openedFromMapIntent) {
      navigation.goBack();
      return;
    }
    setShowMapPicker(false);
  };

  useEffect(() => {
    if (!openMapPickerParam) {
      return;
    }
    setMapPickedPoint({
      latitude: mapPickerFocusLat ?? 48.8566,
      longitude: mapPickerFocusLng ?? 2.3522,
    });
    setShowMapPicker(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMapPickerParam]);

  useEffect(() => {
    if (!showMapPicker || mapPickerFocusLat == null || mapPickerFocusLng == null) {
      return;
    }
    const region = {
      latitude: mapPickerFocusLat,
      longitude: mapPickerFocusLng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    setMapPickedPoint({
      latitude: mapPickerFocusLat,
      longitude: mapPickerFocusLng,
    });
    let cancelled = false;
    const revealTimer = setTimeout(() => {
      if (!cancelled) {
        mapPickerRef.current?.animateToRegion(region, 320);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(revealTimer);
    };
  }, [showMapPicker, mapPickerFocusLat, mapPickerFocusLng]);
  const [scheduledAt, setScheduledAt] = useState<Date>(addHours(new Date(), 2));
  const [volleyType, setVolleyType] = useState<(typeof VOLLEY_VALUES)[number]>('classic');
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [matchSets, setMatchSets] = useState<number>(5);
  const [pointsToWin, setPointsToWin] = useState<number>(25);
  const [eventMode, setEventMode] = useState<'match' | 'tournament'>('match');
  const [teamCount, setTeamCount] = useState(8);
  const [teamSize, setTeamSize] = useState(4);
  const [tournamentPointsPerMatch, setTournamentPointsPerMatch] =
    useState<number>(21);
  const [tournamentCourtCount, setTournamentCourtCount] = useState(2);
  const [tournamentSystem, setTournamentSystem] =
    useState<TournamentSystem>('single_elimination');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [description, setDescription] = useState('');
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [tournamentSystemInfoModal, setTournamentSystemInfoModal] =
    useState<TournamentSystem | null>(null);

  const minSelectableDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const playerOptions = useMemo(
    () => playerOptionsForVolley(volleyType),
    [volleyType],
  );

  const teamSizeOptions = useMemo(
    () => teamSizeOptionsForVolley(volleyType),
    [volleyType],
  );

  useEffect(() => {
    if (eventMode !== 'match') {
      return;
    }
    if (!playerOptions.includes(maxPlayers)) {
      setMaxPlayers(playerOptions[playerOptions.length - 1]);
    }
  }, [eventMode, volleyType, playerOptions, maxPlayers]);

  useEffect(() => {
    if (eventMode !== 'tournament') {
      return;
    }
    if (!teamSizeOptions.includes(teamSize)) {
      setTeamSize(teamSizeOptions[teamSizeOptions.length - 1]);
    }
  }, [eventMode, volleyType, teamSizeOptions, teamSize]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      return;
    }
    if (!date) {
      return;
    }
    setScheduledAt((prev) => {
      const next = new Date(prev);
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return next;
    });
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      return;
    }
    if (!date) {
      return;
    }
    setScheduledAt((prev) => {
      const next = new Date(prev);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedCourt) {
      Alert.alert(t('createMatch.missingCourtTitle'), t('createMatch.missingCourtMessage'));
      return;
    }

    if (scheduledAt <= new Date()) {
      Alert.alert(t('createMatch.invalidDateTitle'), t('createMatch.invalidDateMessage'));
      return;
    }

    try {
      const typeLabel =
        volleyType === 'beach'
          ? t('createMatch.beachVolley')
          : volleyType === 'green'
            ? t('createMatch.greenVolley')
            : t('createMatch.classicVolley');
      const metaLine =
        eventMode === 'tournament'
          ? t('createMatch.descriptionMetaTournament', {
              type: typeLabel,
              teams: teamCount,
              teamSize,
              points: tournamentPointsPerMatch,
            })
          : t('createMatch.descriptionMeta', {
              type: typeLabel,
              sets: matchSets,
              points: pointsToWin,
            });
      const mergedDescription = [metaLine, description.trim()]
        .filter(Boolean)
        .join('\n');

      const match =
        eventMode === 'tournament'
          ? await createMatch.mutateAsync({
              courtId: selectedCourt.id,
              scheduledAt: scheduledAt.toISOString(),
              skillLevel,
              volleyType,
              description: mergedDescription || undefined,
              eventFormat: 'tournament',
              teamCount,
              teamSize,
              tournamentPointsPerMatch,
              tournamentCourtCount,
              tournamentSystem,
            })
          : await createMatch.mutateAsync({
              courtId: selectedCourt.id,
              scheduledAt: scheduledAt.toISOString(),
              maxPlayers,
              skillLevel,
              volleyType,
              description: mergedDescription || undefined,
              matchSets,
              pointsToWin,
            });

      Alert.alert(
        t('createMatch.eventCreatedTitle'),
        t('createMatch.eventCreatedMessage'),
        [
          {
            text: t('createMatch.viewEvent'),
            onPress: () => {
              navigation.replace('MatchDetail', { matchId: match.id });
            },
          },
        ],
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('createMatch.createFailed');
      Alert.alert(t('common.error'), msg);
    }
  };

  const handleUsePickedPoint = async () => {
    if (!mapPickedPoint) return;
    const { latitude: plat, longitude: plng } = mapPickedPoint;
    try {
      let city: string | null = null;
      let department: string | null = null;
      let country: string | null = null;
      let streetLine: string | null = null;
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: plat,
          longitude: plng,
        });
        const a = geo[0];
        if (a) {
          city = a.city;
          department = a.subregion ?? a.district ?? a.region;
          country = a.country;

          const anyAddr = a as unknown as Record<string, unknown>;
          // expo-location varie selon plateformes/versions: on lit via "best effort"
          const streetNumber =
            (anyAddr.streetNumber as string | undefined) ??
            (anyAddr.street_number as string | undefined) ??
            (a as unknown as { streetNumber?: string }).streetNumber ??
            null;
          const streetName =
            (a as unknown as { street?: string }).street ??
            (anyAddr.streetName as string | undefined) ??
            (anyAddr.street_name as string | undefined) ??
            null;

          // Aucun comma ici : on sépare les segments d'adresse plus tard avec ','
          streetLine =
            streetNumber && streetName
              ? `${streetNumber} ${streetName}`
              : (streetName as string | null) ?? (streetNumber as string | null);
        }
      } catch {
        /* geocode optional */
      }

      const addressSegments = [city, streetLine, department, country].filter(Boolean);
      const addressLine =
        addressSegments.length > 0
          ? addressSegments.join(', ')
          : [city, country].filter(Boolean).join(', ') ||
            (department ? String(department) : undefined);

      const court = await createCourt.mutateAsync({
        // Nom technique en base uniquement (l’UI utilise isRegistry + address / coords)
        name: 'Map pin location',
        type: 'outdoor',
        lat: plat,
        lng: plng,
        ...(addressLine ? { address: addressLine } : {}),
      });
      setCustomPinPlaceInfo({
        lat: plat,
        lng: plng,
        city,
        streetLine,
        department,
        country,
      });
      setSelectedCourt(court);
      setShowMapPicker(false);
      setOpenedFromMapIntent(false);
      setMapPickedPoint(null);
      Alert.alert(t('createMatch.locationSelectedTitle'), t('createMatch.locationSelectedMessage'));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('createMatch.createLocationFailed');
      Alert.alert(t('common.error'), msg);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Match vs tournament — même style d’onglets que l’écran Find (Explorer) */}
        <View style={styles.eventTabs}>
          <TouchableOpacity
            style={[styles.eventTab, eventMode === 'match' && styles.eventTabActive]}
            onPress={() => setEventMode('match')}
          >
            <Text
              style={[
                styles.eventTabText,
                eventMode === 'match' && styles.eventTabTextActive,
              ]}
            >
              {t('createMatch.modeMatch')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.eventTab,
              eventMode === 'tournament' && styles.eventTabActive,
            ]}
            onPress={() => setEventMode('tournament')}
          >
            <Text
              style={[
                styles.eventTabText,
                eventMode === 'tournament' && styles.eventTabTextActive,
              ]}
            >
              {t('createMatch.modeTournament')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />{' '}
            {t('createMatch.dateTime')}
          </Text>

          <TouchableOpacity
            style={styles.dateDisplay}
            onPress={() => setShowDateTimeModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.dateText}>{formatDateTimeLocal(scheduledAt, localeTag)}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Localisation — uniquement pin sur la carte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />{' '}
            {t('createMatch.location')}
          </Text>

          <TouchableOpacity
            style={styles.mapPinRow}
            onPress={() => {
              setMapPickedPoint({
                latitude:
                  customPinPlaceInfo?.lat ?? mapPickerFocusLat ?? 48.8566,
                longitude:
                  customPinPlaceInfo?.lng ?? mapPickerFocusLng ?? 2.3522,
              });
              setShowMapPicker(true);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.mapPinRowLeft}>
              <Ionicons name="pin-outline" size={22} color={colors.primary} />
              {!selectedCourt ? (
                <Text style={styles.mapPinRowText}>{t('createMatch.pinOnMap')}</Text>
              ) : (
                <View style={styles.mapPinDetails}>
                  {customPinPlaceInfo?.city ? (
                    <Text style={styles.mapPinDetailLine}>
                      <Text style={styles.mapPinDetailLabel}>{t('createMatch.pinnedCity')} · </Text>
                      {customPinPlaceInfo.city}
                    </Text>
                  ) : selectedCourt.address?.trim() || selectedCourt.name ? (
                    <Text style={styles.mapPinDetailLine} numberOfLines={2}>
                      {selectedCourt.address?.trim() || selectedCourt.name}
                    </Text>
                  ) : null}
                  {customPinPlaceInfo?.streetLine ? (
                    <Text style={styles.mapPinDetailLine}>
                      <Text style={styles.mapPinDetailLabel}>
                        {t('createMatch.pinnedStreetLine')} ·{' '}
                      </Text>
                      {customPinPlaceInfo.streetLine}
                    </Text>
                  ) : null}
                  {customPinPlaceInfo?.department ? (
                    <Text style={styles.mapPinDetailLine}>
                      <Text style={styles.mapPinDetailLabel}>
                        {t('createMatch.pinnedDepartment')} ·{' '}
                      </Text>
                      {customPinPlaceInfo.department}
                    </Text>
                  ) : null}
                  {customPinPlaceInfo?.country ? (
                    <Text style={styles.mapPinDetailLine}>
                      <Text style={styles.mapPinDetailLabel}>
                        {t('createMatch.pinnedCountry')} :{' '}
                      </Text>
                      {customPinPlaceInfo.country}
                    </Text>
                  ) : null}
                  <Text style={styles.mapPinDetailLine}>
                    <Text style={styles.mapPinDetailLabel}>
                      {t('createMatch.pinnedCoordinates')} ·{' '}
                    </Text>
                    {formatMatchCoords(
                      customPinPlaceInfo?.lat ?? selectedCourt.lat,
                      customPinPlaceInfo?.lng ?? selectedCourt.lng,
                      5,
                    ) ?? '—'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.mapPinCircle}>
              <Ionicons name="pin" size={18} color={colors.white} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Format du match / tournoi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people" size={16} color={colors.primary} />{' '}
            {eventMode === 'match'
              ? t('createMatch.matchFormatTitle')
              : t('createMatch.tournamentFormatTitle')}
          </Text>

          <Text style={styles.subsectionLabel}>{t('createMatch.volleyType')}</Text>
          <View style={styles.chips}>
            {VOLLEY_VALUES.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, volleyType === v && styles.chipSelected]}
                onPress={() => setVolleyType(v)}
              >
                <Text
                  style={[
                    styles.chipText,
                    volleyType === v && styles.chipTextSelected,
                  ]}
                >
                  {v === 'beach'
                    ? t('createMatch.beachVolley')
                    : v === 'green'
                      ? t('createMatch.greenVolley')
                      : t('createMatch.classicVolley')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {eventMode === 'tournament' ? (
            <>
              <Text style={styles.subsectionLabel}>
                {t('createMatch.tournamentSystemSection')}
              </Text>
              <View style={styles.tournamentSystemList}>
                {TOURNAMENT_SYSTEM_DEFS.map((def) => {
                  const selected = tournamentSystem === def.value;
                  return (
                    <View
                      key={def.value}
                      style={[
                        styles.tournamentSystemCard,
                        selected && styles.tournamentSystemCardSelected,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.tournamentSystemCardTouchable}
                        onPress={() => setTournamentSystem(def.value)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.tournamentSystemCardHeader}>
                          <Text
                            style={[
                              styles.tournamentSystemCardTitle,
                              selected && styles.tournamentSystemCardTitleSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {t(def.titleKey)}
                          </Text>
                          {selected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color={colors.primary}
                            />
                          ) : (
                            <Ionicons
                              name="ellipse-outline"
                              size={22}
                              color={colors.textMuted}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                      <Pressable
                        style={({ pressed }) => [
                          styles.tournamentSystemInfoBtn,
                          pressed && styles.tournamentSystemInfoBtnPressed,
                        ]}
                        onPress={() => setTournamentSystemInfoModal(def.value)}
                        accessibilityRole="button"
                        accessibilityLabel={t('createMatch.tournamentSystemInfoA11y')}
                        hitSlop={8}
                      >
                        <Text style={styles.tournamentSystemInfoBtnText}>i</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {eventMode === 'match' ? (
            <>
              <Text style={styles.subsectionLabel}>{t('createMatch.maxPlayers')}</Text>
              <View style={styles.chips}>
                {playerOptions.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, maxPlayers === n && styles.chipSelected]}
                    onPress={() => setMaxPlayers(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        maxPlayers === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.subsectionLabel}>{t('createMatch.numberOfSets')}</Text>
              <View style={styles.chips}>
                {MATCH_SET_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, matchSets === n && styles.chipSelected]}
                    onPress={() => setMatchSets(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        matchSets === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.subsectionLabel}>{t('createMatch.pointsToWin')}</Text>
              <View style={styles.chips}>
                {MATCH_POINTS_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, pointsToWin === n && styles.chipSelected]}
                    onPress={() => setPointsToWin(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        pointsToWin === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.subsectionLabel}>{t('createMatch.teamCount')}</Text>
              <View style={styles.chips}>
                {TEAM_COUNT_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.chip,
                      teamCount === n && styles.chipSelected,
                    ]}
                    onPress={() => setTeamCount(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        teamCount === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.subsectionLabel}>{t('createMatch.teamSize')}</Text>
              <View style={styles.chips}>
                {teamSizeOptions.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.chip,
                      teamSize === n && styles.chipSelected,
                    ]}
                    onPress={() => setTeamSize(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        teamSize === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.subsectionLabel}>
                {t('createMatch.tournamentCourtCount')}
              </Text>
              <View style={styles.chips}>
                {TOURNAMENT_COURT_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.chip,
                      tournamentCourtCount === n && styles.chipSelected,
                    ]}
                    onPress={() => setTournamentCourtCount(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tournamentCourtCount === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.subsectionLabel}>
                {t('createMatch.pointsToWinTournamentMatch')}
              </Text>
              <View style={styles.chips}>
                {MATCH_POINTS_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.chip,
                      tournamentPointsPerMatch === n && styles.chipSelected,
                    ]}
                    onPress={() => setTournamentPointsPerMatch(n)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tournamentPointsPerMatch === n && styles.chipTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Niveau */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="trophy" size={16} color={colors.primary} />{' '}
            {t('createMatch.skillLevel')}
          </Text>
          <View style={styles.chips}>
            {SKILL_LEVELS.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.skillChip,
                  {
                    borderColor: s.color + '66',
                    backgroundColor:
                      skillLevel === s.value ? s.color + '33' : colors.surface,
                  },
                ]}
                onPress={() => setSkillLevel(s.value)}
              >
                <Text style={[styles.skillChipText, { color: s.color }]}>
                  {t(s.labelKey)}
                </Text>
                {skillLevel === s.value && (
                  <Ionicons name="checkmark" size={14} color={s.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />{' '}
            {t('createMatch.description')}{' '}
            <Text style={styles.optional}>{t('createMatch.optional')}</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={t('createMatch.descriptionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{description.length}/200</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            createMatch.isPending && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createMatch.isPending}
          activeOpacity={0.8}
        >
          {createMatch.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color={colors.white} />
              <Text style={styles.submitText}>{t('createMatch.createEvent')}</Text>
            </>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showMapPicker}
        animationType="slide"
        onRequestClose={handleCloseMapPicker}
      >
        <View style={styles.mapPickerContainer}>
          <View style={styles.mapPickerHeader}>
            <TouchableOpacity
              style={styles.mapPickerClose}
              onPress={handleCloseMapPicker}
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.mapPickerTitle}>{t('createMatch.moveMapPin')}</Text>
            <View style={{ width: 56 }} />
          </View>
          <View style={styles.mapPickerMapWrap}>
            <MapView
              key={
                showMapPicker
                  ? `${mapThemeKey}-picker-${String(mapPickerFocusLat)}-${String(mapPickerFocusLng)}`
                  : `${mapThemeKey}-picker-closed`
              }
              ref={mapPickerRef}
              style={styles.mapPickerMap}
              initialRegion={{
                latitude: mapPickedPoint?.latitude ?? mapPickerFocusLat ?? 48.8566,
                longitude: mapPickedPoint?.longitude ?? mapPickerFocusLng ?? 2.3522,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              onRegionChangeComplete={(region) =>
                setMapPickedPoint({
                  latitude: region.latitude,
                  longitude: region.longitude,
                })
              }
              showsUserLocation
              {...mapThemeProps}
            />
            <View pointerEvents="none" style={styles.centerPinWrap}>
              <Ionicons name="location" size={38} color={colors.primary} />
            </View>
          </View>
          <View style={styles.mapPickerFooter}>
            <TouchableOpacity
              style={[
                styles.mapConfirmButton,
                (!mapPickedPoint || createCourt.isPending) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleUsePickedPoint}
              disabled={!mapPickedPoint || createCourt.isPending}
            >
              {createCourt.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>{t('createMatch.useThisPoint')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={tournamentSystemInfoModal != null}
        animationType="slide"
        onRequestClose={() => setTournamentSystemInfoModal(null)}
      >
        <View style={styles.tournamentSystemModalRoot}>
          <View style={styles.dateTimeModalHeader}>
            <View style={styles.dateTimeModalHeaderSide}>
              <TouchableOpacity
                onPress={() => setTournamentSystemInfoModal(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.dateTimeModalTitle} numberOfLines={2}>
              {tournamentSystemInfoModal
                ? t(
                    TOURNAMENT_SYSTEM_DEFS.find((d) => d.value === tournamentSystemInfoModal)
                      ?.titleKey ?? 'createMatch.tournamentSystemSection',
                  )
                : ''}
            </Text>
            <View style={[styles.dateTimeModalHeaderSide, styles.dateTimeModalHeaderSideEnd]}>
              <TouchableOpacity
                onPress={() => setTournamentSystemInfoModal(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.dateTimeModalDone}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={styles.dateTimeModalScroll}
            contentContainerStyle={styles.tournamentSystemModalScrollContent}
            showsVerticalScrollIndicator
          >
            {tournamentSystemInfoModal
              ? tournamentSystemInfoBlockKeys(tournamentSystemInfoModal).map((block, idx) => (
                  <View key={idx} style={styles.tournamentSystemModalBlock}>
                    <Text style={styles.tournamentSystemModalSection}>{t(block.section)}</Text>
                    <Text style={styles.tournamentSystemModalBody}>{t(block.body)}</Text>
                  </View>
                ))
              : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDateTimeModal}
        animationType="slide"
        onRequestClose={() => setShowDateTimeModal(false)}
      >
        <View style={styles.dateTimeModalRoot}>
          <View style={styles.dateTimeModalHeader}>
            <View style={styles.dateTimeModalHeaderSide}>
              <TouchableOpacity
                onPress={() => setShowDateTimeModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.dateTimeModalTitle}>{t('createMatch.dateTimeModalTitle')}</Text>
            <View style={[styles.dateTimeModalHeaderSide, styles.dateTimeModalHeaderSideEnd]}>
              <TouchableOpacity
                onPress={() => setShowDateTimeModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.dateTimeModalDone}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={styles.dateTimeModalScroll}
            contentContainerStyle={styles.dateTimeModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.dateControlLabel}>{t('createMatch.dateLabel')}</Text>
            <View style={styles.calendarWrap}>
              <DateTimePicker
                key={`date-${locale}`}
                value={scheduledAt}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                onChange={handleDateChange}
                minimumDate={minSelectableDate}
                {...(Platform.OS === 'ios'
                  ? {
                      themeVariant: 'dark' as const,
                      textColor: colors.white,
                      accentColor: colors.primary,
                      locale: localeToAppleLocale(locale),
                    }
                  : { textColor: colors.white })}
              />
            </View>
            <Text style={[styles.dateControlLabel, styles.dateTimeModalTimeLabel]}>
              {t('createMatch.timeLabel')}
            </Text>
            <View style={styles.timeCardWrap}>
              <View style={styles.timePickerWrap}>
                <DateTimePicker
                  key={`time-${locale}-${use24HourClock ? '24' : '12'}`}
                  value={scheduledAt}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  {...(Platform.OS === 'ios'
                    ? {
                        themeVariant: 'dark' as const,
                        textColor: colors.white,
                        accentColor: colors.primary,
                        minuteInterval: 1,
                        locale: appleTimePickerLocale(locale, use24HourClock),
                      }
                    : { textColor: colors.white, is24Hour: use24HourClock })}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 60,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 15,
    color: colors.text,
  },
  optional: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 13,
  },
  eventTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginHorizontal: -spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  eventTabActive: {
    backgroundColor: colors.primary,
  },
  eventTabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  eventTabTextActive: {
    color: colors.white,
  },
  subsectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapPinRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minWidth: 0,
  },
  mapPinRowText: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  mapPinDetails: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  mapPinDetailLine: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 13,
  },
  mapPinDetailLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  mapPinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  dateText: {
    flex: 1,
    color: colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  dateTimeModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dateTimeModalHeader: {
    height: 56 + Constants.statusBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Constants.statusBarHeight,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateTimeModalHeaderSide: {
    width: 72,
    height: 40,
    justifyContent: 'center',
  },
  dateTimeModalHeaderSideEnd: {
    alignItems: 'flex-end',
  },
  dateTimeModalTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  dateTimeModalDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  dateTimeModalScroll: {
    flex: 1,
  },
  dateTimeModalScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  dateTimeModalTimeLabel: {
    marginTop: spacing.md,
  },
  calendarWrap: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
  },
  timeCardWrap: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
  },
  timePickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    ...Platform.select({
      ios: { height: 216 },
      android: { minHeight: 180 },
      default: {},
    }),
  },
  dateControlLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
  },
  tournamentSystemList: {
    gap: spacing.sm,
    marginBottom: 2,
  },
  tournamentSystemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  tournamentSystemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  tournamentSystemCardTouchable: {
    flex: 1,
    minWidth: 0,
  },
  tournamentSystemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tournamentSystemCardTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  tournamentSystemCardTitleSelected: {
    color: colors.primaryLight,
  },
  tournamentSystemInfoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: colors.card,
  },
  tournamentSystemInfoBtnPressed: {
    opacity: 0.65,
  },
  tournamentSystemInfoBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: -0.5,
  },
  tournamentSystemModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tournamentSystemModalScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  tournamentSystemModalBlock: {
    gap: spacing.xs,
  },
  tournamentSystemModalSection: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tournamentSystemModalBody: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  skillChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  mapPickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapPickerHeader: {
    height: 56 + Constants.statusBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Constants.statusBarHeight,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  mapPickerClose: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: 56,
    height: 40,
  },
  mapPickerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  mapPickerMapWrap: {
    flex: 1,
  },
  mapPickerMap: {
    flex: 1,
  },
  centerPinWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  mapPickerFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  mapConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
});
