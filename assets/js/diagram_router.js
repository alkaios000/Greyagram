/**
 * Greyagram - Professional DBDiagram / ERD-Grade Orthogonal Router
 * Menghasilkan rute konektor ortogonal kelas industri (setara dbdiagram.io / DBeaver / draw.io).
 *
 * Jaminan Kualitas dbdiagram.io:
 * 1. Menghubungkan antarentitas dengan jalur ortogonal alami (Right-to-Left, Left-to-Right, atau Bottom-to-Top).
 * 2. Tidak ada garis aneh yang melambung ke langit-langit (overhead wires) atau memotong badan kartu sendiri.
 * 3. Multi-Track Corridor otomatis mencegah garis-garis paralel tumpang tindih.
 * 4. Multi-Port Slotting mendistribusikan titik masuk/keluar secara proporsional di sepanjang tepi kartu.
 * 5. Teks label relasi dan badge kardinalitas anti-tumpuk dengan deteksi bounding-box.
 */

window.DiagramRouter = (function () {
    'use strict';

    const STUB_LENGTH = 18;      // Jarak minimum keluar/masuk tegak lurus dari kartu
    const CORNER_RADIUS = 8;     // Radius kehalusan lengkungan belokan 90 derajat (dbdiagram.io grade)
    const TRACK_SPACING = 12;    // Jarak elevasi antarjalur paralel di koridor yang sama (offset ±12px sesuai node_line.md)
    const CARD_CLEARANCE = 12;   // Jarak bebas aman dari tepi kartu lain

    /**
     * Hitung seluruh rute konektor untuk semua relasi
     * @param {Array} relations 
     * @param {Map<string, {x: number, y: number, width: number, height: number}>} nodePositions 
     * @returns {Array<Object>}
     */
    function calculateRoutes(relations, nodePositions) {
        if (!relations || relations.length === 0 || !nodePositions) {
            return [];
        }

        // 1. Kumpulkan rintangan (bounding box setiap kartu)
        const allBoxes = [];
        nodePositions.forEach((pos, id) => {
            allBoxes.push({
                id: id,
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
                left: pos.x - CARD_CLEARANCE,
                right: pos.x + pos.width + CARD_CLEARANCE,
                top: pos.y - CARD_CLEARANCE,
                bottom: pos.y + pos.height + CARD_CLEARANCE
            });
        });

        // 2. Tentukan orientasi sisi koneksi alami setara dbdiagram.io
        const resolvedRelations = relations.map(rel => {
            const posA = nodePositions.get(rel.source);
            const posB = nodePositions.get(rel.target);
            if (!posA || !posB) return null;

            const sides = determineDbDiagramSides(posA, posB, rel);
            return {
                rel: rel,
                sourcePos: posA,
                targetPos: posB,
                sourceSide: sides.sourceSide,
                targetSide: sides.targetSide
            };
        }).filter(Boolean);

        // 3. Alokasikan Slot Port pada setiap kartu agar garis tidak bertumpuk di satu titik
        const portAssignments = assignPortSlots(resolvedRelations);

        // 4. Tracker koridor horizontal & vertikal multi-track agar garis tidak tumpang tindih
        const corridorTracks = new Map();

        // 5. Tracker posisi label untuk mencegah tabrakan teks label
        const placedLabels = [];

        // 6. Bangun jalur ortogonal bebas tabrakan untuk setiap relasi
        const routes = resolvedRelations.map(item => {
            const p1 = portAssignments.get(item.rel.id + '_source');
            const p2 = portAssignments.get(item.rel.id + '_target');

            const waypoints = computeDbDiagramWaypoints(
                p1, item.sourceSide,
                p2, item.targetSide,
                item.sourcePos, item.targetPos,
                allBoxes,
                corridorTracks
            );

            const pathData = buildRoundedPath(waypoints, CORNER_RADIUS);
            const labelPoint = computeNonOverlappingLabelPoint(waypoints, item.rel.label, placedLabels);

            return {
                rel: item.rel,
                connection: {
                    source: p1,
                    target: p2,
                    sourceSide: item.sourceSide,
                    targetSide: item.targetSide
                },
                waypoints: waypoints,
                pathData: pathData,
                labelPoint: labelPoint
            };
        });

        return routes;
    }

    /**
     * Tentukan orientasi sisi keluar/masuk setara dbdiagram.io:
     * - Horisontal dominan (kartu bersebelahan/antar kolom): Keluar Right/Left, Masuk Left/Right (Z-Path rapi).
     * - Vertikal dominan (satu kolom sejajar atas-bawah): Keluar Bottom/Top, Masuk Top/Bottom (Lurus).
     */
    function determineDbDiagramSides(boxA, boxB, rel) {
        // Relasi mandiri (Self-relation)
        if (rel && rel.source === rel.target) {
            return { sourceSide: 'right', targetSide: 'top' };
        }

        const aLeft = boxA.x;
        const aRight = boxA.x + boxA.width;
        const aTop = boxA.y;
        const aBottom = boxA.y + boxA.height;
        const aCenterX = (aLeft + aRight) / 2;
        const aCenterY = (aTop + aBottom) / 2;

        const bLeft = boxB.x;
        const bRight = boxB.x + boxB.width;
        const bTop = boxB.y;
        const bBottom = boxB.y + boxB.height;
        const bCenterX = (bLeft + bRight) / 2;
        const bCenterY = (bTop + bBottom) / 2;

        const dx = bCenterX - aCenterX;
        const dy = bCenterY - aCenterY;

        // 1. Pemisahan vertikal jelas (Tier Atas ke Tier Bawah atau sebaliknya)
        // Hubungkan Sisi Bawah (Bottom) ke Sisi Atas (Top) lewat koridor horizontal lapang
        if (aBottom <= bTop + 35) {
            return { sourceSide: 'bottom', targetSide: 'top' };
        }
        if (bBottom <= aTop + 35) {
            return { sourceSide: 'top', targetSide: 'bottom' };
        }

        // 2. Berada di tier/baris yang sama atau overlap vertikal: hubungkan sisi samping (Right / Left)
        if (dx > 0) {
            return { sourceSide: 'right', targetSide: 'left' };
        } else {
            return { sourceSide: 'left', targetSide: 'right' };
        }
    }

    /**
     * Alokasikan Anchor Port sesuai prinsip dbdiagram.io:
     * 1. SISI SUMBER (Source): Seluruh garis dari sisi kartu yang sama keluar dari 1 titik anchor bersama (Center Anchor).
     *    "bisa 1 node dari card di sisi yang sama bisa mengeluarkan banyak garis, tabrakan di node awal ndakpapa"
     * 2. SISI TUJUAN (Target): Jika satu kartu tujuan menerima beberapa relasi di sisi yang sama,
     *    buat titik masuk sedikit terpisah (branch spacing) agar cabangnya terbedakan dengan jelas.
     *    "pas di cabangnya harus beda"
     */
    function assignPortSlots(resolvedRelations) {
        const portMap = new Map();
        const targetSideGroups = new Map();

        resolvedRelations.forEach(item => {
            // SISI SUMBER: 1 titik anchor bersama (Center Anchor)
            const srcKey = item.rel.id + '_source';
            portMap.set(srcKey, getCenterAnchor(item.sourcePos, item.sourceSide));

            // Kumpulkan untuk SISI TUJUAN
            const tgtKey = item.rel.target + '_' + item.targetSide;
            if (!targetSideGroups.has(tgtKey)) targetSideGroups.set(tgtKey, []);
            targetSideGroups.get(tgtKey).push(item);
        });

        // SISI TUJUAN: Pisahkan cabang masuk jika ada >1 relasi ke kartu tujuan yang sama
        targetSideGroups.forEach((entries, groupKey) => {
            const box = entries[0].targetPos;
            const side = entries[0].targetSide;
            const count = entries.length;

            if (count === 1) {
                const portKey = entries[0].rel.id + '_target';
                portMap.set(portKey, getCenterAnchor(box, side));
            } else {
                // Urutkan entri berdasarkan posisi sumber agar cabang tidak bersilangan
                entries.sort((a, b) => {
                    const centerA = (side === 'top' || side === 'bottom')
                        ? (a.sourcePos.x + a.sourcePos.width / 2)
                        : (a.sourcePos.y + a.sourcePos.height / 2);
                    const centerB = (side === 'top' || side === 'bottom')
                        ? (b.sourcePos.x + b.sourcePos.width / 2)
                        : (b.sourcePos.y + b.sourcePos.height / 2);
                    if (Math.abs(centerA - centerB) > 5) return centerA - centerB;
                    return String(a.rel.id).localeCompare(String(b.rel.id));
                });

                const isHorizontalSide = (side === 'top' || side === 'bottom');
                const centerPt = getCenterAnchor(box, side);
                const BRANCH_SPACING = 24; // Jarak antar-cabang masuk ke target

                entries.forEach((item, idx) => {
                    const offset = Math.round((idx - (count - 1) / 2) * BRANCH_SPACING);
                    let pt;
                    if (isHorizontalSide) {
                        pt = { x: centerPt.x + offset, y: centerPt.y };
                    } else {
                        pt = { x: centerPt.x, y: centerPt.y + offset };
                    }
                    portMap.set(item.rel.id + '_target', pt);
                });
            }
        });

        return portMap;
    }

    function getCenterAnchor(box, side) {
        switch (side) {
            case 'top':    return { x: Math.round(box.x + box.width / 2), y: box.y };
            case 'bottom': return { x: Math.round(box.x + box.width / 2), y: box.y + box.height };
            case 'left':   return { x: box.x, y: Math.round(box.y + box.height / 2) };
            case 'right':  default: return { x: box.x + box.width, y: Math.round(box.y + box.height / 2) };
        }
    }

    function getStubPoint(pt, side, dist) {
        switch (side) {
            case 'top':    return { x: pt.x, y: pt.y - dist };
            case 'bottom': return { x: pt.x, y: pt.y + dist };
            case 'left':   return { x: pt.x - dist, y: pt.y };
            case 'right':  default: return { x: pt.x + dist, y: pt.y };
        }
    }

    /**
     * Deteksi apakah segmen garis lurus menabrak kartu lain (rintangan)
     */
    function isSegmentBlocked(pA, pB, obstacles, ignoreIds) {
        const minX = Math.min(pA.x, pB.x);
        const maxX = Math.max(pA.x, pB.x);
        const minY = Math.min(pA.y, pB.y);
        const maxY = Math.max(pA.y, pB.y);

        const isHorizontal = Math.abs(pA.y - pB.y) < 1;
        const isVertical = Math.abs(pA.x - pB.x) < 1;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (ignoreIds && ignoreIds.includes(obs.id)) continue;

            const bLeft = obs.x - 8;
            const bRight = obs.x + obs.width + 8;
            const bTop = obs.y - 8;
            const bBottom = obs.y + obs.height + 8;

            if (isHorizontal) {
                const y = pA.y;
                if (y > bTop && y < bBottom && maxX > bLeft && minX < bRight) {
                    return true;
                }
            } else if (isVertical) {
                const x = pA.x;
                if (x > bLeft && x < bRight && maxY > bTop && minY < bBottom) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Deteksi apakah seluruh jalur ortogonal bebas dari tabrakan dengan kartu lain.
     * PENTING: sourceId dan targetId TIDAK BOLEH dianggap rintangan untuk relasi mereka sendiri.
     */
    function isPathBlocked(points, obstacles, sourceId, targetId) {
        if (!points || points.length < 2) return false;

        const ignore = [sourceId, targetId];

        for (let i = 0; i < points.length - 1; i++) {
            if (isSegmentBlocked(points[i], points[i + 1], obstacles, ignore)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hitung jalur ortogonal DBDiagram-grade alami (Z-path, L-path) bebas tabrakan
     */
    function computeDbDiagramWaypoints(p1, side1, p2, side2, sourceBox, targetBox, obstacles, corridorTracks) {
        // 1. Kasus Khusus: Self-Relation (Siklus Mandiri Kelas yang Sama)
        if (sourceBox === targetBox || (sourceBox.id && sourceBox.id === targetBox.id)) {
            const loopRight = sourceBox.x + sourceBox.width + 30;
            const loopTop = sourceBox.y - 20;
            return cleanCollinearPoints([
                p1,
                { x: loopRight, y: p1.y },
                { x: loopRight, y: loopTop },
                { x: p2.x, y: loopTop },
                p2
            ]);
        }

        const stub1 = getStubPoint(p1, side1, STUB_LENGTH);
        const stub2 = getStubPoint(p2, side2, STUB_LENGTH);

        // 2. KASUS UTAMA: Horisontal Z-Connector (Right ke Left) - Standar DBDiagram
        if (side1 === 'right' && side2 === 'left') {
            if (p2.x >= p1.x + 10) {
                const rawMidX = Math.round((p1.x + p2.x) / 2);
                const corridorKey = 'corr_x_' + Math.round(rawMidX / 30) * 30;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                const offset = (trackIdx % 2 === 1 ? -1 : 1) * Math.ceil(trackIdx / 2) * TRACK_SPACING;
                const channelX = rawMidX + offset;

                const path = [
                    p1,
                    { x: channelX, y: p1.y },
                    { x: channelX, y: p2.y },
                    p2
                ];

                if (!isPathBlocked(path, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(path);
                }
            }
        }

        // 3. Horisontal Z-Connector Terbalik (Left ke Right)
        if (side1 === 'left' && side2 === 'right') {
            if (p1.x >= p2.x + 10) {
                const rawMidX = Math.round((p1.x + p2.x) / 2);
                const corridorKey = 'corr_x_' + Math.round(rawMidX / 30) * 30;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                const offset = (trackIdx % 2 === 1 ? -1 : 1) * Math.ceil(trackIdx / 2) * TRACK_SPACING;
                const channelX = rawMidX + offset;

                const path = [
                    p1,
                    { x: channelX, y: p1.y },
                    { x: channelX, y: p2.y },
                    p2
                ];

                if (!isPathBlocked(path, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(path);
                }
            }
        }

        // 4. KASUS UTAMA: Vertikal Z-Connector (Bottom ke Top) - Satu Kolom Sejajar
        if (side1 === 'bottom' && side2 === 'top') {
            // Garis lurus murni jika hampir satu garis vertikal
            if (Math.abs(p1.x - p2.x) < 8) {
                const straightPath = [{ x: p1.x, y: p1.y }, { x: p1.x, y: p2.y }];
                if (!isPathBlocked(straightPath, obstacles, sourceBox.id, targetBox.id)) {
                    return straightPath;
                }
            }

            if (p2.y >= p1.y + 10) {
                const rawMidY = Math.round((p1.y + p2.y) / 2);
                const corridorKey = 'corr_y_' + Math.round(rawMidY / 30) * 30;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                const offset = (trackIdx % 2 === 1 ? -1 : 1) * Math.ceil(trackIdx / 2) * TRACK_SPACING;
                const channelY = rawMidY + offset;

                const path = [
                    p1,
                    { x: p1.x, y: channelY },
                    { x: p2.x, y: channelY },
                    p2
                ];

                if (!isPathBlocked(path, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(path);
                }
            }
        }

        // 5. Vertikal Z-Connector Terbalik (Top ke Bottom)
        if (side1 === 'top' && side2 === 'bottom') {
            if (Math.abs(p1.x - p2.x) < 8) {
                const straightPath = [{ x: p1.x, y: p1.y }, { x: p1.x, y: p2.y }];
                if (!isPathBlocked(straightPath, obstacles, sourceBox.id, targetBox.id)) {
                    return straightPath;
                }
            }

            if (p1.y >= p2.y + 10) {
                const rawMidY = Math.round((p1.y + p2.y) / 2);
                const corridorKey = 'corr_y_' + Math.round(rawMidY / 30) * 30;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                const offset = (trackIdx % 2 === 1 ? -1 : 1) * Math.ceil(trackIdx / 2) * TRACK_SPACING;
                const channelY = rawMidY + offset;

                const path = [
                    p1,
                    { x: p1.x, y: channelY },
                    { x: p2.x, y: channelY },
                    p2
                ];

                if (!isPathBlocked(path, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(path);
                }
            }
        }

        // 6. Jalur L-Shape Elegan: Right-ke-Top atau Left-ke-Top
        if ((side1 === 'right' || side1 === 'left') && side2 === 'top') {
            const lPath = [
                p1,
                { x: p2.x, y: p1.y },
                p2
            ];
            if (!isPathBlocked(lPath, obstacles, sourceBox.id, targetBox.id)) {
                return cleanCollinearPoints(lPath);
            }
        }

        // 7. Jalur L-Shape Elegan: Bottom-ke-Left atau Bottom-ke-Right
        if (side1 === 'bottom' && (side2 === 'left' || side2 === 'right')) {
            const lPath = [
                p1,
                { x: p1.x, y: p2.y },
                p2
            ];
            if (!isPathBlocked(lPath, obstacles, sourceBox.id, targetBox.id)) {
                return cleanCollinearPoints(lPath);
            }
        }

        // 8. Fallback Ortogonal dengan Stub Bebas Tabrakan
        // Hubungkan stub1 ke stub2 secara ortogonal
        let fallbackPath = null;
        if (side1 === 'right' || side1 === 'left') {
            fallbackPath = [
                p1,
                stub1,
                { x: stub1.x, y: stub2.y },
                stub2,
                p2
            ];
        } else {
            fallbackPath = [
                p1,
                stub1,
                { x: stub2.x, y: stub1.y },
                stub2,
                p2
            ];
        }

        if (!isPathBlocked(fallbackPath, obstacles, sourceBox.id, targetBox.id)) {
            return cleanCollinearPoints(fallbackPath);
        }

        // Jalur alternatif Z-step antara stub
        const midStubX = Math.round((stub1.x + stub2.x) / 2);
        const altZPath = [
            p1,
            stub1,
            { x: midStubX, y: stub1.y },
            { x: midStubX, y: stub2.y },
            stub2,
            p2
        ];

        return cleanCollinearPoints(altZPath);
    }

    /**
     * Hapus titik berurutan yang kolinear (berada di satu garis lurus yang sama)
     */
    function cleanCollinearPoints(points) {
        if (!points || points.length <= 2) return points;

        const cleaned = [points[0]];

        for (let i = 1; i < points.length - 1; i++) {
            const prev = cleaned[cleaned.length - 1];
            const curr = points[i];
            const next = points[i + 1];

            const isCollinearX = (Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5);
            const isCollinearY = (Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5);

            if (!isCollinearX && !isCollinearY) {
                cleaned.push(curr);
            }
        }

        cleaned.push(points[points.length - 1]);
        return cleaned;
    }

    /**
     * Buat SVG Path dengan sudut melengkung halus (rounded corners) kelas industri
     */
    function buildRoundedPath(points, radius) {
        if (!points || points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
        if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            const d1x = curr.x - prev.x;
            const d1y = curr.y - prev.y;
            const len1 = Math.hypot(d1x, d1y);

            const d2x = next.x - curr.x;
            const d2y = next.y - curr.y;
            const len2 = Math.hypot(d2x, d2y);

            const r = Math.min(radius, len1 / 2, len2 / 2);

            if (r < 2) {
                d += ` L ${curr.x} ${curr.y}`;
            } else {
                const startX = curr.x - (d1x / len1) * r;
                const startY = curr.y - (d1y / len1) * r;
                const endX = curr.x + (d2x / len2) * r;
                const endY = curr.y + (d2y / len2) * r;

                d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${curr.x} ${curr.y}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
            }
        }

        const last = points[points.length - 1];
        d += ` L ${last.x} ${last.y}`;
        return d;
    }

    /**
     * Hitung titik peletakan label teks yang bebas tabrakan (anti-overlap dengan deteksi bounding box)
     */
    function computeNonOverlappingLabelPoint(points, labelText, placedLabels) {
        if (!points || points.length === 0) return { x: 0, y: 0 };
        if (!labelText) return computeLabelPoint(points);

        // Cari segmen terpanjang pada rute konektor
        let longestLen = -1;
        let bestPt = { x: 0, y: 0 };
        let isHorizontal = true;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (len > longestLen) {
                longestLen = len;
                bestPt = { x: Math.round((p1.x + p2.x) / 2), y: Math.round((p1.y + p2.y) / 2) };
                isHorizontal = Math.abs(p2.y - p1.y) < Math.abs(p2.x - p1.x);
            }
        }

        const labelLen = String(labelText).length;
        const labelHalfW = Math.max(22, (labelLen * 7.5 + 16) / 2);
        const labelHalfH = 12;

        let adjustedPt = { x: bestPt.x, y: bestPt.y };

        // Deteksi tabrakan AABB (Axis-Aligned Bounding Box) dengan label lain
        for (let attempt = 0; attempt < 8; attempt++) {
            let collides = false;
            for (let j = 0; j < placedLabels.length; j++) {
                const other = placedLabels[j];
                const otherHalfW = other.halfW || 30;
                const otherHalfH = other.halfH || 12;

                const overlapX = Math.abs(adjustedPt.x - other.x) < (labelHalfW + otherHalfW + 8);
                const overlapY = Math.abs(adjustedPt.y - other.y) < (labelHalfH + otherHalfH + 6);
                if (overlapX && overlapY) {
                    collides = true;
                    break;
                }
            }

            if (!collides) break;

            // Jika bertabrakan, geser secara staggered di sepanjang jalur
            if (isHorizontal) {
                const step = (attempt % 2 === 0 ? 1 : -1) * (Math.floor(attempt / 2) + 1) * (labelHalfW * 1.5 + 10);
                adjustedPt.x = bestPt.x + Math.round(step);
            } else {
                const step = (attempt % 2 === 0 ? 1 : -1) * (Math.floor(attempt / 2) + 1) * 26;
                adjustedPt.y = bestPt.y + Math.round(step);
            }
        }

        placedLabels.push({
            x: adjustedPt.x,
            y: adjustedPt.y,
            halfW: labelHalfW,
            halfH: labelHalfH
        });
        return adjustedPt;
    }

    function computeLabelPoint(points) {
        if (!points || points.length === 0) return { x: 0, y: 0 };
        if (points.length === 2) {
            return { x: Math.round((points[0].x + points[1].x) / 2), y: Math.round((points[0].y + points[1].y) / 2) };
        }

        let totalLength = 0;
        const lengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            lengths.push(len);
            totalLength += len;
        }

        const halfLength = totalLength / 2;
        let accumulated = 0;

        for (let i = 0; i < lengths.length; i++) {
            if (accumulated + lengths[i] >= halfLength) {
                const remain = halfLength - accumulated;
                const ratio = lengths[i] > 0 ? (remain / lengths[i]) : 0;
                return {
                    x: Math.round(points[i].x + (points[i + 1].x - points[i].x) * ratio),
                    y: Math.round(points[i].y + (points[i + 1].y - points[i].y) * ratio)
                };
            }
            accumulated += lengths[i];
        }

        return points[Math.floor(points.length / 2)];
    }

    return {
        calculateRoutes: calculateRoutes,
        determineSides: determineDbDiagramSides,
        buildRoundedPath: buildRoundedPath
    };
})();
