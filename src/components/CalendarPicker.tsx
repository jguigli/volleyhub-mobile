import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';

interface CalendarPickerProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Called when user taps a day */
  onDateChange: (date: Date) => void;
  /** Currently displayed month (controlled externally) */
  displayMonth: Date;
  /** Called when user navigates months */
  onDisplayMonthChange: (date: Date) => void;
  /** Minimum selectable date (days before are disabled) */
  minimumDate?: Date;
  /** Locale tag for month label ('fr' | 'en') */
  locale?: string;
  /**
   * Optional map of day keys ("YYYY-MM-DD") that have events.
   * Days with events show a dot indicator.
   */
  eventDays?: Set<string>;
}

const WEEKDAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarPicker({
  selectedDate,
  onDateChange,
  displayMonth,
  onDisplayMonthChange,
  minimumDate,
  locale = 'fr',
  eventDays,
}: CalendarPickerProps) {
  const isFr = locale === 'fr';
  const weekdays = isFr ? WEEKDAYS_FR : WEEKDAYS_EN;

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(isFr ? 'fr-FR' : 'en-US', {
        month: 'long',
        year: 'numeric',
      }).format(displayMonth),
    [displayMonth, isFr],
  );

  const today = useMemo(() => new Date(), []);
  const todayKey = toDayKey(today);
  const selectedKey = toDayKey(selectedDate);

  // Build day grid — week starts on Monday
  const cells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // 0=Sun, convert so Mon=0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const result: Array<{ key: string; day?: number; date?: Date }> = [];
    for (let i = 0; i < startOffset; i++) {
      result.push({ key: `empty-start-${i}` });
    }
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      result.push({ key: toDayKey(date), day, date });
    }
    while (result.length % 7 !== 0) {
      result.push({ key: `empty-end-${result.length}` });
    }
    return result;
  }, [displayMonth]);

  const minDayKey = minimumDate ? toDayKey(minimumDate) : null;

  const goToPrevMonth = () => {
    onDisplayMonthChange(
      new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    onDisplayMonthChange(
      new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1),
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.monthArrow}
          onPress={goToPrevMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          style={styles.monthArrow}
          onPress={goToNextMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekdaysRow}>
        {weekdays.map((w, idx) => (
          <Text key={`${w}-${idx}`} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.daysGrid}>
        {cells.map((cell) => {
          if (!cell.day || !cell.date) {
            return <View key={cell.key} style={styles.dayCell} />;
          }

          const dayKey = cell.key;
          const isSelected = dayKey === selectedKey;
          const isToday = dayKey === todayKey;
          const isDisabled = minDayKey != null && dayKey < minDayKey;
          const hasEvent = eventDays?.has(dayKey) ?? false;

          return (
            <Pressable
              key={cell.key}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => {
                if (!isDisabled) onDateChange(cell.date!);
              }}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.dayCellText,
                  isDisabled && styles.dayCellTextDisabled,
                  isToday && !isSelected && styles.dayCellTextToday,
                  isSelected && styles.dayCellTextSelected,
                  hasEvent && !isSelected && !isDisabled && styles.dayCellTextEvent,
                ]}
              >
                {cell.day}
              </Text>
              {hasEvent && !isSelected && (
                <View style={styles.eventDot} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  monthLabel: {
    ...typography.h3,
    color: colors.text,
    textTransform: 'capitalize',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayCellText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayCellTextDisabled: {
    color: colors.textMuted,
    opacity: 0.4,
  },
  dayCellTextToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayCellTextSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  dayCellTextEvent: {
    color: colors.primary,
    fontWeight: '800',
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
});
