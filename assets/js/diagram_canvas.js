/**
 * Greyagram - Interactive Diagram Canvas & Dynamic Edge Routing
 * Mengatur interaktivitas kanvas: drag & drop node, rendering relasi dinamis, pan, zoom, dan autofit.
 */

window.DiagramCanvas = (function () {
    'use strict';

    function create(containerElement, svgElement, nodesLayerElement) {
        let state = {
            classes: [],
            relations: [],
            nodePositions: new Map(), // id -> {x, y, width, height}
            zoom: 1.0,
            panX: 0,
            panY: 0,
            isPanning: false,
            panStartX: 0,
            panStartY: 0,
            activeDragNodeId: null,
            dragOffset: { x: 0, y: 0 },
            onUpdate: null,
            onPositionChange: null,
            savedLayoutData: null
        };

        // Inisialisasi SVG defs untuk marker panah dan simbol relasi
        initSvgDefs(svgElement);

        // Pasang event listener kanvas untuk pan & zoom
        setupCanvasInteractions();

        /**
         * Render diagram lengkap dari model data
         */
        function render(classes, relations, shouldAutoFit = true, customLayout = null) {
            state.classes = classes || [];
            state.relations = relations || [];

            // Hitung layout bebas tabrakan bawaan
            state.nodePositions = DiagramLayout.computeLayout(state.classes, state.relations);

            // Jika ada posisi tersimpan (customLayout), terapkan koordinat tersimpan
            const layoutSource = customLayout || state.savedLayoutData;
            let hasSavedPositions = false;

            if (layoutSource && typeof layoutSource === 'object') {
                const positionsObj = layoutSource.positions || layoutSource;
                Object.keys(positionsObj).forEach(id => {
                    if (state.nodePositions.has(id)) {
                        const cur = state.nodePositions.get(id);
                        if (typeof positionsObj[id].x === 'number') cur.x = positionsObj[id].x;
                        if (typeof positionsObj[id].y === 'number') cur.y = positionsObj[id].y;
                        hasSavedPositions = true;
                    }
                });

                if (hasSavedPositions) {
                    state.savedLayoutData = layoutSource;
                    // Jika ada posisi tersimpan, jangan reset ke autofit default kecuali diminta eksplisit
                    if (shouldAutoFit === 'auto') {
                        shouldAutoFit = false;
                    }
                }
            }

            // Render DOM node cards
            renderNodeElements();

            // Ukur dimensi fisik aktual setiap kartu secara sinkron dari DOM
            measureActualNodeDimensions(!hasSavedPositions);

            // Render SVG connectors dengan koordinat dimensi riil
            updateConnectors();

            // Lakukan autofit jika diminta
            if (shouldAutoFit === true && state.classes.length > 0) {
                autoFit();
            } else {
                applyTransform();
            }

            // Validasi ulang setelah rendering font browser siap
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    measureActualNodeDimensions();
                    updateConnectors();
                });
            }

            if (typeof state.onUpdate === 'function') {
                state.onUpdate(getStats());
            }
        }

        /**
         * Ukur tinggi dan lebar fisik sebenarnya dari elemen DOM kartu
         * dan pastikan celah/koridor antar baris selalu lapang (anti-tabrakan).
         */
        function measureActualNodeDimensions(shouldEnforceGaps = true) {
            state.classes.forEach(cls => {
                const card = document.getElementById('node_' + cls.id);
                if (card) {
                    const pos = state.nodePositions.get(cls.id);
                    if (pos) {
                        const h = card.offsetHeight || card.clientHeight;
                        const w = card.offsetWidth || card.clientWidth;
                        if (h > 0) pos.height = h;
                        if (w > 0) pos.width = w;
                    }
                }
            });

            if (shouldEnforceGaps) {
                enforceMinimumRowGaps();
            }
        }

        /**
         * Pastikan koridor vertikal antar baris kartu selalu memiliki ruang bebas minimal 140px
         */
        function enforceMinimumRowGaps() {
            if (state.classes.length === 0) return;

            const cardList = [];
            state.classes.forEach(cls => {
                const pos = state.nodePositions.get(cls.id);
                if (pos) {
                    cardList.push({ id: cls.id, pos: pos });
                }
            });

            if (cardList.length === 0) return;

            // Kelompokkan kartu ke dalam baris/tier (toleransi vertikal 50px)
            cardList.sort((a, b) => a.pos.y - b.pos.y);

            const rows = [];
            cardList.forEach(item => {
                let placedInRow = false;
                for (let r = 0; r < rows.length; r++) {
                    const rowAvgY = rows[r].reduce((sum, c) => sum + c.pos.y, 0) / rows[r].length;
                    if (Math.abs(item.pos.y - rowAvgY) <= 50) {
                        rows[r].push(item);
                        placedInRow = true;
                        break;
                    }
                }
                if (!placedInRow) {
                    rows.push([item]);
                }
            });

            // Urutkan baris dari atas ke bawah
            rows.sort((r1, r2) => {
                const y1 = r1.reduce((sum, c) => sum + c.pos.y, 0) / r1.length;
                const y2 = r2.reduce((sum, c) => sum + c.pos.y, 0) / r2.length;
                return y1 - y2;
            });

            // Periksa celah antar baris berurutan: pastikan minimal 140px
            const MIN_ROW_GAP = 140;

            for (let i = 0; i < rows.length - 1; i++) {
                const currentRow = rows[i];
                const nextRow = rows[i + 1];

                const currentMaxBottom = currentRow.reduce((maxB, c) => Math.max(maxB, c.pos.y + c.pos.height), -Infinity);
                const nextMinTop = nextRow.reduce((minT, c) => Math.min(minT, c.pos.y), Infinity);

                const requiredTop = currentMaxBottom + MIN_ROW_GAP;
                if (nextMinTop < requiredTop) {
                    const rowDiff = requiredTop - nextMinTop;

                    // Geser semua baris di bawahnya
                    for (let j = i + 1; j < rows.length; j++) {
                        rows[j].forEach(c => {
                            c.pos.y += rowDiff;
                            const cardEl = document.getElementById('node_' + c.id);
                            if (cardEl) {
                                cardEl.style.top = c.pos.y + 'px';
                            }
                        });
                    }
                }
            }
        }

        /**
         * Render elemen HTML untuk setiap kelas diagram
         */
        function renderNodeElements() {
            nodesLayerElement.innerHTML = '';

            state.classes.forEach(cls => {
                const pos = state.nodePositions.get(cls.id) || { x: 100, y: 100, width: 260, height: 160 };

                const card = document.createElement('div');
                card.className = 'diagram-class-card';
                card.id = 'node_' + cls.id;
                card.setAttribute('data-id', cls.id);
                card.style.left = pos.x + 'px';
                card.style.top = pos.y + 'px';
                card.style.width = pos.width + 'px';

                // Header Card
                const header = document.createElement('div');
                header.className = 'class-card-header';

                if (cls.stereotype) {
                    const stereoBadge = document.createElement('div');
                    stereoBadge.className = 'class-stereotype';
                    stereoBadge.textContent = '<<' + cls.stereotype + '>>';
                    header.appendChild(stereoBadge);
                }

                const titleRow = document.createElement('div');
                titleRow.className = 'class-title-row';

                const classIcon = document.createElement('i');
                classIcon.className = 'fa-solid fa-cube class-title-icon';
                titleRow.appendChild(classIcon);

                const title = document.createElement('span');
                title.className = 'class-title';
                title.textContent = cls.name;
                titleRow.appendChild(title);

                header.appendChild(titleRow);
                card.appendChild(header);

                // Body Card (Atribut & Metode)
                const body = document.createElement('div');
                body.className = 'class-card-body';

                // Bagian Atribut
                const attrSection = document.createElement('div');
                attrSection.className = 'class-member-section';
                if (cls.attributes && cls.attributes.length > 0) {
                    cls.attributes.forEach(attr => {
                        const row = document.createElement('div');
                        row.className = 'member-row member-attribute';

                        const badge = document.createElement('span');
                        badge.className = 'visibility-badge vis-' + attr.visibility;
                        badge.textContent = attr.icon;
                        row.appendChild(badge);

                        const text = document.createElement('span');
                        text.className = 'member-text';
                        text.textContent = attr.text;
                        row.appendChild(text);

                        attrSection.appendChild(row);
                    });
                } else {
                    const emptyRow = document.createElement('div');
                    emptyRow.className = 'member-row member-empty';
                    emptyRow.textContent = '// no attributes';
                    attrSection.appendChild(emptyRow);
                }
                body.appendChild(attrSection);

                // Garis pemisah atribut dan metode
                const divider = document.createElement('div');
                divider.className = 'class-card-divider';
                body.appendChild(divider);

                // Bagian Metode
                const methodSection = document.createElement('div');
                methodSection.className = 'class-member-section';
                if (cls.methods && cls.methods.length > 0) {
                    cls.methods.forEach(method => {
                        const row = document.createElement('div');
                        row.className = 'member-row member-method';

                        const badge = document.createElement('span');
                        badge.className = 'visibility-badge vis-' + method.visibility;
                        badge.textContent = method.icon;
                        row.appendChild(badge);

                        const text = document.createElement('span');
                        text.className = 'member-text';
                        text.textContent = method.text;
                        row.appendChild(text);

                        methodSection.appendChild(row);
                    });
                } else {
                    const emptyRow = document.createElement('div');
                    emptyRow.className = 'member-row member-empty';
                    emptyRow.textContent = '// no methods';
                    methodSection.appendChild(emptyRow);
                }
                body.appendChild(methodSection);

                card.appendChild(body);

                // Pasang drag event listener pada card
                attachNodeDragEvents(card, cls.id);

                nodesLayerElement.appendChild(card);

                // Sinkron langsung ukur dimensi kartu riil dari DOM
                const measuredH = card.offsetHeight || card.clientHeight;
                const measuredW = card.offsetWidth || card.clientWidth;
                if (measuredH > 0) pos.height = measuredH;
                if (measuredW > 0) pos.width = measuredW;
            });
        }

        /**
         * Deteksi dan terapkan Smart Snapping & Alignment Guides (Gaya Canva / Figma)
         * Menyejajarkan sisi kiri, tengah, kanan, atas, tengah-vertikal, dan bawah dengan kartu lain.
         */
        function checkSmartSnapping(nodeId, rawX, rawY) {
            const curPos = state.nodePositions.get(nodeId);
            if (!curPos) return { x: rawX, y: rawY, guides: [] };

            const w = curPos.width || 260;
            const h = curPos.height || 160;

            const SNAP_THRESHOLD = 8; // Ambang batas magnetik dalam pixel kanvas

            let snappedX = rawX;
            let snappedY = rawY;

            let bestDiffX = SNAP_THRESHOLD + 1;
            let bestDiffY = SNAP_THRESHOLD + 1;

            let activeGuideLines = [];

            // Titik acuan kartu yang sedang digeser
            const dragBounds = {
                left: rawX,
                center: rawX + w / 2,
                right: rawX + w,
                top: rawY,
                middle: rawY + h / 2,
                bottom: rawY + h
            };

            // Bandingkan dengan seluruh kartu lain di kanvas
            state.classes.forEach(otherCls => {
                if (otherCls.id === nodeId) return;
                const other = state.nodePositions.get(otherCls.id);
                if (!other) return;

                const oLeft = other.x;
                const oCenter = other.x + (other.width || 260) / 2;
                const oRight = other.x + (other.width || 260);
                const oTop = other.y;
                const oMiddle = other.y + (other.height || 160) / 2;
                const oBottom = other.y + (other.height || 160);

                // --- 1. SNAPPING VERTIKAL (Menyesuaikan Koordinat X) ---

                // Center-to-Center (Warna magenta/pink Canva)
                const diffCenterX = Math.abs(dragBounds.center - oCenter);
                if (diffCenterX <= SNAP_THRESHOLD && diffCenterX < bestDiffX) {
                    bestDiffX = diffCenterX;
                    snappedX = Math.round(oCenter - w / 2);
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'x');
                    activeGuideLines.push({
                        axis: 'x',
                        coord: oCenter,
                        y1: Math.min(dragBounds.top, oTop) - 40,
                        y2: Math.max(dragBounds.bottom, oBottom) + 40,
                        isCenter: true
                    });
                }

                // Left-to-Left
                const diffLeftLeft = Math.abs(dragBounds.left - oLeft);
                if (diffLeftLeft <= SNAP_THRESHOLD && diffLeftLeft < bestDiffX) {
                    bestDiffX = diffLeftLeft;
                    snappedX = oLeft;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'x');
                    activeGuideLines.push({
                        axis: 'x',
                        coord: oLeft,
                        y1: Math.min(dragBounds.top, oTop) - 40,
                        y2: Math.max(dragBounds.bottom, oBottom) + 40,
                        isCenter: false
                    });
                }

                // Right-to-Right
                const diffRightRight = Math.abs(dragBounds.right - oRight);
                if (diffRightRight <= SNAP_THRESHOLD && diffRightRight < bestDiffX) {
                    bestDiffX = diffRightRight;
                    snappedX = oRight - w;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'x');
                    activeGuideLines.push({
                        axis: 'x',
                        coord: oRight,
                        y1: Math.min(dragBounds.top, oTop) - 40,
                        y2: Math.max(dragBounds.bottom, oBottom) + 40,
                        isCenter: false
                    });
                }

                // Left-to-Right
                const diffLeftRight = Math.abs(dragBounds.left - oRight);
                if (diffLeftRight <= SNAP_THRESHOLD && diffLeftRight < bestDiffX) {
                    bestDiffX = diffLeftRight;
                    snappedX = oRight;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'x');
                    activeGuideLines.push({
                        axis: 'x',
                        coord: oRight,
                        y1: Math.min(dragBounds.top, oTop) - 40,
                        y2: Math.max(dragBounds.bottom, oBottom) + 40,
                        isCenter: false
                    });
                }

                // Right-to-Left
                const diffRightLeft = Math.abs(dragBounds.right - oLeft);
                if (diffRightLeft <= SNAP_THRESHOLD && diffRightLeft < bestDiffX) {
                    bestDiffX = diffRightLeft;
                    snappedX = oLeft - w;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'x');
                    activeGuideLines.push({
                        axis: 'x',
                        coord: oLeft,
                        y1: Math.min(dragBounds.top, oTop) - 40,
                        y2: Math.max(dragBounds.bottom, oBottom) + 40,
                        isCenter: false
                    });
                }

                // --- 2. SNAPPING HORIZONTAL (Menyesuaikan Koordinat Y) ---

                // Middle-to-Middle (Warna magenta/pink Canva)
                const diffMiddleY = Math.abs(dragBounds.middle - oMiddle);
                if (diffMiddleY <= SNAP_THRESHOLD && diffMiddleY < bestDiffY) {
                    bestDiffY = diffMiddleY;
                    snappedY = Math.round(oMiddle - h / 2);
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'y');
                    activeGuideLines.push({
                        axis: 'y',
                        coord: oMiddle,
                        x1: Math.min(dragBounds.left, oLeft) - 40,
                        x2: Math.max(dragBounds.right, oRight) + 40,
                        isCenter: true
                    });
                }

                // Top-to-Top
                const diffTopTop = Math.abs(dragBounds.top - oTop);
                if (diffTopTop <= SNAP_THRESHOLD && diffTopTop < bestDiffY) {
                    bestDiffY = diffTopTop;
                    snappedY = oTop;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'y');
                    activeGuideLines.push({
                        axis: 'y',
                        coord: oTop,
                        x1: Math.min(dragBounds.left, oLeft) - 40,
                        x2: Math.max(dragBounds.right, oRight) + 40,
                        isCenter: false
                    });
                }

                // Bottom-to-Bottom
                const diffBottomBottom = Math.abs(dragBounds.bottom - oBottom);
                if (diffBottomBottom <= SNAP_THRESHOLD && diffBottomBottom < bestDiffY) {
                    bestDiffY = diffBottomBottom;
                    snappedY = oBottom - h;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'y');
                    activeGuideLines.push({
                        axis: 'y',
                        coord: oBottom,
                        x1: Math.min(dragBounds.left, oLeft) - 40,
                        x2: Math.max(dragBounds.right, oRight) + 40,
                        isCenter: false
                    });
                }

                // Top-to-Bottom
                const diffTopBottom = Math.abs(dragBounds.top - oBottom);
                if (diffTopBottom <= SNAP_THRESHOLD && diffTopBottom < bestDiffY) {
                    bestDiffY = diffTopBottom;
                    snappedY = oBottom;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'y');
                    activeGuideLines.push({
                        axis: 'y',
                        coord: oBottom,
                        x1: Math.min(dragBounds.left, oLeft) - 40,
                        x2: Math.max(dragBounds.right, oRight) + 40,
                        isCenter: false
                    });
                }

                // Bottom-to-Top
                const diffBottomTop = Math.abs(dragBounds.bottom - oTop);
                if (diffBottomTop <= SNAP_THRESHOLD && diffBottomTop < bestDiffY) {
                    bestDiffY = diffBottomTop;
                    snappedY = oTop - h;
                    activeGuideLines = activeGuideLines.filter(g => g.axis !== 'y');
                    activeGuideLines.push({
                        axis: 'y',
                        coord: oTop,
                        x1: Math.min(dragBounds.left, oLeft) - 40,
                        x2: Math.max(dragBounds.right, oRight) + 40,
                        isCenter: false
                    });
                }
            });

            return {
                x: snappedX,
                y: snappedY,
                guides: activeGuideLines
            };
        }

        /**
         * Render garis pemandu visual di layer SVG (Canva / Figma style)
         */
        function renderAlignmentGuides(guides) {
            let guidesLayer = svgElement.querySelector('#alignmentGuidesLayer');
            if (!guidesLayer) {
                guidesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                guidesLayer.id = 'alignmentGuidesLayer';
                guidesLayer.setAttribute('class', 'diagram-alignment-guides-layer');
                svgElement.appendChild(guidesLayer);
            }

            guidesLayer.innerHTML = '';
            if (!guides || guides.length === 0) return;

            guides.forEach(g => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                if (g.axis === 'x') {
                    line.setAttribute('x1', g.coord);
                    line.setAttribute('y1', g.y1);
                    line.setAttribute('x2', g.coord);
                    line.setAttribute('y2', g.y2);
                } else {
                    line.setAttribute('x1', g.x1);
                    line.setAttribute('y1', g.coord);
                    line.setAttribute('x2', g.x2);
                    line.setAttribute('y2', g.coord);
                }

                line.setAttribute('class', 'diagram-guide-line' + (g.isCenter ? ' guide-center' : ''));
                guidesLayer.appendChild(line);
            });
        }

        /**
         * Hapus semua garis pemandu alignment
         */
        function clearAlignmentGuides() {
            const guidesLayer = svgElement.querySelector('#alignmentGuidesLayer');
            if (guidesLayer) {
                guidesLayer.innerHTML = '';
            }
        }

        /**
         * Pasang interaksi drag & drop pada kartu kelas
         */
        function attachNodeDragEvents(cardElement, nodeId) {
            const header = cardElement.querySelector('.class-card-header');
            const targetHandle = header || cardElement;

            targetHandle.addEventListener('mousedown', (e) => {
                // Hanya tangani klik kiri
                if (e.button !== 0) return;
                e.stopPropagation();

                state.activeDragNodeId = nodeId;
                cardElement.classList.add('is-dragging');

                const pos = state.nodePositions.get(nodeId);
                const mouseCanvasX = (e.clientX - state.panX) / state.zoom;
                const mouseCanvasY = (e.clientY - state.panY) / state.zoom;

                // Hitung offset mouse terhadap koordinat kanvas node
                state.dragOffset = {
                    x: mouseCanvasX - pos.x,
                    y: mouseCanvasY - pos.y
                };

                let hasMoved = false;

                const onMouseMove = (moveEvent) => {
                    if (state.activeDragNodeId !== nodeId) return;
                    hasMoved = true;

                    const curCanvasX = (moveEvent.clientX - state.panX) / state.zoom;
                    const curCanvasY = (moveEvent.clientY - state.panY) / state.zoom;

                    const rawX = Math.round(curCanvasX - state.dragOffset.x);
                    const rawY = Math.round(curCanvasY - state.dragOffset.y);

                    // Deteksi magnetik smart snapping & guidelines (Canva UX)
                    const snapResult = checkSmartSnapping(nodeId, rawX, rawY);

                    pos.x = snapResult.x;
                    pos.y = snapResult.y;

                    cardElement.style.left = pos.x + 'px';
                    cardElement.style.top = pos.y + 'px';

                    // Tampilkan garis pemandu sejajar
                    renderAlignmentGuides(snapResult.guides);

                    // Update garis relasi secara realtime saat node digeser
                    updateConnectors();
                };

                const onMouseUp = () => {
                    state.activeDragNodeId = null;
                    cardElement.classList.remove('is-dragging');
                    clearAlignmentGuides();
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);

                    // Jika ada pergeseran kartu, simpan ke memori dan picu event posisi
                    if (hasMoved) {
                        state.savedLayoutData = getLayoutData();
                        if (typeof state.onPositionChange === 'function') {
                            state.onPositionChange(state.savedLayoutData);
                        }
                    }
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

        /**
         * Update dan gambar ulang semua garis konektor relasi di SVG
         * Menggunakan Manhattan Orthogonal Router bebas tabrakan (zero card collision).
         */
        function updateConnectors() {
            // Bersihkan semua elemen lama kecuali <defs> dan <g id="alignmentGuidesLayer">
            const defs = svgElement.querySelector('defs');
            const guidesLayer = svgElement.querySelector('#alignmentGuidesLayer');
            svgElement.innerHTML = '';
            if (defs) svgElement.appendChild(defs);

            if (!window.DiagramRouter) return;

            const routes = DiagramRouter.calculateRoutes(state.relations, state.nodePositions);

            routes.forEach(route => {
                const rel = route.rel;

                // Buat elemen path SVG untuk garis relasi
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', route.pathData);
                path.setAttribute('class', 'relation-path rel-type-' + rel.type);
                path.setAttribute('fill', 'none');

                // Terapkan marker panah/simbol sesuai tipe relasi
                applyMarkers(path, rel.type);

                svgElement.appendChild(path);

                // Render kardinalitas & label
                renderRelationLabels(route);
            });

            if (guidesLayer) svgElement.appendChild(guidesLayer);
        }

        /**
         * Terapkan marker SVG sesuai tipe relasi
         */
        function applyMarkers(pathElement, type) {
            switch (type) {
                case 'inheritance':
                    pathElement.setAttribute('marker-end', 'url(#marker-inheritance)');
                    break;
                case 'realization':
                    pathElement.setAttribute('marker-end', 'url(#marker-realization)');
                    pathElement.setAttribute('stroke-dasharray', '5,5');
                    break;
                case 'composition':
                    pathElement.setAttribute('marker-start', 'url(#marker-composition)');
                    pathElement.setAttribute('marker-end', 'url(#marker-arrow)');
                    break;
                case 'aggregation':
                    pathElement.setAttribute('marker-start', 'url(#marker-aggregation)');
                    pathElement.setAttribute('marker-end', 'url(#marker-arrow)');
                    break;
                case 'dependency':
                    pathElement.setAttribute('marker-end', 'url(#marker-arrow)');
                    pathElement.setAttribute('stroke-dasharray', '5,5');
                    break;
                case 'association':
                default:
                    pathElement.setAttribute('marker-end', 'url(#marker-arrow)');
                    break;
            }
        }

        /**
         * Render teks label relasi dan kardinalitas
         */
        function renderRelationLabels(route) {
            const rel = route.rel;
            const conn = route.connection;

            // Label relasi di titik tengah rute yang paling bebas rintangan
            if (rel.label && route.labelPoint) {
                const midX = route.labelPoint.x;
                const midY = route.labelPoint.y;

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'relation-label-group');

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', midX);
                text.setAttribute('y', midY);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('class', 'relation-label-text');
                text.textContent = rel.label;

                // Background pill agar teks tidak tertutup garis
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('class', 'relation-label-bg');
                rect.setAttribute('rx', '4');
                rect.setAttribute('ry', '4');

                g.appendChild(rect);
                g.appendChild(text);
                svgElement.appendChild(g);

                // Sesuaikan ukuran rect dengan panjang teks
                requestAnimationFrame(() => {
                    const bbox = text.getBBox();
                    rect.setAttribute('x', bbox.x - 6);
                    rect.setAttribute('y', bbox.y - 2);
                    rect.setAttribute('width', bbox.width + 12);
                    rect.setAttribute('height', bbox.height + 4);
                });
            }

            // Kardinalitas Sumber (Source Cardinality)
            if (rel.sourceCard && conn.source) {
                renderCardinalityText(conn.source, conn.sourceSide, rel.sourceCard);
            }

            // Kardinalitas Target (Target Cardinality)
            if (rel.targetCard && conn.target) {
                renderCardinalityText(conn.target, conn.targetSide, rel.targetCard);
            }
        }

        function renderCardinalityText(point, side, text) {
            let posX = point.x;
            let posY = point.y;
            let anchor = 'start';

            // Geser ke samping garis dan beri clearance agar teks '1' atau 'N' tidak pernah tertutup garis
            if (side === 'top') {
                posX += 9;
                posY -= 12;
                anchor = 'start';
            } else if (side === 'bottom') {
                posX += 9;
                posY += 14;
                anchor = 'start';
            } else if (side === 'left') {
                posX -= 10;
                posY -= 9;
                anchor = 'end';
            } else if (side === 'right') {
                posX += 10;
                posY -= 9;
                anchor = 'start';
            }

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'cardinality-group');

            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', posX);
            t.setAttribute('y', posY);
            t.setAttribute('text-anchor', anchor);
            t.setAttribute('dominant-baseline', 'middle');
            t.setAttribute('class', 'cardinality-text');
            t.textContent = text;

            g.appendChild(t);
            svgElement.appendChild(g);
        }

        /**
         * Inisialisasi marker SVG defs
         */
        function initSvgDefs(svg) {
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svg.appendChild(defs);
            }

            defs.innerHTML = `
                <!-- Pewarisan / Inheritance (Segitiga putih solid) -->
                <marker id="marker-inheritance" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto">
                    <polygon points="1 2, 13 7, 1 12" fill="#ffffff" stroke="#111827" stroke-width="1.5" />
                </marker>

                <!-- Realisasi / Interface Implementation -->
                <marker id="marker-realization" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto">
                    <polygon points="1 2, 13 7, 1 12" fill="#ffffff" stroke="#111827" stroke-width="1.5" />
                </marker>

                <!-- Komposisi / Composition (Belah ketupat hitam penuh) -->
                <marker id="marker-composition" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto">
                    <polygon points="1 8, 8 3, 15 8, 8 13" fill="#111827" stroke="#111827" />
                </marker>

                <!-- Agregasi / Aggregation (Belah ketupat putih) -->
                <marker id="marker-aggregation" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto">
                    <polygon points="1 8, 8 3, 15 8, 8 13" fill="#ffffff" stroke="#111827" stroke-width="1.5" />
                </marker>

                <!-- Asosiasi / Panah Biasa -->
                <marker id="marker-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
                    <polyline points="2 2, 10 6, 2 10" fill="none" stroke="#111827" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </marker>
            `;
        }

        /**
         * Interaksi Pan & Zoom pada kanvas
         */
        function setupCanvasInteractions() {
            // Drag kanvas untuk Pan
            containerElement.addEventListener('mousedown', (e) => {
                // Hanya pan jika klik tengah atau klik pada latar kanvas
                if (e.target !== containerElement && !e.target.classList.contains('canvas-background')) {
                    return;
                }

                state.isPanning = true;
                state.panStartX = e.clientX - state.panX;
                state.panStartY = e.clientY - state.panY;
                containerElement.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (!state.isPanning) return;
                state.panX = e.clientX - state.panStartX;
                state.panY = e.clientY - state.panStartY;
                applyTransform();
            });

            window.addEventListener('mouseup', () => {
                if (state.isPanning) {
                    state.isPanning = false;
                    containerElement.style.cursor = 'default';
                }
            });

            // Zoom dengan mouse wheel
            containerElement.addEventListener('wheel', (e) => {
                e.preventDefault();

                const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
                const newZoom = Math.min(Math.max(0.2, state.zoom * zoomFactor), 3.0);

                // Zoom berpusat pada posisi kursor
                const rect = containerElement.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                state.panX = mouseX - (mouseX - state.panX) * (newZoom / state.zoom);
                state.panY = mouseY - (mouseY - state.panY) * (newZoom / state.zoom);
                state.zoom = newZoom;

                applyTransform();

                if (typeof state.onUpdate === 'function') {
                    state.onUpdate(getStats());
                }
            }, { passive: false });
        }

        /**
         * Terapkan transformasi pan & zoom pada viewport kanvas
         */
        function applyTransform() {
            const viewport = containerElement.querySelector('.diagram-viewport');
            if (viewport) {
                viewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
            }
        }

        /**
         * Fitur Autofit: Posisikan seluruh diagram di tengah layar secara optimal
         */
        function autoFit() {
            if (state.classes.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            state.classes.forEach(cls => {
                const pos = state.nodePositions.get(cls.id);
                if (pos) {
                    minX = Math.min(minX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxX = Math.max(maxX, pos.x + pos.width);
                    maxY = Math.max(maxY, pos.y + pos.height);
                }
            });

            if (minX === Infinity) return;

            const bboxWidth = maxX - minX;
            const bboxHeight = maxY - minY;

            const containerWidth = containerElement.clientWidth || 1000;
            const containerHeight = containerElement.clientHeight || 700;

            const padding = 100;
            const scaleX = (containerWidth - padding * 2) / bboxWidth;
            const scaleY = (containerHeight - padding * 2) / bboxHeight;

            const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.15);
            state.zoom = parseFloat(targetZoom.toFixed(2));

            state.panX = Math.round((containerWidth - bboxWidth * state.zoom) / 2 - minX * state.zoom);
            state.panY = Math.round((containerHeight - bboxHeight * state.zoom) / 2 - minY * state.zoom);

            applyTransform();

            if (typeof state.onUpdate === 'function') {
                state.onUpdate(getStats());
            }
        }

        function zoomIn() {
            state.zoom = Math.min(3.0, parseFloat((state.zoom + 0.15).toFixed(2)));
            applyTransform();
            if (typeof state.onUpdate === 'function') state.onUpdate(getStats());
        }

        function zoomOut() {
            state.zoom = Math.max(0.2, parseFloat((state.zoom - 0.15).toFixed(2)));
            applyTransform();
            if (typeof state.onUpdate === 'function') state.onUpdate(getStats());
        }

        function resetZoom() {
            state.zoom = 1.0;
            autoFit();
        }

        function relayout() {
            state.nodePositions = DiagramLayout.computeLayout(state.classes, state.relations);
            renderNodeElements();
            measureActualNodeDimensions();
            updateConnectors();
            autoFit();
        }

        function getStats() {
            return {
                zoom: Math.round(state.zoom * 100),
                classCount: state.classes.length,
                relationCount: state.relations.length
            };
        }

        function getLayoutData() {
            const positions = {};
            state.nodePositions.forEach((pos, id) => {
                positions[id] = {
                    x: pos.x,
                    y: pos.y,
                    width: pos.width,
                    height: pos.height
                };
            });
            return {
                positions: positions,
                zoom: state.zoom,
                panX: state.panX,
                panY: state.panY
            };
        }

        function setLayoutData(layout) {
            state.savedLayoutData = layout;
            if (layout && layout.positions) {
                Object.keys(layout.positions).forEach(id => {
                    if (state.nodePositions.has(id)) {
                        const cur = state.nodePositions.get(id);
                        if (typeof layout.positions[id].x === 'number') cur.x = layout.positions[id].x;
                        if (typeof layout.positions[id].y === 'number') cur.y = layout.positions[id].y;
                        const card = document.getElementById('node_' + id);
                        if (card) {
                            card.style.left = cur.x + 'px';
                            card.style.top = cur.y + 'px';
                        }
                    }
                });
                updateConnectors();
            }
        }

        return {
            render: render,
            autoFit: autoFit,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            resetZoom: resetZoom,
            relayout: relayout,
            updateConnectors: updateConnectors,
            getStats: getStats,
            getLayoutData: getLayoutData,
            setLayoutData: setLayoutData,
            onPositionChange: (cb) => { state.onPositionChange = cb; },
            onUpdate: (cb) => { state.onUpdate = cb; },
            getState: () => state
        };
    }

    return {
        create: create
    };
})();
