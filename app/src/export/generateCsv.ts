import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { AppSettings, DailyLog } from '../types';

/**
 * Generate and share a CSV file of all logged data.
 */
export async function exportCsv(settings: AppSettings, logs: DailyLog[]): Promise<void> {
  const symptomNames = settings.symptoms.map((s) => s.name);
  const header = ['Date', ...symptomNames, 'Note'].join(',');

  const rows = logs
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => {
      const sevCells = settings.symptoms.map((s) => {
        const entry = log.entries.find((e) => e.symptomId === s.id);
        return entry?.severity?.toString() ?? '';
      });
      const note = log.note ? `"${log.note.replace(/"/g, '""')}"` : '';
      return [log.date, ...sevCells, note].join(',');
    });

  const csv = [header, ...rows].join('\n');
  const filename = `ebb-export-${new Date().toISOString().split('T')[0]}.csv`;
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Ebb Data',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
