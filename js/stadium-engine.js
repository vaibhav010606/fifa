// js/stadium-engine.js — Accurate Olympic Stadium Engine (MatchPulse AI)
// Based on the high-fidelity stadium renderer with instanced seats, running
// track, concourse ring, and facility markers.

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ALL_FACILITIES } from './data.js';
import { CONFIG } from './config.js';

export class StadiumEngine {
    constructor(containerEl, mode = 'fan') {
        this.containerEl = containerEl;
        this.mode = mode;

        const isMobile = window.innerWidth < 768;

        // ── Scene ──────────────────────────────────────────────────────────
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
        this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0015);

        // ── Dimensions ────────────────────────────────────────────────────
        const W = containerEl.clientWidth  || containerEl.offsetWidth  || 800;
        const H = containerEl.clientHeight || containerEl.offsetHeight || 600;

        // ── Camera ────────────────────────────────────────────────────────
        this.camera = new THREE.PerspectiveCamera(50, W / H, 1, 1500);

        // Camera animation targets
        this.targetCamPos  = new THREE.Vector3(0, 300, 350);
        this.targetCamLook = new THREE.Vector3(0, 0, 0);
        this.currentLook   = new THREE.Vector3(0, 0, 0);

        // Spherical orbit state
        this.orbitAngles = { th: Math.PI / 4, ph: Math.PI / 4 };
        this.orbitRadius = mode === 'tactical' ? CONFIG.ENGINE_ORBIT_RADIUS_TACTICAL : CONFIG.ENGINE_ORBIT_RADIUS_FAN;
        this.orbitLook   = new THREE.Vector3(0, 0, 0);
        this._updateTargetCamPos();

        // ── WebGL Renderer ────────────────────────────────────────────────
        this.renderer = new THREE.WebGLRenderer({
            antialias: !isMobile,
            powerPreference: isMobile ? 'low-power' : 'high-performance',
        });
        this.renderer.setSize(W, H, false);
        this.renderer.setPixelRatio(isMobile
            ? Math.min(window.devicePixelRatio, 1)
            : Math.min(window.devicePixelRatio, 1.5));
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top      = '0';
        this.renderer.domElement.style.left     = '0';
        this.renderer.domElement.style.width    = '100%';
        this.renderer.domElement.style.height   = '100%';
        this.renderer.domElement.style.display  = 'block';
        containerEl.appendChild(this.renderer.domElement);

        // ── CSS2D Label Renderer ──────────────────────────────────────────
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(W, H);
        this.labelRenderer.domElement.style.position      = 'absolute';
        this.labelRenderer.domElement.style.top           = '0';
        this.labelRenderer.domElement.style.left          = '0';
        this.labelRenderer.domElement.style.width         = '100%';
        this.labelRenderer.domElement.style.height        = '100%';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.overflow      = 'hidden';
        containerEl.appendChild(this.labelRenderer.domElement);

        // Accessibility: allow canvas to be focused for keyboard nav
        this.renderer.domElement.setAttribute('tabindex', '0');
        this.renderer.domElement.setAttribute('aria-label', '3D Stadium Map. Use arrow keys to pan, plus/minus to zoom.');

        // ── ResizeObserver ────────────────────────────────────────────────
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(containerEl);

        // ── Seat state ────────────────────────────────────────────────────
        this.seatInstancedMesh = null;
        this.seatPosX = null;
        this.seatPosY = null;
        this.seatPosZ = null;
        this.seatColorIdxArr = null;
        this.seatMapDict = {};
        this.activeHighlightId = -1;

        this.cWhite     = new THREE.Color(0xf1f5f9);
        this.cLightBlue = new THREE.Color(0x7dd3fc);
        this.cDarkBlue  = new THREE.Color(0x0284c7);
        this.baseColors = [this.cWhite, this.cLightBlue, this.cDarkBlue];
        this.highlightColor = new THREE.Color(0x4ade80);

        // ── Route line ────────────────────────────────────────────────────
        this.routeLine = null;

        // ── Drag state ────────────────────────────────────────────────────
        this.isDragging    = false;
        this.prevMouse     = { x: 0, y: 0 };
        this.lastTouchDist = null;

        // ── Map Pin ───────────────────────────────────────────────────────
        const pinGeo = new THREE.ConeGeometry(2, 6, 12);
        pinGeo.rotateX(Math.PI);
        pinGeo.translate(0, 3, 0);
        const pinMat = new THREE.MeshLambertMaterial({
            color: 0xffea00, emissive: 0xffea00, emissiveIntensity: 0.5
        });
        this.mapPin = new THREE.Mesh(pinGeo, pinMat);
        this.mapPin.visible = false;
        this.scene.add(this.mapPin);

        this.clock = new THREE.Clock();
        this.markerMeshesById = {};

        // ── Build ─────────────────────────────────────────────────────────
        this._buildLights();
        this._buildEnvironment();
        this._buildStadiumAsync(isMobile);
        this._bindEvents();
        this._animate();
    }
    
    // ════════════════════════════════════════════════════════════════════════
    // MEMORY MANAGEMENT (Efficiency)
    // ════════════════════════════════════════════════════════════════════════
    dispose() {
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Traverse and dispose all geometries, materials, textures
        this.scene.traverse((object) => {
            if (object.isMesh || object.isInstancedMesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        if (this.labelRenderer) {
            if (this.labelRenderer.domElement && this.labelRenderer.domElement.parentNode) {
                this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // BUILD — Lights
    // ════════════════════════════════════════════════════════════════════════
    _buildLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const addFlood = (x, z) => {
            const light = new THREE.SpotLight(0xffffff, 1.5, 800, Math.PI / 3, 0.5, 1);
            light.position.set(x, 200, z);
            light.target.position.set(0, 0, 0);
            this.scene.add(light);
            this.scene.add(light.target);
        };
        addFlood(-150, -150); addFlood(150, -150);
        addFlood(-150,  150); addFlood(150,  150);
    }

    // ════════════════════════════════════════════════════════════════════════
    // BUILD — Pitch, Track, Ground
    // ════════════════════════════════════════════════════════════════════════
    _buildEnvironment() {
        const pitchGroup = new THREE.Group();
        this.scene.add(pitchGroup);

        // Grass
        const pitchMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), pitchMat);
        pitch.rotation.x = -Math.PI / 2;
        pitchGroup.add(pitch);

        // White markings
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mkLine = (w, h, x, z) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.1, z);
            pitchGroup.add(m);
        };
        mkLine(105, 0.5, 0,  34); mkLine(105, 0.5, 0, -34);
        mkLine(0.5,  68, 52.5, 0); mkLine(0.5,  68, -52.5, 0);
        mkLine(0.5,  68, 0,    0);
        const circle = new THREE.Mesh(new THREE.RingGeometry(9.15, 9.65, 32), lineMat);
        circle.rotation.x = -Math.PI / 2;
        circle.position.y = 0.1;
        pitchGroup.add(circle);

        // Running track
        const trackShape = new THREE.Shape();
        trackShape.moveTo(-52.5,  45);
        trackShape.lineTo( 52.5,  45);
        trackShape.absarc( 52.5, 0, 45,  Math.PI / 2, -Math.PI / 2, true);
        trackShape.lineTo(-52.5, -45);
        trackShape.absarc(-52.5, 0, 45, -Math.PI / 2,  Math.PI / 2, true);
        const hole = new THREE.Path();
        hole.moveTo(-52.5,  34); hole.lineTo( 52.5,  34);
        hole.lineTo( 52.5, -34); hole.lineTo(-52.5, -34);
        trackShape.holes.push(hole);

        const track = new THREE.Mesh(
            new THREE.ShapeGeometry(trackShape),
            new THREE.MeshLambertMaterial({ color: 0x8b3a3a })
        );
        track.rotation.x = -Math.PI / 2;
        track.position.y = 0.05;
        pitchGroup.add(track);

        // Ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(800, 800),
            new THREE.MeshLambertMaterial({ color: 0x222222 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.2;
        this.scene.add(ground);
    }

    // ════════════════════════════════════════════════════════════════════════
    // BUILD — Seats (async, non-blocking)
    // ════════════════════════════════════════════════════════════════════════
    async _buildStadiumAsync(isMobile) {
        const seatWidth = isMobile ? 0.95 : 0.65;
        const data = this._generateSeats(seatWidth);

        this.seatPosX        = data.posX;
        this.seatPosY        = data.posY;
        this.seatPosZ        = data.posZ;
        this.seatColorIdxArr = data.colorIdx;
        this.seatMapDict     = data.blockMap;

        const seatGeo = new THREE.BoxGeometry(0.5, 0.6, 0.5);
        seatGeo.translate(0, 0.3, 0);
        const seatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        this.seatInstancedMesh = new THREE.InstancedMesh(seatGeo, seatMat, data.count);

        const matrix = new THREE.Matrix4();
        const euler  = new THREE.Euler();
        const quat   = new THREE.Quaternion();
        const scale  = new THREE.Vector3(1, 1, 1);
        const pos    = new THREE.Vector3();

        for (let i = 0; i < data.count; i++) {
            pos.set(data.posX[i], data.posY[i], data.posZ[i]);
            euler.set(0, data.rotY[i], 0);
            quat.setFromEuler(euler);
            matrix.compose(pos, quat, scale);
            this.seatInstancedMesh.setMatrixAt(i, matrix);
            this.seatInstancedMesh.setColorAt(i, this.baseColors[data.colorIdx[i]]);
        }
        this.seatInstancedMesh.instanceMatrix.needsUpdate = true;
        this.seatInstancedMesh.instanceColor.needsUpdate  = true;
        this.scene.add(this.seatInstancedMesh);

        // Facilities on concourse
        this._buildFacilities();

        // Notify fan portal that seat map is ready
        if (typeof this.onSeatMapReady === 'function') {
            this.onSeatMapReady(this.seatMapDict);
        }
    }

    _rowLabel(index) {
        let n = index + 1, label = '';
        while (n > 0) {
            const rem = (n - 1) % 26;
            label = String.fromCharCode(65 + rem) + label;
            n = Math.floor((n - 1) / 26);
        }
        return label;
    }

    _seatColorIndex(tier, row) {
        if (row % 5 === 0) return 0;
        if (tier === 1) return 2;
        if (tier === 0 && row > 10) return 1;
        return 0;
    }

    _generateSeats(seatWidth) {
        const posX = [], posY = [], posZ = [], rotYArr = [], colorIdxArr = [];
        const blockMap = {};
        let count = 0;
        const pitchOffset = 45;

        for (let t = 0; t < 2; t++) {
            const tierName   = t === 0 ? 'Lower' : 'Upper';
            const baseRadiusX = 65 + pitchOffset + (t * 30);
            const baseRadiusZ = 45 + pitchOffset + (t * 30);
            const baseHeight  = t * 15;
            const rows        = t === 0 ? 30 : 25;
            const rowDepth    = 0.9;
            const rowHeight   = 0.35 + (t * 0.05);

            for (let r = 0; r < rows; r++) {
                const rX  = baseRadiusX + r * rowDepth;
                const rZ  = baseRadiusZ + r * rowDepth;
                const rH  = baseHeight  + r * rowHeight + r * r * 0.005;
                const perim = 2 * Math.PI * Math.sqrt((rX * rX + rZ * rZ) / 2);
                const numSeats = Math.floor(perim / seatWidth);
                const rowStr   = this._rowLabel(r);
                const colorIdx = this._seatColorIndex(t, r);
                const numBlocks = 36;

                for (let s = 0; s < numSeats; s++) {
                    const angle      = (s / numSeats) * Math.PI * 2;
                    const blockFloat = (angle / (Math.PI * 2)) * numBlocks;
                    const blockIndex = Math.floor(blockFloat);
                    const angleInBlock = blockFloat % 1;
                    if (angleInBlock < 0.08) continue;

                    const x    = Math.cos(angle) * rX;
                    const z    = Math.sin(angle) * rZ;
                    const rotY = -angle - Math.PI / 2;
                    const blockStr = `B${(blockIndex + 1).toString().padStart(2, '0')}-${tierName.charAt(0)}`;
                    const seatNum  = Math.floor(angleInBlock * (numSeats / numBlocks)) + 1;

                    posX.push(x); posY.push(rH); posZ.push(z);
                    rotYArr.push(rotY); colorIdxArr.push(colorIdx);

                    if (!blockMap[blockStr]) blockMap[blockStr] = {};
                    if (!blockMap[blockStr][rowStr]) blockMap[blockStr][rowStr] = {};
                    blockMap[blockStr][rowStr][seatNum] = count;
                    count++;
                }
            }
        }

        return {
            count,
            posX:     Float32Array.from(posX),
            posY:     Float32Array.from(posY),
            posZ:     Float32Array.from(posZ),
            rotY:     Float32Array.from(rotYArr),
            colorIdx: Uint8Array.from(colorIdxArr),
            blockMap,
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // BUILD — Facilities (concourse ring + markers)
    // ════════════════════════════════════════════════════════════════════════
    _buildFacilities() {
        const concourseGroup = new THREE.Group();
        this.scene.add(concourseGroup);

        // Concourse ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(110, 160, 64),
            new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 15;
        concourseGroup.add(ring);

        const rX = 145, rZ = 125;

        const addMarkers = (items, typeClass, offsetAngle) => {
            items.forEach((fac, i) => {
                const angle = offsetAngle + (i / items.length) * Math.PI * 2;
                const px = Math.cos(angle) * rX;
                const pz = Math.sin(angle) * rZ;

                let color = 0x22c55e;
                if (typeClass === 'label-wc')   color = 0x3b82f6;
                if (typeClass === 'label-med')  color = 0xef4444;
                if (typeClass === 'label-food') color = 0xeab308;

                const mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(6, 4, 4),
                    new THREE.MeshLambertMaterial({ color })
                );
                mesh.position.set(px, 17, pz);
                mesh.rotation.y = -angle;
                concourseGroup.add(mesh);

                const div = document.createElement('div');
                div.className = `facility-label ${typeClass}`;
                div.textContent = fac.label || fac;
                div.dataset.id  = fac.id || '';
                const label2d = new CSS2DObject(div);
                label2d.position.set(0, 4, 0);
                mesh.add(label2d);

                if (fac.id) {
                    this.markerMeshesById[fac.id] = { mesh, labelDiv: div, data: fac };
                    div.style.cursor = 'pointer';
                    div.addEventListener('click', () => this.flyToMarker(fac.id));
                }
            });
        };

        const gates  = ALL_FACILITIES.filter(f => f.type === 'gate');
        const wcs    = ALL_FACILITIES.filter(f => f.type === 'wc');
        const medics = ALL_FACILITIES.filter(f => f.type === 'medical' || f.type === 'med');
        const foods  = ALL_FACILITIES.filter(f => f.type === 'food');

        // Committee (tactical) mode: gates + medical only.
        // Fan mode: all facility types shown.
        addMarkers(gates,  'label-gate', 0);
        addMarkers(medics, 'label-med',  Math.PI / 4);
        if (this.mode !== 'tactical') {
            addMarkers(wcs,   'label-wc',   Math.PI / 6);
            addMarkers(foods, 'label-food', Math.PI / 8);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC — Seat highlight + fly-to
    // ════════════════════════════════════════════════════════════════════════
    highlightSeat(block, row, seatNum) {
        if (!this.seatInstancedMesh || !this.seatMapDict) return false;
        const id = this.seatMapDict[block]?.[row]?.[seatNum];
        if (id === undefined) return false;

        // Restore previous
        if (this.activeHighlightId !== -1) {
            this.seatInstancedMesh.setColorAt(
                this.activeHighlightId,
                this.baseColors[this.seatColorIdxArr[this.activeHighlightId]]
            );
        }
        this.activeHighlightId = id;
        this.seatInstancedMesh.setColorAt(id, this.highlightColor);
        this.seatInstancedMesh.instanceColor.needsUpdate = true;

        // Map pin
        this.mapPin.position.set(this.seatPosX[id], this.seatPosY[id] + 4, this.seatPosZ[id]);
        this.mapPin.visible = true;

        // Fly camera
        const dx = this.seatPosX[id], dz = this.seatPosZ[id];
        this.orbitLook.set(dx, this.seatPosY[id], dz);
        this.orbitRadius = 60;
        this.orbitAngles.th = Math.atan2(dx, dz);
        this.orbitAngles.ph = Math.PI / 4;
        this._updateTargetCamPos();
        return true;
    }

    clearHighlight() {
        if (!this.seatInstancedMesh) return;
        if (this.activeHighlightId !== -1) {
            this.seatInstancedMesh.setColorAt(
                this.activeHighlightId,
                this.baseColors[this.seatColorIdxArr[this.activeHighlightId]]
            );
            this.seatInstancedMesh.instanceColor.needsUpdate = true;
            this.activeHighlightId = -1;
        }
        this.mapPin.visible = false;
    }

    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC — Committee overlay modes
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Recolor every seat by its block's occupancy density.
     * blockDensityData: { "B01-L": { density: 0-100, status }, ... }
     */
    recolorDensityHeatmap(blockDensityData) {
        if (!this.seatInstancedMesh || !this.seatMapDict) return;
        const green  = new THREE.Color(0x22c55e);
        const yellow = new THREE.Color(0xfacc15);
        const orange = new THREE.Color(0xf97316);
        const red    = new THREE.Color(0xef4444);
        const grey   = new THREE.Color(0x374151);

        // Build a lookup: blockId → THREE.Color
        const colorForBlock = {};
        Object.entries(blockDensityData).forEach(([blockId, info]) => {
            if (info.density >= 90)      colorForBlock[blockId] = red;
            else if (info.density >= 75) colorForBlock[blockId] = orange;
            else if (info.density >= 60) colorForBlock[blockId] = yellow;
            else                          colorForBlock[blockId] = green;
        });

        // Apply to every seat instance
        Object.entries(this.seatMapDict).forEach(([blockId, rows]) => {
            const c = colorForBlock[blockId] || grey;
            Object.values(rows).forEach(seats => {
                Object.values(seats).forEach(idx => {
                    this.seatInstancedMesh.setColorAt(idx, c);
                });
            });
        });

        this.seatInstancedMesh.instanceColor.needsUpdate = true;
        this.activeHighlightId = -1;
        this.mapPin.visible = false;
        this._idleRendered = false;
    }


    /**
     * Recolor seats by facility health: Down blocks → red, Degraded → orange,
     * rest → their original colour.  Highlights the concourse marker labels too.
     */
    recolorFacilityHealth(facilities) {
        if (!this.seatInstancedMesh || !this.seatMapDict) return;

        // First reset to original colours
        this._applyBaseColors();

        // Facility label tinting
        facilities.forEach(fac => {
            const node = this.markerMeshesById[fac.id];
            if (!node) return;
            const mat = node.mesh.material;
            if (fac.status === 'Down') {
                mat.color.set(0xef4444);
                mat.emissive?.set(0xef4444);
                node.labelDiv.style.borderColor = '#ef4444';
                node.labelDiv.style.color = '#f87171';
            } else if (fac.status === 'Degraded') {
                mat.color.set(0xf97316);
                mat.emissive?.set(0xf97316);
                node.labelDiv.style.borderColor = '#f97316';
                node.labelDiv.style.color = '#fb923c';
            } else {
                // restore default by type
                const defaults = { gate: 0x22c55e, wc: 0x3b82f6, medical: 0xef4444, med: 0xef4444, food: 0xeab308 };
                const def = defaults[fac.type] || 0x555555;
                mat.color.set(def);
                mat.emissive?.set(def);
            }
            mat.needsUpdate = true;
        });

        this.seatInstancedMesh.instanceColor.needsUpdate = true;
        this._idleRendered = false;
    }


    /** Restore all seats to their original white/light-blue/dark-blue colour scheme. */
    resetSeatColors() {
        if (!this.seatInstancedMesh) return;
        this._applyBaseColors();
        this.activeHighlightId = -1;
        this.mapPin.visible = false;
        this._idleRendered = false;


        // Also restore facility marker colours
        Object.values(this.markerMeshesById).forEach(node => {
            const defaults = { gate: 0x22c55e, wc: 0x3b82f6, medical: 0xef4444, med: 0xef4444, food: 0xeab308 };
            const def = defaults[node.data?.type] || 0x555555;
            node.mesh.material.color.set(def);
            if (node.mesh.material.emissive) node.mesh.material.emissive.set(def);
            node.mesh.material.needsUpdate = true;
            if (node.labelDiv) {
                node.labelDiv.style.borderColor = '';
                node.labelDiv.style.color = '';
            }
        });
    }

    /** Internal: write the original base colours back to the InstancedMesh. */
    _applyBaseColors() {
        if (!this.seatInstancedMesh || !this.seatColorIdxArr) return;
        const count = this.seatInstancedMesh.count;
        for (let i = 0; i < count; i++) {
            this.seatInstancedMesh.setColorAt(i, this.baseColors[this.seatColorIdxArr[i]]);
        }
        this.seatInstancedMesh.instanceColor.needsUpdate = true;
    }


    applyCameraMode(mode) {
        this.mode = mode;
        if (mode === 'tactical') {
            this.orbitAngles = { th: Math.PI / 5, ph: Math.PI / 2.8 };
            this.orbitRadius = 430;
            this.orbitLook.set(0, 0, 0);
        } else {
            this.orbitAngles = { th: Math.PI / 4, ph: Math.PI / 4 };
            this.orbitRadius = 350;
            this.orbitLook.set(0, 0, 0);
        }
        this._updateTargetCamPos();
    }

    resetCamera() {
        this.clearHighlight();
        this.orbitAngles = { th: Math.PI / 4, ph: Math.PI / 4 };
        this.orbitRadius = this.mode === 'tactical' ? 430 : 350;
        this.orbitLook.set(0, 0, 0);
        this._updateTargetCamPos();
    }

    flyToMarker(id) {
        const node = this.markerMeshesById[id];
        if (!node) return;
        const p = node.mesh.position;
        this.orbitLook.set(p.x, p.y, p.z);
        this.orbitRadius = 120;
        this.orbitAngles.th = Math.atan2(p.x, p.z);
        this.orbitAngles.ph = Math.PI / 3.5;
        this._updateTargetCamPos();

        // Accessibility: Announce 3D movement to screen readers
        const announcer = document.getElementById('a11y-engine-announcer');
        if (announcer) {
            announcer.textContent = `Camera focused on 3D marker: ${id}.`;
        }
    }

    flyToBlock(blockId) {
        if (!this.seatMapDict) return;
        if (!this.seatMapDict[blockId]) {
            // Try to match partial (e.g. B14 -> B14-L or B14-U)
            const matched = Object.keys(this.seatMapDict).find(k => k.startsWith(blockId) || k.includes(blockId));
            if (matched) blockId = matched;
            else return;
        }
        const rows = this.seatMapDict[blockId];
        if (!rows) return;
        const firstRow = Object.values(rows)[0];
        if (!firstRow) return;
        const seatId = Object.values(firstRow)[0];
        if (seatId === undefined) return;

        const dx = this.seatPosX[seatId];
        const dy = this.seatPosY[seatId];
        const dz = this.seatPosZ[seatId];

        this.orbitLook.set(dx, dy, dz);
        this.orbitRadius = 140;
        this.orbitAngles.th = Math.atan2(dx, dz);
        this.orbitAngles.ph = Math.PI / 3.5;
        this._updateTargetCamPos();

        // Accessibility: Announce 3D movement to screen readers
        const announcer = document.getElementById('a11y-engine-announcer');
        if (announcer) {
            announcer.textContent = `Camera zoomed to seating block: ${blockId}.`;
        }
    }


    drawRoute(srcId, tgtId, customPoints = null, animateTour = false) {
        if (this.routeLine) { this.scene.remove(this.routeLine); this.routeLine = null; }

        let pts = [];
        if (customPoints) {
            pts = customPoints;
        } else {
            const src = this.markerMeshesById[srcId]?.mesh.position ?? new THREE.Vector3(120, 17, 80);
            const tgt = this.markerMeshesById[tgtId]?.mesh.position ?? new THREE.Vector3(-120, 17, -80);
            const mid = new THREE.Vector3().addVectors(src, tgt).multiplyScalar(0.5);
            mid.y = 50;
            pts = new THREE.QuadraticBezierCurve3(src, mid, tgt).getPoints(50);
        }

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 4 });
        this.routeLine = new THREE.Line(geo, mat);
        this.scene.add(this.routeLine);

        if (animateTour && pts.length > 0) {
            const mid = pts[Math.floor(pts.length / 2)];
            this.orbitLook.copy(mid);
            this.orbitRadius = 180;
            this._updateTargetCamPos();
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // INTERNAL — Camera helpers
    // ════════════════════════════════════════════════════════════════════════
    _updateTargetCamPos() {
        const { th, ph } = this.orbitAngles;
        const r = this.orbitRadius;
        this.targetCamPos.set(
            this.orbitLook.x + r * Math.sin(th) * Math.cos(ph),
            this.orbitLook.y + Math.max(5, r * Math.sin(ph)),
            this.orbitLook.z + r * Math.cos(th) * Math.cos(ph)
        );
        this._idleRendered = false;
    }


    // ════════════════════════════════════════════════════════════════════════
    // INTERNAL — Events
    // ════════════════════════════════════════════════════════════════════════
    _bindEvents() {
        const el = this.renderer.domElement;
        el.style.cursor = 'grab';

        el.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.prevMouse  = { x: e.clientX, y: e.clientY };
            el.style.cursor = 'grabbing';
        });
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            el.style.cursor = 'grab';
        });
        el.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.prevMouse.x;
            const dy = e.clientY - this.prevMouse.y;
            this.prevMouse = { x: e.clientX, y: e.clientY };
            this.orbitAngles.th -= dx * 0.005;
            this.orbitAngles.ph  = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.orbitAngles.ph - dy * 0.005));
            this._updateTargetCamPos();
        });
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.orbitRadius = Math.max(20, Math.min(600, this.orbitRadius + e.deltaY * 0.2));
            this._updateTargetCamPos();
        }, { passive: false });

        // Keyboard Navigation (Accessibility)
        el.addEventListener('keydown', (e) => {
            const step = 0.05;
            const zoomStep = 20;
            switch(e.key) {
                case 'ArrowLeft':  this.orbitAngles.th += step; break;
                case 'ArrowRight': this.orbitAngles.th -= step; break;
                case 'ArrowUp':    this.orbitAngles.ph = Math.min(Math.PI / 2 - 0.05, this.orbitAngles.ph + step); break;
                case 'ArrowDown':  this.orbitAngles.ph = Math.max(0.1, this.orbitAngles.ph - step); break;
                case '+':
                case '=':          this.orbitRadius = Math.max(20, this.orbitRadius - zoomStep); break;
                case '-':
                case '_':          this.orbitRadius = Math.min(600, this.orbitRadius + zoomStep); break;
                default: return; // Do nothing
            }
            e.preventDefault();
            this._updateTargetCamPos();
        });

        // Touch
        el.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.prevMouse  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.lastTouchDist = Math.hypot(dx, dy);
            }
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches[0].clientX - this.prevMouse.x;
                const dy = e.touches[0].clientY - this.prevMouse.y;
                this.orbitAngles.th -= dx * 0.005;
                this.orbitAngles.ph  = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.orbitAngles.ph - dy * 0.005));
                this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                this._updateTargetCamPos();
            } else if (e.touches.length === 2 && this.lastTouchDist !== null) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                this.orbitRadius = Math.max(20, Math.min(600, this.orbitRadius - (dist - this.lastTouchDist) * 0.5));
                this.lastTouchDist = dist;
                this._updateTargetCamPos();
            }
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) { this.isDragging = false; this.lastTouchDist = null; }
        });

        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        if (!this.containerEl) return;
        const W = this.containerEl.clientWidth  || this.containerEl.offsetWidth;
        const H = this.containerEl.clientHeight || this.containerEl.offsetHeight;
        if (!W || !H) return;
        this.camera.aspect = W / H;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(W, H, false);
        this.labelRenderer.setSize(W, H);
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDER LOOP (Adaptive Efficiency Optimization)
    // ════════════════════════════════════════════════════════════════════════
    _animate() {
        this._animFrameId = requestAnimationFrame(() => this._animate());

        let needsRender = false;

        if (this.mapPin.visible && this.activeHighlightId !== -1) {
            const t = this.clock.getElapsedTime();
            this.mapPin.position.y = (this.seatPosY[this.activeHighlightId] + 4) + Math.sin(t * 5) * 2;
            this.mapPin.rotation.y = t * 2;
            needsRender = true;
        }

        const camDist = this.camera.position.distanceTo(this.targetCamPos);
        const lookDist = this.currentLook.distanceTo(this.orbitLook);

        if (camDist > 0.005 || lookDist > 0.005 || this.isDragging) {
            this.camera.position.lerp(this.targetCamPos, CONFIG.ENGINE_CAMERA_LERP_SPEED);
            this.currentLook.lerp(this.orbitLook, CONFIG.ENGINE_CAMERA_LERP_SPEED);
            this.camera.lookAt(this.currentLook);
            needsRender = true;
        }
        
        // Level of Detail (LOD) Optimization
        if (this.seatInstancedMesh) {
            const distToCenter = this.camera.position.length();
            const shouldBeVisible = distToCenter < CONFIG.LOD_DISTANCE_THRESHOLD;
            if (this.seatInstancedMesh.visible !== shouldBeVisible) {
                this.seatInstancedMesh.visible = shouldBeVisible;
                needsRender = true;
            }
        }

        // Efficiency: Only execute GPU render pass if camera/pin is moving or dirty flag is set
        if (needsRender || !this._idleRendered) {
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.scene, this.camera);
            if (!needsRender) {
                this._idleRendered = true;
            } else {
                this._idleRendered = false;
            }
        }
    }
}

