(function () {
  // ---------- deterministic RNG ----------
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260707);
  function noise(spread) { return (rand() - 0.5) * 2 * spread; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function avg(arr, s, e) {
    s = s === undefined ? 0 : s; e = e === undefined ? arr.length : e;
    let sum = 0; for (let i = s; i < e; i++) sum += arr[i];
    return sum / (e - s);
  }

  // ---------- dates ----------
  const DAYS = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtShort(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtFull(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }

  document.getElementById('asof-date').textContent = fmtFull(today);
  document.getElementById('range-dates').textContent = fmtShort(dates[0]) + ' – ' + fmtShort(dates[DAYS - 1]);

  // ---------- fabricate data ----------
  const oee = [], scrap = [], operatorEff = [], timeEff = [], throughput = [], fpy = [], downtime = [];
  for (let i = 0; i < DAYS; i++) {
    const drift = i * 0.15;
    oee.push(clamp(74 + drift + noise(3.5), 55, 92));
    scrap.push(clamp(2.6 + noise(0.9), 0.8, 5.5));
    const shiftFatigue = i >= DAYS - 7 ? (i - (DAYS - 7)) * 0.6 : 0;
    operatorEff.push(clamp(85 + noise(3) - shiftFatigue, 70, 96));
    timeEff.push(clamp(87 + noise(3), 70, 97));
    throughput.push(Math.round(clamp(500 + i * 1.2 + noise(30), 400, 620)));
    fpy.push(clamp(96.2 + noise(1.1), 93.5, 99.2));
    const isFriday = dates[i].getDay() === 5;
    downtime.push(clamp(1.3 + (isFriday ? 0.9 : 0) + noise(0.5), 0.2, 3.5));
  }
  const dipIdx = DAYS - 8;
  oee[dipIdx] = 61.4;
  const spikeIdx = DAYS - 5;
  scrap[spikeIdx] = 6.8;

  const TODAY_I = DAYS - 1;
  const SCRAP_THRESHOLD = 5;
  const THROUGHPUT_TARGET = 500;

  // ---------- KPI tiles ----------
  const kpis = [
    { key: 'oee', label: 'OEE', unit: '%', data: oee, higherBetter: true },
    { key: 'scrap', label: 'Scrap Rate', unit: '%', data: scrap, higherBetter: false },
    { key: 'operatorEff', label: 'Operator Efficiency', unit: '%', data: operatorEff, higherBetter: true },
    { key: 'timeEff', label: 'Time Efficiency', unit: '%', data: timeEff, higherBetter: true },
    { key: 'throughput', label: 'Throughput', unit: ' units', data: throughput, higherBetter: true },
    { key: 'fpy', label: 'First Pass Yield', unit: '%', data: fpy, higherBetter: true }
  ];

  const kpiGrid = document.getElementById('kpi-grid');
  kpis.forEach(k => {
    const todayVal = k.data[TODAY_I];
    const avgVal = avg(k.data);
    const delta = todayVal - avgVal;
    const improved = k.higherBetter ? delta >= 0 : delta <= 0;
    const tile = document.createElement('div');
    tile.className = 'kpi-tile';
    const decimals = k.key === 'throughput' ? 0 : 1;
    tile.innerHTML =
      '<div class="kpi-label">' + k.label + '</div>' +
      '<div class="kpi-value">' + todayVal.toFixed(decimals) + k.unit + '</div>' +
      '<div class="kpi-trend ' + (improved ? 'up' : 'down') + '">' +
        (improved ? '▲' : '▼') + ' ' + Math.abs(delta).toFixed(decimals) + k.unit +
        '<span class="vs">vs 30-day avg</span>' +
      '</div>';
    kpiGrid.appendChild(tile);
  });

  // ---------- SVG chart helpers ----------
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }
  function makeTooltip(container) {
    const tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    container.appendChild(tip);
    return tip;
  }
  function showTooltip(tip, container, x, y, html) {
    tip.innerHTML = html;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.classList.add('visible');
  }
  function hideTooltip(tip) { tip.classList.remove('visible'); }

  const CW = 620, CH = 300, PAD_L = 42, PAD_R = 14, PAD_T = 16, PAD_B = 30;
  const plotW = CW - PAD_L - PAD_R, plotH = CH - PAD_T - PAD_B;

  function xScale(i) { return PAD_L + (i / (DAYS - 1)) * plotW; }
  function yScaleFor(min, max) {
    return function (v) { return PAD_T + (1 - (v - min) / (max - min)) * plotH; };
  }
  function niceBounds(values, padFrac) {
    const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    const span = (max - min) || 1;
    return [min - span * padFrac, max + span * padFrac];
  }

  // ---------- Line chart ----------
  function buildLineChart(containerId, values, opts) {
    const container = document.getElementById(containerId);
    const svg = svgEl('svg', { viewBox: '0 0 ' + CW + ' ' + CH });
    const [minV, maxV] = niceBounds(values, 0.15);
    const y = yScaleFor(minV, maxV);

    const gridCount = 4;
    for (let g = 0; g <= gridCount; g++) {
      const val = minV + (g / gridCount) * (maxV - minV);
      const gy = y(val);
      svg.appendChild(svgEl('line', { x1: PAD_L, x2: CW - PAD_R, y1: gy, y2: gy, class: 'gridline' }));
      const t = svgEl('text', { x: PAD_L - 6, y: gy + 3, class: 'tick-label', 'text-anchor': 'end' });
      t.textContent = Math.round(val) + opts.unit;
      svg.appendChild(t);
    }
    for (let i = 0; i < DAYS; i += 5) {
      const t = svgEl('text', { x: xScale(i), y: CH - 4, class: 'tick-label', 'text-anchor': 'middle' });
      t.textContent = fmtShort(dates[i]);
      svg.appendChild(t);
    }

    const gradId = containerId + '-grad';
    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': opts.color, 'stop-opacity': '0.35' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': opts.color, 'stop-opacity': '0' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    let areaPath = 'M ' + xScale(0) + ' ' + y(values[0]);
    let linePath = 'M ' + xScale(0) + ' ' + y(values[0]);
    for (let i = 1; i < DAYS; i++) {
      areaPath += ' L ' + xScale(i) + ' ' + y(values[i]);
      linePath += ' L ' + xScale(i) + ' ' + y(values[i]);
    }
    areaPath += ' L ' + xScale(DAYS - 1) + ' ' + (CH - PAD_B) + ' L ' + xScale(0) + ' ' + (CH - PAD_B) + ' Z';

    svg.appendChild(svgEl('path', { d: areaPath, fill: 'url(#' + gradId + ')', stroke: 'none' }));
    svg.appendChild(svgEl('path', { d: linePath, fill: 'none', stroke: opts.color, 'stroke-width': '2' }));
    svg.appendChild(svgEl('circle', { cx: xScale(DAYS - 1), cy: y(values[DAYS - 1]), r: '4', fill: opts.color }));

    const crosshair = svgEl('line', { x1: 0, x2: 0, y1: PAD_T, y2: CH - PAD_B, stroke: 'var(--color-text-muted)', 'stroke-width': '1', 'stroke-dasharray': '3,3', opacity: '0' });
    svg.appendChild(crosshair);
    const hoverDot = svgEl('circle', { r: '5', fill: opts.color, stroke: 'var(--color-bg)', 'stroke-width': '2', opacity: '0' });
    svg.appendChild(hoverDot);

    container.appendChild(svg);
    const tip = makeTooltip(container);
    const overlay = svgEl('rect', { x: PAD_L, y: PAD_T, width: plotW, height: plotH, fill: 'transparent' });
    svg.appendChild(overlay);

    overlay.addEventListener('mousemove', function (e) {
      const rect = svg.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width * CW;
      let idx = Math.round((relX - PAD_L) / plotW * (DAYS - 1));
      idx = Math.max(0, Math.min(DAYS - 1, idx));
      const px = xScale(idx), py = y(values[idx]);
      crosshair.setAttribute('x1', px); crosshair.setAttribute('x2', px); crosshair.setAttribute('opacity', '1');
      hoverDot.setAttribute('cx', px); hoverDot.setAttribute('cy', py); hoverDot.setAttribute('opacity', '1');
      const contRect = container.getBoundingClientRect();
      const tipX = (px / CW) * contRect.width;
      const tipY = (py / CH) * contRect.height;
      showTooltip(tip, container, tipX, tipY, fmtShort(dates[idx]) + ' — <span class="tt-value">' + values[idx].toFixed(1) + opts.unit + '</span>');
    });
    overlay.addEventListener('mouseleave', function () {
      crosshair.setAttribute('opacity', '0');
      hoverDot.setAttribute('opacity', '0');
      hideTooltip(tip);
    });
  }

  // ---------- Bar chart ----------
  function buildBarChart(containerId, values, opts) {
    const container = document.getElementById(containerId);
    const svg = svgEl('svg', { viewBox: '0 0 ' + CW + ' ' + CH });
    const maxV = Math.max.apply(null, values) * 1.15;
    const minV = 0;
    const y = yScaleFor(minV, maxV);

    const gridCount = 4;
    for (let g = 0; g <= gridCount; g++) {
      const val = (g / gridCount) * maxV;
      const gy = y(val);
      svg.appendChild(svgEl('line', { x1: PAD_L, x2: CW - PAD_R, y1: gy, y2: gy, class: 'gridline' }));
      const t = svgEl('text', { x: PAD_L - 6, y: gy + 3, class: 'tick-label', 'text-anchor': 'end' });
      t.textContent = val.toFixed(1) + opts.unit;
      svg.appendChild(t);
    }
    for (let i = 0; i < DAYS; i += 5) {
      const t = svgEl('text', { x: xScale(i), y: CH - 4, class: 'tick-label', 'text-anchor': 'middle' });
      t.textContent = fmtShort(dates[i]);
      svg.appendChild(t);
    }

    if (opts.threshold != null) {
      const ty = y(opts.threshold);
      svg.appendChild(svgEl('line', { x1: PAD_L, x2: CW - PAD_R, y1: ty, y2: ty, stroke: 'var(--status-high)', 'stroke-width': '1', 'stroke-dasharray': '4,3' }));
    }

    const barW = (plotW / DAYS) * 0.6;
    const tip = makeTooltip(container);

    for (let i = 0; i < DAYS; i++) {
      const cx = xScale(i);
      const barH = (CH - PAD_B) - y(values[i]);
      const barColor = opts.colorFn ? opts.colorFn(values[i], i) : (values[i] > opts.threshold ? 'var(--status-high)' : opts.color);
      const bar = svgEl('rect', {
        x: cx - barW / 2,
        y: y(values[i]),
        width: barW,
        height: Math.max(1, barH),
        rx: '1.5',
        fill: barColor
      });
      svg.appendChild(bar);

      bar.addEventListener('mouseenter', function () { bar.setAttribute('opacity', '0.8'); });
      bar.addEventListener('mouseleave', function () { bar.setAttribute('opacity', '1'); hideTooltip(tip); });
      (function (idx, barEl) {
        barEl.addEventListener('mousemove', function () {
          const contRect = container.getBoundingClientRect();
          const relX = (barEl.getBoundingClientRect().left + barEl.getBoundingClientRect().width / 2 - contRect.left);
          const relY = barEl.getBoundingClientRect().top - contRect.top;
          showTooltip(tip, container, relX, relY, fmtShort(dates[idx]) + ' — <span class="tt-value">' + values[idx].toFixed(1) + opts.unit + '</span>');
        });
      })(i, bar);
    }
    container.appendChild(svg);
  }

  // ---------- Scatter chart ----------
  function buildScatterChart(containerId, xValues, yValues, opts) {
    const container = document.getElementById(containerId);
    const svg = svgEl('svg', { viewBox: '0 0 ' + CW + ' ' + CH });
    const [xMin, xMax] = niceBounds(xValues, 0.15);
    const [yMinV, yMaxV] = niceBounds(yValues, 0.15);
    const yS = yScaleFor(yMinV, yMaxV);
    function xS(v) { return PAD_L + (v - xMin) / (xMax - xMin) * plotW; }

    const gridCount = 4;
    for (let g = 0; g <= gridCount; g++) {
      const val = yMinV + (g / gridCount) * (yMaxV - yMinV);
      const gy = yS(val);
      svg.appendChild(svgEl('line', { x1: PAD_L, x2: CW - PAD_R, y1: gy, y2: gy, class: 'gridline' }));
      const t = svgEl('text', { x: PAD_L - 6, y: gy + 3, class: 'tick-label', 'text-anchor': 'end' });
      t.textContent = Math.round(val) + '%';
      svg.appendChild(t);
    }
    const xTickCount = 4;
    for (let g = 0; g <= xTickCount; g++) {
      const val = xMin + (g / xTickCount) * (xMax - xMin);
      const t = svgEl('text', { x: xS(val), y: CH - 4, class: 'tick-label', 'text-anchor': 'middle' });
      t.textContent = Math.round(val) + '%';
      svg.appendChild(t);
    }
    const xAxisLabel = svgEl('text', { x: PAD_L + plotW / 2, y: CH + 14, class: 'axis-label', 'text-anchor': 'middle' });
    xAxisLabel.textContent = 'Operator Efficiency %';
    svg.setAttribute('viewBox', '0 0 ' + CW + ' ' + (CH + 16));
    svg.appendChild(xAxisLabel);

    const n = xValues.length;
    const mx = avg(xValues), my = avg(yValues);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xValues[i] - mx) * (yValues[i] - my); den += (xValues[i] - mx) * (xValues[i] - mx); }
    const slope = den === 0 ? 0 : num / den;
    const intercept = my - slope * mx;
    svg.appendChild(svgEl('line', {
      x1: xS(xMin), y1: yS(intercept + slope * xMin),
      x2: xS(xMax), y2: yS(intercept + slope * xMax),
      stroke: 'var(--color-accent-light)', 'stroke-width': '1.5', 'stroke-dasharray': '5,3'
    }));

    const tip = makeTooltip(container);
    for (let i = 0; i < n; i++) {
      const cx = xS(xValues[i]), cy = yS(yValues[i]);
      const dot = svgEl('circle', { cx: cx, cy: cy, r: '4.5', fill: opts.color, opacity: '0.85' });
      svg.appendChild(dot);
      dot.addEventListener('mouseenter', function () { dot.setAttribute('r', '6'); });
      dot.addEventListener('mouseleave', function () { dot.setAttribute('r', '4.5'); hideTooltip(tip); });
      (function (idx, dotEl) {
        dotEl.addEventListener('mousemove', function () {
          const contRect = container.getBoundingClientRect();
          const dotRect = dotEl.getBoundingClientRect();
          const relX = dotRect.left + dotRect.width / 2 - contRect.left;
          const relY = dotRect.top - contRect.top;
          showTooltip(tip, container, relX, relY,
            fmtShort(dates[idx]) + '<br>Operator Eff: <span class="tt-value">' + xValues[idx].toFixed(1) + '%</span><br>Time Eff: <span class="tt-value">' + yValues[idx].toFixed(1) + '%</span>');
        });
      })(i, dot);
    }
    container.appendChild(svg);
  }

  buildLineChart('chart-oee', oee, { color: 'var(--color-accent)', unit: '%' });
  buildBarChart('chart-scrap', scrap, { color: 'var(--color-accent)', unit: '%', threshold: SCRAP_THRESHOLD });
  buildScatterChart('chart-scatter', operatorEff, timeEff, { color: 'var(--color-accent)' });
  buildBarChart('chart-downtime', downtime, {
    color: 'var(--color-accent)',
    unit: 'h',
    colorFn: function (v, i) { return dates[i].getDay() === 5 ? 'var(--status-monitor)' : 'var(--color-accent)'; }
  });

  // ---------- data table ----------
  const tableBody = document.getElementById('data-table-body');
  for (let i = DAYS - 1; i >= 0; i--) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + fmtShort(dates[i]) + '</td>' +
      '<td>' + oee[i].toFixed(1) + '</td>' +
      '<td>' + scrap[i].toFixed(1) + '</td>' +
      '<td>' + operatorEff[i].toFixed(1) + '</td>' +
      '<td>' + timeEff[i].toFixed(1) + '</td>' +
      '<td>' + throughput[i] + '</td>' +
      '<td>' + downtime[i].toFixed(1) + '</td>' +
      '<td>' + fpy[i].toFixed(1) + '</td>';
    tableBody.appendChild(tr);
  }
  const tableWrap = document.getElementById('data-table-wrap');
  const tableToggleBtn = document.getElementById('table-toggle-btn');
  tableToggleBtn.addEventListener('click', function () {
    const open = tableWrap.classList.toggle('open');
    tableToggleBtn.textContent = open ? 'Hide 30-day data table' : 'Show 30-day data table';
  });

  // ---------- recommendations (computed from data) ----------
  const patterns = [];

  const scrapAvg = avg(scrap);
  patterns.push({
    level: 'high',
    title: 'Scrap rate spike on ' + fmtFull(dates[spikeIdx]),
    detail: 'Scrap rate hit ' + scrap[spikeIdx].toFixed(1) + '%, well above the 30-day average of ' + scrapAvg.toFixed(1) + '% and over the ' + SCRAP_THRESHOLD + '% threshold. Recommend inspecting tooling and process setup for that shift.'
  });

  patterns.push({
    level: 'high',
    title: 'OEE dip on ' + fmtFull(dates[dipIdx]),
    detail: 'OEE dropped to ' + oee[dipIdx].toFixed(1) + '%, consistent with an unplanned downtime event. Recommend reviewing the downtime log for that date before it recurs.'
  });

  const opLast7 = avg(operatorEff, DAYS - 7, DAYS);
  const opPrior7 = avg(operatorEff, DAYS - 14, DAYS - 7);
  if (opPrior7 - opLast7 > 1) {
    patterns.push({
      level: 'monitor',
      title: 'Operator efficiency trending down',
      detail: 'Down ' + (opPrior7 - opLast7).toFixed(1) + ' pts over the last 7 days (from ' + opPrior7.toFixed(1) + '% to ' + opLast7.toFixed(1) + '%). Worth a shift-level check-in.'
    });
  }

  let fridaySum = 0, fridayCount = 0, otherSum = 0, otherCount = 0;
  for (let i = 0; i < DAYS; i++) {
    if (dates[i].getDay() === 5) { fridaySum += downtime[i]; fridayCount++; }
    else { otherSum += downtime[i]; otherCount++; }
  }
  const fridayAvg = fridaySum / fridayCount, otherAvg = otherSum / otherCount;
  if (fridayAvg - otherAvg > 0.4) {
    patterns.push({
      level: 'monitor',
      title: 'Downtime consistently higher on Fridays',
      detail: 'Fridays average ' + fridayAvg.toFixed(1) + ' hrs of downtime vs. ' + otherAvg.toFixed(1) + ' hrs the rest of the week — possible end-of-week changeover or maintenance pattern.'
    });
  }

  const fpyMin = Math.min.apply(null, fpy), fpyAvgAll = avg(fpy);
  if (fpyMin > 94) {
    patterns.push({
      level: 'note',
      title: 'First pass yield holding steady',
      detail: 'FPY stayed above 94% every day this period (min ' + fpyMin.toFixed(1) + '%, avg ' + fpyAvgAll.toFixed(1) + '%). No action needed.'
    });
  }

  const throughputAvg = avg(throughput);
  if (throughputAvg > THROUGHPUT_TARGET) {
    const pct = ((throughputAvg / THROUGHPUT_TARGET) - 1) * 100;
    patterns.push({
      level: 'note',
      title: 'Throughput running above target',
      detail: 'Average daily throughput (' + Math.round(throughputAvg) + ' units) is ' + pct.toFixed(1) + '% above the ' + THROUGHPUT_TARGET + '-unit target.'
    });
  }

  const order = { high: 0, monitor: 1, note: 2 };
  patterns.sort(function (a, b) { return order[a.level] - order[b.level]; });

  const labelFor = { high: 'High Priority', monitor: 'Monitor', note: 'Note' };
  const patternList = document.getElementById('pattern-list');
  patterns.forEach(function (p) {
    const item = document.createElement('div');
    item.className = 'pattern-item ' + p.level;
    item.innerHTML =
      '<div class="pattern-badge">' + labelFor[p.level] + '</div>' +
      '<div class="pattern-title">' + p.title + '</div>' +
      '<div class="pattern-detail">' + p.detail + '</div>';
    patternList.appendChild(item);
  });

  // ---------- part summary ----------
  const parts = [
    { num: 'P-1042', desc: 'Bracket, Mounting, Steel, LH', planned: 240, made: 244 },
    { num: 'P-1043', desc: 'Bracket, Mounting, Steel, RH', planned: 240, made: 238 },
    { num: 'P-2108', desc: 'Channel, Formed, 14GA Aluminum', planned: 180, made: 180 },
    { num: 'P-2231', desc: 'Housing, Weld Assembly', planned: 96, made: 88 },
    { num: 'P-3007', desc: 'Shaft, Machined, 4140 Steel', planned: 150, made: 151 },
    { num: 'P-3312', desc: 'Guard, Laser Cut, Powder Coat', planned: 120, made: 112 },
    { num: 'P-4090', desc: 'Panel, Formed, Powder Coat', planned: 300, made: 296 },
    { num: 'P-4155', desc: 'Cover, Stamped', planned: 400, made: 405 },
    { num: 'P-5021', desc: 'Fixture, Weld, Repeatability', planned: 24, made: 24 },
    { num: 'P-5188', desc: 'Insert, Cast, A356 Aluminum', planned: 60, made: 51 }
  ];

  const partBody = document.getElementById('part-table-body');
  parts.forEach(function (p) {
    const pct = (p.made / p.planned) * 100;
    let statusClass, statusLabel;
    if (pct >= 100) { statusClass = 'good'; statusLabel = 'On Track'; }
    else if (pct >= 90) { statusClass = 'warn'; statusLabel = 'Slightly Short'; }
    else { statusClass = 'short'; statusLabel = 'Short'; }
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + p.num + '</td>' +
      '<td>' + p.desc + '</td>' +
      '<td>' + p.planned + '</td>' +
      '<td>' + p.made + '</td>' +
      '<td><span class="status-dot ' + statusClass + '"></span>' + statusLabel + ' (' + pct.toFixed(0) + '%)</td>';
    partBody.appendChild(tr);
  });
})();
