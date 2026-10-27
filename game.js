import * as THREE from './vendor/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b14);
scene.fog = new THREE.Fog(0x050b14, 17, 48);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);

const worldBounds = 14;
const magazineSize = 12;
const keys = {};
const destructibles = [];
const pulseEffects = [];
const drones = [];

let yaw = 0;
let pitch = 0;
let moveSpeed = 6.5;
const sprintBoost = 1.55;
let fireCooldown = 0;
let gamePhase = 'menu';
let pointerLocked = false;
let ammo = magazineSize;
let health = 100;
let destroyedBlocks = 0;
let reloadTimer = 0;
let messageTimer = 0;
let recoil = 0;

const messageEl = document.getElementById('message');
const startOverlay = document.getElementById('startOverlay');
const startButton = document.getElementById('startButton');
const ammoValue = document.getElementById('ammoValue');
const blockCount = document.getElementById('blockCount');
const droneCount = document.getElementById('droneCount');
const healthValue = document.getElementById('healthValue');
const healthFill = document.getElementById('healthFill');
const overlayTitle = document.getElementById('overlayTitle');
const overlayDescription = document.getElementById('overlayDescription');
const touchControls = document.getElementById('touchControls');
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const fireButton = document.getElementById('fireButton');
const sprintButton = document.getElementById('sprintButton');
const reloadButton = document.getElementById('reloadButton');
const pauseButton = document.getElementById('pauseButton');
const controlsToggle = document.getElementById('controlsToggle');
const controlsSidebar = document.getElementById('controlsSidebar');
const closeControls = document.getElementById('closeControls');
const screenControlsToggle = document.getElementById('screenControlsToggle');

const joystickInput = new THREE.Vector2();
let screenControlsEnabled = window.matchMedia('(pointer: coarse)').matches;
let joystickPointerId = null;
let lookPointerId = null;
let lookLastX = 0;
let lookLastY = 0;
let touchSprinting = false;
let fireHeld = false;

const ambientLight = new THREE.HemisphereLight(0x80d7ff, 0x0d1120, 1.3);
scene.add(ambientLight);

const spotLight = new THREE.PointLight(0x8bf7ff, 16, 50, 2.5);
spotLight.position.set(0, 8, 0);
scene.add(spotLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(52, 52),
  new THREE.MeshStandardMaterial({
    color: 0x101827,
    emissive: 0x0a1d2a,
    metalness: 0.4,
    roughness: 0.82
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const grid = new THREE.GridHelper(52, 52, 0x60f3ff, 0x2d3b4a);
grid.position.y = 0.012;
scene.add(grid);

const neonRing = new THREE.Mesh(
  new THREE.TorusGeometry(10, 0.12, 12, 96),
  new THREE.MeshStandardMaterial({
    color: 0xb66cff,
    emissive: 0x3a1d7e,
    metalness: 0.7,
    roughness: 0.25
  })
);
neonRing.rotation.x = Math.PI / 2;
neonRing.position.y = 0.06;
scene.add(neonRing);

const weapon = new THREE.Group();
const weaponBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.2, 0.52),
  new THREE.MeshStandardMaterial({ color: 0x202c40, metalness: 0.8, roughness: 0.3 })
);
weaponBody.position.set(0.36, -0.31, -0.58);
weapon.add(weaponBody);
const weaponBarrel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.045, 0.055, 0.3, 10),
  new THREE.MeshStandardMaterial({ color: 0x60f3ff, emissive: 0x1b8191, metalness: 0.75, roughness: 0.25 })
);
weaponBarrel.rotation.x = Math.PI / 2;
weaponBarrel.position.set(0.36, -0.27, -0.9);
weapon.add(weaponBarrel);
const weaponGrip = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.24, 0.12),
  new THREE.MeshStandardMaterial({ color: 0xb66cff, emissive: 0x32154a, metalness: 0.5, roughness: 0.4 })
);
weaponGrip.position.set(0.35, -0.48, -0.48);
weapon.add(weaponGrip);
const muzzleFlash = new THREE.Mesh(
  new THREE.SphereGeometry(0.075, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0xffda79 })
);
muzzleFlash.position.set(0.36, -0.27, -1.08);
muzzleFlash.visible = false;
weapon.add(muzzleFlash);
weapon.userData.baseZ = 0;
camera.add(weapon);

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function createBlock(x, y, z, color = 0x65f2ff) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.3,
    metalness: 0.3,
    roughness: 0.5
  });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.breakable = true;
  scene.add(mesh);
  destructibles.push(mesh);
  return mesh;
}

function createDrone(x, z) {
  const drone = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({
      color: 0xff5e7a,
      emissive: 0x7b1a2b,
      metalness: 0.6,
      roughness: 0.5,
      emissiveIntensity: 0.8
    })
  );
  drone.position.set(x, 1.2, z);
  drone.userData.enemy = true;
  drone.userData.offset = Math.random() * Math.PI * 2;
  drone.userData.speed = randomRange(1.2, 2.1);
  drone.userData.health = 2;
  scene.add(drone);
  drones.push(drone);
  return drone;
}

function buildArena() {
  for (let x = -7; x <= 7; x += 1) {
    for (let z = -7; z <= 7; z += 1) {
      if (Math.abs(x) < 2 && z > 1) continue;
      const chance = Math.random();
      if (chance > 0.79) {
        createBlock(x, 0.5, z, chance > 0.85 ? 0xb66cff : 0x65f2ff);
      }
    }
  }

  for (let y = 0; y < 3; y += 1) {
    for (let x = -6; x <= 6; x += 2) {
      const z = y % 2 === 0 ? -8 : 8;
      if (Math.random() > 0.35) {
        createBlock(x, y + 1, z, y % 2 === 0 ? 0x7ef2ff : 0xffd36b);
      }
    }
  }

  createBlock(0, 1.5, -2, 0x5be7ff);
  createBlock(2, 0.5, -3, 0xb66cff);
  createBlock(-3, 0.5, -2, 0xffd36b);
  createBlock(3, 1.5, 1, 0x67f7b7);

  createDrone(4, -3);
  createDrone(-5, -4);
  createDrone(0, -7);

  const skylineMaterial = new THREE.MeshStandardMaterial({
    color: 0x11192b,
    emissive: 0x10152d,
    emissiveIntensity: 0.7,
    metalness: 0.45,
    roughness: 0.7
  });
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x60f3ff });
  for (let x = -18; x <= 18; x += 4) {
    const height = randomRange(6, 12);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(randomRange(2.5, 4), height, 2.5),
      skylineMaterial
    );
    tower.position.set(x, height / 2 - 0.2, -17);
    scene.add(tower);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.09, randomRange(1.2, 3), 0.08), windowMaterial);
    sign.position.set(x + 0.65, randomRange(2, height - 1), -15.7);
    scene.add(sign);
  }
}

function updateHud() {
  ammoValue.textContent = String(ammo);
  blockCount.textContent = String(destroyedBlocks);
  droneCount.textContent = String(drones.length);
  healthValue.textContent = String(Math.ceil(health));
  healthFill.style.width = `${health}%`;
  healthFill.style.background = health <= 30
    ? 'linear-gradient(90deg, #ff3f63, #ff7b5e)'
    : 'linear-gradient(90deg, #ff5e7a, #ffda79)';
}

function showMessage(text, duration = 1800) {
  messageEl.textContent = text;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    if (gamePhase === 'playing') messageEl.textContent = '战区已接入';
  }, duration);
}

function showOverlay(title, description, buttonText) {
  overlayTitle.textContent = title;
  overlayDescription.textContent = description;
  startButton.textContent = buttonText;
  startOverlay.classList.add('visible');
}

function toggleControlsSidebar(forceOpen) {
  const isOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : !controlsSidebar.classList.contains('open');
  controlsSidebar.classList.toggle('open', isOpen);
  controlsSidebar.setAttribute('aria-hidden', String(!isOpen));
  controlsToggle.setAttribute('aria-expanded', String(isOpen));
  if (isOpen && pointerLocked) document.exitPointerLock();
}

function setScreenControlsEnabled(enabled) {
  screenControlsEnabled = enabled;
  document.body.classList.toggle('screen-controls-enabled', enabled);
  screenControlsToggle.setAttribute('aria-pressed', String(enabled));
  screenControlsToggle.innerHTML = `屏幕控制：${enabled ? '开启' : '关闭'} <kbd>T</kbd>`;
}

function toggleScreenControls() {
  setScreenControlsEnabled(!screenControlsEnabled);
}

function finishMission(won) {
  gamePhase = won ? 'won' : 'lost';
  document.exitPointerLock();
  showOverlay(
    won ? 'Mission Complete' : 'Signal Lost',
    won
      ? `无人机已全部清除，累计击碎 ${destroyedBlocks} 个街区方块。`
      : `装甲归零。本次击碎 ${destroyedBlocks} 个方块，还剩 ${drones.length} 架无人机。`,
    '重新开始'
  );
  showMessage(won ? '任务完成' : '任务失败');
}

function damagePlayer(amount) {
  if (gamePhase !== 'playing') return;
  health = Math.max(0, health - amount);
  updateHud();
  const flash = document.getElementById('screenFlash');
  flash.classList.add('active');
  window.setTimeout(() => flash.classList.remove('active'), 150);
  if ('vibrate' in navigator) navigator.vibrate([25, 30, 25]);
  playTone(110, 0.16, 'triangle', 0.04);
  showMessage('受到攻击！拉开距离', 1200);
  if (health <= 0) finishMission(false);
}

function initAudio() {
  if (!window.audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) window.audioCtx = new AudioContextClass();
  }
  if (window.audioCtx && window.audioCtx.state === 'suspended') window.audioCtx.resume();
}

function playTone(freq, duration = 0.08, type = 'sawtooth', gainValue = 0.04) {
  const ctx = window.audioCtx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  setTimeout(() => {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }, 0);
}

function triggerImpact(position, color = 0x60f3ff) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), material);
  sphere.position.copy(position);
  scene.add(sphere);
  pulseEffects.push({ mesh: sphere, life: 0.35, maxLife: 0.35, color });

  const sparkCount = 12;
  for (let i = 0; i < sparkCount; i += 1) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).offsetHSL(0.05, 0.2, 0.2) })
    );
    spark.position.copy(position);
    const velocity = new THREE.Vector3(
      randomRange(-1.8, 1.8),
      randomRange(-1.4, 1.4),
      randomRange(-1.8, 1.8)
    );
    spark.userData.velocity = velocity;
    spark.userData.life = 0.7;
    scene.add(spark);
    pulseEffects.push({ mesh: spark, life: 0.7, maxLife: 0.7, velocity });
  }
}

function startReload() {
  if (gamePhase !== 'playing' || ammo === magazineSize || reloadTimer > 0) return;
  reloadTimer = 0.9;
  showMessage('换弹中…', 950);
  playTone(420, 0.06, 'triangle', 0.025);
}

function shoot() {
  if (gamePhase !== 'playing' || fireCooldown > 0 || reloadTimer > 0) return;
  if (ammo <= 0) {
    startReload();
    return;
  }

  ammo -= 1;
  updateHud();
  fireCooldown = 0.14;
  initAudio();
  playTone(220, 0.08, 'square', 0.03);
  playTone(90, 0.1, 'triangle', 0.025);
  recoil = 0.045;
  muzzleFlash.visible = true;
  window.setTimeout(() => { muzzleFlash.visible = false; }, 55);

  if ('vibrate' in navigator) navigator.vibrate(12);

  raycaster.setFromCamera(pointer, camera);
  const targetList = destructibles.concat(drones);
  const hits = raycaster.intersectObjects(targetList, false);

  if (hits.length > 0) {
    const hit = hits[0];
    const mesh = hit.object;
    const point = hit.point.clone();
    const isDrone = mesh.userData.enemy === true;

    if (isDrone) {
      mesh.userData.health -= 1;
      triggerImpact(point, 0xff5e7a);
      if (mesh.userData.health <= 0) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        const idx = drones.indexOf(mesh);
        if (idx >= 0) drones.splice(idx, 1);
        updateHud();
        showMessage(`目标清除 · 剩余 ${drones.length} 架`);
        playTone(620, 0.12, 'sawtooth', 0.06);
        if (drones.length === 0) finishMission(true);
      } else {
        showMessage('无人机受损');
      }
    } else {
      const index = destructibles.indexOf(mesh);
      if (index >= 0) {
        destructibles.splice(index, 1);
      }
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      destroyedBlocks += 1;
      updateHud();
      triggerImpact(point, 0x65f2ff);
      showMessage('方块粉碎');
      playTone(360, 0.08, 'square', 0.05);
      playTone(140, 0.15, 'triangle', 0.035);
    }
  } else {
    triggerImpact(camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3)), 0xdceaf7);
    showMessage('未命中');
  }
}

function canOccupy(x, z) {
  return !destructibles.some((block) => {
    if (block.position.y - 0.5 > 1.7 || block.position.y + 0.5 < 0) return false;
    const dx = Math.max(Math.abs(x - block.position.x) - 0.5, 0);
    const dz = Math.max(Math.abs(z - block.position.z) - 0.5, 0);
    return dx * dx + dz * dz < 0.32 * 0.32;
  });
}

function updatePlayer(delta) {
  const speed = moveSpeed * (keys.ShiftLeft || keys.ShiftRight || touchSprinting ? sprintBoost : 1);
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const moveVector = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) moveVector.add(forward);
  if (keys.KeyS || keys.ArrowDown) moveVector.sub(forward);
  if (keys.KeyA || keys.ArrowLeft) moveVector.sub(right);
  if (keys.KeyD || keys.ArrowRight) moveVector.add(right);
  moveVector.addScaledVector(right, joystickInput.x);
  moveVector.addScaledVector(forward, -joystickInput.y);

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize().multiplyScalar(speed * delta);
    const nextX = THREE.MathUtils.clamp(camera.position.x + moveVector.x, -worldBounds + 1.3, worldBounds - 1.3);
    const nextZ = THREE.MathUtils.clamp(camera.position.z + moveVector.z, -worldBounds + 1.3, worldBounds - 1.3);
    if (canOccupy(nextX, camera.position.z)) camera.position.x = nextX;
    if (canOccupy(camera.position.x, nextZ)) camera.position.z = nextZ;
    camera.position.y = 1.7;
  }
}

function animateDrones(delta) {
  drones.forEach((drone) => {
    const angle = performance.now() * 0.001 * drone.userData.speed + drone.userData.offset;
    const toPlayer = camera.position.clone().sub(drone.position);
    const distance = toPlayer.length();
    if (distance > 2.2) {
      drone.position.addScaledVector(toPlayer.normalize(), delta * 0.55);
    }
    drone.position.x += Math.sin(angle) * delta * 0.3;
    drone.position.z += Math.cos(angle) * delta * 0.3;
    drone.position.y = 1.2 + Math.sin(angle * 2.5) * 0.25;
    drone.rotation.x += delta * 1.8;
    drone.rotation.y += delta * 2.4;

    if (distance < 1.65 && !drone.userData.hitCooldown) {
      drone.userData.hitCooldown = 0.9;
      damagePlayer(12);
    }

    if (drone.userData.hitCooldown) {
      drone.userData.hitCooldown -= delta;
      if (drone.userData.hitCooldown < 0) drone.userData.hitCooldown = 0;
    }

    if (drone.position.x > worldBounds - 1.2 || drone.position.x < -worldBounds + 1.2) {
      drone.position.x = THREE.MathUtils.clamp(drone.position.x, -worldBounds + 1.2, worldBounds - 1.2);
    }
    if (drone.position.z > worldBounds - 1.2 || drone.position.z < -worldBounds + 1.2) {
      drone.position.z = THREE.MathUtils.clamp(drone.position.z, -worldBounds + 1.2, worldBounds - 1.2);
    }
  });
}

function animatePulse(delta) {
  for (let i = pulseEffects.length - 1; i >= 0; i -= 1) {
    const effect = pulseEffects[i];
    effect.life -= delta;
    if (effect.mesh.material && effect.mesh.material.opacity !== undefined) {
      effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
    }
    if (effect.velocity) {
      effect.mesh.position.addScaledVector(effect.velocity, delta);
      effect.velocity.multiplyScalar(0.95);
    }
    if (effect.mesh.scale) {
      effect.mesh.scale.multiplyScalar(1 + delta * 2.6);
    }
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      pulseEffects.splice(i, 1);
    }
  }
}

function onPointerMove(event) {
  if (!pointerLocked) return;
  applyLookDelta(event.movementX, event.movementY);
}

function applyLookDelta(deltaX, deltaY) {
  yaw -= deltaX * 0.0018;
  pitch -= deltaY * 0.0014;
  pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function onMouseDown(event) {
  if (event.button !== 0) return;
  if (event.target !== renderer.domElement) return;
  if (!pointerLocked) return;
  fireHeld = true;
  shoot();
}

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxOffset = rect.width * 0.3;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy);
  if (length > maxOffset) {
    dx = (dx / length) * maxOffset;
    dy = (dy / length) * maxOffset;
  }
  joystickInput.set(dx / maxOffset, dy / maxOffset);
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function releaseJoystick() {
  joystickPointerId = null;
  joystickInput.set(0, 0);
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}

function setupTouchControls() {
  joystick.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    joystickPointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === joystickPointerId) updateJoystick(event);
  });
  joystick.addEventListener('pointerup', (event) => {
    if (event.pointerId === joystickPointerId) releaseJoystick();
  });
  joystick.addEventListener('pointercancel', releaseJoystick);

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || pointerLocked || gamePhase !== 'playing') return;
    event.preventDefault();
    lookPointerId = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointerId) return;
    applyLookDelta(event.clientX - lookLastX, event.clientY - lookLastY);
    lookLastX = event.clientX;
    lookLastY = event.clientY;
  });
  const endLook = (event) => {
    if (event.pointerId === lookPointerId) lookPointerId = null;
  };
  renderer.domElement.addEventListener('pointerup', endLook);
  renderer.domElement.addEventListener('pointercancel', endLook);

  fireButton.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    fireButton.setPointerCapture(event.pointerId);
    fireHeld = true;
    fireButton.classList.add('active');
    shoot();
  });
  const endFire = () => {
    fireHeld = false;
    fireButton.classList.remove('active');
  };
  fireButton.addEventListener('pointerup', endFire);
  fireButton.addEventListener('pointercancel', endFire);

  sprintButton.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    sprintButton.setPointerCapture(event.pointerId);
    touchSprinting = true;
    sprintButton.classList.add('active');
  });
  const endSprint = () => {
    touchSprinting = false;
    sprintButton.classList.remove('active');
  };
  sprintButton.addEventListener('pointerup', endSprint);
  sprintButton.addEventListener('pointercancel', endSprint);
  reloadButton.addEventListener('click', startReload);
  pauseButton.addEventListener('click', pauseGame);
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  if (pointerLocked) {
    gamePhase = 'playing';
    showMessage('战区已接入');
    startOverlay.classList.remove('visible');
  } else if (gamePhase === 'playing') {
    gamePhase = 'paused';
    fireHeld = false;
    showOverlay('任务暂停', '按下继续返回战区。离开浏览器标签页也会自动暂停。', '继续任务');
  }
}

function pauseGame() {
  if (gamePhase !== 'playing') return;
  fireHeld = false;
  gamePhase = 'paused';
  if (pointerLocked) document.exitPointerLock();
  showOverlay('任务暂停', '按下继续返回战区。离开浏览器标签页也会自动暂停。', '继续任务');
}

function setupKeyboard() {
  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'F1') {
      event.preventDefault();
      toggleControlsSidebar();
    }
    if (event.code === 'KeyT' && !event.repeat) toggleScreenControls();
    if (event.code === 'KeyR' && !event.repeat) startReload();
    if (event.code === 'Escape' && gamePhase === 'playing' && !pointerLocked) pauseGame();
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });
  window.addEventListener('blur', () => {
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    touchSprinting = false;
    fireHeld = false;
    releaseJoystick();
  });

  controlsToggle.addEventListener('click', () => toggleControlsSidebar());
  closeControls.addEventListener('click', () => toggleControlsSidebar(false));
  screenControlsToggle.addEventListener('click', toggleScreenControls);
  setScreenControlsEnabled(screenControlsEnabled);
}

function startGame() {
  if (gamePhase === 'won' || gamePhase === 'lost') {
    window.location.reload();
    return;
  }
  initAudio();
  if (window.matchMedia('(pointer: coarse)').matches) {
    gamePhase = 'playing';
    startOverlay.classList.remove('visible');
    showMessage('战区已接入');
    return;
  }
  if (!renderer.domElement.requestPointerLock) {
    gamePhase = 'playing';
    startOverlay.classList.remove('visible');
    showMessage('战区已接入');
    return;
  }
  const request = renderer.domElement.requestPointerLock();
  if (request && typeof request.catch === 'function') {
    request.catch(() => showMessage('鼠标锁定失败，请检查浏览器权限'));
  }
}

startButton.addEventListener('click', startGame);
document.addEventListener('mousemove', onPointerMove);
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', () => { fireHeld = false; });
document.addEventListener('pointerlockchange', onPointerLockChange);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setupKeyboard();
setupTouchControls();
buildArena();
updateHud();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);

  if (gamePhase === 'playing') {
    updatePlayer(delta);
    animateDrones(delta);
  }
  if (gamePhase === 'playing' && reloadTimer > 0) {
    reloadTimer = Math.max(0, reloadTimer - delta);
    if (reloadTimer === 0) {
      ammo = magazineSize;
      updateHud();
      showMessage('换弹完成');
      playTone(660, 0.07, 'triangle', 0.025);
    }
  }

  if (gamePhase === 'playing' && fireHeld) shoot();
  fireCooldown = Math.max(0, fireCooldown - delta);
  recoil = THREE.MathUtils.lerp(recoil, 0, Math.min(delta * 14, 1));
  weapon.position.z = recoil;
  animatePulse(delta);
  neonRing.rotation.z += delta * 0.5;

  renderer.render(scene, camera);
}

animate();
