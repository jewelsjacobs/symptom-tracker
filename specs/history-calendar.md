# Coding Spec: History Screen — Calendar View Upgrade
**Agent Board ID:** task_c55beee18be93f36  
**Priority:** Medium — phase 2, post-TestFlight  
**Assigned to:** Claude Code  
**Current state:** FlatList (date rows, newest first) — fully functional for MVP

---

## What's Already There

`HistoryScreen.tsx` has a working FlatList that shows:
- Every logged date as a row, newest first
- Color-coded left bar (green/orange/red by avg severity)
- Per-symptom severity dots
- Note preview
- Tap → detail modal (sliding up from bottom)

This is shippable for beta. The calendar view is a phase-2 upgrade.

---

## What to Add

A **monthly calendar grid** above the FlatList (or as a toggle mode) where:
- Each day cell is colored by average severity (or gray if no log, empty if future)
- Tapping a day opens the existing detail modal
- Month navigation (← / → arrows)
- Today highlighted with a ring/border

---

## Install

```bash
npx expo install react-native-calendars
```

---

## Implementation

### New file: `app/src/components/SymptomCalendar.tsx`

```tsx
import React from 'react';
import { Calendar } from 'react-native-calendars';
import { DailyLog } from '../types';
import { colors } from '../theme';

// Severity → color mapping (matches theme.ts severity array)
const SEV_COLORS = ['#66BB6A', '#AED581', '#FFA726', '#FF7043', '#EF5350'];

function avgSeverityColor(log: DailyLog): string {
  if (!log.entries.length) return colors.border;
  const avg = log.entries.reduce((s, e) => s + e.severity, 0) / log.entries.length;
  const idx = Math.min(Math.round(avg) - 1, 4);
  return SEV_COLORS[idx];
}

type Props = {
  logs: DailyLog[];
  onDayPress: (date: string) => void;
};

export default function SymptomCalendar({ logs, onDayPress }: Props) {
  // Build react-native-calendars markedDates object
  const markedDates: Record<string, any> = {};
  for (const log of logs) {
    markedDates[log.date] = {
      marked: true,
      dotColor: avgSeverityColor(log),
      selected: false,
    };
  }

  return (
    <Calendar
      markedDates={markedDates}
      onDayPress={(day) => onDayPress(day.dateString)}
      theme={{
        calendarBackground: colors.card,
        textSectionTitleColor: colors.textMuted,
        todayTextColor: colors.primary,
        arrowColor: colors.primary,
        dotColor: colors.primary,
        selectedDotColor: '#fff',
        monthTextColor: colors.text,
        textMonthFontWeight: '700',
        textDayFontSize: 13,
        textMonthFontSize: 15,
      }}
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    />
  );
}
```

### Changes to `HistoryScreen.tsx`

1. Import `SymptomCalendar`
2. Add a **view toggle** (Calendar / List) in the header
3. In Calendar mode: render `SymptomCalendar` + same detail modal on day tap
4. In List mode: existing FlatList (unchanged)

```tsx
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

// Header toggle buttons:
<View style={styles.toggleRow}>
  <TouchableOpacity
    style={[styles.toggle, viewMode === 'list' && styles.toggleActive]}
    onPress={() => setViewMode('list')}
  >
    <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.toggle, viewMode === 'calendar' && styles.toggleActive]}
    onPress={() => setViewMode('calendar')}
  >
    <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
  </TouchableOpacity>
</View>

// In body:
{viewMode === 'calendar' ? (
  <ScrollView contentContainerStyle={{ padding: spacing.md }}>
    <SymptomCalendar
      logs={logs}
      onDayPress={(date) => {
        const log = logs.find((l) => l.date === date);
        if (log) setSelected(log);
      }}
    />
  </ScrollView>
) : (
  <FlatList ... /> // existing
)}
```

---

## Notes

- `react-native-calendars` is well-maintained (18k GitHub stars), works with Expo
- No premium gate needed — full history view in the calendar is gated by the log data filter (30-day for free users) which is enforced upstream
- Future: add "dot per symptom" rendering using `multi-dot` mode in react-native-calendars
