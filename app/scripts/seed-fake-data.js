#!/usr/bin/env node

/**
 * Seed fake symptom log data into the iOS simulator's AsyncStorage.
 * 
 * Usage:
 *   node scripts/seed-fake-data.js
 *   
 * Then kill and reopen the app in the simulator to see the data.
 * 
 * To clear fake data, delete the app from the simulator and 
 * run `npx expo run:ios` again.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Configuration ---
const DAYS_OF_DATA = 180; // 6 months
const BUNDLE_ID = 'com.julia.ebb';

const SYMPTOMS = [
  { id: 'seed_headache', name: 'Headache', createdAt: '2025-09-04T00:00:00.000Z' },
  { id: 'seed_dizziness', name: 'Dizziness', createdAt: '2025-09-04T00:00:00.000Z' },
  { id: 'seed_depression', name: 'Depression', createdAt: '2025-09-04T00:00:00.000Z' },
  { id: 'seed_joint_pain', name: 'Joint Pain', createdAt: '2025-09-04T00:00:00.000Z' },
  { id: 'seed_anxiety', name: 'Anxiety', createdAt: '2025-09-04T00:00:00.000Z' },
  { id: 'seed_sleep', name: 'Sleep Quality', createdAt: '2025-09-04T00:00:00.000Z' },
];

const NOTES = [
  'Took meds',
  'Stressful day at work',
  'Slept well',
  'Skipped coffee',
  'Rainy weather',
  'Exercised',
  'Ate well today',
  'Feeling better',
  null, null, null, null,
];

// --- Generate data ---

function dateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateSeverity(symptomIdx, dayIdx) {
  const bases = [2.5, 2.0, 3.0, 1.5, 2.5, 2.0];
  const base = bases[symptomIdx % bases.length];
  const dayOfWeek = (dayIdx % 7);
  const weekEffect = dayOfWeek >= 2 && dayOfWeek <= 4 ? 0.5 : -0.3;
  const trend = (dayIdx / DAYS_OF_DATA) * 0.8;
  const noise = (Math.random() - 0.5) * 2;
  const raw = base + weekEffect + trend + noise;
  return Math.max(1, Math.min(5, Math.round(raw)));
}

const settings = {
  symptoms: SYMPTOMS,
  reminderTime: '20:00',
  hasCompletedOnboarding: true,
  accountEmail: null,
};

const manifest = {};
manifest['@symptom_tracker_settings'] = JSON.stringify(settings);

let logCount = 0;
for (let i = 0; i < DAYS_OF_DATA; i++) {
  if (Math.random() < 0.15) continue; // skip ~15% of days
  
  const date = dateString(i);
  const entries = SYMPTOMS.map((symptom, si) => ({
    symptomId: symptom.id,
    severity: generateSeverity(si, i),
  }));
  
  const note = NOTES[Math.floor(Math.random() * NOTES.length)];
  const log = { date, entries };
  if (note) log.note = note;
  
  manifest[`@symptom_tracker_log_${date}`] = JSON.stringify(log);
  logCount++;
}

console.log(`Generated ${logCount} days of log data for ${SYMPTOMS.length} symptoms`);

// --- Find simulator and write ---

try {
  const simDevicesDir = path.join(process.env.HOME, 'Library/Developer/CoreSimulator/Devices');
  
  const bootedOutput = execSync('xcrun simctl list devices booted -j', { encoding: 'utf8' });
  const bootedData = JSON.parse(bootedOutput);
  let deviceId = null;
  for (const runtime of Object.values(bootedData.devices)) {
    for (const device of runtime) {
      if (device.state === 'Booted') {
        deviceId = device.udid;
        break;
      }
    }
    if (deviceId) break;
  }
  
  if (!deviceId) {
    console.error('No booted simulator found. Start the simulator first.');
    process.exit(1);
  }
  
  console.log(`Found booted simulator: ${deviceId}`);
  
  const findCmd = `find "${simDevicesDir}/${deviceId}" -path "*/Application Support/${BUNDLE_ID}/RCTAsyncLocalStorage_V1" -type d 2>/dev/null`;
  const storagePath = execSync(findCmd, { encoding: 'utf8' }).trim();
  
  if (!storagePath) {
    console.error(`Could not find AsyncStorage for ${BUNDLE_ID}. Run the app once first.`);
    process.exit(1);
  }
  
  const manifestPath = path.join(storagePath, 'manifest.json');
  console.log(`Writing to: ${manifestPath}`);
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('\n✅ Fake data seeded! Kill and reopen the app in the simulator to see it.');
  
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
