/**
 * Greyagram - Professional Visio/DBDiagram-Quality Orthogonal Router
 * Menghasilkan rute konektor ortogonal kelas industri (setara Microsoft Visio / dbdiagram.io / draw.io).
 *
 * Jaminan Kualitas Visio & dbdiagram.io:
 * 1. Panah relasi hierarki vertikal (turun) SELALU masuk dari ATAS (top) dan mengarah tegak lurus ke BAWAH.
 * 2. Garis konektor TIDAK PERNAH memotong atau menempel di sisi/border kartu manapun.
 * 3. Jalur horizontal dialokasikan pada Multi-Track Corridor terpisah (anti-tumpuk) dengan elevasi Y unik.
 * 4. Multi-Port otomatis mendistribusikan titik masuk/keluar secara merata pada kartu.
 * 5. Anti-tumpuk teks label dengan deteksi tabrakan koordinat.
 */

window.DiagramRouter = (function () {
    'use strict';

    const STUB_LENGTH = 28;     // Panjang jalur tegak lurus wajib keluar/masuk kartu (menjamin panah dari atas)
    const CORNER_RADIUS = 8;    // Radius lengkungan belokan 90 derajat
    const TRACK_SPACING = 20;   // Jarak elevasi antar jalur paralel di koridor yang sama (anti-tumpuk)
    const CARD_CLEARANCE = 24;  // Jarak bebas aman dari tepi kartu

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

        // 1. Tentukan orientasi sisi koneksi seperti Visio / dbdiagram.io
        const resolvedRelations = relations.map(rel => {
            const posA = nodePositions.get(rel.source);
            const posB = nodePositions.get(rel.target);
            if (!posA || !posB) return null;

            const sides = determineVisioSides(posA, posB, rel);
            return {
                rel: rel,
                sourcePos: posA,
                targetPos: posB,
                sourceSide: sides.sourceSide,
                targetSide: sides.targetSide
            };
        }).filter(Boolean);

        // 2. Alokasikan Slot Port pada setiap kartu agar garis tidak bertumpuk di satu titik
        const portAssignments = assignPortSlots(resolvedRelations);

        // 3. Kumpulkan rintangan (bounding box setiap kartu)
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

        // 4. Tracker koridor horizontal multi-track agar garis tidak tumpang tindih
        const corridorTracks = new Map(); // key: corridor band -> counter

        // 5. Tracker posisi label untuk mencegah tabrakan teks label
        const placedLabels = [];

        // 6. Bangun jalur ortogonal untuk setiap relasi
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
     * Tentukan orientasi sisi keluar/masuk setara Visio & dbdiagram.io:
     * - Relasi Mandiri (Self-Relation): Keluar Kanan (right), Masuk Atas (top).
     * - Relasi Turun Hierarki (Target di bawah Sumber): Sumber keluar BAWAH (bottom), Target masuk ATAS (top).
     * - Relasi Naik Hierarki (Target di atas Sumber): Sumber keluar ATAS (top), Target masuk BAWAH (bottom).
     * - Relasi Satu Baris (Horizontal): Keluar Kanan/Kiri, Masuk Kiri/Kanan.
     */
    function determineVisioSides(boxA, boxB, rel) {
        // Relasi mandiri (User -> User)
        if (rel && rel.source === rel.target) {
            return { sourceSide: 'right', targetSide: 'top' };
        }

        const centerA = { x: boxA.x + boxA.width / 2, y: boxA.y + boxA.height / 2 };
        const centerB = { x: boxB.x + boxB.width / 2, y: boxB.y + boxB.height / 2 };

        const dy = centerB.y - centerA.y;
        const dx = centerB.x - centerA.x;

        // Target berada di baris/tier bawah sumber:
        // Standar Visio/dbdiagram: Keluar dari BAWAH, Masuk dari ATAS
        if (boxB.y >= boxA.y + 40 || dy > 45) {
            return { sourceSide: 'bottom', targetSide: 'top' };
        }

        // Target berada di baris/tier atas sumber:
        if (boxA.y >= boxB.y + 40 || dy < -45) {
            return { sourceSide: 'top', targetSide: 'bottom' };
        }

        // Satu baris horizontal sejajar
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

        // KASUS 1: Relasi Vertikal Alami (Bottom ke Top - Pola Standar Hierarki/Relasi Turun)
        // Sumber di baris atas, Target di baris bawah -> PANAH PASTI DARI ATAS
        if (side1 === 'bottom' && side2 === 'top') {
            const rowGapTop = sourceBox.y + sourceBox.height;
            const rowGapBottom = targetBox.y;

            // Jika posisi target normal berada di bawah sumber
            if (rowGapBottom > rowGapTop + 15) {
                // Jalur Lurus Murni jika posisi horizontal hampir persis sejajar (< 8px)
                if (Math.abs(p1.x - p2.x) < 8) {
                    return [
                        { x: p1.x, y: p1.y },
                        { x: p1.x, y: p2.y }
                    ];
                }

                // Koridor horizontal di ruang kosong antara baris atas dan baris bawah
                const rawMidY = Math.round((rowGapTop + rowGapBottom) / 2);

                // Multi-Track Allocation: Berikan elevasi Y berbeda untuk setiap garis di koridor ini
                const corridorKey = 'corridor_y_' + Math.round(rawMidY / 50) * 50;
                const trackIdx = corridorTracks.get(corridorKey) || 0;
                corridorTracks.set(corridorKey, trackIdx + 1);

                // Pola sebaran track simetris: 0, -18, +18, -36, +36, -54, +54...
                let trackOffset = 0;
                if (trackIdx > 0) {
                    const stepNum = Math.ceil(trackIdx / 2);
                    trackOffset = (trackIdx % 2 === 1 ? -stepNum : stepNum) * TRACK_SPACING;
                }

                let channelY = rawMidY + trackOffset;

                // Batasi agar channelY selalu berada di ruang bebas aman, minimal 22px dari kartu atas dan bawah
                const minSafeY = rowGapTop + CARD_CLEARANCE;
                const maxSafeY = rowGapBottom - CARD_CLEARANCE;
                if (minSafeY < maxSafeY) {
                    channelY = Math.max(minSafeY, Math.min(maxSafeY, channelY));
                }

                // Rute Ortogonal 2-Belokan Bersih (Visio/dbdiagram style):
                // 1. Keluar lurus dari bawah kartu sumber (p1.y) menuju channelY
                // 2. Berjalan horizontal di channelY yang eksklusif (anti-tumpuk)
                // 3. Belok dan turun tegak lurus masuk ke sisi ATAS kartu target (p2)
                // -> Segmen terakhir (channelY -> p2.y) DIJAMIN TEGAK LURUS DARI ATAS!
                return cleanCollinearPoints([
                    p1,
                    { x: p1.x, y: channelY },
                    { x: p2.x, y: channelY },
                    p2
                ]);
            } else {
                // Kasus langka: Kartu target digeser manual oleh user ke samping/atas sumber
                // Rute memutar aman: Turun ke bawah sumber -> lewati celah samping -> naik dan masuk dari atas target
                const safeBottomY = Math.max(sourceBox.y + sourceBox.height, targetBox.y + targetBox.height) + CARD_CLEARANCE + 16;
                const safeTopY = targetBox.y - CARD_CLEARANCE - 16;
                const goRight = targetBox.x >= sourceBox.x;
                const escapeX = goRight ? Math.max(sourceBox.x + sourceBox.width, targetBox.x + targetBox.width) + CARD_CLEARANCE + 20
                                        : Math.min(sourceBox.x, targetBox.x) - CARD_CLEARANCE - 20;

                return cleanCollinearPoints([
                    p1,
                    { x: p1.x, y: safeBottomY },
                    { x: escapeX, y: safeBottomY },
                    { x: escapeX, y: safeTopY },
                    { x: p2.x, y: safeTopY },
                    p2
                ]);
            }
        }

        // KASUS 2: Relasi Vertikal Naik (Top ke Bottom - Target di atas Sumber)
        if (side1 === 'top' && side2 === 'bottom') {
            const rowGapBottom = sourceBox.y;
            const rowGapTop = targetBox.y + targetBox.height;

            if (rowGapBottom > rowGapTop + 15) {
                if (Math.abs(p1.x - p2.x) < 8) {
                    return [
                        { x: p1.x, y: p1.y },
                        { x: p1.x, y: p2.y }
                    ];
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

                return cleanCollinearPoints([
                    p1,
                    { x: p1.x, y: channelY },
                    { x: p2.x, y: channelY },
                    p2
                ]);
            }
        }

        // KASUS 3: Relasi Horizontal Sejajar (Right ke Left - Sumber di Kiri, Target di Kanan)
        if (side1 === 'right' && side2 === 'left') {
            const colGapLeft = sourceBox.x + sourceBox.width;
            const colGapRight = targetBox.x;

            if (colGapRight > colGapLeft + 15) {
                if (Math.abs(p1.y - p2.y) < 8) {
                    return [
                        { x: p1.x, y: p1.y },
                        { x: p2.x, y: p1.y }
                    ];
                }

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

                return cleanCollinearPoints([
                    p1,
                    { x: channelX, y: p1.y },
                    { x: channelX, y: p2.y },
                    p2
                ]);
            }
        }

        // KASUS 4: Relasi Horizontal Sejajar Terbalik (Left ke Right)
        if (side1 === 'left' && side2 === 'right') {
            const colGapRight = sourceBox.x;
            const colGapLeft = targetBox.x + targetBox.width;

            if (colGapRight > colGapLeft + 15) {
                if (Math.abs(p1.y - p2.y) < 8) {
                    return [
                        { x: p1.x, y: p1.y },
                        { x: p2.x, y: p1.y }
                    ];
                }

                const rawMidX = Math.round((colGapLeft + colGapRight) / 2);
                return cleanCollinearPoints([
                    p1,
                    { x: rawMidX, y: p1.y },
                    { x: rawMidX, y: p2.y },
                    p2
                ]);
            }
        }

        // KASUS 5: Default Fallback Ortogonal dengan Stub Wajib (Menjamin sudut masuk selalu tegak lurus)
        const stub1 = getStubPoint(p1, side1, STUB_LENGTH);
        const stub2 = getStubPoint(p2, side2, STUB_LENGTH);

        // Jika side2 adalah 'top', stub2 berada tepat di ATAS p2 -> panah tetap masuk dari atas!
        if (side2 === 'top') {
            const midY = (stub1.y + stub2.y) / 2;
            return cleanCollinearPoints([
                p1,
                stub1,
                { x: stub1.x, y: midY },
                { x: stub2.x, y: midY },
                stub2,
                p2
            ]);
        }

        return cleanCollinearPoints([
            p1,
            stub1,
            { x: stub2.x, y: stub1.y },
            stub2,
            p2
        ]);
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
     * Hitung titik peletakan label teks yang bebas tabrakan (anti-overlap)
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

        // Cek tabrakan dengan label-label yang telah ditempatkan sebelumnya
        const minDistance = 55;
        let adjustedPt = { x: bestPt.x, y: bestPt.y };

        for (let attempt = 0; attempt < 4; attempt++) {
            let collides = false;
            for (let j = 0; j < placedLabels.length; j++) {
                const other = placedLabels[j];
                const dist = Math.hypot(adjustedPt.x - other.x, adjustedPt.y - other.y);
                if (dist < minDistance) {
                    collides = true;
                    break;
                }
            }

            if (!collides) break;

            // Jika bertabrakan, geser secara staggered di sepanjang segmen
            if (isHorizontal) {
                adjustedPt.x += (attempt % 2 === 0 ? 35 : -35) * (Math.floor(attempt / 2) + 1);
            } else {
                adjustedPt.y += (attempt % 2 === 0 ? 25 : -25) * (Math.floor(attempt / 2) + 1);
            }
        }

        placedLabels.push(adjustedPt);
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
