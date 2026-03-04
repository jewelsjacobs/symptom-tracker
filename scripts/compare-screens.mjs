#!/usr/bin/env node

/**
 * Visual QA Screen Comparison Tool
 * 
 * Compares mockup PNGs against simulator screenshots using pixelmatch.
 * Outputs a diff image highlighting all differences in red.
 * 
 * Usage:
 *   node compare-screens.mjs <mockup.png> <screenshot.png> [output-diff.png]
 *   node compare-screens.mjs --batch <mockups-dir> <screenshots-dir> [diffs-dir]
 * 
 * Requirements:
 *   npm install pixelmatch pngjs
 */

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// ─── Configuration ───────────────────────────────────────────────
const THRESHOLD = 0.1;        // Color difference threshold (0-1, lower = more sensitive)
const DIFF_COLOR = [255, 0, 0]; // Red highlight for differences
const PASS_THRESHOLD = 1.0;   // Pass if diff percentage is below this (%)

// ─── Helper Functions ────────────────────────────────────────────

function loadPNG(filePath) {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function resizeToMatch(source, targetWidth, targetHeight) {
  const resized = new PNG({ width: targetWidth, height: targetHeight });
  const xRatio = source.width / targetWidth;
  const yRatio = source.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * source.width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      resized.data[dstIdx] = source.data[srcIdx];
      resized.data[dstIdx + 1] = source.data[srcIdx + 1];
      resized.data[dstIdx + 2] = source.data[srcIdx + 2];
      resized.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }
  return resized;
}

function compareImages(mockupPath, screenshotPath, diffOutputPath) {
  const mockup = loadPNG(mockupPath);
  let screenshot = loadPNG(screenshotPath);

  if (mockup.width !== screenshot.width || mockup.height !== screenshot.height) {
    console.log(`  ⚠ Size mismatch: mockup ${mockup.width}x${mockup.height} vs screenshot ${screenshot.width}x${screenshot.height}`);
    console.log(`  → Resizing screenshot to match mockup dimensions`);
    screenshot = resizeToMatch(screenshot, mockup.width, mockup.height);
  }

  const { width, height } = mockup;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    mockup.data,
    screenshot.data,
    diff.data,
    width,
    height,
    {
      threshold: THRESHOLD,
      diffColor: DIFF_COLOR,
      alpha: 0.3,
      includeAA: false,
    }
  );

  const totalPixels = width * height;
  const diffPercent = ((numDiffPixels / totalPixels) * 100).toFixed(2);
  const passed = parseFloat(diffPercent) < PASS_THRESHOLD;

  fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

  return { mockupPath, screenshotPath, diffOutputPath, numDiffPixels, totalPixels, diffPercent, passed, width, height };
}

function printResult(result) {
  const icon = result.passed ? '✅' : '❌';
  console.log(`\n${icon} ${path.basename(result.mockupPath)}`);
  console.log(`  Mockup:     ${result.mockupPath}`);
  console.log(`  Screenshot: ${result.screenshotPath}`);
  console.log(`  Diff image: ${result.diffOutputPath}`);
  console.log(`  Dimensions: ${result.width}x${result.height}`);
  console.log(`  Different pixels: ${result.numDiffPixels.toLocaleString()} / ${result.totalPixels.toLocaleString()}`);
  console.log(`  Diff: ${result.diffPercent}% ${result.passed ? '(PASS)' : '(FAIL - exceeds ' + PASS_THRESHOLD + '% threshold)'}`);
}

function printSummary(results) {
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total screens: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log(`\nScreens needing attention:`);
    results
      .filter(r => !r.passed)
      .sort((a, b) => parseFloat(b.diffPercent) - parseFloat(a.diffPercent))
      .forEach(r => {
        console.log(`  ❌ ${path.basename(r.mockupPath)} — ${r.diffPercent}% different`);
        console.log(`     Diff image: ${r.diffOutputPath}`);
      });
  }

  console.log('═'.repeat(60));
}

// ─── Batch Mode ──────────────────────────────────────────────────

function batchCompare(mockupsDir, screenshotsDir, diffsDir) {
  if (!fs.existsSync(diffsDir)) {
    fs.mkdirSync(diffsDir, { recursive: true });
  }

  const mockupFiles = fs.readdirSync(mockupsDir)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort();

  const screenshotFiles = fs.readdirSync(screenshotsDir)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort();

  if (mockupFiles.length === 0) {
    console.error(`❌ No PNG files found in mockups directory: ${mockupsDir}`);
    process.exit(1);
  }

  console.log(`Found ${mockupFiles.length} mockup(s) and ${screenshotFiles.length} screenshot(s)\n`);

  const results = [];

  for (const mockupFile of mockupFiles) {
    const baseName = path.basename(mockupFile, '.png');
    const matchingScreenshot = screenshotFiles.find(f => {
      const screenshotBase = path.basename(f, '.png');
      return screenshotBase.toLowerCase().includes(baseName.toLowerCase()) ||
             baseName.toLowerCase().includes(screenshotBase.toLowerCase());
    });

    if (!matchingScreenshot) {
      console.log(`⚠ No matching screenshot found for: ${mockupFile}`);
      continue;
    }

    const mockupPath = path.join(mockupsDir, mockupFile);
    const screenshotPath = path.join(screenshotsDir, matchingScreenshot);
    const diffPath = path.join(diffsDir, `diff-${baseName}.png`);

    const result = compareImages(mockupPath, screenshotPath, diffPath);
    printResult(result);
    results.push(result);
  }

  if (results.length > 0) {
    printSummary(results);
  }

  return results;
}

// ─── Single Comparison Mode ─────────────────────────────────────

function singleCompare(mockupPath, screenshotPath, diffPath) {
  if (!diffPath) {
    const dir = path.dirname(mockupPath);
    const base = path.basename(mockupPath, '.png');
    diffPath = path.join(dir, `diff-${base}.png`);
  }

  const result = compareImages(mockupPath, screenshotPath, diffPath);
  printResult(result);
  return result;
}

// ─── Main ────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Visual QA Screen Comparison Tool
─────────────────────────────────

Single comparison:
  node compare-screens.mjs <mockup.png> <screenshot.png> [output-diff.png]

Batch comparison:
  node compare-screens.mjs --batch <mockups-dir> <screenshots-dir> [diffs-dir]

Options:
  Threshold: ${THRESHOLD} (edit THRESHOLD in script to adjust sensitivity)
  Pass threshold: ${PASS_THRESHOLD}% (edit PASS_THRESHOLD to adjust)
  `);
  process.exit(0);
}

if (args[0] === '--batch') {
  const mockupsDir = args[1];
  const screenshotsDir = args[2];
  const diffsDir = args[3] || path.join(screenshotsDir, '..', 'diffs');

  if (!mockupsDir || !screenshotsDir) {
    console.error('Usage: node compare-screens.mjs --batch <mockups-dir> <screenshots-dir> [diffs-dir]');
    process.exit(1);
  }

  const results = batchCompare(mockupsDir, screenshotsDir, diffsDir);
  process.exit(results.every(r => r.passed) ? 0 : 1);
} else {
  const mockupPath = args[0];
  const screenshotPath = args[1];
  const diffPath = args[2];

  if (!mockupPath || !screenshotPath) {
    console.error('Usage: node compare-screens.mjs <mockup.png> <screenshot.png> [output-diff.png]');
    process.exit(1);
  }

  const result = singleCompare(mockupPath, screenshotPath, diffPath);
  process.exit(result.passed ? 0 : 1);
}
