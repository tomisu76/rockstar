/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private animationId: number = 0;

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140); // Reduced haze

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Slightly zoomed out start position
    this.camera.position.set(30, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.set(0, 5, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    this.scene.add(dirLight);

    // Floor
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = CONFIG.FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }

  private createVoxels(data: VoxelData[]) {
    // Clear existing
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        // Slight color variation for realism
        c.offsetHSL(0, 0, (Math.random() * 0.1) - 0.05);
        return {
            id: i,
            x: v.x, y: v.y, z: v.z, color: c,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0,
            ox: v.x, oy: v.y, oz: v.z,
            group: v.group
        };
    });

    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    this.instanceMesh.instanceColor!.needsUpdate = true;
  }

  public dismantle() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);

    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.8;
        v.vy = Math.random() * 0.5;
        v.vz = (Math.random() - 0.5) * 0.8;
        v.rvx = (Math.random() - 0.5) * 0.2;
        v.rvy = (Math.random() - 0.5) * 0.2;
        v.rvz = (Math.random() - 0.5) * 0.2;
    });
  }

  private getColorDist(c1: THREE.Color, hex2: number): number {
    const c2 = new THREE.Color(hex2);
    const r = (c1.r - c2.r) * 0.3;
    const g = (c1.g - c2.g) * 0.59;
    const b = (c1.b - c2.b) * 0.11;
    return Math.sqrt(r * r + g * g + b * b);
  }

  private rotatePoint(x: number, y: number, z: number, px: number, py: number, pz: number, rx: number, ry: number, rz: number) {
      let dx = x - px;
      let dy = y - py;
      let dz = z - pz;

      if (rx !== 0) {
          const cos = Math.cos(rx);
          const sin = Math.sin(rx);
          const newY = dy * cos - dz * sin;
          const newZ = dy * sin + dz * cos;
          dy = newY;
          dz = newZ;
      }
      if (ry !== 0) {
          const cos = Math.cos(ry);
          const sin = Math.sin(ry);
          const newX = dx * cos + dz * sin;
          const newZ = -dx * sin + dz * cos;
          dx = newX;
          dz = newZ;
      }
      if (rz !== 0) {
          const cos = Math.cos(rz);
          const sin = Math.sin(rz);
          const newX = dx * cos - dy * sin;
          const newY = dx * sin + dy * cos;
          dx = newX;
          dy = newY;
      }

      return { x: dx + px, y: dy + py, z: dz + pz };
  }

  public rebuild(targetModel: VoxelData[]) {
    if (this.state === AppState.REBUILDING) return;

    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);

    // Simple greedy matching for colors
    targetModel.forEach(target => {
        let bestDist = 9999;
        let bestIdx = -1;

        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;

            const d = this.getColorDist(available[i].color, target.color);
            // Penalties for wrong material types (green vs wood)
            const isLeafOrWood = (available[i].color.g > 0.4) || (available[i].color.r < 0.25 && available[i].color.b < 0.25);
            const targetIsGreen = target.color === COLORS.GREEN || target.color === COLORS.WOOD;
            const penalty = (isLeafOrWood && !targetIsGreen) ? 100 : 0;

            if (d + penalty < bestDist) {
                bestDist = d + penalty;
                bestIdx = i;
                if (d < 0.01) break; // Perfect match
            }
        }

        if (bestIdx !== -1) {
            available[bestIdx].taken = true;
            const h = Math.max(0, (target.y - CONFIG.FLOOR_Y) / 15);
            mappings[available[bestIdx].index] = {
                x: target.x, y: target.y, z: target.z,
                delay: h * 800,
                group: target.group
            };
        }
    });

    // Leftover voxels become rubble
    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
            mappings[i] = {
                x: this.voxels[i].x, y: this.voxels[i].y, z: this.voxels[i].z,
                isRubble: true, delay: 0
            };
        }
    }

    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
  }

  private updatePhysics() {
    if (this.state === AppState.DISMANTLING) {
        this.voxels.forEach(v => {
            v.vy -= 0.025; // Gravity
            v.x += v.vx; v.y += v.vy; v.z += v.vz;
            v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;

            // Floor bounce
            if (v.y < CONFIG.FLOOR_Y + 0.5) {
                v.y = CONFIG.FLOOR_Y + 0.5;
                v.vy *= -0.5; v.vx *= 0.9; v.vz *= 0.9;
                v.rvx *= 0.8; v.rvy *= 0.8; v.rvz *= 0.8;
            }
        });
    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = now - this.rebuildStartTime;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (t.isRubble) return;

            if (elapsed < t.delay) {
                allDone = false;
                return;
            }

            const speed = 0.12;
            v.x += (t.x - v.x) * speed;
            v.y += (t.y - v.y) * speed;
            v.z += (t.z - v.z) * speed;
            // Rotate back to zero
            v.rx += (0 - v.rx) * speed;
            v.ry += (0 - v.ry) * speed;
            v.rz += (0 - v.rz) * speed;

            // Check if reached
            if ((t.x - v.x) ** 2 + (t.y - v.y) ** 2 + (t.z - v.z) ** 2 > 0.01) {
                allDone = false;
            } else {
                // Snap to grid and update base animation values
                v.x = t.x; v.y = t.y; v.z = t.z;
                v.ox = t.x; v.oy = t.y; v.oz = t.z;
                v.group = t.group;
                v.rx = 0; v.ry = 0; v.rz = 0;
            }
        });

        if (allDone) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
        }
    } else if (this.state === AppState.STABLE) {
        // Dynamic animations for rockstar band members (Singer, etc.)
        const time = Date.now() * 0.0035;
        const walkTime = Date.now() * 0.0008;
        const walkOffset = Math.sin(walkTime) * 12; // walk range -12 to 12

        // Joint Angles
        const pelvisY = Math.sin(time) * 0.1;
        const pelvisZ = Math.cos(time * 0.5) * 0.06;

        const torsoX = Math.abs(Math.sin(time * 2)) * 0.05;
        const torsoY = Math.sin(time * 0.7) * 0.08;

        const headX = Math.sin(time * 2) * 0.12;
        const headZ = Math.cos(time) * 0.08;

        // Arms
        const shLAngleX = Math.sin(time) * 0.15;
        const shLAngleY = Math.cos(time) * 0.1;
        const elLAngleX = Math.cos(time * 1.5) * 0.2;

        const shRAngleX = -0.8 + Math.sin(time * 3) * 0.3; // raised arm
        const shRAngleZ = -0.2 + Math.cos(time * 3) * 0.15;
        const elRAngleX = 0.4 + Math.sin(time * 3) * 0.2;

        // Legs (strides)
        const stride = Math.sin(time * 2);
        const hipLAngleX = stride * 0.25;
        const kneeLAngleX = Math.max(0, stride) * 0.35;
        const ankleLAngleX = -Math.max(0, -stride) * 0.15;

        const hipRAngleX = -stride * 0.25;
        const kneeRAngleX = Math.max(0, -stride) * 0.35;
        const ankleRAngleX = -Math.max(0, stride) * 0.15;

        // Pivots (for 2x scaled singer model)
        const pPelvis = { x: 0, y: -10, z: 0 };
        const pTorso = { x: 0, y: -2, z: 0 };
        const pHead = { x: 0, y: 10, z: 0 };
        
        const pShL = { x: -6, y: 4, z: 0 };
        const pElL = { x: -8, y: -2, z: 2 };
        const pWrL = { x: -8, y: -6, z: 4 };

        const pShR = { x: 6, y: 4, z: 0 };
        const pElR = { x: 8, y: 2, z: -2 };
        const pWrR = { x: 8, y: 8, z: -2 };

        const pHipL = { x: -3, y: -10, z: 0 };
        const pKneeL = { x: -3, y: -18, z: 0 };
        const pAnkleL = { x: -3, y: -23, z: 0 };

        const pHipR = { x: 3, y: -10, z: 0 };
        const pKneeR = { x: 3, y: -18, z: 0 };
        const pAnkleR = { x: 3, y: -23, z: 0 };

        this.voxels.forEach(v => {
            if (!v.group) return;

            let pt = { x: v.ox, y: v.oy, z: v.oz };

            // Apply bone hierarchy transformations based on voxel group
            if (v.group === 'head') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHead.x, pHead.y, pHead.z, headX, 0, headZ);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'torso') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'pelvis' || v.group === 'body') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            }
            // Left Arm
            else if (v.group === 'handL') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pWrL.x, pWrL.y, pWrL.z, 0, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pElL.x, pElL.y, pElL.z, elLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pShL.x, pShL.y, pShL.z, shLAngleX, shLAngleY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'forearmL') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pElL.x, pElL.y, pElL.z, elLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pShL.x, pShL.y, pShL.z, shLAngleX, shLAngleY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'upperArmL') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pShL.x, pShL.y, pShL.z, shLAngleX, shLAngleY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            }
            // Right Arm
            else if (v.group === 'handR') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pWrR.x, pWrR.y, pWrR.z, 0, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pElR.x, pElR.y, pElR.z, elRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pShR.x, pShR.y, pShR.z, shRAngleX, 0, shRAngleZ);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'forearmR') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pElR.x, pElR.y, pElR.z, elRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pShR.x, pShR.y, pShR.z, shRAngleX, 0, shRAngleZ);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'upperArmR') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pShR.x, pShR.y, pShR.z, shRAngleX, 0, shRAngleZ);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pTorso.x, pTorso.y, pTorso.z, torsoX, torsoY, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            }
            // Left Leg
            else if (v.group === 'footL') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pAnkleL.x, pAnkleL.y, pAnkleL.z, ankleLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pKneeL.x, pKneeL.y, pKneeL.z, kneeLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHipL.x, pHipL.y, pHipL.z, hipLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'calfL') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pKneeL.x, pKneeL.y, pKneeL.z, kneeLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHipL.x, pHipL.y, pHipL.z, hipLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'thighL') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHipL.x, pHipL.y, pHipL.z, hipLAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            }
            // Right Leg
            else if (v.group === 'footR') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pAnkleR.x, pAnkleR.y, pAnkleR.z, ankleRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pKneeR.x, pKneeR.y, pKneeR.z, kneeRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHipR.x, pHipR.y, pHipR.z, hipRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'calfR') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pKneeR.x, pKneeR.y, pKneeR.z, kneeRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHipR.x, pHipR.y, pHipR.z, hipRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            } else if (v.group === 'thighR') {
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pHipR.x, pHipR.y, pHipR.z, hipRAngleX, 0, 0);
                pt = this.rotatePoint(pt.x, pt.y, pt.z, pPelvis.x, pPelvis.y, pPelvis.z, 0, pelvisY, pelvisZ);
            }
            // Mic Stand & Mic Capsule
            else if (v.group === 'mic' || v.group === 'micStand') {
                pt.y = pt.y + Math.cos(time * 1.5) * 0.3;
                pt.z = pt.z + Math.sin(time * 1.5) * 0.4;
            }

            // Apply global walk translation
            v.x = pt.x + walkOffset;
            v.y = pt.y;
            v.z = pt.z;
        });
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    
    // Optimize: only draw if moving or animating
    const hasAnimatedVoxels = this.voxels.some(v => v.group !== undefined);
    if (this.state !== AppState.STABLE || this.controls.autoRotate || hasAnimatedVoxels) {
        this.draw();
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public getJsonData(): string {
      const data = this.voxels.map((v, i) => ({
          id: i,
          x: +v.x.toFixed(2),
          y: +v.y.toFixed(2),
          z: +v.z.toFixed(2),
          c: '#' + v.color.getHexString()
      }));
      return JSON.stringify(data, null, 2);
  }
  
  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => {
        colors.add('#' + v.color.getHexString());
    });
    return Array.from(colors);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
