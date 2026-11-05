/**
 * Greyagram - Collision-Free Diagram Layout Engine
 * Mengatur tata letak awal node diagram secara otomatis, proporsional, dan bebas tabrakan.
 * Dilengkapi pencegahan siklus rekursif (cycle prevention) dan alignment barycenter.
 */

window.DiagramLayout = (function () {
    'use strict';

    const DEFAULT_CONFIG = {
        nodeWidth: 260,
        nodeMinHeight: 140,
        horizontalGap: 90,
        verticalGap: 160,       // Koridor horizontal lapang untuk jalur multi-track Visio
        startX: 100,
        startY: 100
    };

    /**
     * Hitung posisi (x, y) untuk setiap kelas berdasarkan relasi hierarki
     * @param {Array} classes 
     * @param {Array} relations 
     * @param {Object} customConfig 
     * @returns {Map<string, {x: number, y: number, width: number, height: number}>}
     */
    function computeLayout(classes, relations, customConfig) {
        const config = Object.assign({}, DEFAULT_CONFIG, customConfig || {});
        const positions = new Map();

        if (!classes || classes.length === 0) {
            return positions;
        }

        // Buat graph adjacency
        const inDegree = new Map();
        const outNeighbors = new Map();

        classes.forEach(cls => {
            inDegree.set(cls.id, 0);
            outNeighbors.set(cls.id, []);
        });

        relations.forEach(rel => {
            // Hindari relasi mandiri mempengaruhi derajat hierarki
            if (rel.source === rel.target) return;

            if (outNeighbors.has(rel.source) && inDegree.has(rel.target)) {
                outNeighbors.get(rel.source).push(rel.target);
                inDegree.set(rel.target, (inDegree.get(rel.target) || 0) + 1);
            }
        });

        // Hitung perkiraan tinggi setiap node berdasarkan jumlah atribut dan metode
        function estimateNodeHeight(cls) {
            const headerHeight = cls.stereotype ? 62 : 48;
            const attrCount = (cls.attributes && cls.attributes.length) || 0;
            const methodCount = (cls.methods && cls.methods.length) || 0;
            const totalMembers = attrCount + methodCount;
            const memberHeight = Math.max(1, totalMembers) * 26;
            const dividerHeight = (attrCount > 0 && methodCount > 0) ? 14 : 0;
            const bodyPadding = 24;
            return Math.max(config.nodeMinHeight, headerHeight + bodyPadding + dividerHeight + memberHeight);
        }

        // Tentukan tingkat hierarki (rank / level) menggunakan Topological Sort aman dari siklus
        const levels = new Map();
        const queue = [];
        const maxLevelLimit = Math.max(2, classes.length);

        classes.forEach(cls => {
            if ((inDegree.get(cls.id) || 0) === 0) {
                levels.set(cls.id, 0);
                queue.push(cls.id);
            }
        });

        // Jika semua memiliki derajat masuk > 0 (siklus murni), inisialisasi node pertama
        if (queue.length === 0 && classes.length > 0) {
            levels.set(classes[0].id, 0);
            queue.push(classes[0].id);
        }

        let stepCount = 0;
        const maxSteps = classes.length * 5;

        while (queue.length > 0 && stepCount < maxSteps) {
            stepCount++;
            const currentId = queue.shift();
            const currentLevel = levels.get(currentId) || 0;
            const neighbors = outNeighbors.get(currentId) || [];

            neighbors.forEach(neighborId => {
                const existingLevel = levels.get(neighborId);
                const nextLevel = currentLevel + 1;

                if (nextLevel < maxLevelLimit) {
                    if (existingLevel === undefined || nextLevel > existingLevel) {
                        levels.set(neighborId, nextLevel);
                        queue.push(neighborId);
                    }
                } else if (existingLevel === undefined) {
                    levels.set(neighborId, maxLevelLimit - 1);
                }
            });
        }

        // Pastikan SEMUA kelas pasti memiliki level terdefinisi
        classes.forEach((cls, idx) => {
            if (!levels.has(cls.id)) {
                levels.set(cls.id, idx % 3);
            }
        });

        // Kelompokkan node berdasarkan level
        const levelGroups = new Map();
        classes.forEach(cls => {
            const lvl = levels.get(cls.id) || 0;
            if (!levelGroups.has(lvl)) {
                levelGroups.set(lvl, []);
            }
            levelGroups.get(lvl).push(cls);
        });

        // Urutkan key level
        const sortedLevelKeys = Array.from(levelGroups.keys()).sort((a, b) => a - b);

        // Hitung koordinat x dan y presisi dengan Barycenter heuristic untuk menyelaraskan garis vertikal lurus
        let currentY = config.startY;

        sortedLevelKeys.forEach((lvl, lvlIdx) => {
            const group = levelGroups.get(lvl);

            // Jika bukan baris pertama, urutkan kartu berdasarkan rata-rata posisi horizontal relasinya di level sebelumnya
            if (lvlIdx > 0) {
                group.sort((a, b) => {
                    const avgA = getRelatedAverageX(a.id, relations, positions, config.startX);
                    const avgB = getRelatedAverageX(b.id, relations, positions, config.startX);
                    return avgA - avgB;
                });
            }

            const totalWidth = group.length * config.nodeWidth + (group.length - 1) * config.horizontalGap;
            let startX = Math.max(config.startX, (1200 - totalWidth) / 2);

            let maxRowHeight = config.nodeMinHeight;

            group.forEach((cls, index) => {
                const nodeHeight = estimateNodeHeight(cls);
                maxRowHeight = Math.max(maxRowHeight, nodeHeight);

                // Coba posisikan tepat di bawah parent langsung jika hanya memiliki 1 parent untuk garis vertikal lurus
                let nodeX = startX + index * (config.nodeWidth + config.horizontalGap);
                if (lvlIdx > 0) {
                    const directParentX = getDirectParentCenter(cls.id, relations, positions);
                    if (directParentX !== null) {
                        const targetX = Math.round(directParentX - config.nodeWidth / 2);
                        const prevNodeX = index > 0 ? (positions.get(group[index - 1].id).x + config.nodeWidth + config.horizontalGap) : -Infinity;
                        if (targetX >= prevNodeX) {
                            nodeX = targetX;
                        }
                    }
                }

                positions.set(cls.id, {
                    x: Math.round(nodeX),
                    y: Math.round(currentY),
                    width: config.nodeWidth,
                    height: nodeHeight
                });
            });

            // Beri ruang koridor lapang (verticalGap) antar baris
            currentY += maxRowHeight + config.verticalGap;
        });

        // Pastikan tidak ada tabrakan/tumpang tindih horizontal & vertikal
        resolveCollisions(positions, config);

        return positions;
    }

    /**
     * Dapatkan rata-rata posisi X dari kartu-kartu yang berelasi di baris sebelumnya
     */
    function getRelatedAverageX(nodeId, relations, positions, fallbackX) {
        let sumX = 0;
        let count = 0;

        relations.forEach(rel => {
            if (rel.source === rel.target) return;

            if (rel.target === nodeId && positions.has(rel.source)) {
                const p = positions.get(rel.source);
                sumX += p.x + p.width / 2;
                count++;
            } else if (rel.source === nodeId && positions.has(rel.target)) {
                const p = positions.get(rel.target);
                sumX += p.x + p.width / 2;
                count++;
            }
        });

        return count > 0 ? (sumX / count) : fallbackX;
    }

    /**
     * Dapatkan titik tengah horizontal kartu parent jika hanya ada 1 relasi vertikal
     */
    function getDirectParentCenter(nodeId, relations, positions) {
        const parents = [];
        relations.forEach(rel => {
            if (rel.source === rel.target) return;
            if (rel.target === nodeId && positions.has(rel.source)) {
                parents.push(positions.get(rel.source));
            }
        });

        if (parents.length === 1) {
            return parents[0].x + parents[0].width / 2;
        }
        return null;
    }

    /**
     * Pastikan tidak ada bounding box yang saling tumpang tindih
     */
    function resolveCollisions(positions, config) {
        const padding = 36;
        const keys = Array.from(positions.keys());

        for (let pass = 0; pass < 3; pass++) {
            let collisionFound = false;

            for (let i = 0; i < keys.length; i++) {
                const posA = positions.get(keys[i]);
                for (let j = i + 1; j < keys.length; j++) {
                    const posB = positions.get(keys[j]);

                    const overlapX = (posA.x < posB.x + posB.width + padding) && (posA.x + posA.width + padding > posB.x);
                    const overlapY = (posA.y < posB.y + posB.height + padding) && (posA.y + posA.height + padding > posB.y);

                    if (overlapX && overlapY) {
                        collisionFound = true;
                        if (Math.abs(posA.x - posB.x) < Math.abs(posA.y - posB.y)) {
                            posB.y = posA.y + posA.height + config.verticalGap / 2;
                        } else {
                            posB.x = posA.x + posA.width + config.horizontalGap / 2;
                        }
                    }
                }
            }

            if (!collisionFound) break;
        }
    }

    return {
        computeLayout: computeLayout
    };
})();
