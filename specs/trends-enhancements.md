# Coding Spec: Trends Screen — Line Graphs + Time Range Toggle
**Agent Board ID:** task_d99943d108980361  
**Priority:** Medium — phase 2, post-TestFlight  
**Assigned to:** Claude Code  
**Current state:** Bar chart (7-day only) — functional for MVP

---

## What's Already There

`TrendsScreen.tsx` has a working bar chart per symptom:
- 7-day view, hardcoded
- Y-axis labels (1–5)
- 7-day average badge
- Severity color legend
- Today highlighted

This is shippable for beta. Enhancements below are phase-2.

---

## What to Add

1. **Time range toggle:** 7d / 30d / 90d / All — free users locked to 7d
2. **Line graph** — replace custom bar chart with a proper chart library for smoother lines
3. **Average line** — dashed horizontal line at 7-day avg for reference

---

## Install

```bash
npx expo install react-native-gifted-charts
# gifted-charts is Expo-compatible, no native modules, pure JS
```

---

## Implementation

### Changes to `TrendsScreen.tsx`

#### 1. Time range state + gate

```tsx
import { usePremium } from '../purchases/usePremium';

type TimeRange = '7d' | '30d' | '90d' | 'all';

const { premium } = usePremium();
const [range, setRange] = useState<TimeRange>('7d');

function getDaysForRange(r: TimeRange): number | null {
  if (r === '7d') return 7;
  if (r === '30d') return 30;
  if (r === '90d') return 90;
  return null; // all time
}

// Time range toggle UI:
<View style={styles.rangeRow}>
  {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((r) => {
    const locked = r !== '7d' && !premium;
    return (
      <TouchableOpacity
        key={r}
        style={[styles.rangeBtn, range === r && styles.rangeBtnActive, locked && styles.rangeBtnLocked]}
        onPress={() => {
          if (locked) {
            Alert.alert('Premium', 'Extended trends require Ebb Premium.');
            return;
          }
          setRange(r);
        }}
      >
        <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
          {locked ? '🔒 ' : ''}{r === 'all' ? 'All' : r}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
```

#### 2. Data preparation for selected range

```tsx
// Replace `last7Days` with dynamic range:
const days = getDaysForRange(range);
const rangeData = useMemo(() => {
  const allDates = days
    ? Array.from({ length: days }, (_, i) => daysAgoDateString(days - 1 - i))
    : Array.from(logMap.keys()).sort(); // all logged dates, chronological

  return allDates.map((date) => ({
    date,
    log: logMap.get(date) ?? null,
    dayLabel: date.split('-')[2], // day of month, e.g. "23"
  }));
}, [range, logMap]);
```

#### 3. Replace bar chart with LineChart (gifted-charts)

```tsx
import { LineChart } from 'react-native-gifted-charts';

// Inside symptom card, replace the manual bar chart:
const chartData = rangeData.map(({ date, log }) => {
  const entry = log?.entries.find((e) => e.symptomId === symptom.id);
  return {
    value: entry?.severity ?? 0,
    dataPointText: entry ? undefined : '',
    hideDataPoint: !entry,
    label: rangeData.length <= 14 ? dayInitial(date) : '',
  };
});

<LineChart
  data={chartData}
  height={80}
  maxValue={5}
  noOfSections={4}
  stepValue={1}
  color={colors.primary}
  thickness={2}
  dataPointsColor={colors.primary}
  dataPointsRadius={3}
  startFillColor={colors.primaryLight}
  startOpacity={0.2}
  endOpacity={0}
  areaChart
  curved
  hideRules={false}
  rulesColor={colors.border}
  rulesType="solid"
  yAxisColor="transparent"
  xAxisColor={colors.border}
  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
  backgroundColor={colors.card}
  hideYAxisText={false}
  initialSpacing={8}
  spacing={rangeData.length > 30 ? 4 : rangeData.length > 14 ? 8 : 16}
/>
```

#### 4. Add reference line for average

```tsx
// After the chart:
const filledEntries = chartData.filter((d) => d.value > 0);
const avg = filledEntries.length
  ? filledEntries.reduce((s, d) => s + d.value, 0) / filledEntries.length
  : null;

// The avg badge already exists — keep it.
// gifted-charts supports a `referenceLine` prop; use it if the version supports it:
referenceLine1Config={{ color: colors.primary, thickness: 1, type: 'dashed' }}
referenceLine1Position={avg ?? 0}
```

---

## Style additions

```ts
rangeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
rangeBtn: {
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
},
rangeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
rangeBtnLocked: { opacity: 0.5 },
rangeBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
rangeBtnTextActive: { color: '#fff', fontWeight: '700' },
```

---

## Notes

- `react-native-gifted-charts` is pure JS — no native rebuild needed
- For 30d+, hide day-of-week labels; show day-of-month numbers instead
- For "all time" with > 90 entries, reduce spacing to 3–4px per bar so chart fits
- Premium gate is enforced via `usePremium()` hook — same as history filter
