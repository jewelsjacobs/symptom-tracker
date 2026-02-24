# Bug Fix Spec: Deleted Symptoms in History Modal
**Agent Board ID:** task_18ae8f3d511950b8  
**Priority:** Low (data not lost — just not visible)  
**Assigned to:** Claude Code

---

## Bug Description

In `HistoryScreen.tsx`, the detail modal loops over `settings.symptoms` to resolve symptom names for a log entry:

```tsx
{settings.symptoms.map((symptom) => {
  const entry = selected.entries.find((e) => e.symptomId === symptom.id);
  ...
})}
```

If a symptom was **deleted from Settings**, its `id` no longer appears in `settings.symptoms`, so any log entries for that symptom are silently skipped in the modal. The data exists in AsyncStorage, but the UI doesn't show it.

---

## Fix

In `HistoryScreen.tsx`, render detail modal entries by iterating `selected.entries` (the log data), not `settings.symptoms`. For each entry, look up the symptom name — if it was deleted, show `"Unknown symptom"` as a fallback.

### Replace this block in `renderDetailModal()`:
```tsx
{settings.symptoms.map((symptom) => {
  const entry = selected.entries.find((e) => e.symptomId === symptom.id);
  const sev = entry?.severity ?? null;
  return (
    <View key={symptom.id} style={styles.modalRow}>
      <Text style={styles.modalSymptomName}>{symptom.name}</Text>
      ...
    </View>
  );
})}
```

### With this:
```tsx
{selected.entries.map((entry) => {
  const symptom = settings.symptoms.find((s) => s.id === entry.symptomId);
  const name = symptom?.name ?? 'Unknown symptom';
  return (
    <View key={entry.symptomId} style={styles.modalRow}>
      <Text style={[styles.modalSymptomName, !symptom && { color: colors.textMuted, fontStyle: 'italic' }]}>
        {name}
      </Text>
      <View style={styles.modalDotsRow}>
        {([1, 2, 3, 4, 5] as SeverityLevel[]).map((level) => (
          <View
            key={level}
            style={[
              styles.modalDot,
              {
                backgroundColor:
                  level <= entry.severity
                    ? severityColors[entry.severity - 1]
                    : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
})}
```

---

## Notes

- One-file change: `app/src/screens/HistoryScreen.tsx`
- No storage changes needed — data is fine
- The fix also handles future symptoms-without-logs (no symptom shows up without an entry)
- Visual: deleted symptoms show as italic muted "Unknown symptom" with their severity — better than invisible
