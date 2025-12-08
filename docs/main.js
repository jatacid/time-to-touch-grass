// Initialize UI (from ui.js loaded before this script)
window.initUI();

// --- Configuration ---
const WORLD_RADIUS = 50;
const GRASS_COUNT = 200000;
const GRASS_WIDTH = 0.1;
const GRASS_HEIGHT = 1.5;
const PLAYER_HEIGHT = 1.7;
const MOVEMENT_SPEED = 10.0;
const INTERACTION_RADIUS = 5.0;

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 40, 90);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Player Setup ---
const playerGroup = new THREE.Group();
scene.add(playerGroup);
playerGroup.position.set(0, WORLD_RADIUS, 0);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, PLAYER_HEIGHT, 0);
playerGroup.add(camera);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// --- World (Sphere) ---
const groundGeometry = new THREE.SphereGeometry(WORLD_RADIUS, 64, 64);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2b4a2b,
    roughness: 1.0
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(ground);

// --- Grass (Spherical Distribution) ---
const grassVertexShader = `
  uniform float time;
  uniform float interactionRadius;
  uniform vec3 hand1Pos; 
  uniform float hand1Active;
  uniform vec3 hand2Pos; 
  uniform float hand2Active;
  
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vColor;
  
  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  float noise(vec2 st) {
      vec2 i = floor(st); vec2 f = fract(st);
      float a = random(i); float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vUv = uv;
    vHeight = position.y;
    vColor = instanceColor;
    
    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
    vec3 pos = worldPosition.xyz;
    
    vec3 normal = normalize(pos);
    
    float noiseVal = noise(pos.xz * 0.5 + time * 0.5); 
    vec3 tangent1 = cross(normal, vec3(0, 1, 0));
    if (length(tangent1) < 0.001) tangent1 = cross(normal, vec3(0, 0, 1));
    tangent1 = normalize(tangent1);
    vec3 tangent2 = cross(normal, tangent1);
    
    float windStrength = pow(vHeight / ${GRASS_HEIGHT.toFixed(1)}, 2.0) * 0.5;
    pos += tangent1 * sin(time * 2.0 + pos.x * 0.5) * windStrength * 0.5;
    pos += tangent2 * cos(time * 1.5 + pos.z * 0.5) * windStrength * 0.5;
    
    if (hand1Active > 0.5) {
        float dist = distance(pos, hand1Pos);
        if (dist < interactionRadius) {
            vec3 dir = normalize(pos - hand1Pos);
            float push = (1.0 - dist / interactionRadius) * 2.0;
            float pushFactor = pow(vHeight / ${GRASS_HEIGHT.toFixed(1)}, 2.0);
            pos += dir * push * pushFactor;
            pos -= normal * (push * pushFactor * 0.5); 
        }
    }
    
    if (hand2Active > 0.5) {
        float dist = distance(pos, hand2Pos);
        if (dist < interactionRadius) {
            vec3 dir = normalize(pos - hand2Pos);
            float push = (1.0 - dist / interactionRadius) * 2.0;
            float pushFactor = pow(vHeight / ${GRASS_HEIGHT.toFixed(1)}, 2.0);
            pos += dir * push * pushFactor;
            pos -= normal * (push * pushFactor * 0.5);
        }
    }

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const grassMaterial = new THREE.ShaderMaterial({
    vertexShader: grassVertexShader,
    fragmentShader: `
        varying vec3 vColor;
        void main() { gl_FragColor = vec4(vColor, 1.0); }
    `,
    uniforms: {
        time: { value: 0 },
        interactionRadius: { value: INTERACTION_RADIUS },
        hand1Pos: { value: new THREE.Vector3() },
        hand1Active: { value: 0.0 },
        hand2Pos: { value: new THREE.Vector3() },
        hand2Active: { value: 0.0 },
    },
    side: THREE.DoubleSide
});

const grassGeometry = new THREE.PlaneGeometry(GRASS_WIDTH, GRASS_HEIGHT, 1, 4);
grassGeometry.translate(0, GRASS_HEIGHT / 2, 0);

const grassMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, GRASS_COUNT);

const dummy = new THREE.Object3D();
const _position = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _color = new THREE.Color();

const color1 = new THREE.Color(0x2b4a2b);
const color2 = new THREE.Color(0x44aa00);
const color3 = new THREE.Color(0x88cc00);

for (let i = 0; i < GRASS_COUNT; i++) {
    _normal.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    _position.copy(_normal).multiplyScalar(WORLD_RADIUS);
    _quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _normal);
    
    dummy.position.copy(_position);
    dummy.quaternion.copy(_quaternion);
    dummy.rotateY(Math.random() * Math.PI * 2);
    dummy.scale.setScalar(0.5 + Math.random() * 0.5);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
    
    const r = Math.random();
    if (r < 0.33) _color.copy(color1).lerp(color2, Math.random());
    else if (r < 0.66) _color.copy(color2).lerp(color3, Math.random());
    else _color.copy(color3).lerp(color1, Math.random());
    
    grassMesh.setColorAt(i, _color);
}
scene.add(grassMesh);

// --- 3D Clouds ---
const cloudCount = 50;
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

const cloudGeo = new THREE.SphereGeometry(1, 8, 8);
const cloudMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.6,
    flatShading: true 
});

for (let i = 0; i < cloudCount; i++) {
    const cluster = new THREE.Group();
    const altitude = WORLD_RADIUS + 20 + Math.random() * 15;
    const pos = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(altitude);
    cluster.position.copy(pos);
    cluster.lookAt(0, 0, 0);
    
    const blobs = 3 + Math.floor(Math.random() * 5);
    for (let j = 0; j < blobs; j++) {
        const mesh = new THREE.Mesh(cloudGeo, cloudMat);
        mesh.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 10
        );
        mesh.scale.setScalar(2 + Math.random() * 3);
        cluster.add(mesh);
    }
    cloudGroup.add(cluster);
}

// --- Procedural Environment (Trees & Buildings) ---
const treeCount = 50; 
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 1.5, 6);
trunkGeo.translate(0, 0.75, 0); 
const foliageGeo = new THREE.ConeGeometry(1.5, 3, 6);
foliageGeo.translate(0, 1.5 + 1.5, 0); 
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 });
const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
const treeData = []; // Store tree state (position, active)

const _dummyObj = new THREE.Object3D();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();

for (let i = 0; i < treeCount; i++) {
    _n.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    _p.copy(_n).multiplyScalar(WORLD_RADIUS);
    _q.setFromUnitVectors(new THREE.Vector3(0,1,0), _n);
    
    _dummyObj.position.copy(_p);
    _dummyObj.quaternion.copy(_q);
    _dummyObj.scale.setScalar(0.8 + Math.random() * 0.4);
    _dummyObj.updateMatrix();
    
    trunkMesh.setMatrixAt(i, _dummyObj.matrix);
    foliageMesh.setMatrixAt(i, _dummyObj.matrix);
    
    treeData.push({
        index: i,
        position: _p.clone(),
        active: true
    });
}
scene.add(trunkMesh);
scene.add(foliageMesh);

// --- Procedural Environment (Cottages) ---
const cottages = [];
const spawnedTrees = [];
let destroyedHousesCount = 0;

function destroySpawnedTree(index) {
    if (index < 0 || index >= spawnedTrees.length) return;
    const treeGroup = spawnedTrees[index];
    
    // Calculate position for mushroom spawn before removing
    const pos = treeGroup.position.clone();
    
    // Remove from scene and array
    scene.remove(treeGroup);
    spawnedTrees.splice(index, 1);
    
    // Spawn 5 mushrooms with explosion physics (logic copied from destroyTree)
    for (let k = 0; k < 5; k++) {
        // Spawn slightly above base
        const spawnPos = pos.clone().add(new THREE.Vector3(0, 0, 0)); // Start at base
        spawnPos.y += 1.0;
        
        const localUp = new THREE.Vector3(0, 1, 0);
        
        // Small random spread (approx 1m radius)
        const randDir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        const spread = Math.random() * 1.5; 
        
        // Initial upward velocity + some spread
        const velocity = localUp.clone().multiplyScalar(2 + Math.random() * 3); // Up 2-5
        velocity.add(randDir.multiplyScalar(spread)); // Outward spread

        const spawnQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), localUp);
        
        createMushroom(spawnPos, spawnQuat, velocity);
    }
}

function destroyTree(index) {
    if (index < 0 || index >= treeData.length) return;
    const tree = treeData[index];
    if (!tree.active) return;
    
    tree.active = false;
    
    // Hide the tree by scaling it to zero
    const dummy = new THREE.Object3D();
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    
    trunkMesh.setMatrixAt(index, dummy.matrix);
    foliageMesh.setMatrixAt(index, dummy.matrix);
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
    
    // Spawn 5 mushrooms with explosion physics
    for (let k = 0; k < 5; k++) {
        // Spawn slightly above the tree's base
        const spawnPos = tree.position.clone().normalize().multiplyScalar(WORLD_RADIUS + 1.0);
        
        // Simpler falling physics (drop near base)
        const localUp = tree.position.clone().normalize();
        
        // Small random spread (approx 1m radius)
        const randDir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        const spread = Math.random() * 1.5; 
        
        // Initial upward velocity + some spread
        const velocity = localUp.clone().multiplyScalar(2 + Math.random() * 3); // Up 2-5
        velocity.add(randDir.multiplyScalar(spread)); // Outward spread

        const spawnQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), localUp);
        
        createMushroom(spawnPos, spawnQuat, velocity);
    }
}

function destroyCottage(index) {
    if (index < 0 || index >= cottages.length) return;
    
    const cottageGroup = cottages[index];
    const center = cottageGroup.position.clone();
    const quat = cottageGroup.quaternion.clone();
    
    scene.remove(cottageGroup);
    cottages.splice(index, 1);
    
    // Spawn trees in place of the house
    for (let k = 0; k < 15; k++) {
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8
        );
        offset.applyQuaternion(quat);
        const spawnPos = center.clone().add(offset);
        spawnPos.normalize().multiplyScalar(WORLD_RADIUS);
        const spawnQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0), spawnPos.clone().normalize()
        );
        spawnTreeAt(spawnPos, spawnQuat);
    }

    destroyedHousesCount++;
    
    // Unlock Achievements
    window.unlockAchievement(`house_${destroyedHousesCount}`);
    
    if (destroyedHousesCount === 5) {
        window.unlockAchievement('anti_establishment');
    }
}

function createCottage(pos, quat) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.quaternion.copy(quat);

    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0xC2B280, roughness: 0.9 }) 
    );
    walls.position.y = 1.5;
    group.add(walls);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 2, 4),
        new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.6 }) 
    );
    roof.position.y = 3 + 1; 
    roof.rotation.y = Math.PI / 4; 
    group.add(roof);

    const door = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x4A3C31 })
    );
    door.position.set(0, 1, 2.05); 
    door.name = "cottage_door";
    group.add(door);
    
    scene.add(group);
    cottages.push(group);
}

for (let i = 0; i < 5; i++) {
    _n.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    _p.copy(_n).multiplyScalar(WORLD_RADIUS);
    _q.setFromUnitVectors(new THREE.Vector3(0,1,0), _n);
    createCottage(_p, _q);
}

function spawnTreeAt(position, quaternion) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.quaternion.copy(quaternion);
    
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.setScalar(0);
    
    group.add(trunk);
    group.add(foliage);
    scene.add(group);
    spawnedTrees.push(group);
    
    let s = 0;
    const animatePop = () => {
        s += 0.05;
        if (s < scale) {
            group.scale.setScalar(s);
            requestAnimationFrame(animatePop);
        } else {
            group.scale.setScalar(scale);
        }
    };
    animatePop();
}

// --- Mushrooms ---
const mushrooms = [];
const mushroomGroup = new THREE.Group();
scene.add(mushroomGroup);

function createMushroom(pos, quat) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.quaternion.copy(quat);

    // Stem
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.8 })
    );
    stem.position.y = 0.2;
    group.add(stem);

    // Cap
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xFF0000, roughness: 0.5 })
    );
    cap.position.y = 0.4;
    // Add white spots to cap
    const spotGeo = new THREE.CircleGeometry(0.05, 6);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    for(let i=0; i<5; i++) {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(
            (Math.random()-0.5)*0.4,
            0.15 + Math.random()*0.1,
            (Math.random()-0.5)*0.4
        );
        spot.lookAt(0, 10, 0); // Look up roughly
        spot.rotation.x = -Math.PI/2;
        cap.add(spot);
    }

    group.add(cap);
    
    // Random scale
    group.scale.setScalar(0.8 + Math.random() * 0.5);
    
    mushroomGroup.add(group);
    mushrooms.push(group);
}

function createMushroom(pos, quat, velocity = null) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.quaternion.copy(quat);
    
    // Physics
    group.userData.velocity = velocity ? velocity.clone() : new THREE.Vector3();
    group.userData.isFalling = !!velocity;

    // Stem
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.8 })
    );
    stem.position.y = 0.2;
    group.add(stem);

    // Cap
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xFF0000, roughness: 0.5 })
    );
    cap.position.y = 0.4;
    // Add white spots to cap
    const spotGeo = new THREE.CircleGeometry(0.05, 6);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    for(let i=0; i<5; i++) {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(
            (Math.random()-0.5)*0.4,
            0.15 + Math.random()*0.1,
            (Math.random()-0.5)*0.4
        );
        spot.lookAt(0, 10, 0); // Look up roughly
        spot.rotation.x = -Math.PI/2;
        cap.add(spot);
    }

    group.add(cap);
    
    // Random scale
    group.scale.setScalar(0.8 + Math.random() * 0.5);
    
    mushroomGroup.add(group);
    mushrooms.push(group);
}

function spawnMushroom() {
    if (mushrooms.length >= 200) return; // Limit total mushrooms

    const _n = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const _p = _n.clone().multiplyScalar(WORLD_RADIUS);
    const _q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), _n);
    
    createMushroom(_p, _q);
}

window.resetMushrooms = function() {
    for (let m of mushrooms) {
        mushroomGroup.remove(m);
    }
    mushrooms.length = 0;
};

// --- Flying Geese ---
const geeseGroup = new THREE.Group();
scene.add(geeseGroup);

function createBird() {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.5 })
    );
    body.rotation.x = Math.PI / 2;
    bird.add(body);
    
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    head.position.z = 0.3;
    head.position.y = 0.1;
    bird.add(head);
    
    const leftWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xBBBBBB })
    );
    leftWing.position.x = -0.4;
    const lwGroup = new THREE.Group();
    lwGroup.add(leftWing);
    lwGroup.name = "leftWing";
    bird.add(lwGroup);
    
    const rightWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xBBBBBB })
    );
    rightWing.position.x = 0.4;
    const rwGroup = new THREE.Group();
    rwGroup.add(rightWing);
    rwGroup.name = "rightWing";
    bird.add(rwGroup);
    
    return bird;
}

const flockSize = 7;
for (let i = 0; i < flockSize; i++) {
    const goose = createBird();
    const row = Math.floor((i + 1) / 2);
    const side = i % 2 === 0 ? 1 : -1;
    if (i === 0) goose.position.set(0, 0, 0);
    else goose.position.set(side * row * 0.8, 0, row * 0.8);
    geeseGroup.add(goose);
}
const flockOrbitRadius = WORLD_RADIUS + 15;
geeseGroup.position.set(0, flockOrbitRadius, 0);

// --- Controls & Interaction ---
// handLeft and handRight are already declared in ui.js

let isLeftClick = false;
let isRightClick = false;
const handPosLeft = new THREE.Vector2(-0.3, -0.3);
const handPosRight = new THREE.Vector2(0.3, -0.3);
const lastHandPosLeft = new THREE.Vector2(-0.3, -0.3);
const lastHandPosRight = new THREE.Vector2(0.3, -0.3);

// --- Confetti System ---
const confettiCount = 0;
const confettiParticles = [];
const confettiGroup = new THREE.Group();
scene.add(confettiGroup);

const confettiGeo = new THREE.PlaneGeometry(0.05, 0.05);
const confettiColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFFFFF];

function createConfettiParticle(pos) {
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(confettiGeo, material);
    
    mesh.position.copy(pos);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 5
    );
    
    confettiGroup.add(mesh);
    confettiParticles.push({ mesh, velocity, life: 3.0 });
}

function updateConfetti(delta) {
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.life -= delta;
        
        if (p.life <= 0) {
            confettiGroup.remove(p.mesh);
            confettiParticles.splice(i, 1);
            continue;
        }
        
        // Physics
        p.velocity.y -= 9.8 * delta; // Gravity
        p.velocity.x *= 0.98; // Air resistance
        p.velocity.z *= 0.98;
        
        p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
        p.mesh.rotation.x += delta * 5;
        p.mesh.rotation.y += delta * 3;
        
        // Ground collision (simple fade/remove)
        if (p.mesh.position.length() < WORLD_RADIUS) {
            confettiGroup.remove(p.mesh);
            confettiParticles.splice(i, 1);
        }
    }
}

// Jump Physics Variables
let verticalVelocity = 0;
let playerJumpHeight = 0;
const GRAVITY = 20.0;
const JUMP_FORCE = 8.0;

document.body.addEventListener('click', () => {
    if (!window.isLocked) {
        document.body.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        window.setIsLocked(true);
    } else {
        window.setIsLocked(false);
        isLeftClick = false;
        isRightClick = false;
    }
});

document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': 
        case 'ArrowUp':
            window.moveState.forward = true; 
            if (window.TipManager) window.TipManager.onInput('move');
            break;
        case 'KeyA': 
        case 'ArrowLeft':
            window.moveState.left = true; 
            break;
        case 'KeyS': 
        case 'ArrowDown':
            window.moveState.backward = true; 
            break;
        case 'KeyD': 
        case 'ArrowRight':
            window.moveState.right = true; 
            break;
        case 'Space':
            if (playerJumpHeight <= 0.01) { // Ground check
                verticalVelocity = JUMP_FORCE;
                if (window.incrementJumpCount) window.incrementJumpCount();
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': 
        case 'ArrowUp':
            window.moveState.forward = false; 
            break;
        case 'KeyA': 
        case 'ArrowLeft':
            window.moveState.left = false; 
            break;
        case 'KeyS': 
        case 'ArrowDown':
            window.moveState.backward = false; 
            break;
        case 'KeyD': 
        case 'ArrowRight':
            window.moveState.right = false; 
            break;
    }
});

document.addEventListener('mousedown', (e) => {
    if (!window.isLocked) return; // Only handle clicks when in game (pointer locked)
    if (e.button === 0) {
        isLeftClick = true;
        handLeft.classList.add('active');
        handPosLeft.set(-0.3, -0.3);
        lastHandPosLeft.copy(handPosLeft);
        
        if (isRightClick && window.TipManager) window.TipManager.onInput('both_buttons');

        // --- House Destruction Logic ---
        // --- House Destruction Logic ---
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        
        for (let i = cottages.length - 1; i >= 0; i--) {
            const cottageGroup = cottages[i];
            const intersects = raycaster.intersectObjects(cottageGroup.children);
            let hitDoor = false;
            
            for (let hit of intersects) {
                if (hit.object.name === "cottage_door") {
                    hitDoor = true;
                    break;
                }
            }

            if (hitDoor) {
                destroyCottage(i);
                break; 
            }
        }
        
        // --- Tree Click Destruction ---
        // Allow clicking anywhere on the tree to destroy it
        const treeIntersects = raycaster.intersectObjects([trunkMesh, foliageMesh]);
        if (treeIntersects.length > 0) {
            const hit = treeIntersects[0];
            const instanceId = hit.instanceId;
            
            if (instanceId !== undefined && instanceId < treeData.length) {
                const tree = treeData[instanceId];
                if (tree.active) {
                    const dist = playerGroup.position.distanceTo(tree.position);
                    if (dist < 3.5) { // Require close proximity (similar to touch-grass radius)
                        destroyTree(instanceId);
                    }
                }
            }
        }
        
        // --- Spawned Tree Click Destruction ---
        // Iterate backwards since we might modify the array
        for (let i = spawnedTrees.length - 1; i >= 0; i--) {
            const treeGroup = spawnedTrees[i];
            const intersects = raycaster.intersectObjects(treeGroup.children);
            if (intersects.length > 0) {
                const dist = playerGroup.position.distanceTo(treeGroup.position);
                if (dist < 5.0) { // Interaction radius
                    destroySpawnedTree(i);
                    break;
                }
            }
        }

        
    } else if (e.button === 2) {
        isRightClick = true;
        handRight.classList.add('active');
        handPosRight.set(0.3, -0.3);
        lastHandPosRight.copy(handPosRight);

        if (isLeftClick && window.TipManager) window.TipManager.onInput('both_buttons');
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        isLeftClick = false;
        handLeft.classList.remove('active');
    } else if (e.button === 2) {
        isRightClick = false;
        handRight.classList.remove('active');
    }
});

document.addEventListener('mousemove', (e) => {
    if (!window.isLocked) return;
    
    const sensitivity = 0.002;
    
    if (isLeftClick || isRightClick) {
        if (isLeftClick) {
            handPosLeft.x += e.movementX * sensitivity;
            handPosLeft.y -= e.movementY * sensitivity;
            handPosLeft.x = Math.max(-1, Math.min(1, handPosLeft.x));
            handPosLeft.y = Math.max(-1, Math.min(1, handPosLeft.y));
        }
        if (isRightClick) {
            handPosRight.x += e.movementX * sensitivity;
            handPosRight.y -= e.movementY * sensitivity;
            handPosRight.x = Math.max(-1, Math.min(1, handPosRight.x));
            handPosRight.y = Math.max(-1, Math.min(1, handPosRight.y));
        }
    } else {
        playerGroup.rotateY(-e.movementX * sensitivity);
        camera.rotateX(-e.movementY * sensitivity);
    }
});

// --- Animation Loop ---
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
let lastPos = new THREE.Vector3();
let lastHand1Touching = false;
let lastHand2Touching = false;

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    let hand1Touching = false;
    let hand2Touching = false;

    // Rotate Clouds
    cloudGroup.rotation.y += delta * 0.02;
    cloudGroup.rotation.x += delta * 0.005;
    
    // Animate Geese
    const orbitSpeed = 0.05;
    const timeScale = time * orbitSpeed;
    geeseGroup.position.set(
        Math.sin(timeScale) * (WORLD_RADIUS + 15),
        Math.cos(timeScale * 0.7) * (WORLD_RADIUS + 15) * 0.5, 
        Math.cos(timeScale) * (WORLD_RADIUS + 15)
    );
    const nextPos = new THREE.Vector3(
        Math.sin(timeScale + 0.01) * (WORLD_RADIUS + 15),
        Math.cos((timeScale + 0.01) * 0.7) * (WORLD_RADIUS + 15) * 0.5,
        Math.cos(timeScale + 0.01) * (WORLD_RADIUS + 15)
    );
    geeseGroup.lookAt(nextPos); 
    
    const flapSpeed = 10;
    const flapAngle = Math.sin(time * flapSpeed) * 0.5;
    geeseGroup.children.forEach(bird => {
        const lw = bird.getObjectByName("leftWing");
        const rw = bird.getObjectByName("rightWing");
        if (lw) lw.rotation.z = flapAngle;
        if (rw) rw.rotation.z = -flapAngle;
    });

    if (window.isLocked) {
        // --- Movement Logic ---
        const speedMult = window.getSpeedMultiplier ? window.getSpeedMultiplier() : 1.0;
        const moveSpeed = MOVEMENT_SPEED * speedMult * delta;
        
        // Update Boost Logic
        if (window.updateBoostState) window.updateBoostState();
        
        // --- Jump Physics ---
        verticalVelocity -= GRAVITY * delta;
        playerJumpHeight += verticalVelocity * delta;
        
        if (playerJumpHeight < 0) {
            playerJumpHeight = 0;
            verticalVelocity = 0;
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerGroup.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerGroup.quaternion);
        const normal = playerGroup.position.clone().normalize();
        
        forward.projectOnPlane(normal).normalize();
        right.projectOnPlane(normal).normalize();
        
        const moveDir = new THREE.Vector3();
        if (window.moveState.forward) moveDir.add(forward);
        if (window.moveState.backward) moveDir.sub(forward);

        // Turn Logic (A/D)
        const ROTATION_SPEED = 2.0;
        if (window.moveState.left) playerGroup.rotateY(ROTATION_SPEED * delta);
        if (window.moveState.right) playerGroup.rotateY(-ROTATION_SPEED * delta);
        
        if (moveDir.lengthSq() > 0) {
            moveDir.normalize().multiplyScalar(moveSpeed);
            
            // We calculate horizontal movement first
            const horizPos = playerGroup.position.clone().add(moveDir);
            
            // Project onto the sphere surface (radius) THEN add jump height
            horizPos.normalize().multiplyScalar(WORLD_RADIUS + playerJumpHeight);
            
            const newPos = horizPos;
            
            let collision = false;
            if (cottages.length > 0) {
                // Iterate backwards to safely remove items if needed
                for (let i = cottages.length - 1; i >= 0; i--) {
                    const cottage = cottages[i];
                    const distToCottage = newPos.distanceTo(cottage.position);
                    
                    if (distToCottage < 4.0) {
                        collision = true;
                    }
                }
            }
            
            // Tree Collision
            if (!collision) {
                for (let i = 0; i < treeData.length; i++) {
                    const tree = treeData[i];
                    if (!tree.active) continue;
                    
                    const distToTree = newPos.distanceTo(tree.position);
                    if (distToTree < 1.0) {
                        collision = true;
                        break;
                    }
                }
            }
            
            // Spawned Tree Collision
            if (!collision) {
                for (let i = 0; i < spawnedTrees.length; i++) {
                    const tree = spawnedTrees[i];
                    const distToTree = newPos.distanceTo(tree.position);
                    if (distToTree < 1.0) {
                        collision = true;
                        break;
                    }
                }
            }
            
            if (!collision) playerGroup.position.copy(newPos);
        } else {
             // Even if not moving horizontally, we must update vertical position (for jump in place)
             const currentPos = playerGroup.position.clone();
             currentPos.normalize().multiplyScalar(WORLD_RADIUS + playerJumpHeight);
             playerGroup.position.copy(currentPos);
        }
        
        // --- Stationary Destruction Logic ---
        // Check for destruction even if not moving, as long as "touching grass"
        if (window.isLocked) {
             // House Destruction
             if (cottages.length > 0 && (lastHand1Touching || lastHand2Touching)) {
                for (let i = cottages.length - 1; i >= 0; i--) {
                    const cottage = cottages[i];
                    const distToCottage = playerGroup.position.distanceTo(cottage.position);
                    if (distToCottage < 5.0) { // Slightly generous radius
                        destroyCottage(i);
                    }
                }
            }
            
            // Tree Destruction
            if (treeData.length > 0 && (lastHand1Touching || lastHand2Touching)) {
                 for (let i = 0; i < treeData.length; i++) {
                    const tree = treeData[i];
                    if (!tree.active) continue;
                    const distToTree = playerGroup.position.distanceTo(tree.position);
                    if (distToTree < 3.5) { // Increased tolerance
                        destroyTree(i);
                    }
                 }
                 
                 // Spawned Trees Destruction (Walk-into)
                 for (let i = spawnedTrees.length - 1; i >= 0; i--) {
                     const tree = spawnedTrees[i];
                     const distToTree = playerGroup.position.distanceTo(tree.position);
                     if (distToTree < 3.5) {
                         destroySpawnedTree(i);
                     }
                 }
            }
        }

        // Joystick Turning
        if (window.isTouchDevice && window.joystickActive && Math.abs(window.joystickDirection.x) > 0.3) {
            const turnSpeed = 2.0 * delta;
            playerGroup.rotateY(-window.joystickDirection.x * turnSpeed);
        }

        // --- Orientation Logic (Gravity) ---
        const currentUp = playerGroup.up.clone();
        const targetUp = playerGroup.position.clone().normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(currentUp, targetUp);
        playerGroup.quaternion.premultiply(q);
        playerGroup.up.copy(targetUp); 
        
        // --- Hand Logic ---
        if (isLeftClick) {
            const x = (handPosLeft.x * 0.5 + 0.5) * window.innerWidth;
            const y = -(handPosLeft.y * 0.5 - 0.5) * window.innerHeight;
            handLeft.style.left = x + 'px';
            handLeft.style.top = y + 'px';
            
            raycaster.setFromCamera(handPosLeft, camera);
            const intersects = raycaster.intersectObject(ground);
            if (intersects.length > 0) {
                grassMaterial.uniforms.hand1Pos.value.copy(intersects[0].point);
                grassMaterial.uniforms.hand1Active.value = 1.0;
                hand1Touching = true;
            } else {
                grassMaterial.uniforms.hand1Active.value = 0.0;
            }

            // Mouse movement scoring
            const dist = handPosLeft.distanceTo(lastHandPosLeft);
            window.addHandMovement(dist * 10.0);
            lastHandPosLeft.copy(handPosLeft);

        } else {
            grassMaterial.uniforms.hand1Active.value = 0.0;
            lastHandPosLeft.copy(handPosLeft);
        }
        
        if (isRightClick) {
            const x = (handPosRight.x * 0.5 + 0.5) * window.innerWidth;
            const y = -(handPosRight.y * 0.5 - 0.5) * window.innerHeight;
            handRight.style.left = x + 'px';
            handRight.style.top = y + 'px';
            
            raycaster.setFromCamera(handPosRight, camera);
            const intersects = raycaster.intersectObject(ground);
            if (intersects.length > 0) {
                grassMaterial.uniforms.hand2Pos.value.copy(intersects[0].point);
                grassMaterial.uniforms.hand2Active.value = 1.0;
                hand2Touching = true;
            } else {
                grassMaterial.uniforms.hand2Active.value = 0.0;
            }

            // Mouse movement scoring
            const dist = handPosRight.distanceTo(lastHandPosRight);
            window.addHandMovement(dist * 10.0);
            lastHandPosRight.copy(handPosRight);

        } else {
            grassMaterial.uniforms.hand2Active.value = 0.0;
            lastHandPosRight.copy(handPosRight);
        }

        // --- Hand Logic (Touch) ---
        let touchHandActive = false;
        for (let [touchId, touchData] of window.activeTouches) {
            if (touchData.isRight) {
                touchHandActive = true;
                const ndcX = (touchData.x / window.innerWidth) * 2 - 1;
                const ndcY = -(touchData.y / window.innerHeight) * 2 + 1;
                const touchNDC = new THREE.Vector2(ndcX, ndcY);

                handRight.style.left = touchData.x + 'px';
                handRight.style.top = touchData.y + 'px';
                handRight.classList.add('active');

                raycaster.setFromCamera(touchNDC, camera);
                const intersects = raycaster.intersectObject(ground);
                if (intersects.length > 0) {
                    grassMaterial.uniforms.hand2Pos.value.copy(intersects[0].point);
                    grassMaterial.uniforms.hand2Active.value = 1.0;
                    hand2Touching = true;
                }
                break;
            }
        }

        if (!touchHandActive && window.isTouchDevice && !isRightClick) {
            handRight.classList.remove('active');
            if (!isRightClick) grassMaterial.uniforms.hand2Active.value = 0.0;
        }
    }
    
    grassMaterial.uniforms.time.value = time;
    
    const deltaDist = playerGroup.position.distanceTo(lastPos);
    const isTouchingAnyGrass = hand1Touching || hand2Touching;

    window.updateGamification(deltaDist, isTouchingAnyGrass);
    lastPos.copy(playerGroup.position);

    if (isTouchingAnyGrass && window.isLocked) {
        window.checkFirstTouch();
    }

    // Tap Detection (Rising Edge)
    if (hand1Touching && !lastHand1Touching) incrementGrassTaps();
    if (hand2Touching && !lastHand2Touching) incrementGrassTaps();

    lastHand1Touching = hand1Touching;
    lastHand2Touching = hand2Touching;
    
    // Mushroom Spawning & Collection
    if (Math.random() < 0.02) { // 2% chance per frame
        spawnMushroom();
    }

    // Mushroom Physics & Collection
    for (let i = mushrooms.length - 1; i >= 0; i--) {
        const m = mushrooms[i];
        
        // Physics
        if (m.userData.isFalling) {
            const vel = m.userData.velocity;
            
            // Gravity (towards center of world)
            const gravityDir = m.position.clone().normalize().negate();
            vel.add(gravityDir.multiplyScalar(9.8 * delta));
            
            // Move
            m.position.add(vel.clone().multiplyScalar(delta));
            
            // Ground Collision
            const distFromCenter = m.position.length();
            if (distFromCenter < WORLD_RADIUS) {
                // Landed!
                m.position.normalize().multiplyScalar(WORLD_RADIUS);
                m.userData.isFalling = false;
                
                // Re-orient to stand up on the sphere
                const up = m.position.clone().normalize();
                m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
            }
        }

        // Collection (check both while falling and landed)
        if (playerGroup.position.distanceTo(m.position) < 2.0) {
            mushroomGroup.remove(m);
            mushrooms.splice(i, 1);
            window.collectMushroom();
        }
    }

    // Confetti Logic
    if (window.confettiActive) {
        if (hand1Touching) {
            const spawnPos = grassMaterial.uniforms.hand1Pos.value.clone().add(new THREE.Vector3(0, 0.5, 0));
            createConfettiParticle(spawnPos);
        }
        if (hand2Touching) {
            const spawnPos = grassMaterial.uniforms.hand2Pos.value.clone().add(new THREE.Vector3(0, 0.5, 0));
            createConfettiParticle(spawnPos);
        }
    }
    updateConfetti(delta);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
