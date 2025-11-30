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
}
scene.add(trunkMesh);
scene.add(foliageMesh);

// --- Procedural Environment (Cottages) ---
const cottages = [];
let destroyedHousesCount = 0;

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
        case 'KeyW': window.moveState.forward = true; break;
        case 'KeyA': window.moveState.left = true; break;
        case 'KeyS': window.moveState.backward = true; break;
        case 'KeyD': window.moveState.right = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': window.moveState.forward = false; break;
        case 'KeyA': window.moveState.left = false; break;
        case 'KeyS': window.moveState.backward = false; break;
        case 'KeyD': window.moveState.right = false; break;
    }
});

document.addEventListener('mousedown', (e) => {
    if (!window.isLocked) return; // Only handle clicks when in game (pointer locked)
    if (e.button === 0) {
        isLeftClick = true;
        handLeft.classList.add('active');
        handPosLeft.set(-0.3, -0.3);
        lastHandPosLeft.copy(handPosLeft);
        
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
                const center = cottageGroup.position.clone();
                const quat = cottageGroup.quaternion.clone();
                scene.remove(cottageGroup);
                cottages.splice(i, 1);
                
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
                
                break; // Stop checking other cottages if we hit one
            }
        }
        
    } else if (e.button === 2) {
        isRightClick = true;
        handRight.classList.add('active');
        handPosRight.set(0.3, -0.3);
        lastHandPosRight.copy(handPosRight);
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
        const moveSpeed = MOVEMENT_SPEED * delta;
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerGroup.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerGroup.quaternion);
        const normal = playerGroup.position.clone().normalize();
        
        forward.projectOnPlane(normal).normalize();
        right.projectOnPlane(normal).normalize();
        
        const moveDir = new THREE.Vector3();
        if (window.moveState.forward) moveDir.add(forward);
        if (window.moveState.backward) moveDir.sub(forward);
        if (window.moveState.right) moveDir.add(right);
        if (window.moveState.left) moveDir.sub(right);
        
        if (moveDir.lengthSq() > 0) {
            moveDir.normalize().multiplyScalar(moveSpeed);
            const newPos = playerGroup.position.clone().add(moveDir);
            newPos.normalize().multiplyScalar(WORLD_RADIUS);
            
            let collision = false;
            if (cottages.length > 0) {
                for (let cottage of cottages) {
                    const distToCottage = newPos.distanceTo(cottage.position);
                    if (distToCottage < 4.0) {
                        collision = true;
                        break;
                    }
                }
            }
            
            if (!collision) playerGroup.position.copy(newPos);
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
    
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
