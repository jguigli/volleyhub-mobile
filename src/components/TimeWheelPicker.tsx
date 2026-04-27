import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, borderRadius, typography } from '../theme';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

interface WheelColumnProps {
  data: number[];
  selected: number;
  onValueChange: (value: number) => void;
}

function WheelColumn({ data, selected, onValueChange }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    const idx = data.indexOf(selected);
    if (idx >= 0 && !isUserScrolling.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: idx * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [selected, data]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      isUserScrolling.current = false;

      if (data[clampedIndex] !== selected) {
        onValueChange(data[clampedIndex]);
      }
    },
    [data, selected, onValueChange],
  );

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  return (
    <View style={styles.columnContainer}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PADDING }}
      >
        {data.map((item) => {
          const isSelected = item === selected;
          return (
            <View key={item} style={styles.itemContainer}>
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                ]}
              >
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface TimeWheelPickerProps {
  hour: number;
  minute: number;
  onTimeChange: (hour: number, minute: number) => void;
  minuteInterval?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TimeWheelPicker({
  hour,
  minute,
  onTimeChange,
  minuteInterval = 1,
}: TimeWheelPickerProps) {
  const minutes = useMemo(
    () => Array.from({ length: Math.floor(60 / minuteInterval) }, (_, i) => i * minuteInterval),
    [minuteInterval],
  );

  const snappedMinute = useMemo(() => {
    const nearest = Math.round(minute / minuteInterval) * minuteInterval;
    return nearest >= 60 ? 0 : nearest;
  }, [minute, minuteInterval]);

  const handleHourChange = useCallback(
    (h: number) => onTimeChange(h, snappedMinute),
    [onTimeChange, snappedMinute],
  );

  const handleMinuteChange = useCallback(
    (m: number) => onTimeChange(hour, m),
    [onTimeChange, hour],
  );

  return (
    <View style={styles.container}>
      <View style={styles.selectionBand} pointerEvents="none" />

      <View style={styles.wheelsRow}>
        <WheelColumn
          data={HOURS}
          selected={hour}
          onValueChange={handleHourChange}
        />
        <Text style={styles.separator}>:</Text>
        <WheelColumn
          data={minutes}
          selected={snappedMinute}
          onValueChange={handleMinuteChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectionBand: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primary + '1A',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
  },
  columnContainer: {
    width: 70,
    height: PICKER_HEIGHT,
  },
  separator: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textMuted,
  },
  itemTextSelected: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 22,
  },
});
