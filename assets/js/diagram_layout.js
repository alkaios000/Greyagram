/**
 * Greyagram - Multi-Algorithm Diagram Layout Engine (dbdiagram.io Grade)
 * Menyediakan 4 algoritma penataan otomatis persis seperti dbdiagram.io:
 * 1. Left-right : Susunan kolom kiri ke kanan mengikuti rantai foreign-key.
 * 2. Pipeline   : Susunan bertingkat (stages) kiri ke kanan berdasar lineage dependensi.
 * 3. Snowflake  : Susunan radial/bintang dengan tabel paling sentral di tengah.
 * 4. Compact    : Susunan kisi persegi panjang kompak dan hemat ruang.
 */

window.DiagramLayout = (function () {
    'use strict';

    const DEFAULT_CONFIG = {
        nodeWidth: 260,          // Lebar kartu sedikit disesuaikan agar teks lebih besar muat leluasa
        nodeMinHeight: 120,
        horizontalGap: 50,       // Kompak & tidak terlalu jauh
        verticalGap: 85,         // Jarak antar baris kompak & koridor pas
        startX: 60,
        startY: 60
    };

    /**
     * Hitung perkiraan tinggi setiap node berdasarkan jumlah atribut dan metode
     */
    function estimateNodeHeight(cls, config) {
        const headerHeight = cls.stereotype ? 60 : 48;
        const attrCount = (cls.attributes && cls.attributes.length) || 0;
        const methodCount = (cls.methods && cls.methods.length) || 0;
        const totalMembers = attrCount + methodCount;
        const memberHeight = Math.max(1, totalMembers) * 25; // Sesuai tinggi baris teks baru yang lebih besar
        const dividerHeight = (attrCount > 0 && methodCount > 0) ? 12 : 0;
        const bodyPadding = 22;
        return Math.max(config.nodeMinHeight, headerHeight + bodyPadding + dividerHeight + memberHeight);
    }

    /**
     * Hitung metrik graf: derajat masuk, derajat keluar, dan total relasi
     */
    function buildGraphMetrics(classes, relations) {
        const inDegree = new Map();
        const outNeighbors = new Map();
        const inNeighbors = new Map();
        const totalDegree = new Map();

        classes.forEach(cls => {
            inDegree.set(cls.id, 0);
            outNeighbors.set(cls.id, []);
            inNeighbors.set(cls.id, []);
            totalDegree.set(cls.id, 0);
        });

        relations.forEach(rel => {
            if (rel.source === rel.target) return;
            if (outNeighbors.has(rel.source) && inDegree.has(rel.target)) {
                outNeighbors.get(rel.source).push(rel.target);
                inNeighbors.get(rel.target).push(rel.source);
                inDegree.set(rel.target, (inDegree.get(rel.target) || 0) + 1);
                totalDegree.set(rel.source, (totalDegree.get(rel.source) || 0) + 1);
                totalDegree.set(rel.target, (totalDegree.get(rel.target) || 0) + 1);
            }
        });

        return { inDegree, outNeighbors, inNeighbors, totalDegree };
    }

    /**
     * Helper membagi array menjadi sub-kolom yang seimbang (maksimal maxPerCol kartu per kolom)
     */
    function splitIntoBalancedColumns(items, maxPerCol = 3) {
        if (!items || items.length <= maxPerCol) return [items || []];
        const numCols = Math.ceil(items.length / maxPerCol);
        const perCol = Math.ceil(items.length / numCols);
        const cols = [];
        for (let i = 0; i < items.length; i += perCol) {
            cols.push(items.slice(i, i + perCol));
        }
        return cols;
    }

    /**
     * 1. ALGORITMA LEFT-RIGHT (Standard dbdiagram.io)
     * "Arrange tables left to right following their foreign-key relationships.
     * Best for schemas with long relationship chains."
     * Menghasilkan kolom kiri-ke-kanan yang kompak dan rapi, tanpa jarak membentang.
     */
    function layoutLeftRight(classes, relations, config, metrics) {
        const positions = new Map();
        const { inDegree, outNeighbors } = metrics;

        const connected = classes.filter(c => (outNeighbors.get(c.id) || []).length > 0 || (inDegree.get(c.id) || 0) > 0);
        const standalone = classes.filter(c => (outNeighbors.get(c.id) || []).length === 0 && (inDegree.get(c.id) || 0) === 0);

        if (connected.length === 0) {
            return layoutTopDown(classes, relations, config, metrics);
        }

        const levels = new Map();
        const queue = [];

        connected.forEach(cls => {
            if ((inDegree.get(cls.id) || 0) === 0) {
                levels.set(cls.id, 0);
                queue.push(cls.id);
            }
        });

        if (queue.length === 0 && connected.length > 0) {
            levels.set(connected[0].id, 0);
            queue.push(connected[0].id);
        }

        let step = 0;
        while (queue.length > 0 && step < connected.length * 6) {
            step++;
            const curId = queue.shift();
            const curLvl = levels.get(curId) || 0;
            const neighbors = outNeighbors.get(curId) || [];

            neighbors.forEach(nId => {
                const nextLvl = curLvl + 1;
                const existing = levels.get(nId);
                if (existing === undefined || nextLvl > existing) {
                    levels.set(nId, nextLvl);
                    queue.push(nId);
                }
            });
        }

        connected.forEach((cls, idx) => {
            if (!levels.has(cls.id)) levels.set(cls.id, idx % 2);
        });

        // Kelompokkan per level kolom
        const rawCols = new Map();
        connected.forEach(cls => {
            const lvl = levels.get(cls.id) || 0;
            if (!rawCols.has(lvl)) rawCols.set(lvl, []);
            rawCols.get(lvl).push(cls);
        });

        const sortedLvlKeys = Array.from(rawCols.keys()).sort((a, b) => a - b);
        const finalColumns = [];
        const MAX_PER_COL = 3;

        sortedLvlKeys.forEach(lvl => {
            const group = rawCols.get(lvl);
            if (finalColumns.length > 0) {
                group.sort((a, b) => {
                    const avgA = getRelatedAverageY(a.id, relations, positions, config.startY);
                    const avgB = getRelatedAverageY(b.id, relations, positions, config.startY);
                    return avgA - avgB;
                });
            }

            const balancedSubCols = splitIntoBalancedColumns(group, MAX_PER_COL);
            balancedSubCols.forEach(sc => finalColumns.push(sc));
        });

        let currentX = config.startX;
        let maxConnectedX = config.startX;
        const colGap = 60;
        const cardGapY = 32;

        finalColumns.forEach((colCards, colIdx) => {
            let currentY = config.startY;

            colCards.forEach((cls) => {
                const nodeH = estimateNodeHeight(cls, config);
                let targetY = currentY;

                if (colIdx > 0) {
                    const parentCenterY = getDirectParentCenterY(cls.id, relations, positions);
                    if (parentCenterY !== null) {
                        const alignedY = Math.round(parentCenterY - nodeH / 2);
                        if (alignedY >= currentY) {
                            targetY = alignedY;
                        }
                    }
                }

                positions.set(cls.id, {
                    x: Math.round(currentX),
                    y: Math.round(targetY),
                    width: config.nodeWidth,
                    height: nodeH
                });

                currentY = targetY + nodeH + cardGapY;
            });

            if (currentX + config.nodeWidth > maxConnectedX) {
                maxConnectedX = currentX + config.nodeWidth;
            }
            currentX += config.nodeWidth + colGap;
        });

        // Standalone ditaruh di kolom samping kanan secara rapi (grid 2 kolom)
        if (standalone.length > 0) {
            const standStartX = maxConnectedX + colGap;
            const maxStandCols = 2;
            const standGapX = 35;
            const standGapY = 30;

            standalone.forEach((cls, idx) => {
                const nodeH = estimateNodeHeight(cls, config);
                const col = idx % maxStandCols;
                const row = Math.floor(idx / maxStandCols);

                const posX = standStartX + col * (config.nodeWidth + standGapX);
                const posY = config.startY + row * (config.nodeMinHeight + standGapY);

                positions.set(cls.id, {
                    x: Math.round(posX),
                    y: Math.round(posY),
                    width: config.nodeWidth,
                    height: nodeH
                });
            });
        }

        return positions;
    }

    /**
     * 2. ALGORITMA PIPELINE (dbdiagram.io Pipeline)
     * "Arrange tables left to right along their data-dependency lineage.
     * Table groups become stages ordered left to right, with their tables stacked vertically."
     * Membagi ke dalam tahapan lineage nyata (Stages) yang seimbang dan padat.
     */
    function layoutPipeline(classes, relations, config, metrics) {
        const positions = new Map();
        const { inDegree, outNeighbors } = metrics;

        const connected = classes.filter(c => (outNeighbors.get(c.id) || []).length > 0 || (inDegree.get(c.id) || 0) > 0);
        const standalone = classes.filter(c => (outNeighbors.get(c.id) || []).length === 0 && (inDegree.get(c.id) || 0) === 0);

        if (connected.length === 0) {
            return layoutTopDown(classes, relations, config, metrics);
        }

        // Hitung stage depth berdasarkan dependensi data
        const stageDepth = new Map();
        const queue = [];

        connected.forEach(cls => {
            if ((inDegree.get(cls.id) || 0) === 0) {
                stageDepth.set(cls.id, 0);
                queue.push(cls.id);
            }
        });

        if (queue.length === 0 && connected.length > 0) {
            stageDepth.set(connected[0].id, 0);
            queue.push(connected[0].id);
        }

        let step = 0;
        while (queue.length > 0 && step < connected.length * 6) {
            step++;
            const curId = queue.shift();
            const curStage = stageDepth.get(curId) || 0;
            const neighbors = outNeighbors.get(curId) || [];

            neighbors.forEach(nId => {
                const nextStage = curStage + 1;
                const existing = stageDepth.get(nId);
                if (existing === undefined || nextStage > existing) {
                    stageDepth.set(nId, nextStage);
                    queue.push(nId);
                }
            });
        }

        connected.forEach((cls, idx) => {
            if (!stageDepth.has(cls.id)) stageDepth.set(cls.id, idx % 2);
        });

        // Kelompokkan tabel ke dalam Stage nyata
        const stageGroups = new Map();
        connected.forEach(cls => {
            const s = stageDepth.get(cls.id) || 0;
            if (!stageGroups.has(s)) stageGroups.set(s, []);
            stageGroups.get(s).push(cls);
        });

        const sortedStages = Array.from(stageGroups.keys()).sort((a, b) => a - b);
        const pipelineColumns = [];
        const MAX_PER_STAGE_COL = 3;

        sortedStages.forEach((sIdx, sOrder) => {
            const group = stageGroups.get(sIdx);
            if (sOrder > 0) {
                group.sort((a, b) => {
                    const avgA = getRelatedAverageY(a.id, relations, positions, config.startY);
                    const avgB = getRelatedAverageY(b.id, relations, positions, config.startY);
                    return avgA - avgB;
                });
            }

            const balancedSubCols = splitIntoBalancedColumns(group, MAX_PER_STAGE_COL);
            balancedSubCols.forEach(sc => pipelineColumns.push(sc));
        });

        let currentX = config.startX;
        let maxConnectedX = config.startX;
        const stageGapX = 60;
        const cardGapY = 32;

        pipelineColumns.forEach((colCards, colIdx) => {
            let currentY = config.startY;

            colCards.forEach((cls) => {
                const nodeH = estimateNodeHeight(cls, config);
                let targetY = currentY;

                if (colIdx > 0) {
                    const parentY = getDirectParentCenterY(cls.id, relations, positions);
                    if (parentY !== null) {
                        const alignedY = Math.round(parentY - nodeH / 2);
                        if (alignedY >= currentY) {
                            targetY = alignedY;
                        }
                    }
                }

                positions.set(cls.id, {
                    x: Math.round(currentX),
                    y: Math.round(targetY),
                    width: config.nodeWidth,
                    height: nodeH
                });

                currentY = targetY + nodeH + cardGapY;
            });

            if (currentX + config.nodeWidth > maxConnectedX) {
                maxConnectedX = currentX + config.nodeWidth;
            }
            currentX += config.nodeWidth + stageGapX;
        });

        // Standalone diletakkan di sisi kanan secara rapi
        if (standalone.length > 0) {
            const standStartX = maxConnectedX + stageGapX;
            const maxStandCols = 2;
            const standGapX = 35;
            const standGapY = 30;

            standalone.forEach((cls, idx) => {
                const nodeH = estimateNodeHeight(cls, config);
                const col = idx % maxStandCols;
                const row = Math.floor(idx / maxStandCols);

                const posX = standStartX + col * (config.nodeWidth + standGapX);
                const posY = config.startY + row * (config.nodeMinHeight + standGapY);

                positions.set(cls.id, {
                    x: Math.round(posX),
                    y: Math.round(posY),
                    width: config.nodeWidth,
                    height: nodeH
                });
            });
        }

        return positions;
    }

    /**
     * 3. ALGORITMA SNOWFLAKE (dbdiagram.io Snowflake)
     * "Arrange tables in a snowflake shape, with the most connected tables in the center.
     * Ideal for densely connected diagrams like data warehouses."
     * Membentuk klaster bintang/salib kardinal yang padat, proporsional, dan elegan.
     */
    function layoutSnowflake(classes, relations, config, metrics) {
        const positions = new Map();
        const { totalDegree, outNeighbors, inDegree } = metrics;

        const connected = classes.filter(c => (outNeighbors.get(c.id) || []).length > 0 || (inDegree.get(c.id) || 0) > 0);
        const standalone = classes.filter(c => (outNeighbors.get(c.id) || []).length === 0 && (inDegree.get(c.id) || 0) === 0);

        if (connected.length === 0) {
            return layoutTopDown(classes, relations, config, metrics);
        }

        // Cari tabel paling sentral (derajat relasi tertinggi)
        connected.sort((a, b) => (totalDegree.get(b.id) || 0) - (totalDegree.get(a.id) || 0));
        const centralClass = connected[0];
        const surrounding = connected.slice(1);

        const centralH = estimateNodeHeight(centralClass, config);
        const centralW = config.nodeWidth;

        // Hub diletakkan di origin (0, 0) sementara, kemudian dinormalisasi
        positions.set(centralClass.id, {
            x: 0,
            y: 0,
            width: centralW,
            height: centralH
        });

        const gapX = 60;
        const gapY = 65;
        const cardGap = 35;

        if (surrounding.length > 0) {
            // Bagi surrounding ke dalam 4 sektor: Top, Bottom, Left, Right
            const sectors = { top: [], bottom: [], left: [], right: [] };
            const sectorNames = ['top', 'bottom', 'right', 'left'];

            // Urutkan surrounding: prioritaskan yang punya relasi langsung dengan centralClass
            const directNeighbors = surrounding.filter(c => {
                return relations.some(r => 
                    (r.source === centralClass.id && r.target === c.id) ||
                    (r.target === centralClass.id && r.source === c.id)
                );
            });
            const indirectNeighbors = surrounding.filter(c => !directNeighbors.includes(c));
            const orderedSurrounding = [...directNeighbors, ...indirectNeighbors];

            orderedSurrounding.forEach((cls, idx) => {
                const sec = sectorNames[idx % 4];
                sectors[sec].push(cls);
            });

            // 1. TOP SECTOR: letakkan di atas central table
            if (sectors.top.length > 0) {
                const count = sectors.top.length;
                const totalW = count * centralW + (count - 1) * cardGap;
                const startX = Math.round((centralW - totalW) / 2);
                let maxH = 0;
                sectors.top.forEach(c => {
                    maxH = Math.max(maxH, estimateNodeHeight(c, config));
                });
                const posY = -maxH - gapY;

                sectors.top.forEach((cls, i) => {
                    const nodeH = estimateNodeHeight(cls, config);
                    const posX = startX + i * (centralW + cardGap);
                    positions.set(cls.id, {
                        x: Math.round(posX),
                        y: Math.round(posY + (maxH - nodeH)),
                        width: centralW,
                        height: nodeH
                    });
                });
            }

            // 2. BOTTOM SECTOR: letakkan di bawah central table
            if (sectors.bottom.length > 0) {
                const count = sectors.bottom.length;
                const totalW = count * centralW + (count - 1) * cardGap;
                const startX = Math.round((centralW - totalW) / 2);
                const posY = centralH + gapY;

                sectors.bottom.forEach((cls, i) => {
                    const nodeH = estimateNodeHeight(cls, config);
                    const posX = startX + i * (centralW + cardGap);
                    positions.set(cls.id, {
                        x: Math.round(posX),
                        y: Math.round(posY),
                        width: centralW,
                        height: nodeH
                    });
                });
            }

            // 3. LEFT SECTOR: letakkan di kiri central table
            if (sectors.left.length > 0) {
                let totalH = 0;
                sectors.left.forEach(c => {
                    totalH += estimateNodeHeight(c, config);
                });
                totalH += (sectors.left.length - 1) * cardGap;
                let currentY = Math.round((centralH - totalH) / 2);
                const posX = -centralW - gapX;

                sectors.left.forEach((cls) => {
                    const nodeH = estimateNodeHeight(cls, config);
                    positions.set(cls.id, {
                        x: Math.round(posX),
                        y: Math.round(currentY),
                        width: centralW,
                        height: nodeH
                    });
                    currentY += nodeH + cardGap;
                });
            }

            // 4. RIGHT SECTOR: letakkan di kanan central table
            if (sectors.right.length > 0) {
                let totalH = 0;
                sectors.right.forEach(c => {
                    totalH += estimateNodeHeight(c, config);
                });
                totalH += (sectors.right.length - 1) * cardGap;
                let currentY = Math.round((centralH - totalH) / 2);
                const posX = centralW + gapX;

                sectors.right.forEach((cls) => {
                    const nodeH = estimateNodeHeight(cls, config);
                    positions.set(cls.id, {
                        x: Math.round(posX),
                        y: Math.round(currentY),
                        width: centralW,
                        height: nodeH
                    });
                    currentY += nodeH + cardGap;
                });
            }
        }

        // Normalisasi semua koordinat agar minimal (config.startX, config.startY)
        let minX = Infinity, minY = Infinity, maxX = -Infinity;
        positions.forEach(pos => {
            if (pos.x < minX) minX = pos.x;
            if (pos.y < minY) minY = pos.y;
            if (pos.x + pos.width > maxX) maxX = pos.x + pos.width;
        });

        const offsetX = config.startX - minX;
        const offsetY = config.startY - minY;

        positions.forEach(pos => {
            pos.x += offsetX;
            pos.y += offsetY;
        });

        // Standalone diletakkan di sebelah kanan klaster snowflake
        const adjustedMaxX = maxX + offsetX;
        if (standalone.length > 0) {
            const standStartX = adjustedMaxX + gapX;
            const maxStandCols = 2;
            const standGapX = 35;
            const standGapY = 30;

            standalone.forEach((cls, idx) => {
                const nodeH = estimateNodeHeight(cls, config);
                const col = idx % maxStandCols;
                const row = Math.floor(idx / maxStandCols);

                const posX = standStartX + col * (config.nodeWidth + standGapX);
                const posY = config.startY + row * (config.nodeMinHeight + standGapY);

                positions.set(cls.id, {
                    x: Math.round(posX),
                    y: Math.round(posY),
                    width: config.nodeWidth,
                    height: nodeH
                });
            });
        }

        return positions;
    }

    /**
     * 4. ALGORITMA COMPACT (dbdiagram.io Compact)
     * "Arrange tables in a compact rectangle layout.
     * Ideal for diagrams with few relationships and tables."
     */
    function layoutCompact(classes, relations, config) {
        const positions = new Map();
        const total = classes.length;
        const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(total * 1.3))));
        const gapX = 50;
        const gapY = 60;

        classes.forEach((cls, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const nodeH = estimateNodeHeight(cls, config);

            const posX = config.startX + col * (config.nodeWidth + gapX);
            const posY = config.startY + row * (config.nodeMinHeight + gapY);

            positions.set(cls.id, {
                x: Math.round(posX),
                y: Math.round(posY),
                width: config.nodeWidth,
                height: nodeH
            });
        });

        return positions;
    }

    /**
     * 5. ALGORITMA TOP-DOWN (Hierarki Klasik Baris ke Bawah)
     */
    function layoutTopDown(classes, relations, config, metrics) {
        const positions = new Map();
        const { inDegree, outNeighbors } = metrics;

        const connected = classes.filter(c => (outNeighbors.get(c.id) || []).length > 0 || (inDegree.get(c.id) || 0) > 0);
        const standalone = classes.filter(c => (outNeighbors.get(c.id) || []).length === 0 && (inDegree.get(c.id) || 0) === 0);

        const levels = new Map();
        const queue = [];
        const maxLevelLimit = Math.max(2, connected.length);

        connected.forEach(cls => {
            if ((inDegree.get(cls.id) || 0) === 0) {
                levels.set(cls.id, 0);
                queue.push(cls.id);
            }
        });

        if (queue.length === 0 && connected.length > 0) {
            levels.set(connected[0].id, 0);
            queue.push(connected[0].id);
        }

        let step = 0;
        while (queue.length > 0 && step < connected.length * 5) {
            step++;
            const curId = queue.shift();
            const curLvl = levels.get(curId) || 0;
            const neighbors = outNeighbors.get(curId) || [];

            neighbors.forEach(nId => {
                const nextLvl = curLvl + 1;
                const existing = levels.get(nId);
                if (nextLvl < maxLevelLimit) {
                    if (existing === undefined || nextLvl > existing) {
                        levels.set(nId, nextLvl);
                        queue.push(nId);
                    }
                } else if (existing === undefined) {
                    levels.set(nId, maxLevelLimit - 1);
                }
            });
        }

        connected.forEach((cls, idx) => {
            if (!levels.has(cls.id)) levels.set(cls.id, idx % 2);
        });

        const levelGroups = new Map();
        connected.forEach(cls => {
            const lvl = levels.get(cls.id) || 0;
            if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
            levelGroups.get(lvl).push(cls);
        });

        const sortedLevelKeys = Array.from(levelGroups.keys()).sort((a, b) => a - b);
        let currentY = config.startY;
        let maxConnectedX = config.startX;

        sortedLevelKeys.forEach((lvl, lvlIdx) => {
            const group = levelGroups.get(lvl);

            if (lvlIdx > 0) {
                group.sort((a, b) => {
                    const avgA = getRelatedAverageX(a.id, relations, positions, config.startX);
                    const avgB = getRelatedAverageX(b.id, relations, positions, config.startX);
                    return avgA - avgB;
                });
            }

            let startX = config.startX;
            let maxRowHeight = config.nodeMinHeight;

            group.forEach((cls, index) => {
                const nodeHeight = estimateNodeHeight(cls, config);
                maxRowHeight = Math.max(maxRowHeight, nodeHeight);

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

                if (nodeX + config.nodeWidth > maxConnectedX) {
                    maxConnectedX = nodeX + config.nodeWidth;
                }
            });

            currentY += maxRowHeight + config.verticalGap;
        });

        if (standalone.length > 0) {
            const standaloneStartX = connected.length > 0
                ? (maxConnectedX + config.horizontalGap + 35)
                : config.startX;

            const maxCardsPerRow = 2;
            standalone.forEach((cls, idx) => {
                const nodeHeight = estimateNodeHeight(cls, config);
                const col = idx % maxCardsPerRow;
                const row = Math.floor(idx / maxCardsPerRow);

                const posX = standaloneStartX + col * (config.nodeWidth + config.horizontalGap);
                const posY = config.startY + row * (config.nodeMinHeight + 35);

                positions.set(cls.id, {
                    x: Math.round(posX),
                    y: Math.round(posY),
                    width: config.nodeWidth,
                    height: nodeHeight
                });
            });
        }

        return positions;
    }

    /**
     * Hitung tata letak diagram dengan algoritma terpilih
     * @param {Array} classes 
     * @param {Array} relations 
     * @param {string|Object} algorithm ('left-right' | 'pipeline' | 'snowflake' | 'compact' | 'top-down')
     * @param {Object} customConfig 
     * @returns {Map<string, {x: number, y: number, width: number, height: number}>}
     */
    function computeLayout(classes, relations, algorithm = 'compact', customConfig = {}) {
        if (typeof algorithm === 'object' && algorithm !== null) {
            customConfig = algorithm;
            algorithm = customConfig.algorithm || 'compact';
        }
        const config = Object.assign({}, DEFAULT_CONFIG, customConfig || {});
        if (!classes || classes.length === 0) return new Map();

        const metrics = buildGraphMetrics(classes, relations);
        let positions;

        switch (algorithm) {
            case 'pipeline':
                positions = layoutPipeline(classes, relations, config, metrics);
                break;
            case 'snowflake':
                positions = layoutSnowflake(classes, relations, config, metrics);
                break;
            case 'left-right':
                positions = layoutLeftRight(classes, relations, config, metrics);
                break;
            case 'compact':
            case 'top-down':
            default:
                positions = layoutTopDown(classes, relations, config, metrics);
                break;
        }

        resolveCollisions(positions, config);
        return positions;
    }

    /**
     * Helper perhitungan rata-rata koordinat
     */
    function getRelatedAverageX(nodeId, relations, positions, fallbackX) {
        let sumX = 0, count = 0;
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

    function getRelatedAverageY(nodeId, relations, positions, fallbackY) {
        let sumY = 0, count = 0;
        relations.forEach(rel => {
            if (rel.source === rel.target) return;
            if (rel.target === nodeId && positions.has(rel.source)) {
                const p = positions.get(rel.source);
                sumY += p.y + p.height / 2;
                count++;
            } else if (rel.source === nodeId && positions.has(rel.target)) {
                const p = positions.get(rel.target);
                sumY += p.y + p.height / 2;
                count++;
            }
        });
        return count > 0 ? (sumY / count) : fallbackY;
    }

    function getDirectParentCenter(nodeId, relations, positions) {
        const parents = [];
        relations.forEach(rel => {
            if (rel.source === rel.target) return;
            if (rel.target === nodeId && positions.has(rel.source)) {
                parents.push(positions.get(rel.source));
            }
        });
        return parents.length === 1 ? (parents[0].x + parents[0].width / 2) : null;
    }

    function getDirectParentCenterY(nodeId, relations, positions) {
        const parents = [];
        relations.forEach(rel => {
            if (rel.source === rel.target) return;
            if (rel.target === nodeId && positions.has(rel.source)) {
                parents.push(positions.get(rel.source));
            }
        });
        return parents.length === 1 ? (parents[0].y + parents[0].height / 2) : null;
    }

    function resolveCollisions(positions, config) {
        const minGap = 16;
        const keys = Array.from(positions.keys());

        for (let pass = 0; pass < 3; pass++) {
            let collisionFound = false;
            for (let i = 0; i < keys.length; i++) {
                const posA = positions.get(keys[i]);
                for (let j = i + 1; j < keys.length; j++) {
                    const posB = positions.get(keys[j]);
                    // Cek apakah benar-benar tumpang tindih secara geometris
                    const overlapX = (posA.x < posB.x + posB.width + minGap) && (posA.x + posA.width + minGap > posB.x);
                    const overlapY = (posA.y < posB.y + posB.height + minGap) && (posA.y + posA.height + minGap > posB.y);

                    if (overlapX && overlapY) {
                        collisionFound = true;
                        // Geser posB secukupnya agar tidak overlap, tanpa lompatan acak
                        if (Math.abs(posA.x - posB.x) < Math.abs(posA.y - posB.y)) {
                            posB.y = posA.y + posA.height + 24;
                        } else {
                            posB.x = posA.x + posA.width + 24;
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
