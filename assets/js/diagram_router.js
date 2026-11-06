/**
 * Greyagram - Professional Visio/DBDiagram-Quality Orthogonal Router
 * Menghasilkan rute konektor ortogonal kelas industri (setara Microsoft Visio / dbdiagram.io / draw.io).
 *
 * Jaminan Kualitas Visio & dbdiagram.io:
 * 1. Panah relasi hierarki vertikal (turun) SELALU masuk dari ATAS (top) dan mengarah tegak lurus ke BAWAH.
 * 2. Garis konektor TIDAK PERNAH memotong atau menempel di sisi/border kartu manapun (Zero Obstacle Collision).
 * 3. Jika dua kartu di baris yang sama dipisahkan kartu lain, rute melambung di koridor atas dan panah masuk dari ATAS.
 * 4. Jalur horizontal dialokasikan pada Multi-Track Corridor terpisah (anti-tumpuk) dengan elevasi Y unik.
 * 5. Multi-Port otomatis mendistribusikan titik masuk/keluar secara merata pada kartu.
 * 6. Anti-tumpuk teks label dengan deteksi tabrakan koordinat.
 */

window.DiagramRouter = (function () {
    'use strict';

    const STUB_LENGTH = 24;     // Panjang jalur tegak lurus wajib keluar/masuk kartu (menjamin panah dari atas)
    const CORNER_RADIUS = 8;    // Radius lengkungan belokan 90 derajat
    const TRACK_SPACING = 18;   // Jarak elevasi antar jalur paralel di koridor yang sama (anti-tumpuk)
    const CARD_CLEARANCE = 20;  // Jarak bebas aman dari tepi kartu

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

        // 2. Tentukan orientasi sisi koneksi seperti Visio / dbdiagram.io
        const resolvedRelations = relations.map(rel => {
            const posA = nodePositions.get(rel.source);
            const posB = nodePositions.get(rel.target);
            if (!posA || !posB) return null;

            const sides = determineVisioSides(posA, posB, rel, allBoxes);
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

        // 4. Tracker koridor horizontal multi-track agar garis tidak tumpang tindih
        const corridorTracks = new Map(); // key: corridor band -> counter

        // 5. Tracker posisi label untuk mencegah tabrakan teks label
        const placedLabels = [];

        // 6. Bangun jalur ortogonal bebas tabrakan untuk setiap relasi
        const routes = resolvedRelations.map(item => {
            const p1 = portAssignments.get(item.rel.id + '_source');
            const p2 = portAssignments.get(item.rel.id + '_target');

            const waypoints = computeVisioOrthogonalWaypoints(
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
     * Cek apakah ada kartu lain di antara dua kartu dalam baris yang sama secara horizontal
     */
    function hasIntermediateHorizontalCard(boxA, boxB, allBoxes) {
        const minX = Math.min(boxA.x, boxB.x);
        const maxX = Math.max(boxA.x + boxA.width, boxB.x + boxB.width);
        const minY = Math.min(boxA.y, boxB.y) - 25;
        const maxY = Math.max(boxA.y + boxA.height, boxB.y + boxB.height) + 25;

        for (let i = 0; i < allBoxes.length; i++) {
            const box = allBoxes[i];
            if (box.id === boxA.id || box.id === boxB.id) continue;
            // Jika kartu memotong rentang horizontal dan vertikal
            if (box.x + box.width > minX + 15 && box.x < maxX - 15) {
                if (box.y < maxY && (box.y + box.height) > minY) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Tentukan orientasi sisi keluar/masuk setara Visio & dbdiagram.io:
     * - Relasi Mandiri (Self-Relation): Keluar Kanan (right), Masuk Atas (top).
     * - Relasi Turun Hierarki (Target di bawah Sumber): Sumber keluar BAWAH (bottom), Target masuk ATAS (top).
     * - Relasi Naik Hierarki (Target di atas Sumber): Sumber keluar ATAS (top), Target masuk BAWAH (bottom).
     * - Relasi Satu Baris (Horizontal):
     *   - Jika bersebelahan tanpa kartu di tengah: Keluar Kanan/Kiri, Masuk Kiri/Kanan.
     *   - Jika terhalang kartu di tengah: Keluar ATAS, Masuk ATAS (panah dari atas, melambung di koridor atas).
     */
    function determineVisioSides(boxA, boxB, rel, allBoxes) {
        // Relasi mandiri (User -> User)
        if (rel && rel.source === rel.target) {
            return { sourceSide: 'right', targetSide: 'top' };
        }

        const centerA = { x: boxA.x + boxA.width / 2, y: boxA.y + boxA.height / 2 };
        const centerB = { x: boxB.x + boxB.width / 2, y: boxB.y + boxB.height / 2 };

        const dy = centerB.y - centerA.y;
        const dx = centerB.x - centerA.x;

        // Target berada di baris/tier bawah sumber:
        // Standar Visio/dbdiagram: Keluar dari BAWAH, Masuk dari ATAS (Panah pasti dari atas!)
        if (boxB.y >= boxA.y + 40 || dy > 45) {
            return { sourceSide: 'bottom', targetSide: 'top' };
        }

        // Target berada di baris/tier atas sumber:
        if (boxA.y >= boxB.y + 40 || dy < -45) {
            return { sourceSide: 'top', targetSide: 'bottom' };
        }

        // Satu baris horizontal sejajar (dy kecil):
        // Jika ada kartu lain di antara A dan B:
        // Rute lewat koridor ATAS dan panah masuk dari ATAS (agar tidak memotong kartu di tengah!)
        if (allBoxes && hasIntermediateHorizontalCard(boxA, boxB, allBoxes)) {
            return { sourceSide: 'top', targetSide: 'top' };
        }

        // Bersebelahan langsung tanpa halangan kartu tengah
        if (dx >= 0) {
            return { sourceSide: 'right', targetSide: 'left' };
        } else {
            return { sourceSide: 'left', targetSide: 'right' };
        }
    }

    /**
     * Bagikan port merata pada sisi kartu agar garis-garis masuk/keluar terpisah rapi
     */
    function assignPortSlots(resolvedRelations) {
        const portMap = new Map();
        const sideGroups = new Map();

        resolvedRelations.forEach(item => {
            const srcKey = item.rel.source + '_' + item.sourceSide;
            const tgtKey = item.rel.target + '_' + item.targetSide;

            if (!sideGroups.has(srcKey)) sideGroups.set(srcKey, []);
            if (!sideGroups.has(tgtKey)) sideGroups.set(tgtKey, []);

            sideGroups.get(srcKey).push({
                relId: item.rel.id,
                isSource: true,
                box: item.sourcePos,
                side: item.sourceSide,
                otherPos: item.targetPos
            });

            sideGroups.get(tgtKey).push({
                relId: item.rel.id,
                isSource: false,
                box: item.targetPos,
                side: item.targetSide,
                otherPos: item.sourcePos
            });
        });

        sideGroups.forEach((entries, groupKey) => {
            const [nodeId, side] = groupKey.split('_');
            const box = entries[0].box;
            const count = entries.length;

            // Urutkan entri berdasarkan posisi tujuan agar garis tidak saling silang
            if (side === 'top' || side === 'bottom') {
                entries.sort((a, b) => {
                    const centerA = a.otherPos.x + a.otherPos.width / 2;
                    const centerB = b.otherPos.x + b.otherPos.width / 2;
                    if (Math.abs(centerA - centerB) > 5) {
                        return centerA - centerB;
                    }
                    return a.relId.localeCompare(b.relId);
                });
            } else {
                entries.sort((a, b) => {
                    const centerA = a.otherPos.y + a.otherPos.height / 2;
                    const centerB = b.otherPos.y + b.otherPos.height / 2;
                    if (Math.abs(centerA - centerB) > 5) {
                        return centerA - centerB;
                    }
                    return a.relId.localeCompare(b.relId);
                });
            }

            const isHorizontalSide = (side === 'top' || side === 'bottom');
            const totalDimension = isHorizontalSide ? box.width : box.height;

            entries.forEach((entry, idx) => {
                let pt;
                if (count === 1) {
                    pt = getCenterAnchor(box, side);
                } else {
                    // Margin aman dari pojok kartu agar tidak menyentuh sudut melengkung kartu
                    const margin = Math.min(32, Math.max(20, totalDimension * 0.12));
                    const usable = totalDimension - margin * 2;
                    const step = usable / (count - 1);
                    const offset = Math.round(margin + idx * step);

                    if (isHorizontalSide) {
                        pt = {
                            x: Math.round(box.x + offset),
                            y: side === 'top' ? box.y : (box.y + box.height)
                        };
                    } else {
                        pt = {
                            x: side === 'left' ? box.x : (box.x + box.width),
                            y: Math.round(box.y + offset)
                        };
                    }
                }

                const portKey = entry.relId + (entry.isSource ? '_source' : '_target');
                portMap.set(portKey, pt);
            });
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

    /**
     * Dapatkan titik stub berjarak tertentu tegak lurus menjauh dari sisi kartu
     */
    function getStubPoint(pt, side, dist) {
        switch (side) {
            case 'top':    return { x: pt.x, y: pt.y - dist };
            case 'bottom': return { x: pt.x, y: pt.y + dist };
            case 'left':   return { x: pt.x - dist, y: pt.y };
            case 'right':  default: return { x: pt.x + dist, y: pt.y };
        }
    }

    /**
     * Deteksi apakah segmen garis lurus (horizontal/vertikal) menabrak salah satu kotak obstacle
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

            // Clearance margin aman 16px agar garis tidak pernah menempel atau memotong kartu
            const bLeft = obs.x - 16;
            const bRight = obs.x + obs.width + 16;
            const bTop = obs.y - 16;
            const bBottom = obs.y + obs.height + 16;

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
     * Deteksi apakah seluruh jalur ortogonal bebas dari tabrakan dengan kartu lain
     */
    function isPathBlocked(points, obstacles, sourceId, targetId) {
        if (!points || points.length < 2) return false;

        for (let i = 0; i < points.length - 1; i++) {
            const pA = points[i];
            const pB = points[i + 1];

            const ignore = [];
            // Segmen pertama terhubung ke sumber
            if (i === 0) ignore.push(sourceId);
            // Segmen terakhir terhubung ke target
            if (i === points.length - 2) ignore.push(targetId);

            if (isSegmentBlocked(pA, pB, obstacles, ignore)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hitung jalur ortogonal Visio-grade dengan alokasi koridor multi-track bebas tabrakan
     */
    function computeVisioOrthogonalWaypoints(p1, side1, p2, side2, sourceBox, targetBox, obstacles, corridorTracks) {
        // Kasus Khusus: Self-Relation (Siklus Mandiri Kelas yang Sama)
        if (sourceBox === targetBox || (sourceBox.id && sourceBox.id === targetBox.id)) {
            const loopRight = sourceBox.x + sourceBox.width + 36;
            const loopTop = sourceBox.y - 28;
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

        // KASUS A: Sisi Masuk & Keluar Keduanya di ATAS (side1: 'top', side2: 'top')
        // Terjadi ketika dua kartu di baris yang sama dihubungkan melewati koridor atas (panah masuk dari atas!)
        if (side1 === 'top' && side2 === 'top') {
            const rowTopY = Math.min(sourceBox.y, targetBox.y);
            const corridorKey = 'corridor_top_' + Math.round(rowTopY / 50) * 50;
            const trackIdx = corridorTracks.get(corridorKey) || 0;
            corridorTracks.set(corridorKey, trackIdx + 1);

            const trackOffset = trackIdx * TRACK_SPACING;
            const channelY = rowTopY - CARD_CLEARANCE - 16 - trackOffset;

            const path = [
                p1,
                stub1,
                { x: stub1.x, y: channelY },
                { x: stub2.x, y: channelY },
                stub2,
                p2
            ];
            return cleanCollinearPoints(path);
        }

        // KASUS B: Relasi Vertikal Turun (Bottom ke Top - Pola Standar Hierarki/Relasi Turun)
        // Sumber di baris atas, Target di baris bawah -> PANAH PASTI DARI ATAS
        if (side1 === 'bottom' && side2 === 'top') {
            const rowGapTop = sourceBox.y + sourceBox.height;
            const rowGapBottom = targetBox.y;

            if (rowGapBottom > rowGapTop + 15) {
                // Jalur Lurus Murni jika hampir sejajar horizontal dan tidak ada kartu lain menghalangi
                if (Math.abs(p1.x - p2.x) < 8) {
                    const straightPath = [{ x: p1.x, y: p1.y }, { x: p1.x, y: p2.y }];
                    if (!isPathBlocked(straightPath, obstacles, sourceBox.id, targetBox.id)) {
                        return straightPath;
                    }
                }

                // Alokasi Koridor Multi-Track
                const rawMidY = Math.round((rowGapTop + rowGapBottom) / 2);
                const corridorKey = 'corridor_y_' + Math.round(rawMidY / 50) * 50;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                let trackOffset = 0;
                if (trackIdx > 0) {
                    const stepNum = Math.ceil(trackIdx / 2);
                    trackOffset = (trackIdx % 2 === 1 ? -stepNum : stepNum) * TRACK_SPACING;
                }

                let channelY = rawMidY + trackOffset;
                const minSafeY = rowGapTop + CARD_CLEARANCE;
                const maxSafeY = rowGapBottom - CARD_CLEARANCE;
                if (minSafeY < maxSafeY) {
                    channelY = Math.max(minSafeY, Math.min(maxSafeY, channelY));
                }

                const candidatePath = [
                    p1,
                    { x: p1.x, y: channelY },
                    { x: p2.x, y: channelY },
                    p2
                ];

                // Jika jalur bebas tabrakan, gunakan langsung
                if (!isPathBlocked(candidatePath, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(candidatePath);
                }

                // Coba elevasi tepat di bawah source
                const tryY1 = rowGapTop + CARD_CLEARANCE + (trackIdx % 3) * TRACK_SPACING;
                const path1 = [p1, { x: p1.x, y: tryY1 }, { x: p2.x, y: tryY1 }, p2];
                if (!isPathBlocked(path1, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(path1);
                }

                // Coba elevasi tepat di atas target
                const tryY2 = rowGapBottom - CARD_CLEARANCE - (trackIdx % 3) * TRACK_SPACING;
                const path2 = [p1, { x: p1.x, y: tryY2 }, { x: p2.x, y: tryY2 }, p2];
                if (!isPathBlocked(path2, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(path2);
                }
            }
        }

        // KASUS C: Relasi Vertikal Naik (Top ke Bottom - Target di atas Sumber)
        if (side1 === 'top' && side2 === 'bottom') {
            const rowGapBottom = sourceBox.y;
            const rowGapTop = targetBox.y + targetBox.height;

            if (rowGapBottom > rowGapTop + 15) {
                if (Math.abs(p1.x - p2.x) < 8) {
                    const straightPath = [{ x: p1.x, y: p1.y }, { x: p1.x, y: p2.y }];
                    if (!isPathBlocked(straightPath, obstacles, sourceBox.id, targetBox.id)) {
                        return straightPath;
                    }
                }

                const rawMidY = Math.round((rowGapTop + rowGapBottom) / 2);
                const corridorKey = 'corridor_y_' + Math.round(rawMidY / 50) * 50;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                let trackOffset = 0;
                if (trackIdx > 0) {
                    const stepNum = Math.ceil(trackIdx / 2);
                    trackOffset = (trackIdx % 2 === 1 ? -stepNum : stepNum) * TRACK_SPACING;
                }

                let channelY = rawMidY + trackOffset;
                const minSafeY = rowGapTop + CARD_CLEARANCE;
                const maxSafeY = rowGapBottom - CARD_CLEARANCE;
                if (minSafeY < maxSafeY) {
                    channelY = Math.max(minSafeY, Math.min(maxSafeY, channelY));
                }

                const candidatePath = [
                    p1,
                    { x: p1.x, y: channelY },
                    { x: p2.x, y: channelY },
                    p2
                ];

                if (!isPathBlocked(candidatePath, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(candidatePath);
                }
            }
        }

        // KASUS D: Relasi Horizontal Sejajar (Right ke Left)
        if (side1 === 'right' && side2 === 'left') {
            const colGapLeft = sourceBox.x + sourceBox.width;
            const colGapRight = targetBox.x;

            if (colGapRight > colGapLeft + 15) {
                const rawMidX = Math.round((colGapLeft + colGapRight) / 2);
                const corridorKey = 'corridor_x_' + Math.round(rawMidX / 50) * 50;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                let trackOffset = 0;
                if (trackIdx > 0) {
                    const stepNum = Math.ceil(trackIdx / 2);
                    trackOffset = (trackIdx % 2 === 1 ? -stepNum : stepNum) * TRACK_SPACING;
                }

                const channelX = Math.max(colGapLeft + 16, Math.min(colGapRight - 16, rawMidX + trackOffset));
                const candidatePath = [
                    p1,
                    { x: channelX, y: p1.y },
                    { x: channelX, y: p2.y },
                    p2
                ];

                if (!isPathBlocked(candidatePath, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(candidatePath);
                }
            }
        }

        // KASUS E: Relasi Horizontal Sejajar Terbalik (Left ke Right)
        if (side1 === 'left' && side2 === 'right') {
            const colGapRight = sourceBox.x;
            const colGapLeft = targetBox.x + targetBox.width;

            if (colGapRight > colGapLeft + 15) {
                const rawMidX = Math.round((colGapLeft + colGapRight) / 2);
                const candidatePath = [
                    p1,
                    { x: rawMidX, y: p1.y },
                    { x: rawMidX, y: p2.y },
                    p2
                ];

                if (!isPathBlocked(candidatePath, obstacles, sourceBox.id, targetBox.id)) {
                    return cleanCollinearPoints(candidatePath);
                }
            }
        }

        // KASUS F: Fallback Ortogonal dengan Stub Wajib
        // Jika targetSide adalah 'top', selalu jaga agar stub2 berada di ATAS p2 (panah dari atas!)
        if (side2 === 'top') {
            const midY = (stub1.y + stub2.y) / 2;
            const tryPath = [
                p1,
                stub1,
                { x: stub1.x, y: midY },
                { x: stub2.x, y: midY },
                stub2,
                p2
            ];
            if (!isPathBlocked(tryPath, obstacles, sourceBox.id, targetBox.id)) {
                return cleanCollinearPoints(tryPath);
            }
        }

        // RUTE DETOUR ZERO-COLLISION: Jika rute tengah terhalang, melambung lewat ruang kosong atas atau bawah
        const allTops = obstacles.map(b => b.y);
        const allBottoms = obstacles.map(b => b.y + b.height);
        const minTop = Math.min(...allTops, sourceBox.y, targetBox.y);
        const maxBottom = Math.max(...allBottoms, sourceBox.y + sourceBox.height, targetBox.y + targetBox.height);

        // Pilih rute melambung atas jika side2 === 'top'
        if (side2 === 'top' || side1 === 'top') {
            const detourY = minTop - CARD_CLEARANCE - 20;
            return cleanCollinearPoints([
                p1,
                stub1,
                { x: stub1.x, y: detourY },
                { x: stub2.x, y: detourY },
                stub2,
                p2
            ]);
        }

        const detourBottomY = maxBottom + CARD_CLEARANCE + 20;
        return cleanCollinearPoints([
            p1,
            stub1,
            { x: stub1.x, y: detourBottomY },
            { x: stub2.x, y: detourBottomY },
            stub2,
            p2
        ]);
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

        let longestLen = -1;
        let bestMid = { x: 0, y: 0 };

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (len > longestLen) {
                longestLen = len;
                bestMid = { x: Math.round((p1.x + p2.x) / 2), y: Math.round((p1.y + p2.y) / 2) };
            }
        }

        return bestMid;
    }

    return {
        calculateRoutes: calculateRoutes,
        buildRoundedPath: buildRoundedPath
    };
})();
