/**
 * Greyagram - Diagram PNG Export Engine
 * Mengonversi seluruh diagram (elemen node dan konektor SVG) ke berkas citra PNG berkualitas tinggi.
 */

window.DiagramExport = (function () {
    'use strict';

    /**
     * Unduh diagram saat ini sebagai gambar PNG Ultra-HD (4K Crisp Scale 4x)
     * @param {Object} canvasState 
     * @param {string} fileName 
     */
    async function downloadPNG(canvasState, fileName = 'greyagram-class-diagram.png') {
        try {
            const classes = canvasState.classes || [];
            const relations = canvasState.relations || [];
            const positions = canvasState.nodePositions;

            if (classes.length === 0) {
                alert('Diagram masih kosong, tidak ada yang dapat diekspor.');
                return false;
            }

            // Pastikan font browser telah ter-render sempurna
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // 1. Hitung bounding box diagram dengan padding ekstra luas
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            classes.forEach(cls => {
                const pos = positions.get(cls.id);
                if (pos) {
                    minX = Math.min(minX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxX = Math.max(maxX, pos.x + pos.width);
                    maxY = Math.max(maxY, pos.y + pos.height);
                }
            });

            const padding = 70;
            const diagramWidth = Math.max(400, (maxX - minX) + padding * 2);
            const diagramHeight = Math.max(300, (maxY - minY) + padding * 2);

            // Buat canvas Ultra-HD (4x resolution - 4K Crisp)
            const dpr = 4;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(diagramWidth * dpr);
            canvas.height = Math.round(diagramHeight * dpr);

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // Pengaturan kualitas rendering gambar & teks tertinggi
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Latar belakang putih polos sesuai PRD/rule.md
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, diagramWidth, diagramHeight);

            // Offset untuk memusatkan diagram ke koordinat kanvas ekspor
            const offsetX = padding - minX;
            const offsetY = padding - minY;

            // 2. Render Konektor Relasi Ortogonal
            renderRelationsToCanvas(ctx, relations, positions, offsetX, offsetY);

            // 3. Render Setiap Kartu Node Kelas
            renderNodesToCanvas(ctx, classes, positions, offsetX, offsetY);

            // 4. Unduh berkas PNG resolusi tinggi
            const imageUri = canvas.toDataURL('image/png', 1.0);
            const downloadLink = document.createElement('a');
            downloadLink.download = fileName;
            downloadLink.href = imageUri;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            return true;
        } catch (err) {
            console.error('Export PNG Error:', err);
            throw err;
        }
    }

    /**
     * Gambar relasi dan tanda panah pada canvas ekspor menggunakan Manhattan Orthogonal Router
     */
    function renderRelationsToCanvas(ctx, relations, positions, offsetX, offsetY) {
        if (!window.DiagramRouter) return;

        const routes = DiagramRouter.calculateRoutes(relations, positions);

        routes.forEach(route => {
            const rel = route.rel;
            const pts = route.waypoints;
            if (!pts || pts.length < 2) return;

            ctx.save();
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1.5;

            // Garis putus-putus untuk dependensi & realisasi
            if (rel.type === 'dependency' || rel.type === 'realization' || rel.type === 'dotted') {
                ctx.setLineDash([5, 5]);
            } else {
                ctx.setLineDash([]);
            }

            // Gambar jalur ortogonal dengan sudut melengkung
            const r = 8;
            ctx.beginPath();
            ctx.moveTo(pts[0].x + offsetX, pts[0].y + offsetY);

            for (let i = 1; i < pts.length - 1; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                const next = pts[i + 1];

                const d1x = curr.x - prev.x;
                const d1y = curr.y - prev.y;
                const len1 = Math.hypot(d1x, d1y);

                const d2x = next.x - curr.x;
                const d2y = next.y - curr.y;
                const len2 = Math.hypot(d2x, d2y);

                const cr = Math.min(r, len1 / 2, len2 / 2);

                if (cr < 2) {
                    ctx.lineTo(curr.x + offsetX, curr.y + offsetY);
                } else {
                    const startX = curr.x - (d1x / len1) * cr;
                    const startY = curr.y - (d1y / len1) * cr;
                    const endX = curr.x + (d2x / len2) * cr;
                    const endY = curr.y + (d2y / len2) * cr;

                    ctx.lineTo(startX + offsetX, startY + offsetY);
                    ctx.quadraticCurveTo(curr.x + offsetX, curr.y + offsetY, endX + offsetX, endY + offsetY);
                }
            }

            const lastPt = pts[pts.length - 1];
            ctx.lineTo(lastPt.x + offsetX, lastPt.y + offsetY);
            ctx.stroke();

            // Gambar marker panah di titik tujuan
            const conn = route.connection;
            drawMarkerOnCanvas(ctx, { x: conn.target.x + offsetX, y: conn.target.y + offsetY }, conn.targetSide, rel.type);

            // Jika komposisi atau agregasi, gambar belah ketupat di titik sumber
            if (rel.type === 'composition' || rel.type === 'aggregation') {
                drawDiamondOnCanvas(ctx, { x: conn.source.x + offsetX, y: conn.source.y + offsetY }, conn.sourceSide, rel.type === 'composition');
            }

            // Gambar teks label relasi di titik terbaik rute
            if (rel.label && route.labelPoint) {
                const midX = route.labelPoint.x + offsetX;
                const midY = route.labelPoint.y + offsetY;

                ctx.font = '500 11px Inter, sans-serif';
                const textWidth = ctx.measureText(rel.label).width;

                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                drawRoundedRect(ctx, midX - textWidth / 2 - 6, midY - 10, textWidth + 12, 20, 4, true, true);

                ctx.fillStyle = '#4b5563';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(rel.label, midX, midY);
            }

            // Kardinalitas
            if (rel.sourceCard && conn.source) {
                drawCardText(ctx, { x: conn.source.x + offsetX, y: conn.source.y + offsetY }, conn.sourceSide, rel.sourceCard, false);
            }
            if (rel.targetCard && conn.target) {
                drawCardText(ctx, { x: conn.target.x + offsetX, y: conn.target.y + offsetY }, conn.targetSide, rel.targetCard, true);
            }

            ctx.restore();
        });
    }

    /**
     * Gambar kartu kelas node pada canvas ekspor
     */
    function renderNodesToCanvas(ctx, classes, positions, offsetX, offsetY) {
        classes.forEach(cls => {
            const pos = positions.get(cls.id);
            if (!pos) return;

            const x = pos.x + offsetX;
            const y = pos.y + offsetY;
            const w = pos.width;
            const h = pos.height;

            ctx.save();

            // Background & Border Kartu
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1.2;
            drawRoundedRect(ctx, x, y, w, h, 8, true, true);

            // Header Background halus
            ctx.fillStyle = '#f9fafb';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x, y, w, cls.stereotype ? 56 : 42, [8, 8, 0, 0]) : drawRoundedRect(ctx, x, y, w, cls.stereotype ? 56 : 42, 0, true, false);
            ctx.fill();

            // Header separator line
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + (cls.stereotype ? 56 : 42));
            ctx.lineTo(x + w, y + (cls.stereotype ? 56 : 42));
            ctx.stroke();

            let cursorY = y + 18;

            // Stereotype text
            if (cls.stereotype) {
                ctx.fillStyle = '#6b7280';
                ctx.font = '500 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('<<' + cls.stereotype + '>>', x + w / 2, cursorY);
                cursorY += 18;
            }

            // Nama Kelas
            ctx.fillStyle = '#111827';
            ctx.font = '600 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cls.name, x + w / 2, cursorY);

            cursorY = y + (cls.stereotype ? 56 : 42) + 16;

            // Atribut
            ctx.textAlign = 'left';
            if (cls.attributes && cls.attributes.length > 0) {
                cls.attributes.forEach(attr => {
                    drawMemberRow(ctx, attr, x + 12, cursorY);
                    cursorY += 20;
                });
            } else {
                ctx.fillStyle = '#9ca3af';
                ctx.font = 'italic 11px Inter, sans-serif';
                ctx.fillText('// no attributes', x + 16, cursorY);
                cursorY += 18;
            }

            cursorY += 4;

            // Divider pemisah atribut dan metode
            ctx.strokeStyle = '#f3f4f6';
            ctx.beginPath();
            ctx.moveTo(x + 12, cursorY);
            ctx.lineTo(x + w - 12, cursorY);
            ctx.stroke();

            cursorY += 16;

            // Metode
            if (cls.methods && cls.methods.length > 0) {
                cls.methods.forEach(method => {
                    drawMemberRow(ctx, method, x + 12, cursorY);
                    cursorY += 20;
                });
            } else {
                ctx.fillStyle = '#9ca3af';
                ctx.font = 'italic 11px Inter, sans-serif';
                ctx.fillText('// no methods', x + 16, cursorY);
            }

            ctx.restore();
        });
    }

    function drawMemberRow(ctx, member, startX, baselineY) {
        // Icon/Badge Visibilitas
        let badgeColor = '#10b981'; // public green
        if (member.visibility === 'private') badgeColor = '#ef4444'; // private red
        else if (member.visibility === 'protected') badgeColor = '#f59e0b'; // protected amber
        else if (member.visibility === 'package') badgeColor = '#64748b'; // package slate

        ctx.fillStyle = badgeColor;
        ctx.font = 'bold 12px Inter, monospace';
        ctx.fillText(member.icon, startX, baselineY);

        ctx.fillStyle = '#374151';
        ctx.font = '400 12px Inter, sans-serif';
        ctx.fillText(member.text, startX + 16, baselineY);
    }

    function drawMarkerOnCanvas(ctx, point, targetSide, type) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.5;

        let angle = 0;
        if (targetSide === 'left') angle = 0;
        else if (targetSide === 'top') angle = Math.PI / 2;
        else if (targetSide === 'right') angle = Math.PI;
        else if (targetSide === 'bottom') angle = -Math.PI / 2;

        ctx.translate(point.x, point.y);
        ctx.rotate(angle);

        if (type === 'inheritance' || type === 'realization') {
            // Segitiga putih
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(0, 0);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Panah asosiasi terbuka
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(0, 0);
            ctx.lineTo(-8, 4);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawDiamondOnCanvas(ctx, point, sourceSide, isFilled) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = isFilled ? '#111827' : '#ffffff';

        let angle = 0;
        if (sourceSide === 'right') angle = 0;
        else if (sourceSide === 'bottom') angle = Math.PI / 2;
        else if (sourceSide === 'left') angle = Math.PI;
        else if (sourceSide === 'top') angle = -Math.PI / 2;

        ctx.translate(point.x, point.y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(6, -4);
        ctx.lineTo(12, 0);
        ctx.lineTo(6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    function drawCardText(ctx, point, side, text, isTarget = false) {
        let tx = point.x;
        let ty = point.y;

        if (side === 'top') {
            tx += 14;
            ty -= isTarget ? 20 : 12;
        } else if (side === 'bottom') {
            tx += 14;
            ty += isTarget ? 20 : 12;
        } else if (side === 'left') {
            tx -= isTarget ? 22 : 14;
            ty -= 12;
        } else if (side === 'right') {
            tx += isTarget ? 22 : 14;
            ty -= 12;
        }

        ctx.save();
        ctx.font = '700 10px Inter, sans-serif';
        const textWidth = ctx.measureText(text).width;
        const padX = 5;
        const padY = 3;
        const badgeWidth = Math.max(16, textWidth + padX * 2);
        const badgeHeight = 16;
        const badgeX = tx - badgeWidth / 2;
        const badgeY = ty - badgeHeight / 2;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 3, true, true);

        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tx, ty);
        ctx.restore();
    }

    function getCardinalitySvgPos(x, y, side, isTarget = false) {
        if (side === 'top') return { x: x + 14, y: y - (isTarget ? 20 : 12) };
        if (side === 'bottom') return { x: x + 14, y: y + (isTarget ? 20 : 12) };
        if (side === 'left') return { x: x - (isTarget ? 22 : 14), y: y - 12 };
        return { x: x + (isTarget ? 22 : 14), y: y - 12 };
    }

    function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function calculateAnchors(boxA, boxB) {
        const centerA = { x: boxA.x + boxA.width / 2, y: boxA.y + boxA.height / 2 };
        const centerB = { x: boxB.x + boxB.width / 2, y: boxB.y + boxB.height / 2 };

        const dx = centerB.x - centerA.x;
        const dy = centerB.y - centerA.y;

        let sideA, sideB;
        if (Math.abs(dx) > Math.abs(dy)) {
            sideA = dx > 0 ? 'right' : 'left';
            sideB = dx > 0 ? 'left' : 'right';
        } else {
            sideA = dy > 0 ? 'bottom' : 'top';
            sideB = dy > 0 ? 'top' : 'bottom';
        }

        return {
            source: getAnchor(boxA, sideA),
            target: getAnchor(boxB, sideB),
            sourceSide: sideA,
            targetSide: sideB
        };
    }

    function getAnchor(box, side) {
        switch (side) {
            case 'top': return { x: box.x + box.width / 2, y: box.y };
            case 'bottom': return { x: box.x + box.width / 2, y: box.y + box.height };
            case 'left': return { x: box.x, y: box.y + box.height / 2 };
            case 'right': default: return { x: box.x + box.width, y: box.y + box.height / 2 };
        }
    }

    /**
     * Unduh diagram dalam format vektor SVG murni (resolusi tak terbatas, 100% vector HD)
     */
    function downloadSVG(canvasState, fileName = 'greyagram-diagram.svg') {
        const classes = canvasState.classes || [];
        const relations = canvasState.relations || [];
        const positions = canvasState.nodePositions;

        if (classes.length === 0) {
            alert('Diagram masih kosong, tidak ada yang dapat diekspor.');
            return false;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        classes.forEach(cls => {
            const pos = positions.get(cls.id);
            if (pos) {
                minX = Math.min(minX, pos.x);
                minY = Math.min(minY, pos.y);
                maxX = Math.max(maxX, pos.x + pos.width);
                maxY = Math.max(maxY, pos.y + pos.height);
            }
        });

        const padding = 60;
        const width = Math.max(400, (maxX - minX) + padding * 2);
        const height = Math.max(300, (maxY - minY) + padding * 2);
        const offsetX = padding - minX;
        const offsetY = padding - minY;

        const routes = window.DiagramRouter ? DiagramRouter.calculateRoutes(relations, positions) : [];

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #ffffff; font-family: 'Inter', sans-serif;">\n`;
        svgContent += `  <defs>\n`;
        svgContent += `    <marker id="svg-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto"><polyline points="2 2, 10 6, 2 10" fill="none" stroke="#111827" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></marker>\n`;
        svgContent += `    <marker id="svg-inheritance" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto"><polygon points="1 2, 13 7, 1 12" fill="#ffffff" stroke="#111827" stroke-width="1.5" /></marker>\n`;
        svgContent += `    <marker id="svg-composition" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto"><polygon points="1 8, 8 3, 15 8, 8 13" fill="#111827" stroke="#111827" /></marker>\n`;
        svgContent += `    <marker id="svg-aggregation" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto"><polygon points="1 8, 8 3, 15 8, 8 13" fill="#ffffff" stroke="#111827" stroke-width="1.5" /></marker>\n`;
        svgContent += `  </defs>\n`;

        // Background
        svgContent += `  <rect width="100%" height="100%" fill="#ffffff" />\n`;

        // Relations
        routes.forEach(route => {
            const rel = route.rel;
            const pts = route.waypoints.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
            const d = DiagramRouter.buildRoundedPath(pts, 8);
            let markerAttr = 'marker-end="url(#svg-arrow)"';
            if (rel.type === 'inheritance' || rel.type === 'realization') markerAttr = 'marker-end="url(#svg-inheritance)"';
            else if (rel.type === 'composition') markerAttr = 'marker-start="url(#svg-composition)" marker-end="url(#svg-arrow)"';
            else if (rel.type === 'aggregation') markerAttr = 'marker-start="url(#svg-aggregation)" marker-end="url(#svg-arrow)"';

            const dashAttr = (rel.type === 'dependency' || rel.type === 'realization') ? 'stroke-dasharray="5,5"' : '';
            svgContent += `  <path d="${d}" fill="none" stroke="#374151" stroke-width="1.5" ${dashAttr} ${markerAttr} />\n`;

            if (rel.label && route.labelPoint) {
                const lx = route.labelPoint.x + offsetX;
                const ly = route.labelPoint.y + offsetY;
                const tw = rel.label.length * 7 + 14;
                svgContent += `  <g><rect x="${lx - tw/2}" y="${ly - 10}" width="${tw}" height="20" rx="4" fill="#ffffff" stroke="#d1d5db" /><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" font-weight="500" fill="#4b5563">${rel.label}</text></g>\n`;
            }

            // Kardinalitas Sumber & Target pada SVG (dilindungi badge putih anti-tumpuk)
            const conn = route.connection;
            if (rel.sourceCard && conn && conn.source) {
                const cPos = getCardinalitySvgPos(conn.source.x + offsetX, conn.source.y + offsetY, conn.sourceSide, false);
                const tw = Math.max(16, rel.sourceCard.length * 7 + 10);
                svgContent += `  <g class="cardinality-badge"><rect x="${cPos.x - tw/2}" y="${cPos.y - 8}" width="${tw}" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" /><text x="${cPos.x}" y="${cPos.y}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="#1e293b">${rel.sourceCard}</text></g>\n`;
            }
            if (rel.targetCard && conn && conn.target) {
                const cPos = getCardinalitySvgPos(conn.target.x + offsetX, conn.target.y + offsetY, conn.targetSide, true);
                const tw = Math.max(16, rel.targetCard.length * 7 + 10);
                svgContent += `  <g class="cardinality-badge"><rect x="${cPos.x - tw/2}" y="${cPos.y - 8}" width="${tw}" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" /><text x="${cPos.x}" y="${cPos.y}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="#1e293b">${rel.targetCard}</text></g>\n`;
            }
        });

        // Cards
        classes.forEach(cls => {
            const pos = positions.get(cls.id);
            if (!pos) return;
            const x = pos.x + offsetX;
            const y = pos.y + offsetY;
            const w = pos.width;
            const h = pos.height;

            svgContent += `  <g id="card_${cls.id}">\n`;
            svgContent += `    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#ffffff" stroke="#d1d5db" stroke-width="1.2" />\n`;
            svgContent += `    <path d="M ${x} ${y+8} Q ${x} ${y} ${x+8} ${y} L ${x+w-8} ${y} Q ${x+w} ${y} ${x+w} ${y+8} L ${x+w} ${y+(cls.stereotype?56:42)} L ${x} ${y+(cls.stereotype?56:42)} Z" fill="#f9fafb" />\n`;
            svgContent += `    <line x1="${x}" y1="${y+(cls.stereotype?56:42)}" x2="${x+w}" y2="${y+(cls.stereotype?56:42)}" stroke="#e5e7eb" stroke-width="1" />\n`;

            let cy = y + 18;
            if (cls.stereotype) {
                svgContent += `    <text x="${x+w/2}" y="${cy}" text-anchor="middle" font-size="10" font-weight="600" fill="#6b7280">&lt;&lt;${cls.stereotype}&gt;&gt;</text>\n`;
                cy += 18;
            }
            svgContent += `    <text x="${x+w/2}" y="${cy}" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">${cls.name}</text>\n`;

            cy = y + (cls.stereotype ? 56 : 42) + 16;
            if (cls.attributes && cls.attributes.length > 0) {
                cls.attributes.forEach(attr => {
                    const col = attr.visibility === 'private' ? '#ef4444' : (attr.visibility === 'protected' ? '#f59e0b' : '#10b981');
                    svgContent += `    <text x="${x+12}" y="${cy}" font-size="12" font-family="monospace" font-weight="bold" fill="${col}">${attr.icon}</text>\n`;
                    svgContent += `    <text x="${x+28}" y="${cy}" font-size="12" fill="#374151">${attr.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>\n`;
                    cy += 20;
                });
            }
            svgContent += `  </g>\n`;
        });

        svgContent += `</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = fileName;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }

    /**
     * Hasilkan pratinjau thumbnail ringkas sebagai Data URL (JPEG/PNG)
     * Digunakan untuk galeri proyek pengguna.
     * @param {Object} canvasState
     * @param {number} maxThumbWidth
     * @param {number} maxThumbHeight
     * @returns {string|null} Data URL citra pratinjau
     */
    /**
     * Hasilkan Thumbnail diagram format JPEG data URL untuk preview kartu proyek
     */
    function generateThumbnail(canvasState, maxThumbWidth = 480, maxThumbHeight = 240) {
        try {
            if (!canvasState) return null;

            const classes = canvasState.classes || [];
            const relations = canvasState.relations || [];
            let positions = canvasState.nodePositions;

            if (classes.length === 0 || !positions) {
                return null;
            }

            // Normalisasi nodePositions jika berupa Object biasa
            if (!(positions instanceof Map)) {
                const map = new Map();
                Object.keys(positions).forEach(k => map.set(k, positions[k]));
                positions = map;
            }

            // Hitung bounding box diagram
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            classes.forEach(cls => {
                const pos = positions.get(cls.id);
                if (pos) {
                    minX = Math.min(minX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxX = Math.max(maxX, pos.x + (pos.width || 260));
                    maxY = Math.max(maxY, pos.y + (pos.height || 160));
                }
            });

            if (minX === Infinity || maxX === -Infinity) return null;

            const padding = 25;
            const diagramWidth = Math.max(260, (maxX - minX) + padding * 2);
            const diagramHeight = Math.max(160, (maxY - minY) + padding * 2);

            // Hitung rasio skala agar pas proporsional dalam dimensi thumbnail landscape
            const scale = Math.min(maxThumbWidth / diagramWidth, maxThumbHeight / diagramHeight, 1.0);
            const targetW = Math.max(160, Math.round(diagramWidth * scale));
            const targetH = Math.max(100, Math.round(diagramHeight * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);

            ctx.save();
            ctx.scale(scale, scale);

            const offsetX = -minX + padding;
            const offsetY = -minY + padding;

            // 1. Render seluruh relasi konektor ortogonal
            renderRelationsToCanvas(ctx, relations, positions, offsetX, offsetY);

            // 2. Render seluruh kartu kelas
            renderNodesToCanvas(ctx, classes, positions, offsetX, offsetY);

            ctx.restore();

            return canvas.toDataURL('image/jpeg', 0.85);
        } catch (e) {
            console.warn('Gagal menghasilkan thumbnail diagram:', e);
            return null;
        }
    }

    return {
        downloadPNG: downloadPNG,
        downloadSVG: downloadSVG,
        generateThumbnail: generateThumbnail
    };
})();

