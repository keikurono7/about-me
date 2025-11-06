// module: loads the OBJ space station, FBX rockets, and dynamic asteroids
import * as THREE from "three";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/loaders/FBXLoader.js";

// === Scene setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -1, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const placeholder = document.getElementById("bg");
if (placeholder && placeholder.parentNode) placeholder.replaceWith(renderer.domElement);
else document.body.appendChild(renderer.domElement);

// --- Responsive helpers: detect mobile and apply camera / scene tweaks ---
const isMobile = () => window.innerWidth <= 768;
function applyResponsiveSettings() {
  const mobile = isMobile();

  // camera: slightly wider FOV on mobile, and move closer / higher so objects are visible
  camera.fov = mobile ? 70 : 50;
  camera.position.set(mobile ? 0 : 0, mobile ? -0.6 : -1, mobile ? 6.0 : 8.0);
  camera.updateProjectionMatrix();

  // station: scale up a bit on mobile so it's clearer
  if (station) {
    station.scale.setScalar(mobile ? 0.85 : 0.6);
    station.position.y = mobile ? -0.25 : 0;
  }

  // tweak asteroid spread if already created
  if (asteroidGroup) {
    asteroidGroup.children.forEach((rock, i) => {
      if (mobile) {
        rock.position.x = (Math.random() - 0.5) * 10;
        rock.position.y = (Math.random() - 0.5) * 6;
        rock.position.z = (Math.random() - 0.5) * 8;
        rock.scale.setScalar(0.4 + Math.random() * 1.0);
      } else {
        rock.position.x = (Math.random() - 0.5) * 20;
        rock.position.y = (Math.random() - 0.5) * 12;
        rock.position.z = (Math.random() - 0.5) * 20;
        rock.scale.setScalar(0.5 + Math.random() * 1.5);
      }
    });
  }

  // ensure rockets (if already loaded) have smaller orbits on mobile
  if (rocketGroup) {
    rocketGroup.children.forEach((r, idx) => {
      if (!r.userData) r.userData = {};
      const baseIdx = idx % 6;
      if (mobile) {
        r.userData.orbitRadius = 1.8 + baseIdx * 0.35;
        r.userData.orbitTilt = (Math.random() * Math.PI * 0.5) - Math.PI * 0.25;
        r.userData.verticalOffset = (Math.random() - 0.5) * 1.2;
        r.scale.setScalar(0.06 + Math.random() * 0.03);
      } else {
        r.userData.orbitRadius = 3.5 + idx * 0.6;
        r.userData.orbitTilt = (Math.random() * Math.PI * 0.7) - Math.PI * 0.35;
        r.userData.verticalOffset = (Math.random() - 0.5) * 2;
        r.scale.setScalar(0.08 + Math.random() * 0.03);
      }
    });
  }
}

// call once at startup (station variable declared later, will be adjusted in loader callback too)
window.addEventListener("load", () => setTimeout(applyResponsiveSettings, 60));

// === Lights ===
scene.add(new THREE.AmbientLight(0x555555));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(4, 8, 6);
scene.add(dir);

// === Load station ===
const objLoader = new OBJLoader();
const tex = new THREE.TextureLoader().load("spacestations/station01_diffuse.png");
let station = null;
objLoader.load(
  "spacestations/station01.obj",
  (obj) => {
    obj.traverse((c) => {
      if (c.isMesh) {
        c.material = new THREE.MeshStandardMaterial({
          map: tex,
          metalness: 0.5,
          roughness: 0.6,
        });
      }
    });
    // default scale; applyResponsiveSettings will adjust for mobile
    obj.scale.set(0.6, 0.6, 0.6);
    obj.rotation.x = 0.3;
    station = obj;
    scene.add(station);
    // ensure responsive tweaks run now that station exists
    applyResponsiveSettings();
  },
  undefined,
  (err) => console.error("OBJ load error:", err)
);

// === Section fade-ins ===
const sections = document.querySelectorAll(".section");
const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.1 }
);
sections.forEach((s) => observer.observe(s));

// === Dots highlight ===
const dots = document.querySelectorAll(".dot");
window.addEventListener(
  "scroll",
  () => {
    const scrollPos = window.scrollY + window.innerHeight / 2;
    let current = 0;
    sections.forEach((sec, i) => {
      if (scrollPos >= sec.offsetTop) current = i;
    });
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  },
  { passive: true }
);

// === Scroll progress ===
function getScrollProgress() {
  const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / max));
}

// === Asteroids ===
const asteroidGroup = new THREE.Group();
scene.add(asteroidGroup);
const asteroidGeo = new THREE.IcosahedronGeometry(0.2, 1);
const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0.1 });

for (let i = 0; i < 40; i++) {
  const rock = new THREE.Mesh(asteroidGeo, asteroidMat.clone());
  if (isMobile()) {
    rock.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8);
    rock.scale.setScalar(0.4 + Math.random() * 1.0);
  } else {
    rock.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 20);
    rock.scale.setScalar(0.5 + Math.random() * 1.5);
  }
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  asteroidGroup.add(rock);
}

// === Rockets (FBX) ===
const fbxLoader = new FBXLoader();
const rocketTexture1 = new THREE.TextureLoader().load("rockets/SpaceShipsTexture.png");
const rocketTexture2 = new THREE.TextureLoader().load("rockets/SpaceShipsDark.png");
const rocketGroup = new THREE.Group();
scene.add(rocketGroup);

const rocketFiles = Array.from({ length: 8 }, (_, i) => `rockets/Ship0${i + 1}.fbx`);

rocketFiles.forEach((file, idx) => {
  fbxLoader.load(
    file,
    (fbx) => {
      // randomly assign texture
      const chosenTex = Math.random() > 0.5 ? rocketTexture1 : rocketTexture2;

      fbx.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            map: chosenTex,
            metalness: 0.7,
            roughness: 0.4,
          });
        }
      });

      // scale & orbit tuning depends on mobile vs desktop
      if (isMobile()) {
        fbx.scale.setScalar(0.06 + Math.random() * 0.03);
        fbx.userData = {
          orbitRadius: 1.8 + (idx % 6) * 0.35,
          orbitTilt: (Math.random() * Math.PI * 0.5) - Math.PI * 0.25,
          speed: 0.002 + Math.random() * 0.0012,
          angleOffset: Math.random() * Math.PI * 2,
          verticalOffset: (Math.random() - 0.5) * 1.2,
          phase: Math.random() * Math.PI * 2,
        };
      } else {
        fbx.scale.setScalar(0.08 + Math.random() * 0.03);
        fbx.userData = {
          orbitRadius: 3.5 + idx * 0.6,
          orbitTilt: (Math.random() * Math.PI * 0.7) - Math.PI * 0.35,
          speed: 0.002 + Math.random() * 0.001,
          angleOffset: Math.random() * Math.PI * 2,
          verticalOffset: (Math.random() - 0.5) * 2,
          phase: Math.random() * Math.PI * 2,
        };
      }

      rocketGroup.add(fbx);
    },
    undefined,
    (err) => console.error("FBX rocket load error:", err)
  );
});

// === Animation loop ===
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  const scrollProgress = getScrollProgress();

  // Station rotation
  if (station) {
    station.rotation.y += 0.002;
    station.rotation.z = -0.3 + scrollProgress * 0.6;
  }

  // Asteroid drift
  asteroidGroup.children.forEach((rock) => {
    rock.rotation.x += 0.002;
    rock.rotation.y += 0.001;
  });

  // Rocket motion
  t += 0.008;
  rocketGroup.children.forEach((rocket) => {
    const { orbitRadius, orbitTilt, speed, angleOffset, verticalOffset, phase } = rocket.userData;
    const angle = t * (speed * 400) + angleOffset;

    // Keep them in visible front hemisphere (no full orbit) — push forward more on mobile
    const forwardBias = isMobile() ? 3.2 : 2.5;
    const frontFactor = isMobile() ? 0.8 : 0.6;
    const x = Math.cos(angle + orbitTilt) * orbitRadius;
    const z = Math.sin(angle + orbitTilt) * orbitRadius * frontFactor + forwardBias;
    const y = Math.sin(angle * 1.2 + phase) * (isMobile() ? 0.6 : 0.8) + verticalOffset;
    rocket.position.set(x, y, z);

    // Make rocket face direction of travel
    const nextAngle = angle + 0.05;
    const nextPos = new THREE.Vector3(
      Math.cos(nextAngle + orbitTilt) * orbitRadius,
      Math.sin(nextAngle * 1.2 + phase) * (isMobile() ? 0.6 : 0.8) + verticalOffset,
      Math.sin(nextAngle + orbitTilt) * orbitRadius * frontFactor + forwardBias
    );
    const dirVec = new THREE.Vector3().subVectors(nextPos, rocket.position).normalize();
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dirVec);
    rocket.quaternion.slerp(targetQuat, 0.2);
  });

  renderer.render(scene, camera);
}
animate();

// === Resize ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // reapply responsive tweaks when viewport changes
  applyResponsiveSettings();
});
