/* Digital Twin Prototype — browser-based Three.js simulation of a generic
   12-station assembly line. Station layout, product, and event data here are
   illustrative/fictionalized (inspired by manufacturing internship experience,
   not real production data or any specific employer's process). */
window.addEventListener('load', () => {

// ─── SCENE SETUP ────────────────────────────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x080c1a);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080c1a, 0.018);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(3, 18, 32);
camera.lookAt(3, 0.5, 0);

// ─── LIGHTING ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x202840, 1.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(10, 20, 12);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);
const pl1 = new THREE.PointLight(0x3366bb, 0.6, 60);
pl1.position.set(-8, 6, 0);
scene.add(pl1);
const pl2 = new THREE.PointLight(0x1D9E75, 0.35, 40);
pl2.position.set(10, 4, 4);
scene.add(pl2);

// ─── HELPERS ────────────────────────────────────────────────────────────────
function mkMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, ...opts });
}
function mkBox(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

// ─── STATION DATA (generic assembly line — illustrative, not real production data) ─
const STATIONS = [
  { id: 'OP1a', x: -13.5, name: 'Load / Orient',      color: 0x185FA5, type: 'mat' },
  { id: 'OP1b', x: -10.5, name: 'Label Print',        color: 0x185FA5, type: 'mat' },
  { id: 'OP2',  x:  -7.5, name: 'Sub-Assembly 1',     color: 0x3B6D11, type: 'asm' },
  { id: 'OP3',  x:  -4.5, name: 'Sub-Assembly 2',     color: 0x3B6D11, type: 'asm' },
  { id: 'OP4',  x:  -1.5, name: 'Component Install',  color: 0x3B6D11, type: 'asm' },
  { id: 'OP5',  x:   1.5, name: 'Wire Install',       color: 0x854F0B, type: 'wire' },
  { id: 'OP6',  x:   4.5, name: 'Functional Test',    color: 0xA32D2D, type: 'test' },
  { id: 'OP7',  x:   7.5, name: 'Cover Install',       color: 0x3B6D11, type: 'asm' },
  { id: 'OP8',  x:  10.5, name: 'Final Trim',          color: 0x3B6D11, type: 'asm' },
  { id: 'OP9',  x:  13.5, name: 'Boxing / Package',   color: 0x185FA5, type: 'mat' },
  { id: 'OP10', x:  16.5, name: 'Box Labels',          color: 0x185FA5, type: 'mat' },
  { id: 'OP11', x:  19.5, name: 'Palletize',           color: 0x3C3489, type: 'pack' },
];

// ─── GRID FLOOR ──────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(60, 60, 0x1a2240, 0x111830);
gridHelper.position.set(3, -2.25, 0);
scene.add(gridHelper);

// ─── CONVEYOR RAILS ──────────────────────────────────────────────────────────
const railMat = mkMat(0xb0c0d8, { metalness: 0.7, roughness: 0.3 });
[-0.88, 0.88].forEach(z => {
  const rail = mkBox(38, 0.16, 0.20, railMat);
  rail.position.set(3, 0, z);
  scene.add(rail);
});

// Belt
const beltMat = mkMat(0x1e2a3a, { roughness: 0.85 });
const belt = mkBox(38, 0.08, 1.58, beltMat);
belt.position.set(3, -0.07, 0);
scene.add(belt);

// Green center stripe
const stripeMat = mkMat(0x2a5c2a, { roughness: 0.7 });
const stripe = mkBox(38, 0.02, 0.12, stripeMat);
stripe.position.set(3, -0.02, 0);
scene.add(stripe);

// ─── ROLLERS ─────────────────────────────────────────────────────────────────
const rollerMat = mkMat(0x9090a8, { metalness: 0.6, roughness: 0.4 });
const rollerGeo = new THREE.CylinderGeometry(0.052, 0.052, 1.76, 8);
for (let rx = -13.9; rx <= 23.9; rx += 0.2) {
  const r = new THREE.Mesh(rollerGeo, rollerMat);
  r.rotation.z = Math.PI / 2;
  r.position.set(rx, 0.0, 0);
  scene.add(r);
}

// ─── LEGS ────────────────────────────────────────────────────────────────────
const legMat = mkMat(0x707888, { metalness: 0.5, roughness: 0.5 });
const footMat = mkMat(0x505560, { metalness: 0.3 });
const legPositions = [];
for (let i = 0; i < 7; i++) legPositions.push(-13.5 + i * 5.5);
legPositions.forEach(lx => {
  [-0.75, 0.75].forEach(lz => {
    const leg = mkBox(0.09, 2.1, 0.09, legMat);
    leg.position.set(lx, -1.15, lz);
    scene.add(leg);
    const foot = mkBox(0.2, 0.08, 0.2, footMat);
    foot.position.set(lx, -2.24, lz);
    scene.add(foot);
  });
});

// ─── STATIONS (arch frames + floor pads + labels) ────────────────────────────
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 256; labelCanvas.height = 64;
const lctx = labelCanvas.getContext('2d');

STATIONS.forEach(st => {
  const mat = new THREE.MeshStandardMaterial({
    color: st.color, transparent: true, opacity: 0.15, depthWrite: false
  });

  // Two vertical posts
  [-1.1, 1.1].forEach(pz => {
    const post = mkBox(0.07, 2.1, 0.07, mat.clone());
    post.position.set(st.x, 0.97, pz);
    scene.add(post);
  });
  // Top crossbar
  const bar = mkBox(0.07, 0.07, 2.25, mat.clone());
  bar.position.set(st.x, 1.97, 0);
  scene.add(bar);

  // Floor zone pad
  const padMat = new THREE.MeshStandardMaterial({
    color: st.color, transparent: true, opacity: 0.5, depthWrite: false
  });
  const pad = mkBox(2.85, 0.03, 2.65, padMat);
  pad.position.set(st.x, -0.595, 0);
  scene.add(pad);
  // Edges
  const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.85, 0.03, 2.65));
  const edgesMat = new THREE.LineBasicMaterial({ color: st.color, transparent: true, opacity: 0.7 });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  edges.position.set(st.x, -0.595, 0);
  scene.add(edges);

  // RFID antennas
  const antMat = mkMat(0xEF9F27, { emissive: 0x241400, emissiveIntensity: 0.4 });
  [-0.78, 0.78].forEach(az => {
    const post = mkBox(0.09, 0.4, 0.09, antMat.clone());
    post.position.set(st.x, 1.55, az);
    scene.add(post);
    const discGeo = new THREE.CylinderGeometry(0.17, 0.12, 0.04, 8);
    const disc = new THREE.Mesh(discGeo, antMat.clone());
    disc.position.set(st.x, 1.77, az);
    scene.add(disc);
  });

  // Station label (floating text plane)
  lctx.clearRect(0, 0, 256, 64);
  lctx.fillStyle = `#${st.color.toString(16).padStart(6,'0')}cc`;
  lctx.fillRect(0, 0, 256, 64);
  lctx.fillStyle = '#ffffff';
  lctx.font = 'bold 20px Segoe UI';
  lctx.textAlign = 'center';
  lctx.fillText(st.id, 128, 22);
  lctx.font = '14px Segoe UI';
  lctx.fillStyle = '#e0e8ff';
  const words = st.name.split(' ');
  if (words.length <= 2) {
    lctx.fillText(st.name, 128, 44);
  } else {
    lctx.fillText(words.slice(0,2).join(' '), 128, 40);
    lctx.fillText(words.slice(2).join(' '), 128, 56);
  }
  const tex = new THREE.CanvasTexture(labelCanvas);
  const labelGeo = new THREE.PlaneGeometry(1.4, 0.35);
  const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.set(st.x, 2.35, 0);
  label.rotation.x = -0.2;
  scene.add(label);
});

// ─── FIXTURES ────────────────────────────────────────────────────────────────
const TOTAL_FIXTURES = 20;
const FAIL_INDICES = [3, 11]; // FX-004, FX-012 (0-based)
const STATION_X = STATIONS.map(s => s.x);
const OP6_IDX = 6;
const SPAWN_INTERVAL = 4.2;  // seconds
const DWELL = 2.8;           // seconds per station at 1x
const TRAVEL_SPD = 3.0;      // units/sec
const STOP_DUR = 8.0;        // seconds sim time for line stop

let fixtures = [];
let nextSpawnIdx = 0;
let spawnTimer = 0;
let simTime = 6 * 3600; // 06:00:00
let simElapsed = 0;
let lineRunning = true;
let paused = false;
let speed = 1.0;
let orderDone = false;

// KPI state
let kpiCompleted = 0;
let kpiFails = 0;
let kpiStops = 0;
let downtimeSec = 0;
let stopStartTime = null;
let stopTimes = [];

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function fmtDur(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function logEvent(cls, msg) {
  const log = document.getElementById('event-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${fmtTime(simTime)}</span><span class="${cls}">${msg}</span>`;
  log.insertBefore(entry, log.firstChild);
  if (log.children.length > 80) log.removeChild(log.lastChild);
}

// Pulse ring for fail
function makePulseRing(color) {
  const geo = new THREE.RingGeometry(0.48, 0.62, 16);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  return ring;
}

class Fixture {
  constructor(idx) {
    this.idx = idx;
    this.id = `FX-${String(idx + 1).padStart(3, '0')}`;
    this.stationIdx = 0;
    this.state = 'traveling'; // traveling, dwelling, failing, retesting, done
    this.isFail = FAIL_INDICES.includes(idx);
    this.hasFailed = false;
    this.retested = false;

    // Start position: just before OP1a
    this.x = STATION_X[0] - 4;
    this.targetX = STATION_X[0];

    // Three.js mesh
    const geo = new THREE.BoxGeometry(1.65, 0.20, 0.82);
    this.mat = new THREE.MeshStandardMaterial({
      color: 0x1D9E75, emissive: 0x0a2a1a, emissiveIntensity: 0.35,
      roughness: 0.5, metalness: 0.2
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    this.mesh.position.set(this.x, 0.18, 0);
    scene.add(this.mesh);

    this.pulseRing = null;
    this.dwellTimer = 0;
    this.stopTimer = 0;

    logEvent('log-info', `${this.id} entered line at OP1a`);
  }

  setColor(state) {
    if (state === 'ok') {
      this.mat.color.setHex(0x1D9E75);
      this.mat.emissive.setHex(0x0a2a1a);
      this.mat.emissiveIntensity = 0.35;
    } else if (state === 'fail') {
      this.mat.color.setHex(0xE24B4A);
      this.mat.emissive.setHex(0x380000);
      this.mat.emissiveIntensity = 0.55;
    } else if (state === 'retest') {
      this.mat.color.setHex(0xEF9F27);
      this.mat.emissive.setHex(0x281600);
      this.mat.emissiveIntensity = 0.40;
    }
  }

  addPulse(color) {
    if (this.pulseRing) this.mesh.remove(this.pulseRing);
    this.pulseRing = makePulseRing(color);
    this.mesh.add(this.pulseRing);
  }

  removePulse() {
    if (this.pulseRing) { this.mesh.remove(this.pulseRing); this.pulseRing = null; }
  }

  update(dt) {
    if (this.state === 'done') return;

    // Animate pulse ring
    if (this.pulseRing) {
      this.pulseRing.material.opacity = 0.4 + 0.4 * Math.sin(Date.now() * 0.005);
      this.pulseRing.scale.setScalar(1 + 0.15 * Math.sin(Date.now() * 0.004));
    }

    if (this.state === 'traveling') {
      const dx = this.targetX - this.x;
      const step = TRAVEL_SPD * speed * dt;
      if (Math.abs(dx) <= step) {
        this.x = this.targetX;
        this.state = 'dwelling';
        this.dwellTimer = 0;
        logEvent('log-ok', `${this.id} → ${STATIONS[this.stationIdx].id}`);
      } else {
        this.x += Math.sign(dx) * step;
      }
      this.mesh.position.x = this.x;

    } else if (this.state === 'dwelling') {
      const dwellTime = (this.stationIdx === OP6_IDX && this.hasFailed && !this.retested)
        ? DWELL * 1.7 : DWELL;
      this.dwellTimer += dt * speed;

      if (this.dwellTimer >= dwellTime) {
        // At OP6, first pass, this fixture fails
        if (this.stationIdx === OP6_IDX && this.isFail && !this.hasFailed && !this.retested) {
          this.state = 'failing';
          this.stopTimer = 0;
          this.hasFailed = true;
          kpiFails++;
          kpiStops++;
          if (!lineRunning) {} // already stopped
          lineRunning = false;
          stopStartTime = simElapsed;
          stopTimes.push(simElapsed);
          this.setColor('fail');
          this.addPulse(0xe24b4a);
          logEvent('log-fail', `⚠ ${this.id} FAIL at OP6 — electrical short detected`);
          logEvent('log-stop', `LINE STOP — quality hold`);
          updateKPIs();
          return;
        }
        // Move to next station
        this.advance();
      }

    } else if (this.state === 'failing') {
      this.stopTimer += dt * speed;
      if (this.stopTimer >= STOP_DUR) {
        // Begin retest
        this.state = 'retesting';
        this.dwellTimer = 0;
        this.removePulse();
        this.setColor('retest');
        this.addPulse(0xef9f27);
        logEvent('log-stop', `${this.id} retest in progress…`);
        lineRunning = true;
        if (stopStartTime !== null) {
          downtimeSec += simElapsed - stopStartTime;
          stopStartTime = null;
        }
        logEvent('log-resume', `LINE RESUME`);
        updateKPIs();
      }

    } else if (this.state === 'retesting') {
      this.dwellTimer += dt * speed;
      if (this.dwellTimer >= DWELL) {
        this.retested = true;
        this.removePulse();
        this.setColor('ok');
        logEvent('log-ok', `${this.id} RETEST PASS — cleared`);
        this.advance();
      }
    }
  }

  advance() {
    if (this.stationIdx >= STATIONS.length - 1) {
      // Done
      this.state = 'done';
      kpiCompleted++;
      logEvent('log-complete', `★ ${this.id} completed & palletized`);
      scene.remove(this.mesh);
      updateKPIs();
      if (kpiCompleted >= TOTAL_FIXTURES) {
        orderDone = true;
        lineRunning = false;
        document.getElementById('status-badge').textContent = 'ORDER DONE';
        document.getElementById('status-badge').className = 'status-done';
        logEvent('log-complete', `✔ Order complete — 20 fixtures done`);
      }
      return;
    }
    this.stationIdx++;
    this.targetX = STATION_X[this.stationIdx];
    this.state = 'traveling';
  }

  destroy() {
    scene.remove(this.mesh);
  }
}

// ─── KPI UPDATE ──────────────────────────────────────────────────────────────
function updateKPIs() {
  const online = fixtures.filter(f => f.state !== 'done').length;
  document.getElementById('kpi-completed').textContent = kpiCompleted;
  document.getElementById('kpi-online').textContent = online;
  document.getElementById('kpi-fails').textContent = kpiFails;
  document.getElementById('kpi-stops').textContent = kpiStops;
  document.getElementById('kpi-downtime').textContent = fmtDur(downtimeSec);

  const shiftDur = Math.max(simElapsed, 1);
  const oee = Math.max(0, ((1 - downtimeSec / shiftDur) * 100)).toFixed(1);
  document.getElementById('kpi-oee').textContent = oee + '%';

  if (kpiStops > 0 && simElapsed > 0) {
    const mtbs = (simElapsed / kpiStops / 60).toFixed(1);
    document.getElementById('kpi-mtbs').textContent = mtbs + 'min';
  }

  const badge = document.getElementById('status-badge');
  if (!orderDone) {
    if (lineRunning) {
      badge.textContent = 'RUNNING';
      badge.className = 'status-badge status-running';
    } else {
      badge.textContent = 'STOPPED';
      badge.className = 'status-badge status-stopped';
    }
  }
}

// ─── CAMERA / ORBIT ──────────────────────────────────────────────────────────
let camTheta = 0.0;
let camPhi = 0.82;
let camDist = 32;
let camTarget = new THREE.Vector3(3, 0.5, 0);
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

function applyCamera() {
  camera.position.x = camTarget.x + camDist * Math.sin(camPhi) * Math.sin(camTheta);
  camera.position.y = camTarget.y + camDist * Math.cos(camPhi);
  camera.position.z = camTarget.z + camDist * Math.sin(camPhi) * Math.cos(camTheta);
  camera.lookAt(camTarget);
}

canvas.addEventListener('mousedown', e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  camTheta -= dx * 0.007;
  camPhi = Math.max(0.07, Math.min(1.4, camPhi + dy * 0.005));
  lastMouse = { x: e.clientX, y: e.clientY };
  applyCamera();
});
canvas.addEventListener('wheel', e => {
  camDist = Math.max(7, Math.min(60, camDist + e.deltaY * 0.04));
  applyCamera();
  e.preventDefault();
}, { passive: false });

// Touch support
let lastTouch = null;
canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && lastTouch) {
    const dx = e.touches[0].clientX - lastTouch.x;
    const dy = e.touches[0].clientY - lastTouch.y;
    camTheta -= dx * 0.007;
    camPhi = Math.max(0.07, Math.min(1.4, camPhi + dy * 0.005));
    lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    applyCamera();
  }
}, { passive: true });

applyCamera();

// ─── CONTROLS ────────────────────────────────────────────────────────────────
document.getElementById('btn-pause').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('btn-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
  document.getElementById('btn-pause').classList.toggle('active', paused);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  fixtures.forEach(f => f.destroy());
  fixtures = [];
  nextSpawnIdx = 0;
  spawnTimer = 0;
  simTime = 6 * 3600;
  simElapsed = 0;
  lineRunning = true;
  orderDone = false;
  paused = false;
  kpiCompleted = 0;
  kpiFails = 0;
  kpiStops = 0;
  downtimeSec = 0;
  stopStartTime = null;
  stopTimes = [];
  document.getElementById('btn-pause').textContent = '⏸ Pause';
  document.getElementById('btn-pause').classList.remove('active');
  document.getElementById('event-log').innerHTML = '';
  updateKPIs();
  logEvent('log-info', 'Simulation reset — order started');
});

document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    speed = parseFloat(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ─── ANIMATION LOOP ──────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 0.05); // cap delta

  if (!paused && !orderDone) {
    simElapsed += dt * speed;
    simTime += dt * speed;

    // Spawn next fixture
    if (nextSpawnIdx < TOTAL_FIXTURES && lineRunning) {
      spawnTimer += dt * speed;
      if (spawnTimer >= SPAWN_INTERVAL || nextSpawnIdx === 0) {
        if (nextSpawnIdx > 0) spawnTimer -= SPAWN_INTERVAL;
        else spawnTimer = 0;
        fixtures.push(new Fixture(nextSpawnIdx));
        nextSpawnIdx++;
        updateKPIs();
      }
    }

    // Update fixtures
    fixtures.forEach(f => {
      if (lineRunning || f.state === 'failing' || f.state === 'retesting') {
        f.update(dt);
      }
    });

    // Accumulate downtime
    if (!lineRunning && stopStartTime !== null && !orderDone) {
      downtimeSec += dt * speed;
    }

    // Update KPIs periodically
    updateKPIs();
  }

  renderer.render(scene, camera);
}

// ─── RESIZE ──────────────────────────────────────────────────────────────────
function onResize() {
  const container = document.getElementById('canvas-container');
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

logEvent('log-info', 'Digital twin initialized');
logEvent('log-info', 'Order: 20 fixtures — FX-004 & FX-012 pre-designated FAIL');
animate();

}); // end window.load
