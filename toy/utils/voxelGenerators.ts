/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { VoxelData } from '../types';
import { COLORS, CONFIG } from './voxelConstants';

// Helper to prevent overlapping voxels
function setBlock(map: Map<string, VoxelData>, x: number, y: number, z: number, color: number, group?: string) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const key = `${rx},${ry},${rz}`;
    map.set(key, { x: rx, y: ry, z: rz, color, group });
}

function generateSphere(map: Map<string, VoxelData>, cx: number, cy: number, cz: number, r: number, col: number, sy = 1, group?: string) {
    const r2 = r * r;
    const xMin = Math.floor(cx - r);
    const xMax = Math.ceil(cx + r);
    const yMin = Math.floor(cy - r * sy);
    const yMax = Math.ceil(cy + r * sy);
    const zMin = Math.floor(cz - r);
    const zMax = Math.ceil(cz + r);

    for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
            for (let z = zMin; z <= zMax; z++) {
                const dx = x - cx;
                const dy = (y - cy) / sy;
                const dz = z - cz;
                if (dx * dx + dy * dy + dz * dz <= r2) {
                    setBlock(map, x, y, z, col, group);
                }
            }
        }
    }
}

export const Generators = {
    Eagle: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        // Branch
        for (let x = -8; x < 8; x++) {
            const y = Math.sin(x * 0.2) * 1.5;
            const z = Math.cos(x * 0.1) * 1.5;
            generateSphere(map, x, y, z, 1.8, COLORS.WOOD);
            if (Math.random() > 0.7) generateSphere(map, x, y + 2, z + (Math.random() - 0.5) * 3, 1.5, COLORS.GREEN);
        }
        // Body
        const EX = 0, EY = 2, EZ = 2;
        generateSphere(map, EX, EY + 6, EZ, 4.5, COLORS.DARK, 1.4);
        // Chest
        for (let x = EX - 2; x <= EX + 2; x++) for (let y = EY + 4; y <= EY + 9; y++) setBlock(map, x, y, EZ + 3, COLORS.LIGHT);
        // Wings (Rough approximation)
        for (let x of [-4, -3, 3, 4]) for (let y = EY + 4; y <= EY + 10; y++) for (let z = EZ - 2; z <= EZ + 3; z++) setBlock(map, x, y, z, COLORS.DARK);
        // Tail
        for (let x = EX - 2; x <= EX + 2; x++) for (let y = EY; y <= EY + 4; y++) for (let z = EZ - 5; z <= EZ - 3; z++) setBlock(map, x, y, z, COLORS.WHITE);
        // Head
        const HY = EY + 12, HZ = EZ + 1;
        generateSphere(map, EX, HY, HZ, 2.8, COLORS.WHITE);
        generateSphere(map, EX, HY - 2, HZ, 2.5, COLORS.WHITE);
        // Talons
        [[-2, 0], [-2, 1], [2, 0], [2, 1]].forEach(o => setBlock(map, EX + o[0], EY + o[1], EZ, COLORS.TALON));
        // Beak
        [[0, 1], [0, 2], [1, 1], [-1, 1]].forEach(o => setBlock(map, EX + o[0], HY, HZ + 2 + o[1], COLORS.GOLD));
        setBlock(map, EX, HY - 1, HZ + 3, COLORS.GOLD);
        // Eyes
        [[-1.5, COLORS.BLACK], [1.5, COLORS.BLACK]].forEach(o => setBlock(map, EX + o[0], HY + 0.5, HZ + 1.5, o[1]));
        [[-1.5, COLORS.WHITE], [1.5, COLORS.WHITE]].forEach(o => setBlock(map, EX + o[0], HY + 1.5, HZ + 1.5, o[1]));

        return Array.from(map.values());
    },

    Cat: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const CY = CONFIG.FLOOR_Y + 1; const CX = 0, CZ = 0;
        // Paws
        generateSphere(map, CX - 3, CY + 2, CZ, 2.2, COLORS.DARK, 1.2);
        generateSphere(map, CX + 3, CY + 2, CZ, 2.2, COLORS.DARK, 1.2);
        // Body
        for (let y = 0; y < 7; y++) {
            const r = 3.5 - (y * 0.2);
            generateSphere(map, CX, CY + 2 + y, CZ, r, COLORS.DARK);
            generateSphere(map, CX, CY + 2 + y, CZ + 2, r * 0.6, COLORS.WHITE);
        }
        // Legs
        for (let y = 0; y < 5; y++) {
            setBlock(map, CX - 1.5, CY + y, CZ + 3, COLORS.WHITE); setBlock(map, CX + 1.5, CY + y, CZ + 3, COLORS.WHITE);
            setBlock(map, CX - 1.5, CY + y, CZ + 2, COLORS.WHITE); setBlock(map, CX + 1.5, CY + y, CZ + 2, COLORS.WHITE);
        }
        // Head
        const CHY = CY + 9;
        generateSphere(map, CX, CHY, CZ, 3.2, COLORS.LIGHT, 0.8);
        // Ears
        [[-2, 1], [2, 1]].forEach(side => {
            setBlock(map, CX + side[0], CHY + 3, CZ, COLORS.DARK); setBlock(map, CX + side[0] * 0.8, CHY + 3, CZ + 1, COLORS.WHITE);
            setBlock(map, CX + side[0], CHY + 4, CZ, COLORS.DARK);
        });
        // Tail
        for (let i = 0; i < 12; i++) {
            const a = i * 0.3, tx = Math.cos(a) * 4.5, tz = Math.sin(a) * 4.5;
            if (tz > -2) { setBlock(map, CX + tx, CY, CZ + tz, COLORS.DARK); setBlock(map, CX + tx, CY + 1, CZ + tz, COLORS.DARK); }
        }
        // Face
        setBlock(map, CX - 1, CHY + 0.5, CZ + 2.5, COLORS.GOLD); setBlock(map, CX + 1, CHY + 0.5, CZ + 2.5, COLORS.GOLD);
        setBlock(map, CX - 1, CHY + 0.5, CZ + 3, COLORS.BLACK); setBlock(map, CX + 1, CHY + 0.5, CZ + 3, COLORS.BLACK);
        setBlock(map, CX, CHY, CZ + 3, COLORS.TALON);
        return Array.from(map.values());
    },

    Rabbit: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const LOG_Y = CONFIG.FLOOR_Y + 2.5;
        const RX = 0, RZ = 0;
        // Log
        for (let x = -6; x <= 6; x++) {
            const radius = 2.8 + Math.sin(x * 0.5) * 0.2;
            generateSphere(map, x, LOG_Y, 0, radius, COLORS.DARK);
            if (x === -6 || x === 6) generateSphere(map, x, LOG_Y, 0, radius - 0.5, COLORS.WOOD);
            if (Math.random() > 0.8) setBlock(map, x, LOG_Y + radius, (Math.random() - 0.5) * 2, COLORS.GREEN);
        }
        // Body
        const BY = LOG_Y + 2.5;
        generateSphere(map, RX - 1.5, BY + 1.5, RZ - 1.5, 1.8, COLORS.WHITE);
        generateSphere(map, RX + 1.5, BY + 1.5, RZ - 1.5, 1.8, COLORS.WHITE);
        generateSphere(map, RX, BY + 2, RZ, 2.2, COLORS.WHITE, 0.8);
        generateSphere(map, RX, BY + 2.5, RZ + 1.5, 1.5, COLORS.WHITE);
        setBlock(map, RX - 1.2, BY, RZ + 2.2, COLORS.LIGHT); setBlock(map, RX + 1.2, BY, RZ + 2.2, COLORS.LIGHT);
        setBlock(map, RX - 2.2, BY, RZ - 0.5, COLORS.WHITE); setBlock(map, RX + 2.2, BY, RZ - 0.5, COLORS.WHITE);
        generateSphere(map, RX, BY + 1.5, RZ - 2.5, 1.0, COLORS.WHITE);
        // Head
        const HY = BY + 4.5; const HZ = RZ + 1;
        generateSphere(map, RX, HY, HZ, 1.7, COLORS.WHITE);
        generateSphere(map, RX - 1.1, HY - 0.5, HZ + 0.5, 1.0, COLORS.WHITE);
        generateSphere(map, RX + 1.1, HY - 0.5, HZ + 0.5, 1.0, COLORS.WHITE);
        // Ears
        for (let y = 0; y < 5; y++) {
            const curve = y * 0.2;
            setBlock(map, RX - 0.8, HY + 1.5 + y, HZ - curve, COLORS.WHITE); setBlock(map, RX - 1.2, HY + 1.5 + y, HZ - curve, COLORS.WHITE);
            setBlock(map, RX - 1.0, HY + 1.5 + y, HZ - curve + 0.5, COLORS.LIGHT);
            setBlock(map, RX + 0.8, HY + 1.5 + y, HZ - curve, COLORS.WHITE); setBlock(map, RX + 1.2, HY + 1.5 + y, HZ - curve, COLORS.WHITE);
            setBlock(map, RX + 1.0, HY + 1.5 + y, HZ - curve + 0.5, COLORS.LIGHT);
        }
        setBlock(map, RX - 0.8, HY + 0.2, HZ + 1.5, COLORS.BLACK); setBlock(map, RX + 0.8, HY + 0.2, HZ + 1.5, COLORS.BLACK);
        setBlock(map, RX, HY - 0.5, HZ + 1.8, COLORS.TALON);
        return Array.from(map.values());
    },

    Twins: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        function buildMiniEagle(offsetX: number, offsetZ: number, mirror: boolean) {
            // Branch
            for (let x = -5; x < 5; x++) {
                const y = Math.sin(x * 0.4) * 0.5;
                generateSphere(map, offsetX + x, y, offsetZ, 1.2, COLORS.WOOD);
                if (Math.random() > 0.8) generateSphere(map, offsetX + x, y + 1, offsetZ, 1, COLORS.GREEN);
            }
            const EX = offsetX, EY = 1.5, EZ = offsetZ;
            generateSphere(map, EX, EY + 4, EZ, 3.0, COLORS.DARK, 1.4);
            for (let x = EX - 1; x <= EX + 1; x++) for (let y = EY + 2; y <= EY + 6; y++) setBlock(map, x, y, EZ + 2, COLORS.LIGHT);
            for (let x = EX - 1; x <= EX + 1; x++) for (let y = EY + 2; y <= EY + 3; y++) setBlock(map, x, y, EZ - 3, COLORS.WHITE);
            for (let y = EY + 2; y <= EY + 6; y++) for (let z = EZ - 1; z <= EZ + 2; z++) { setBlock(map, EX - 3, y, z, COLORS.DARK); setBlock(map, EX + 3, y, z, COLORS.DARK); }
            const HY = EY + 8, HZ = EZ + 1;
            generateSphere(map, EX, HY, HZ, 2.0, COLORS.WHITE);
            setBlock(map, EX, HY, HZ + 2, COLORS.GOLD); setBlock(map, EX, HY - 0.5, HZ + 2, COLORS.GOLD);
            setBlock(map, EX - 1, HY + 0.5, HZ + 1, COLORS.BLACK); setBlock(map, EX + 1, HY + 0.5, HZ + 1, COLORS.BLACK);
            setBlock(map, EX - 1, EY, EZ, COLORS.TALON); setBlock(map, EX + 1, EY, EZ, COLORS.TALON);
        }
        buildMiniEagle(-10, 2, false);
        buildMiniEagle(10, -2, true);
        return Array.from(map.values());
    },

    Guitar: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorBody = 0xff2d78; // Hot pink
        const colorPickguard = 0xffffff; // White
        const colorNeck = 0x888888; // Silver/Gray
        const colorHead = 0x111111; // Black
        const colorStrings = 0xffffff;

        // 1. Guitar Body (rounded fender style)
        for (let y = -10; y <= -4; y++) {
            const width = y === -10 || y === -4 ? 2 : 3;
            for (let x = -width; x <= width; x++) {
                for (let z = -1; z <= 1; z++) {
                    // Cut out some corners to make it round
                    if (Math.abs(x) === width && Math.abs(z) === 1 && (y === -10 || y === -4)) continue;
                    setBlock(map, x, y, z, colorBody);
                }
            }
        }
        // Body horns/cutaways
        for (let z = -1; z <= 1; z++) {
            setBlock(map, -3, -3, z, colorBody);
            setBlock(map, -3, -2, z, colorBody);
            setBlock(map, 3, -3, z, colorBody);
        }

        // 2. Pickguard (front face)
        for (let y = -9; y <= -5; y++) {
            const pw = y === -9 || y === -5 ? 1 : 2;
            for (let x = -pw + 0.5; x <= pw - 0.5; x++) {
                setBlock(map, x, y, 1.2, colorPickguard);
            }
        }

        // 3. Neck (extending up from body)
        for (let y = -3; y <= 8; y++) {
            setBlock(map, 0, y, 0, colorNeck);
            setBlock(map, 0, y, 0.5, colorStrings); // String line
        }

        // 4. Headstock (tuning peg section)
        for (let y = 9; y <= 11; y++) {
            for (let x = -1; x <= 1; x++) {
                if (x === 0) {
                    setBlock(map, x, y, 0, colorHead);
                } else {
                    setBlock(map, x, y, 0, 0xffd700); // Golden tuning pegs
                }
            }
        }

        return Array.from(map.values());
    },

    Microphone: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorBase = 0x222222;
        const colorStand = 0xcccccc;
        const colorClip = 0x111111;
        const colorGrille = 0x888888;
        const colorAccent = 0xff2d78; // Hot pink ring

        // 1. Base (circular stand base)
        for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
                if (x*x + z*z <= 9) {
                    setBlock(map, x, -12, z, colorBase);
                }
            }
        }

        // 2. Stand pole
        for (let y = -11; y <= 5; y++) {
            setBlock(map, 0, y, 0, colorStand);
        }

        // 3. Clip/Joint
        for (let z = 0; z <= 2; z++) {
            setBlock(map, 0, 5, z, colorClip);
        }
        setBlock(map, 0, 6, 2, colorClip);

        // 4. Mic body and grille (inclined slightly forward)
        const my = 7;
        const mz = 3;
        // Handle
        for (let dy = -2; dy <= 0; dy++) {
            setBlock(map, 0, my + dy, mz + dy, colorClip);
        }
        // Pink accent ring
        setBlock(map, 0, my + 1, mz + 1, colorAccent);
        
        // Grille sphere
        generateSphere(map, 0, my + 3, mz + 3, 2.0, colorGrille);

        return Array.from(map.values());
    },

    Speaker: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorCab = 0x1a1a1a; // Almost black cabinet
        const colorGrille = 0x333333; // Dark grey grille
        const colorCone = 0xcccccc; // Silver/grey cones
        const colorDustCap = 0x111111; // Black center

        // 1. Outer Cabinet (box)
        for (let x = -5; x <= 5; x++) {
            for (let y = -12; y <= 0; y++) {
                for (let z = -4; z <= 4; z++) {
                    const isOuter = x === -5 || x === 5 || y === -12 || y === 0 || z === -4;
                    if (isOuter) {
                        setBlock(map, x, y, z, colorCab);
                    }
                }
            }
        }

        // 2. Front Grille
        for (let x = -4; x <= 4; x++) {
            for (let y = -11; y <= -1; y++) {
                setBlock(map, x, y, 4, colorGrille);
            }
        }

        // 3. Bottom Speaker (Large Cone)
        const bx = 0;
        const by = -8;
        const bz = 4.2;
        generateSphere(map, bx, by, bz, 2.2, colorCone);
        setBlock(map, bx, by, bz + 0.5, colorDustCap);

        // 4. Top Speaker (Tweeter / Mid Cone)
        const tx = 0;
        const ty = -3;
        const tz = 4.2;
        generateSphere(map, tx, ty, tz, 1.5, colorCone);
        setBlock(map, tx, ty, tz + 0.5, colorDustCap);

        // 5. Control Knobs at the top
        for (let x = -3; x <= 3; x += 2) {
            setBlock(map, x, 0.2, 3, 0xffd700); // Golden dial knobs
        }

        return Array.from(map.values());
    },

    GoldRecord: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorStand = 0x222222; // Black display stand
        const colorGold = 0xffd700; // Gold record
        const colorLabel = 0xff2d78; // Hot pink label
        const colorCenter = 0x111111; // Black center hole
        const colorPlaque = 0xeeeeee; // Silver info plaque

        // 1. Display base/stand
        for (let x = -5; x <= 5; x++) {
            for (let z = -2; z <= 2; z++) {
                setBlock(map, x, -12, z, colorStand);
            }
        }
        // Vertical back support frame
        for (let x = -5; x <= 5; x++) {
            for (let y = -11; y <= 2; y++) {
                setBlock(map, x, y, -1, colorStand);
            }
        }

        // 2. Gold Vinyl (flat circle oriented in X/Y plane at z=0)
        const rx = 0;
        const ry = -4;
        const rz = 0;
        for (let x = -5; x <= 5; x++) {
            for (let y = -9; y <= 1; y++) {
                const dx = x - rx;
                const dy = y - ry;
                const dist2 = dx*dx + dy*dy;
                if (dist2 <= 16 && dist2 > 0) {
                    setBlock(map, x, y, rz, colorGold);
                }
            }
        }

        // Center Label
        setBlock(map, rx, ry, rz, colorLabel);
        setBlock(map, rx - 1, ry, rz, colorLabel);
        setBlock(map, rx + 1, ry, rz, colorLabel);
        setBlock(map, rx, ry - 1, rz, colorLabel);
        setBlock(map, rx, ry + 1, rz, colorLabel);

        // Center hole
        setBlock(map, rx, ry, rz + 0.2, colorCenter);

        // 3. Info Plaque at the bottom
        for (let x = -2; x <= 2; x++) {
            for (let y = -11; y <= -10; y++) {
                setBlock(map, x, y, 0, colorPlaque);
            }
        }

        return Array.from(map.values());
    },

    Singer: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorJeans = 0x2e5c8a;
        const colorJeansShade = 0x1f3f5c;
        const colorShirt = 0xcc2222;
        const colorBolt = 0xffd700; // Gold lightning bolt
        const colorJacket = 0x111111;
        const colorJacketTrim = 0x333333;
        const colorSkin = 0xffe0bd;
        const colorMouth = 0xff8888;
        const colorHair = 0x221100; // Brown spiky hair
        const colorShoes = 0x222222;
        const colorSoles = 0xffffff;
        const colorMic = 0xcccccc;
        const colorMicStand = 0x444444;

        // 1. Detailed Shoes (White soles + black shoes) - footL & footR
        // Left shoe (slightly wider sole at -24)
        for (let x = -6; x <= -1; x++) {
            for (let y = -24; y <= -22; y++) {
                const zMin = (y === -24) ? -5 : -4;
                const zMax = (y === -24) ? 5 : 4;
                for (let z = zMin; z <= zMax; z++) {
                    const col = (y === -24) ? colorSoles : colorShoes;
                    setBlock(map, x, y, z, col, 'footL');
                }
            }
        }
        // Add boot laces & buckles for detail
        for (let y = -23; y <= -22; y++) {
            setBlock(map, -3, y, 4.1, 0xdddddd, 'footL'); // silver buckles
            setBlock(map, -2, y, 4.1, 0x111111, 'footL'); // black laces
        }

        // Right shoe (slightly wider sole at -24)
        for (let x = 1; x <= 6; x++) {
            for (let y = -24; y <= -22; y++) {
                const zMin = (y === -24) ? -5 : -4;
                const zMax = (y === -24) ? 5 : 4;
                for (let z = zMin; z <= zMax; z++) {
                    const col = (y === -24) ? colorSoles : colorShoes;
                    setBlock(map, x, y, z, col, 'footR');
                }
            }
        }
        // Add boot laces & buckles for detail
        for (let y = -23; y <= -22; y++) {
            setBlock(map, 3, y, 4.1, 0xdddddd, 'footR'); // silver buckles
            setBlock(map, 2, y, 4.1, 0x111111, 'footR'); // black laces
        }

        // 2. Legs (Jeans with shading/wrinkles) - calfL, calfR, thighL, thighR
        // Left Calf
        for (let x = -5; x <= -1; x++) {
            for (let y = -21; y <= -18; y++) {
                for (let z = -3; z <= 3; z++) {
                    const isOuter = x === -5 || z === -3 || z === 3;
                    const col = isOuter ? colorJeansShade : colorJeans;
                    setBlock(map, x, y, z, col, 'calfL');
                }
            }
        }
        // Right Calf
        for (let x = 1; x <= 5; x++) {
            for (let y = -21; y <= -18; y++) {
                for (let z = -3; z <= 3; z++) {
                    const isOuter = x === 5 || z === -3 || z === 3;
                    const col = isOuter ? colorJeansShade : colorJeans;
                    setBlock(map, x, y, z, col, 'calfR');
                }
            }
        }
        // Left Thigh
        for (let x = -5; x <= -1; x++) {
            for (let y = -17; y <= -11; y++) {
                for (let z = -3; z <= 3; z++) {
                    const isOuter = x === -5 || z === -3 || z === 3;
                    const col = isOuter ? colorJeansShade : colorJeans;
                    setBlock(map, x, y, z, col, 'thighL');
                }
            }
        }
        // Right Thigh
        for (let x = 1; x <= 5; x++) {
            for (let y = -17; y <= -11; y++) {
                for (let z = -3; z <= 3; z++) {
                    const isOuter = x === 5 || z === -3 || z === 3;
                    const col = isOuter ? colorJeansShade : colorJeans;
                    setBlock(map, x, y, z, col, 'thighR');
                }
            }
        }

        // Pelvis / Belt
        for (let x = -5; x <= 5; x++) {
            for (let y = -10; y <= -7; y++) {
                for (let z = -3; z <= 3; z++) {
                    const isBelt = y === -7;
                    const col = isBelt ? 0x111111 : colorJeans;
                    setBlock(map, x, y, z, col, 'pelvis');
                }
            }
        }
        // Gold belt buckle
        setBlock(map, 0, -7, 3.1, 0xffd700, 'pelvis');
        setBlock(map, -1, -7, 3.1, 0xffd700, 'pelvis');
        setBlock(map, 1, -7, 3.1, 0xffd700, 'pelvis');

        // Studded belt details
        for (let x = -5; x <= 5; x += 2) {
            if (x !== 0) {
                setBlock(map, x, -7, 3.1, 0xdddddd, 'pelvis');
                setBlock(map, x, -7, -3.1, 0xdddddd, 'pelvis');
            }
        }

        // Wallet chain on right hip
        setBlock(map, 3, -8, 3.1, 0xdddddd, 'pelvis');
        setBlock(map, 4, -9, 2.5, 0xdddddd, 'thighR');
        setBlock(map, 4.5, -10, 1.5, 0xdddddd, 'thighR');
        setBlock(map, 4.5, -11, 0.5, 0xdddddd, 'thighR');
        setBlock(map, 4, -12, -0.5, 0xdddddd, 'thighR');

        // Wallet chain on left hip
        setBlock(map, -3, -8, 3.1, 0xdddddd, 'pelvis');
        setBlock(map, -4, -9, 2.5, 0xdddddd, 'thighL');
        setBlock(map, -4.5, -10, 1.5, 0xdddddd, 'thighL');
        setBlock(map, -4.5, -11, 0.5, 0xdddddd, 'thighL');
        setBlock(map, -4, -12, -0.5, 0xdddddd, 'thighL');

        // 3. Torso (Jacket, shirt & golden lightning bolt)
        for (let x = -6; x <= 6; x++) {
            for (let y = -6; y <= 3; y++) {
                for (let z = -3; z <= 3; z++) {
                    const isJacket = Math.abs(x) >= 4 || z <= -2 || (z === 3 && Math.abs(x) >= 3);
                    const isBolt = z === 3 && y >= -2 && y <= 2 && (x === 0 || (y === 2 && x === 1) || (y === -2 && x === -1));
                    
                    let col = colorShirt;
                    if (isJacket) {
                        col = (y === 3) ? colorJacketTrim : colorJacket;
                    } else if (isBolt) {
                        col = colorBolt;
                    }
                    setBlock(map, x, y, z, col, 'torso');
                }
            }
        }

        // Shoulder Spikes & Jacket Lapels for detail
        for (let z = -3; z <= 3; z++) {
            setBlock(map, -6, 3.2, z, 0xdddddd, 'torso'); // left shoulder spikes
            setBlock(map, 6, 3.2, z, 0xdddddd, 'torso');  // right shoulder spikes
        }
        // Jacket lapels in front
        for (let y = -2; y <= 1; y++) {
            setBlock(map, -3, y, 3.1, colorJacketTrim, 'torso');
            setBlock(map, 3, y, 3.1, colorJacketTrim, 'torso');
        }

        // Guitar strap front
        for (let step = 0; step <= 10; step++) {
            const sx = Math.round(-5 + step * 0.9);
            const sy = Math.round(3 - step * 0.9);
            setBlock(map, sx, sy, 3.1, 0x553311, 'torso'); // brown strap
        }
        // Guitar strap back
        for (let step = 0; step <= 10; step++) {
            const sx = Math.round(-5 + step * 0.9);
            const sy = Math.round(3 - step * 0.9);
            setBlock(map, sx, sy, -3.1, 0x553311, 'torso');
        }

        // Leather jacket tails hanging down the back (attached to torso)
        for (let y = -21; y <= -7; y++) {
            const width = y <= -15 ? 5 : 6; // slightly tapers down
            for (let x = -width; x <= width; x++) {
                for (let z = -5; z <= -4; z++) {
                    // Cut a split in the middle-back of the coat
                    if (x === 0 && y <= -10) continue;
                    setBlock(map, x, y, z, colorJacket, 'torso');
                }
            }
        }

        // Slung guitar on the back (attached to torso)
        const colorGuitarBody = 0xff2d78; // Hot pink
        const colorGuitarNeck = 0x888888;
        const colorGuitarHead = 0x111111;
        const colorGuitarPegs = 0xffd700;

        for (let gx = -4; gx <= 1; gx++) {
            for (let gy = -5; gy <= -1; gy++) {
                for (let gz = -7; gz <= -6; gz++) { // Shifted slightly backward because of the coat tails
                    if (Math.abs(gx + 1.5) + Math.abs(gy + 3) <= 3) {
                        setBlock(map, gx, gy, gz, colorGuitarBody, 'torso');
                    }
                }
            }
        }
        for (let step = 0; step <= 12; step++) {
            const gx = Math.round(-1 + step * 0.5);
            const gy = Math.round(-1 + step * 0.8);
            setBlock(map, gx, gy, -6, colorGuitarNeck, 'torso');
            setBlock(map, gx, gy, -7, 0xffffff, 'torso'); // strings
        }
        for (let hstep = 13; hstep <= 15; hstep++) {
            const gx = Math.round(-1 + hstep * 0.5);
            const gy = Math.round(-1 + hstep * 0.8);
            setBlock(map, gx, gy, -7, colorGuitarHead, 'torso');
            setBlock(map, gx + 1, gy, -7, colorGuitarPegs, 'torso');
            setBlock(map, gx - 1, gy, -7, colorGuitarPegs, 'torso');
        }

        // 4. Arms
        // Left Arm (holding mic) - upperArmL, forearmL, handL
        // Upper Arm
        for (let x = -9; x <= -6; x++) {
            for (let y = 0; y <= 4; y++) {
                for (let z = -2; z <= 2; z++) {
                    setBlock(map, x, y, z, colorJacket, 'upperArmL');
                }
            }
        }
        // Forearm
        for (let x = -10; x <= -7; x++) {
            for (let y = -5; y <= -1; y++) {
                for (let z = 1; z <= 4; z++) {
                    setBlock(map, x, y, z, colorSkin, 'forearmL');
                }
            }
        }
        // Tattoo on left forearm
        setBlock(map, -10.1, -3, 2.5, 0x1f3f5c, 'forearmL');
        setBlock(map, -10.1, -4, 2.5, 0x1f3f5c, 'forearmL');
        setBlock(map, -10.1, -2, 2.5, 0x1f3f5c, 'forearmL');
        setBlock(map, -10.1, -3, 1.5, 0x1f3f5c, 'forearmL');
        setBlock(map, -10.1, -3, 3.5, 0x1f3f5c, 'forearmL');

        // Hand
        for (let x = -9; x <= -7; x++) {
            for (let y = -7; y <= -6; y++) {
                for (let z = 4; z <= 6; z++) {
                    setBlock(map, x, y, z, colorSkin, 'handL');
                }
            }
        }

        // Right Arm (rock sign fist) - upperArmR, forearmR, handR
        // Upper Arm
        for (let x = 6; x <= 9; x++) {
            for (let y = 0; y <= 5; y++) {
                for (let z = -2; z <= 2; z++) {
                    setBlock(map, x, y, z, colorJacket, 'upperArmR');
                }
            }
        }
        // Forearm
        for (let x = 6; x <= 9; x++) {
            for (let y = 6; y <= 9; y++) {
                for (let z = -2; z <= 2; z++) {
                    setBlock(map, x, y, z, colorSkin, 'forearmR');
                }
            }
        }
        // Tattoo on right forearm
        setBlock(map, 9.1, 7.5, 0, 0x1f3f5c, 'forearmR');
        setBlock(map, 9.1, 8.5, 0, 0x1f3f5c, 'forearmR');
        setBlock(map, 9.1, 6.5, 0, 0x1f3f5c, 'forearmR');
        setBlock(map, 9.1, 7.5, -1, 0x1f3f5c, 'forearmR');
        setBlock(map, 9.1, 7.5, 1, 0x1f3f5c, 'forearmR');

        // Hand
        for (let x = 5; x <= 9; x++) {
            for (let y = 10; y <= 12; y++) {
                for (let z = -2; z <= 2; z++) {
                    setBlock(map, x, y, z, colorSkin, 'handR');
                }
            }
        }
        // Index & Pinky fingers sticking up
        for (let y = 13; y <= 14; y++) {
            setBlock(map, 5, y, 0, colorSkin, 'handR');
            setBlock(map, 9, y, 0, colorSkin, 'handR');
        }

        // 5. Neck & Head
        // Neck
        for (let x = -1; x <= 1; x++) {
            for (let y = 4; y <= 5; y++) {
                for (let z = -1; z <= 1; z++) {
                    setBlock(map, x, y, z, colorSkin, 'head');
                }
            }
        }
        // Head sphere
        generateSphere(map, 0, 9, 0, 3.5, colorSkin, 1.0, 'head');

        // Nose & Ears & Earrings
        setBlock(map, 0, 9, 4, colorSkin, 'head');
        setBlock(map, 0, 8.7, 4, colorSkin, 'head');
        setBlock(map, -4, 9, 0, colorSkin, 'head');
        setBlock(map, -4, 8, 0, 0xdddddd, 'head');
        setBlock(map, -4, 7, 0, 0xdddddd, 'head'); // double earring L
        setBlock(map, 4, 9, 0, colorSkin, 'head');
        setBlock(map, 4, 8, 0, 0xdddddd, 'head');
        setBlock(map, 4, 7, 0, 0xdddddd, 'head');  // double earring R

        // Eyebrows
        setBlock(map, -2, 11, 3.2, 0x111111, 'head');
        setBlock(map, -1, 11, 3.2, 0x111111, 'head');
        setBlock(map, 1, 11, 3.2, 0x111111, 'head');
        setBlock(map, 2, 11, 3.2, 0x111111, 'head');

        // Open mouth with teeth
        for (let x = -1; x <= 1; x++) {
            setBlock(map, x, 8, 3, colorMouth, 'head');
        }
        setBlock(map, -1, 8.1, 3.1, 0xffffff, 'head');
        setBlock(map, 1, 8.1, 3.1, 0xffffff, 'head');

        // Sunglasses
        for (let x = -2; x <= 2; x++) {
            setBlock(map, x, 10, 3, 0x111111, 'head');
        }
        setBlock(map, -3, 10, 2.5, 0xffffff, 'head');
        setBlock(map, 3, 10, 2.5, 0xffffff, 'head');

        // Nose Ring
        setBlock(map, 1, 8.7, 4.1, 0xdddddd, 'head');

        // 6. Spiky Hair
        for (let x = -5; x <= 5; x++) {
            for (let y = 11; y <= 18; y++) {
                for (let z = -5; z <= 4; z++) {
                    const dx = x;
                    const dy = y - 11;
                    const dz = z + 0.5;
                    const dist = dx*dx + dy*dy + dz*dz;
                    if (dist <= 38) {
                        if (y >= 16) {
                            const isSpikeTip = (Math.abs(x) % 2 === 1 && Math.abs(z) % 2 === 1) || (x === 0 && z === 0);
                            if (!isSpikeTip) continue;
                        }
                        const isPinkStreak = Math.abs(x) === 2 || Math.abs(z) === 2;
                        const col = isPinkStreak ? 0xff2d78 : colorHair;
                        setBlock(map, x, y, z, col, 'head');
                    }
                }
            }
        }

        // 7. Microphone Stand & coiled cable & floor extension
        for (let y = -12; y <= 4; y++) {
            setBlock(map, -4, y, 5, colorMicStand, 'micStand');
            // Coiled cable
            const angle = y * 0.8;
            const cx = -4 + Math.round(Math.cos(angle) * 1.2);
            const cz = 5 + Math.round(Math.sin(angle) * 1.2);
            setBlock(map, cx, y, cz, 0x111111, 'micStand');
        }
        setBlock(map, -3, 5, 5, 0x111111, 'micStand'); // clip joint
        setBlock(map, -4, 6, 5, colorMic, 'mic');
        setBlock(map, -4, 7, 5, colorMic, 'mic');

        // Floor cable extension
        for (let cx = -8; cx <= -4; cx++) {
            setBlock(map, cx, -12, 5.5, 0x111111, 'micStand');
        }

        // Mic clip ring (around mic stand joint)
        setBlock(map, -3, 6, 5, 0x111111, 'micStand');
        setBlock(map, -3, 7, 5, 0x111111, 'micStand');
        setBlock(map, -5, 6, 5, 0x111111, 'micStand');
        setBlock(map, -5, 7, 5, 0x111111, 'micStand');
        setBlock(map, -4, 6, 4, 0x111111, 'micStand');
        setBlock(map, -4, 7, 4, 0x111111, 'micStand');

        // Stage monitor wedge speaker
        for (let mx = -11; mx <= -5; mx++) {
            for (let my = -12; my <= -8; my++) {
                for (let mz = 3; mz <= 8; mz++) {
                    const dy = my - (-12);
                    const dz = mz - 3;
                    if (dy + dz <= 5) {
                        const isGrille = (dy + dz === 5);
                        const col = isGrille ? 0x333333 : 0x1a1a1a;
                        setBlock(map, mx, my, mz, col, 'micStand');
                    }
                }
            }
        }

        // Volume knobs on stage monitor
        setBlock(map, -9, -7, 3, 0xffd700, 'micStand');
        setBlock(map, -8, -7, 3, 0xffd700, 'micStand');
        setBlock(map, -7, -7, 3, 0xffd700, 'micStand');

        return Array.from(map.values());
    },

    Keyboard: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorStand = 0x333333;
        const colorBody = 0x111111;
        const colorWhiteKey = 0xffffff;
        const colorBlackKey = 0x111111;

        // 1. X-Stand (legs crossing)
        for (let y = -12; y <= -2; y++) {
            const xA = -4 + Math.round((y + 12) * 0.8);
            const xB = 4 - Math.round((y + 12) * 0.8);
            
            for (let z = -1; z <= 1; z += 2) {
                setBlock(map, xA, y, z, colorStand);
                setBlock(map, xB, y, z, colorStand);
            }
        }

        // 2. Keyboard Main Chassis (Wide box)
        for (let x = -7; x <= 7; x++) {
            for (let y = -2; y <= 0; y++) {
                for (let z = -2; z <= 2; z++) {
                    setBlock(map, x, y, z, colorBody);
                }
            }
        }

        // 3. Piano Keys (front row)
        for (let x = -6; x <= 6; x++) {
            setBlock(map, x, 0.2, 1, colorWhiteKey);
            setBlock(map, x, 0.2, 2, colorWhiteKey);
            if (x % 3 !== 0 && x !== -6 && x !== 6) {
                setBlock(map, x, 0.5, 1, colorBlackKey);
            }
        }

        // 4. Knobs/Faders on the board
        setBlock(map, -5, 0.2, -1, 0xff2d78); // Red light
        setBlock(map, -3, 0.2, -1, 0x00ff00); // Green dial
        setBlock(map, -1, 0.2, -1, 0xffd700); // Yellow dial

        return Array.from(map.values());
    },

    Drums: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorShell = 0xcc2222; // Red drum shells
        const colorHead = 0xeeeeee; // White drum heads
        const colorHardware = 0x888888; // Silver hardware
        const colorCymbal = 0xffd700; // Gold cymbals

        // 1. Bass Drum (Kick Drum) - oriented along Z
        const bz = 0;
        for (let x = -3; x <= 3; x++) {
            for (let y = -12; y <= -6; y++) {
                const cy = y - (-9);
                if (x*x + cy*cy <= 9) {
                    for (let z = -2; z <= 2; z++) {
                        const isHead = z === -2 || z === 2;
                        setBlock(map, x, y, z, isHead ? colorHead : colorShell);
                    }
                }
            }
        }
        for (let y = -12; y <= -10; y++) {
            setBlock(map, -4, y, -2, colorHardware);
            setBlock(map, 4, y, -2, colorHardware);
        }

        // 2. Snare Drum (left side)
        const sy = -6;
        for (let x = -4; x <= -2; x++) {
            for (let z = -1; z <= 1; z++) {
                setBlock(map, x, sy, z, colorShell);
                setBlock(map, x, sy + 1, z, colorHead);
            }
        }
        for (let y = -12; y <= -7; y++) {
            setBlock(map, -3, y, 0, colorHardware);
        }

        // 3. Tom Drum (mounted on kick)
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                setBlock(map, x, -5, z, colorShell);
                setBlock(map, x, -4, z, colorHead);
            }
        }

        // 4. Cymbal (Crash/Ride on right)
        for (let y = -12; y <= -1; y++) {
            setBlock(map, 4, y, 1, colorHardware);
        }
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                if (dx*dx + dz*dz <= 4) {
                    setBlock(map, 4 + dx, -1, 1 + dz, colorCymbal);
                }
            }
        }

        return Array.from(map.values());
    },

    Cassette: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const colorShell = 0x222222;
        const colorLabel = 0xffffff;
        const colorLabelAccent = 0xff2d78; // Hot pink strip
        const colorReel = 0x888888;
        const colorHole = 0x111111;

        // 1. Cassette Outer Body (Flat rectangle in X/Y plane)
        for (let x = -6; x <= 6; x++) {
            for (let y = -9; y <= -1; y++) {
                for (let z = -1; z <= 1; z++) {
                    if (Math.abs(x) === 6 && (y === -9 || y === -1)) continue;
                    setBlock(map, x, y, z, colorShell);
                }
            }
        }
        for (let x = -4; x <= 4; x++) {
            setBlock(map, x, -10, 0, colorShell);
        }

        // 2. White sticker Label
        for (let x = -4; x <= 4; x++) {
            for (let y = -7; y <= -3; y++) {
                const isStrip = y === -7;
                const col = isStrip ? colorLabelAccent : colorLabel;
                setBlock(map, x, y, 1.1, col);
                setBlock(map, x, y, -1.1, col);
            }
        }

        // 3. Reels & Tape Window
        const rx1 = -2;
        const rx2 = 2;
        const ry = -5;
        setBlock(map, rx1, ry, 1.2, colorReel);
        setBlock(map, rx1, ry, -1.2, colorReel);
        setBlock(map, rx1, ry, 0, colorHole);

        setBlock(map, rx2, ry, 1.2, colorReel);
        setBlock(map, rx2, ry, -1.2, colorReel);
        setBlock(map, rx2, ry, 0, colorHole);

        for (let x = -1; x <= 1; x++) {
            setBlock(map, x, -5, 1.2, 0x555555);
            setBlock(map, x, -5, -1.2, 0x555555);
        }

        return Array.from(map.values());
    },

    Body: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        
        // Color palettes for realistic shading
        const colorSkin = 0xffe0bd;         // Base skin
        const colorSkinShade = 0xe5c298;    // Shadow skin for creases and muscles
        const colorSkinHighlight = 0xffeed6;// Highlight skin for prominent muscles
        const colorNipple = 0xcc9988;       // Nipple details
        const colorLips = 0xffa0a0;         // Natural pink lips
        const colorHair = 0x5a3825;         // Natural brown hair
        const colorEyes = 0x3d2314;         // Dark brown eyes
        const colorWhite = 0xffffff;

        // --- Left Foot ---
        for (let y = -24; y <= -22; y++) {
            const xMin = y === -24 ? -6 : -5;
            const xMax = y === -24 ? -1 : -2;
            const zMin = y === -24 ? -5 : -4;
            const zMax = y === -24 ? 5 : 3;
            
            for (let x = xMin; x <= xMax; x++) {
                for (let z = zMin; z <= zMax; z++) {
                    const isHeel = z <= -2;
                    const isSole = y === -24;
                    const col = isHeel ? colorSkinShade : (isSole ? colorSkinShade : colorSkin);
                    setBlock(map, x, y, z, col, 'footL');
                }
            }
        }
        // Individual toes left foot
        for (let tx = -5; tx <= -1; tx++) {
            setBlock(map, tx, -24, 5.2, colorSkinHighlight, 'footL');
        }

        // --- Right Foot ---
        for (let y = -24; y <= -22; y++) {
            const xMin = y === -24 ? 1 : 2;
            const xMax = y === -24 ? 7 : 6;
            const zMin = y === -24 ? -5 : -4;
            const zMax = y === -24 ? 5 : 3;
            
            for (let x = xMin; x <= xMax; x++) {
                for (let z = zMin; z <= zMax; z++) {
                    const isHeel = z <= -2;
                    const isSole = y === -24;
                    const col = isHeel ? colorSkinShade : (isSole ? colorSkinShade : colorSkin);
                    setBlock(map, x, y, z, col, 'footR');
                }
            }
        }
        // Individual toes right foot
        for (let tx = 1; tx <= 5; tx++) {
            setBlock(map, tx, -24, 5.2, colorSkinHighlight, 'footR');
        }

        // --- Left Calf ---
        for (let y = -21; y <= -18; y++) {
            const factor = (y - (-21)) / 3; // 0 to 1
            const rx = 2.8 + factor * 0.6;
            const rz = rx * 1.1; // slightly deeper than wide for calf muscle
            for (let x = -6; x <= -1; x++) {
                for (let z = -5; z <= 4; z++) {
                    const dx = x - (-3.5);
                    const dz = z - (-0.5); // bulge backwards
                    if ((dx*dx)/(rx*rx) + (dz*dz)/(rz*rz) <= 1.0) {
                        const col = z <= -2 ? colorSkinShade : colorSkin;
                        setBlock(map, x, y, z, col, 'calfL');
                    }
                }
            }
        }

        // --- Right Calf ---
        for (let y = -21; y <= -18; y++) {
            const factor = (y - (-21)) / 3;
            const rx = 2.8 + factor * 0.6;
            const rz = rx * 1.1;
            for (let x = 1; x <= 6; x++) {
                for (let z = -5; z <= 4; z++) {
                    const dx = x - 3.5;
                    const dz = z - (-0.5);
                    if ((dx*dx)/(rx*rx) + (dz*dz)/(rz*rz) <= 1.0) {
                        const col = z <= -2 ? colorSkinShade : colorSkin;
                        setBlock(map, x, y, z, col, 'calfR');
                    }
                }
            }
        }

        // --- Left Thigh ---
        for (let y = -17; y <= -11; y++) {
            const factor = (y - (-17)) / 6; // 0 to 1
            const rx = 3.2 + factor * 0.8; // Thicker at top (hip)
            const rz = rx * 1.1; // Deeper for hamstrings and quads
            for (let x = -7; x <= 0; x++) {
                for (let z = -5; z <= 5; z++) {
                    const dx = x - (-3.5);
                    const dz = z;
                    if ((dx*dx)/(rx*rx) + (dz*dz)/(rz*rz) <= 1.0) {
                        const col = z >= 2 ? colorSkinHighlight : (z <= -2 ? colorSkinShade : colorSkin);
                        setBlock(map, x, y, z, col, 'thighL');
                    }
                }
            }
        }

        // --- Right Thigh ---
        for (let y = -17; y <= -11; y++) {
            const factor = (y - (-17)) / 6;
            const rx = 3.2 + factor * 0.8;
            const rz = rx * 1.1;
            for (let x = 0; x <= 7; x++) {
                for (let z = -5; z <= 5; z++) {
                    const dx = x - 3.5;
                    const dz = z;
                    if ((dx*dx)/(rx*rx) + (dz*dz)/(rz*rz) <= 1.0) {
                        const col = z >= 2 ? colorSkinHighlight : (z <= -2 ? colorSkinShade : colorSkin);
                        setBlock(map, x, y, z, col, 'thighR');
                    }
                }
            }
        }

        // --- Pelvis & Hips ---
        for (let y = -10; y <= -7; y++) {
            const rx = 6.4;
            const rz = 5.2;
            for (let x = -8; x <= 8; x++) {
                for (let z = -5; z <= 5; z++) {
                    const dx = x;
                    const dz = z - (-0.3);
                    if ((dx*dx)/(rx*rx) + (dz*dz)/(rz*rz) <= 1.0) {
                        const isCleavage = x === 0 && z <= -2;
                        const col = isCleavage ? colorSkinShade : (z <= -2 ? colorSkinHighlight : colorSkin);
                        setBlock(map, x, y, z, col, 'pelvis');
                    }
                }
            }
        }

        // --- Torso (Abdomen and Chest muscles) ---
        for (let y = -6; y <= 3; y++) {
            const waistDist = Math.abs(y - (-3.5));
            const widthFactor = 1.0 + (y >= -3.5 ? (y - (-3.5)) * 0.22 : waistDist * 0.15);
            const rx = 5.2 * widthFactor; // Widens towards chest
            const rz = 4.2 + (y >= -3.5 ? (y - (-3.5)) * 0.12 : 0);
            
            for (let x = -8; x <= 8; x++) {
                for (let z = -5; z <= 6; z++) {
                    const dx = x;
                    const dz = z;
                    if ((dx*dx)/(rx*rx) + (dz*dz)/(rz*rz) <= 1.0) {
                        let col = colorSkin;
                        
                        // Pectoral muscles at the chest front
                        const isPect = y >= 0 && y <= 2 && z >= 3.8 && Math.abs(x) <= 5.5;
                        if (isPect) {
                            col = colorSkinHighlight;
                            if (Math.abs(x) < 0.8) col = colorSkinShade;
                        }
                        
                        // Abdominal definition (six pack!)
                        const isAbs = y >= -5 && y <= -1 && z >= 3.8 && Math.abs(x) <= 3.0;
                        if (isAbs) {
                            const horizCut = y === -3 || y === -5 || y === -1;
                            const vertCut = Math.abs(x) < 0.6 || (Math.abs(x) >= 2.0 && Math.abs(x) <= 2.5);
                            col = (horizCut || vertCut) ? colorSkinShade : colorSkinHighlight;
                        }
                        
                        // Back spine groove
                        if (z <= -3.0 && Math.abs(x) < 0.8) {
                            col = colorSkinShade;
                        }

                        setBlock(map, x, y, z, col, 'torso');
                    }
                }
            }
        }

        // Nipple details
        setBlock(map, -3.2, 1, 5.2, colorNipple, 'torso');
        setBlock(map, 3.2, 1, 5.2, colorNipple, 'torso');

        // --- Left Arm ---
        // Upper Arm
        for (let y = 0; y <= 4; y++) {
            const isDeltoid = y >= 2;
            const r = isDeltoid ? 2.5 : 2.0;
            for (let x = -11; x <= -5; x++) {
                for (let z = -3; z <= 3; z++) {
                    const dx = x - (-8.0);
                    const dz = z;
                    if (dx*dx + dz*dz <= r*r) {
                        const col = isDeltoid && z >= 1 ? colorSkinHighlight : colorSkin;
                        setBlock(map, x, y, z, col, 'upperArmL');
                    }
                }
            }
        }
        // Forearm
        for (let y = -5; y <= -1; y++) {
            const factor = (y - (-5)) / 4; // 0 to 1
            const r = 1.6 + factor * 0.5;
            for (let x = -12; x <= -6; x++) {
                for (let z = 0; z <= 5; z++) {
                    const dx = x - (-9.0);
                    const dz = z - 2.5;
                    if (dx*dx + dz*dz <= r*r) {
                        const col = factor > 0.6 && z >= 3.5 ? colorSkinHighlight : colorSkin;
                        setBlock(map, x, y, z, col, 'forearmL');
                    }
                }
            }
        }
        // Hand & 5 Fingers L
        for (let x = -11; x <= -6; x++) {
            for (let y = -7; y <= -6; y++) {
                for (let z = 3; z <= 6; z++) {
                    setBlock(map, x, y, z, colorSkin, 'handL');
                }
            }
        }
        // Individual fingers
        setBlock(map, -11, -8, 5, colorSkinHighlight, 'handL'); // thumb
        setBlock(map, -10, -8, 6, colorSkinHighlight, 'handL');  // index
        setBlock(map, -8.5, -8, 6.2, colorSkinHighlight, 'handL');// middle
        setBlock(map, -7.5, -8, 6, colorSkinHighlight, 'handL');  // ring
        setBlock(map, -6, -8, 5.5, colorSkinHighlight, 'handL');// pinky

        // --- Right Arm ---
        // Upper Arm
        for (let y = 0; y <= 5; y++) {
            const isDeltoid = y >= 3;
            const r = isDeltoid ? 2.5 : 2.0;
            for (let x = 5; x <= 11; x++) {
                for (let z = -3; z <= 3; z++) {
                    const dx = x - 8.0;
                    const dz = z;
                    if (dx*dx + dz*dz <= r*r) {
                        const col = isDeltoid && z >= 1 ? colorSkinHighlight : colorSkin;
                        setBlock(map, x, y, z, col, 'upperArmR');
                    }
                }
            }
        }
        // Forearm
        for (let y = 6; y <= 9; y++) {
            const factor = (y - 6) / 3;
            const r = 2.1 - factor * 0.5;
            for (let x = 6; x <= 12; x++) {
                for (let z = -3; z <= 3; z++) {
                    const dx = x - 9.0;
                    const dz = z;
                    if (dx*dx + dz*dz <= r*r) {
                        const col = factor < 0.4 && z >= 1 ? colorSkinHighlight : colorSkin;
                        setBlock(map, x, y, z, col, 'forearmR');
                    }
                }
            }
        }
        // Hand & 5 Fingers R
        for (let x = 6; x <= 11; x++) {
            for (let y = 10; y <= 11; y++) {
                for (let z = -3; z <= 1; z++) {
                    setBlock(map, x, y, z, colorSkin, 'handR');
                }
            }
        }
        // Individual fingers pointing up/curled
        setBlock(map, 11, 12, 0, colorSkinHighlight, 'handR');   // thumb
        setBlock(map, 9.5, 12, 1, colorSkinHighlight, 'handR');   // index
        setBlock(map, 8.5, 12, 1.2, colorSkinHighlight, 'handR'); // middle
        setBlock(map, 7.5, 12, 1, colorSkinHighlight, 'handR');   // ring
        setBlock(map, 6, 12, 0.5, colorSkinHighlight, 'handR'); // pinky

        // --- Neck & Head ---
        // Neck
        for (let x = -2; x <= 2; x++) {
            for (let y = 4; y <= 5; y++) {
                for (let z = -2; z <= 2; z++) {
                    if (x*x + z*z <= 5.0) {
                        const col = Math.abs(x) === 1 && z >= 1 ? colorSkinHighlight : colorSkin;
                        setBlock(map, x, y, z, col, 'head');
                    }
                }
            }
        }
        // Head sphere
        generateSphere(map, 0, 9, 0, 3.6, colorSkin, 1.0, 'head');

        // Nose
        setBlock(map, 0, 9, 4.0, colorSkinHighlight, 'head');
        setBlock(map, 0, 8.6, 4.0, colorSkinHighlight, 'head');

        // Cheeks & Chin
        setBlock(map, -2.0, 8.5, 2.8, colorSkinHighlight, 'head'); // cheek L
        setBlock(map, 2.0, 8.5, 2.8, colorSkinHighlight, 'head');  // cheek R
        setBlock(map, 0, 7.0, 3.0, colorSkinHighlight, 'head');    // chin

        // Lips
        setBlock(map, -0.8, 7.9, 3.7, colorLips, 'head');
        setBlock(map, 0, 7.9, 3.8, colorLips, 'head');
        setBlock(map, 0.8, 7.9, 3.7, colorLips, 'head');
        setBlock(map, -0.6, 7.6, 3.6, colorLips, 'head');
        setBlock(map, 0, 7.6, 3.7, colorLips, 'head');
        setBlock(map, 0.6, 7.6, 3.6, colorLips, 'head');

        // Eyes
        setBlock(map, -1.3, 9.5, 3.4, colorWhite, 'head');
        setBlock(map, -1.3, 9.5, 3.6, colorEyes, 'head');
        setBlock(map, 1.3, 9.5, 3.4, colorWhite, 'head');
        setBlock(map, 1.3, 9.5, 3.6, colorEyes, 'head');

        // Ears
        setBlock(map, -3.8, 9, 0, colorSkin, 'head');
        setBlock(map, 3.8, 9, 0, colorSkin, 'head');

        // Hair (Detailed natural hair overlay)
        for (let x = -5; x <= 5; x++) {
            for (let y = 10; y <= 14; y++) {
                for (let z = -5; z <= 4; z++) {
                    const dx = x;
                    const dy = y - 10;
                    const dz = z + 0.3;
                    if (dx*dx + dy*dy + dz*dz <= 18) {
                        if (z >= 3.0 && y <= 11) continue;
                        setBlock(map, x, y, z, colorHair, 'head');
                    }
                }
            }
        }

        return Array.from(map.values());
    }
};
