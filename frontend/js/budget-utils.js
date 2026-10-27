// Budget utilities: presets, blending, normalization

export function normalizeBreakdown(parts) {
  const keys = ['transport', 'accommodation', 'food', 'activities', 'other'];
  // Fill missing with 0
  const filled = Object.fromEntries(keys.map(k => [k, Math.max(0, Number(parts?.[k] || 0))]));
  const sum = keys.reduce((s, k) => s + filled[k], 0) || 1;
  // Normalize to 100
  const normalized = {};
  keys.forEach(k => { normalized[k] = (filled[k] / sum) * 100; });
  // Fix rounding drift
  const total = Math.round(keys.reduce((s, k) => s + Math.round(normalized[k]), 0));
  if (total !== 100) {
    // Adjust the largest bucket to make total 100
    const largest = keys.sort((a, b) => normalized[b] - normalized[a])[0];
    normalized[largest] += (100 - total);
  }
  return normalized;
}

export function getStylePreset(style) {
  const s = String(style || '').toLowerCase();
  switch (s) {
    case 'adventure': return { transport: 35, accommodation: 20, food: 15, activities: 25, other: 5 };
    case 'luxury': return { transport: 15, accommodation: 45, food: 25, activities: 10, other: 5 };
    case 'cultural': return { transport: 20, accommodation: 25, food: 25, activities: 25, other: 5 };
    case 'relaxation': return { transport: 15, accommodation: 40, food: 25, activities: 15, other: 5 };
    case 'budget': return { transport: 25, accommodation: 25, food: 20, activities: 20, other: 10 };
    default: return { transport: 30, accommodation: 30, food: 20, activities: 15, other: 5 };
  }
}

export function blendPresets(presets) {
  if (!presets || presets.length === 0) return getStylePreset();
  const keys = ['transport', 'accommodation', 'food', 'activities', 'other'];
  const agg = { transport: 0, accommodation: 0, food: 0, activities: 0, other: 0 };
  presets.forEach(p => keys.forEach(k => { agg[k] += p[k]; }));
  keys.forEach(k => { agg[k] /= presets.length; });
  return normalizeBreakdown(agg);
}

export function destinationTweaks(dest) {
  const d = String(dest || '').toLowerCase();
  // Heuristic tweaks (+/- percentage points)
  if (/(switzerland|tokyo|singapore|dubai|iceland)/.test(d)) {
    return { accommodation: +5, food: +5, transport: -5, other: -5 };
  }
  if (/(bali|goa|maldives|phuket)/.test(d)) {
    return { accommodation: +5, activities: +5, transport: -5, other: -5 };
  }
  if (/(europe|paris|london|rome|barcelona)/.test(d)) {
    return { accommodation: +3, food: +2, transport: 0, activities: 0, other: -5 };
  }
  return { transport: 0, accommodation: 0, food: 0, activities: 0, other: 0 };
}

export function applyTweaks(base, tweaks) {
  const keys = ['transport', 'accommodation', 'food', 'activities', 'other'];
  const out = { ...base };
  keys.forEach(k => { out[k] = (out[k] || 0) + (tweaks[k] || 0); });
  return normalizeBreakdown(out);
}

export function durationTravelerTweaks(days, travelers) {
  const t = { transport: 0, accommodation: 0, food: 0, activities: 0, other: 0 };
  const d = Number(days || 1);
  const n = Number(travelers || 1);
  if (d <= 3) { t.activities += 3; t.food += 2; t.transport -= 3; t.other -= 2; }
  if (n >= 4) { t.accommodation += 3; t.food += 2; t.activities -= 3; t.other - 2; }
  return t;
}

export function getDefaultBreakdown({ travelStyles = [], destination = '', days = 7, travelers = 2 }) {
  const presets = (Array.isArray(travelStyles) && travelStyles.length)
    ? travelStyles.map(getStylePreset)
    : [getStylePreset()];
  let blended = blendPresets(presets);
  blended = applyTweaks(blended, destinationTweaks(destination));
  blended = applyTweaks(blended, durationTravelerTweaks(days, travelers));
  return blended; // percentages summing to ~100
}

export function percentagesToAmounts(percentages, total) {
  const keys = ['transport', 'accommodation', 'food', 'activities', 'other'];
  const p = normalizeBreakdown(percentages);
  const amounts = {};
  let allocated = 0;
  keys.forEach((k, idx) => {
    if (idx < keys.length - 1) {
      amounts[k] = Math.round((p[k] / 100) * total);
      allocated += amounts[k];
    } else {
      amounts[k] = total - allocated; // ensure exact total
    }
  });
  return amounts;
}
