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
            isSpacePressed: false,
            isMarqueeSelecting: false,
            marqueeStart: { clientX: 0, clientY: 0, canvasX: 0, canvasY: 0, initialSelectedIds: new Set() },
            selectedNodeId: null,
            selectedNodeIds: new Set(),
            selectedRelation: null,
            activeDragNodeId: null,
            dragOffset: { x: 0, y: 0 },
            isLocked: false,
            onUpdate: null,
            onPositionChange: null,
            onCodeChange: null,
            onSelect: null,
            savedLayoutData: null,
            currentAlgorithm: 'compact'
        };

        // Inisialisasi SVG defs untuk marker panah dan simbol relasi
        initSvgDefs(svgElement);

        // Pasang event listener kanvas untuk pan & zoom
        setupCanvasInteractions();

        /**
         * Render diagram lengkap dari model data
         */
        function render(classes, relations, shouldAutoFit = true, customLayout = undefined) {
            state.classes = classes || [];
            state.relations = relations || [];

            // Jika customLayout eksplisit null, bersihkan memori posisi tersimpan sebelumnya
            if (customLayout === null) {
                state.savedLayoutData = null;
            }

            // Hitung layout bebas tabrakan bawaan
            state.nodePositions = DiagramLayout.computeLayout(state.classes, state.relations, state.currentAlgorithm);

            // Jika ada posisi tersimpan (customLayout), terapkan koordinat tersimpan
            const layoutSource = (customLayout !== undefined && customLayout !== null) ? customLayout : state.savedLayoutData;
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
                    if (shouldAutoFit === true) {
                        autoFit();
                    }
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
         * Helper cek kesamaan dua relasi
         */
        function isSameRelation(r1, r2) {
            if (!r1 || !r2) return false;
            return r1.source === r2.source &&
                   r1.target === r2.target &&
                   r1.type === r2.type &&
                   (r1.label || '') === (r2.label || '');
        }

        /**
         * Terapkan update status visual seleksi pada seluruh kartu dan garis
         */
        function applySelectionUI() {
            state.classes.forEach(cls => {
                const card = document.getElementById('node_' + cls.id);
                if (card) {
                    const isSelected = state.selectedNodeIds.has(cls.id);
                    const isRelated = state.selectedRelation && (cls.id === state.selectedRelation.source || cls.id === state.selectedRelation.target);

                    card.classList.toggle('is-selected', isSelected);
                    card.classList.toggle('is-related', isRelated);
                }
            });

            updateConnectors();
        }

        /**
         * Pilih kartu kelas secara interaktif (dukung Shift/Ctrl untuk multi-select)
         */
        function selectNode(nodeId, isToggle = false) {
            state.selectedRelation = null;

            if (isToggle) {
                if (state.selectedNodeIds.has(nodeId)) {
                    state.selectedNodeIds.delete(nodeId);
                } else {
                    state.selectedNodeIds.add(nodeId);
                }
            } else {
                state.selectedNodeIds.clear();
                state.selectedNodeIds.add(nodeId);
            }

            state.selectedNodeId = state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : null;

            applySelectionUI();

            if (typeof state.onSelect === 'function') {
                state.onSelect({
                    type: 'node',
                    id: state.selectedNodeId,
                    selectedIds: Array.from(state.selectedNodeIds)
                });
            }
        }

        /**
         * Set seleksi banyak kartu sekaligus (misalnya dari kotak seleksi marquee)
         */
        function setMultiSelection(nodeIds) {
            state.selectedRelation = null;
            state.selectedNodeIds.clear();
            nodeIds.forEach(id => state.selectedNodeIds.add(id));
            state.selectedNodeId = state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : null;

            applySelectionUI();

            if (typeof state.onSelect === 'function') {
                state.onSelect({
                    type: 'node',
                    id: state.selectedNodeId,
                    selectedIds: Array.from(state.selectedNodeIds)
                });
            }
        }

        /**
         * Pilih garis konektor relasi secara interaktif
         */
        function selectRelation(rel) {
            state.selectedRelation = rel;
            state.selectedNodeIds.clear();
            state.selectedNodeId = null;

            applySelectionUI();

            if (typeof state.onSelect === 'function') {
                state.onSelect({ type: 'relation', data: rel });
            }
        }

        /**
         * Bersihkan seleksi pada kartu dan garis relasi
         */
        function clearSelection() {
            if (state.selectedNodeIds.size === 0 && !state.selectedRelation) return;
            state.selectedNodeIds.clear();
            state.selectedNodeId = null;
            state.selectedRelation = null;

            applySelectionUI();

            if (typeof state.onSelect === 'function') {
                state.onSelect(null);
            }
        }

        /**
         * Render elemen HTML untuk setiap kelas diagram dengan dukungan interaktif:
         * - Klik ganda untuk inline edit nama kelas, atribut, dan metode
         * - Tombol [+] di setiap bagian untuk tambah baris baru secara instan
         * - Tombol [x] untuk hapus baris atau kelas
         */
        function renderNodeElements() {
            nodesLayerElement.innerHTML = '';

            state.classes.forEach(cls => {
                const pos = state.nodePositions.get(cls.id) || { x: 100, y: 100, width: 260, height: 160 };

                const isSelected = state.selectedNodeIds.has(cls.id);
                const isRelated = state.selectedRelation && (cls.id === state.selectedRelation.source || cls.id === state.selectedRelation.target);
                let cardClass = 'diagram-class-card' + (state.isLocked ? ' is-locked' : '');
                if (isSelected) cardClass += ' is-selected';
                if (isRelated) cardClass += ' is-related';

                const card = document.createElement('div');
                card.className = cardClass;
                card.id = 'node_' + cls.id;
                card.setAttribute('data-id', cls.id);
                card.style.left = pos.x + 'px';
                card.style.top = pos.y + 'px';
                card.style.width = pos.width + 'px';

                // Klik kartu untuk memilih (dukung Shift/Ctrl untuk toggle multi-select)
                card.addEventListener('click', (e) => {
                    if (e.target.closest('button, input, textarea, .btn-card-add-row, .btn-row-del, .btn-card-del, .card-inline-input')) return;
                    e.stopPropagation();
                    const isToggle = e.shiftKey || e.ctrlKey || e.metaKey;
                    selectNode(cls.id, isToggle);
                });

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
                let iconClass = 'fa-solid fa-cube class-title-icon text-primary';
                if (cls.stereotype === 'interface') iconClass = 'fa-solid fa-plug class-title-icon text-teal';
                else if (cls.stereotype === 'abstract') iconClass = 'fa-solid fa-shapes class-title-icon text-purple';
                else if (cls.stereotype === 'enum') iconClass = 'fa-solid fa-list-ol class-title-icon text-emerald';
                classIcon.className = iconClass;
                titleRow.appendChild(classIcon);

                const title = document.createElement('span');
                title.className = 'class-title';
                title.textContent = cls.name;
                title.title = 'Klik 2x untuk ubah nama kelas';
                title.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    makeInlineEditable(title, cls.name, (newName) => {
                        updateClassName(cls.id, newName);
                    });
                });
                titleRow.appendChild(title);

                // Header Action: Lock Indicator & Delete Button
                const headerActions = document.createElement('div');
                headerActions.className = 'class-header-actions';

                if (state.isLocked) {
                    const lockBadge = document.createElement('span');
                    lockBadge.className = 'card-lock-badge';
                    lockBadge.title = 'Posisi terkunci';
                    lockBadge.innerHTML = '<i class="fa-solid fa-lock"></i>';
                    headerActions.appendChild(lockBadge);
                }

                const btnDelClass = document.createElement('button');
                btnDelClass.type = 'button';
                btnDelClass.className = 'btn-card-del';
                btnDelClass.title = 'Hapus Kelas';
                btnDelClass.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                btnDelClass.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Hapus kelas "${cls.name}" beserta relasinya?`)) {
                        deleteClass(cls.id);
                    }
                });
                headerActions.appendChild(btnDelClass);

                titleRow.appendChild(headerActions);
                header.appendChild(titleRow);
                card.appendChild(header);

                // Body Card (Atribut & Metode)
                const body = document.createElement('div');
                body.className = 'class-card-body';

                // Bagian Atribut
                const attrSection = document.createElement('div');
                attrSection.className = 'class-member-section attr-section';

                if (cls.attributes && cls.attributes.length > 0) {
                    cls.attributes.forEach((attr, idx) => {
                        const row = document.createElement('div');
                        row.className = 'member-row member-attribute';
                        row.setAttribute('data-idx', idx);

                        const badge = document.createElement('span');
                        badge.className = 'visibility-badge vis-' + attr.visibility;
                        badge.textContent = attr.icon || '+';
                        row.appendChild(badge);

                        const text = document.createElement('span');
                        text.className = 'member-text';
                        text.textContent = attr.text;
                        text.title = 'Klik 2x untuk edit atribut';
                        text.addEventListener('dblclick', (e) => {
                            e.stopPropagation();
                            makeInlineEditable(text, (attr.icon || '+') + ' ' + attr.text, (newVal) => {
                                updateMemberText(cls.id, 'attribute', idx, newVal);
                            });
                        });
                        row.appendChild(text);

                        const btnDel = document.createElement('button');
                        btnDel.type = 'button';
                        btnDel.className = 'btn-row-del';
                        btnDel.title = 'Hapus Atribut';
                        btnDel.innerHTML = '&times;';
                        btnDel.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deleteMember(cls.id, 'attribute', idx);
                        });
                        row.appendChild(btnDel);

                        attrSection.appendChild(row);
                    });
                } else {
                    const emptyRow = document.createElement('div');
                    emptyRow.className = 'member-row member-empty';
                    emptyRow.textContent = '// tidak ada atribut';
                    attrSection.appendChild(emptyRow);
                }

                // Tombol tambah baris atribut di pojok bawah kanan bagian atribut
                const addAttrBar = document.createElement('div');
                addAttrBar.className = 'card-add-row-bar';
                addAttrBar.innerHTML = `<button type="button" class="btn-card-add-row" title="Tambah Baris Atribut Baru"><i class="fa-solid fa-plus"></i> <span>Atribut</span></button>`;
                addAttrBar.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const defaultName = cls.stereotype === 'enum' ? 'STATUS_NEW' : '+string newProperty';
                    addMember(cls.id, 'attribute', defaultName);
                });
                attrSection.appendChild(addAttrBar);
                body.appendChild(attrSection);

                // Garis pemisah atribut dan metode
                const divider = document.createElement('div');
                divider.className = 'class-card-divider';
                body.appendChild(divider);

                // Bagian Metode
                const methodSection = document.createElement('div');
                methodSection.className = 'class-member-section method-section';

                if (cls.methods && cls.methods.length > 0) {
                    cls.methods.forEach((method, idx) => {
                        const row = document.createElement('div');
                        row.className = 'member-row member-method';
                        row.setAttribute('data-idx', idx);

                        const badge = document.createElement('span');
                        badge.className = 'visibility-badge vis-' + method.visibility;
                        badge.textContent = method.icon || '+';
                        row.appendChild(badge);

                        const text = document.createElement('span');
                        text.className = 'member-text';
                        text.textContent = method.text;
                        text.title = 'Klik 2x untuk edit method';
                        text.addEventListener('dblclick', (e) => {
                            e.stopPropagation();
                            makeInlineEditable(text, (method.icon || '+') + ' ' + method.text, (newVal) => {
                                updateMemberText(cls.id, 'method', idx, newVal);
                            });
                        });
                        row.appendChild(text);

                        const btnDel = document.createElement('button');
                        btnDel.type = 'button';
                        btnDel.className = 'btn-row-del';
                        btnDel.title = 'Hapus Method';
                        btnDel.innerHTML = '&times;';
                        btnDel.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deleteMember(cls.id, 'method', idx);
                        });
                        row.appendChild(btnDel);

                        methodSection.appendChild(row);
                    });
                } else {
                    const emptyRow = document.createElement('div');
                    emptyRow.className = 'member-row member-empty';
                    emptyRow.textContent = '// tidak ada method';
                    methodSection.appendChild(emptyRow);
                }

                // Tombol tambah baris method di pojok bawah kanan bagian method
                const addMethodBar = document.createElement('div');
                addMethodBar.className = 'card-add-row-bar';
                addMethodBar.innerHTML = `<button type="button" class="btn-card-add-row" title="Tambah Baris Method Baru"><i class="fa-solid fa-plus"></i> <span>Method</span></button>`;
                addMethodBar.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    addMember(cls.id, 'method', '+newAction()');
                });
                methodSection.appendChild(addMethodBar);
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
         * Mengubah teks menjadi input inline yang dapat diedit langsung di kanvas
         */
        function makeInlineEditable(element, initialValue, onSave) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'card-inline-input';
            input.value = initialValue;

            const originalParent = element.parentNode;
            originalParent.replaceChild(input, element);
            input.focus();
            input.select();

            let finished = false;
            const commit = () => {
                if (finished) return;
                finished = true;
                const val = input.value.trim();
                if (val && val !== initialValue) {
                    onSave(val);
                } else {
                    if (input.parentNode) {
                        originalParent.replaceChild(element, input);
                    }
                }
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                } else if (e.key === 'Escape') {
                    finished = true;
                    if (input.parentNode) {
                        originalParent.replaceChild(element, input);
                    }
                }
            });

            input.addEventListener('blur', () => {
                commit();
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

                // Cegah pergeseran jika user mengklik tombol atau inline editor
                if (e.target.closest('button, input, textarea, .btn-card-add-row, .btn-row-del, .btn-card-del, .card-inline-input')) return;

                const isToggle = e.shiftKey || e.ctrlKey || e.metaKey;
                const wasAlreadySelected = state.selectedNodeIds.has(nodeId);

                // 1. Jika kartu BELUM aktif / belum diklik sebelumnya:
                // Harus diklik dulu untuk mengaktifkan kartu; belum bisa di-drag!
                if (!wasAlreadySelected) {
                    e.stopPropagation();
                    if (isToggle) {
                        selectNode(nodeId, true);
                    } else {
                        selectNode(nodeId, false);
                    }
                    return;
                }

                // 2. Jika menekan Shift/Ctrl pada kartu yang SUDAH aktif, toggle untuk melepas seleksi
                if (isToggle) {
                    e.stopPropagation();
                    selectNode(nodeId, true);
                    return;
                }

                // 3. Kartu SUDAH aktif / terpilih: Sekarang kartu BISA di-drag!
                if (state.isLocked) return;
                e.stopPropagation();

                state.activeDragNodeId = nodeId;
                cardElement.classList.add('is-dragging');

                // Simpan posisi awal untuk semua kartu terpilih agar bisa digeser bersamaan
                const initialPositions = new Map();
                state.selectedNodeIds.forEach(id => {
                    const p = state.nodePositions.get(id);
                    if (p) initialPositions.set(id, { x: p.x, y: p.y });
                });

                const pos = state.nodePositions.get(nodeId);
                const mouseCanvasX = (e.clientX - state.panX) / state.zoom;
                const mouseCanvasY = (e.clientY - state.panY) / state.zoom;

                // Hitung offset mouse terhadap koordinat kanvas node
                state.dragOffset = {
                    x: mouseCanvasX - pos.x,
                    y: mouseCanvasY - pos.y
                };

                let hasMoved = false;
                const startClientX = e.clientX;
                const startClientY = e.clientY;

                const onMouseMove = (moveEvent) => {
                    if (state.activeDragNodeId !== nodeId) return;
                    if (Math.abs(moveEvent.clientX - startClientX) > 3 || Math.abs(moveEvent.clientY - startClientY) > 3) {
                        hasMoved = true;
                    }

                    const curCanvasX = (moveEvent.clientX - state.panX) / state.zoom;
                    const curCanvasY = (moveEvent.clientY - state.panY) / state.zoom;

                    const rawX = Math.round(curCanvasX - state.dragOffset.x);
                    const rawY = Math.round(curCanvasY - state.dragOffset.y);

                    // Deteksi magnetik smart snapping & guidelines (Canva UX)
                    const snapResult = checkSmartSnapping(nodeId, rawX, rawY);

                    let finalX = snapResult.x;
                    let finalY = snapResult.y;

                    // Sesuai node_line.md: jika tidak magnetis sejajar dengan kartu lain, snap ke grid 10px
                    const hasXGuide = snapResult.guides && snapResult.guides.some(g => g.axis === 'x');
                    const hasYGuide = snapResult.guides && snapResult.guides.some(g => g.axis === 'y');
                    if (!hasXGuide) finalX = Math.round(finalX / 10) * 10;
                    if (!hasYGuide) finalY = Math.round(finalY / 10) * 10;

                    const initPrimary = initialPositions.get(nodeId) || pos;
                    const dx = finalX - initPrimary.x;
                    const dy = finalY - initPrimary.y;

                    // Geser seluruh kartu yang terpilih secara sinkron
                    state.selectedNodeIds.forEach(id => {
                        const p = state.nodePositions.get(id);
                        const init = initialPositions.get(id);
                        if (p && init) {
                            p.x = Math.round(init.x + dx);
                            p.y = Math.round(init.y + dy);
                            const el = document.getElementById('node_' + id);
                            if (el) {
                                el.style.left = p.x + 'px';
                                el.style.top = p.y + 'px';
                            }
                        }
                    });

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
                    } else if (!isToggle) {
                        selectNode(nodeId, false);
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

            // Layer untuk garis konektor
            const connectorsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            connectorsLayer.setAttribute('id', 'connectorsLayer');
            svgElement.appendChild(connectorsLayer);

            // Layer untuk label teks dan badge kardinalitas (selalu di atas garis konektor!)
            const labelsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelsLayer.setAttribute('id', 'labelsLayer');
            svgElement.appendChild(labelsLayer);

            const routes = DiagramRouter.calculateRoutes(state.relations, state.nodePositions);

            routes.forEach(route => {
                const rel = route.rel;
                const isSelected = isSameRelation(state.selectedRelation, rel);
                const isConnectedToSelectedNode = state.selectedNodeIds.size > 0 && (state.selectedNodeIds.has(rel.source) || state.selectedNodeIds.has(rel.target));

                // Buat elemen hit area transparan yang lebar (18px) agar garis sangat mudah diklik
                const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                hitArea.setAttribute('d', route.pathData);
                hitArea.setAttribute('class', 'relation-hit-area');
                hitArea.setAttribute('fill', 'none');
                hitArea.setAttribute('stroke', 'transparent');
                hitArea.setAttribute('stroke-width', '18');
                hitArea.style.cursor = 'pointer';
                hitArea.style.pointerEvents = 'stroke';

                // Buat elemen path SVG untuk garis relasi visual
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', route.pathData);
                let pathClass = 'relation-path rel-type-' + rel.type;
                if (isSelected) pathClass += ' is-selected';
                else if (isConnectedToSelectedNode) pathClass += ' is-connected-to-selected';
                path.setAttribute('class', pathClass);
                path.setAttribute('fill', 'none');
                path.style.cursor = 'pointer';
                path.style.pointerEvents = 'stroke';

                // Terapkan marker panah/simbol sesuai tipe relasi (gunakan varian selected jika aktif)
                applyMarkers(path, rel.type, isSelected);

                // Event klik pada garis relasi
                const handleRelClick = (e) => {
                    e.stopPropagation();
                    selectRelation(rel);
                };
                path.addEventListener('click', handleRelClick);
                hitArea.addEventListener('click', handleRelClick);

                // Efek hover sinkron antara hit area dan garis visual
                hitArea.addEventListener('mouseenter', () => path.classList.add('is-hovered'));
                hitArea.addEventListener('mouseleave', () => path.classList.remove('is-hovered'));

                connectorsLayer.appendChild(path);
                connectorsLayer.appendChild(hitArea);

                // Render kardinalitas & label pada labelsLayer
                renderRelationLabels(route, labelsLayer, isSelected, rel);
            });

            if (guidesLayer) svgElement.appendChild(guidesLayer);
        }

        /**
         * Terapkan marker SVG sesuai tipe relasi
         */
        function applyMarkers(pathElement, type, isSelected = false) {
            const suffix = isSelected ? '-selected' : '';
            switch (type) {
                case 'inheritance':
                    pathElement.setAttribute('marker-end', `url(#marker-inheritance${suffix})`);
                    break;
                case 'realization':
                    pathElement.setAttribute('marker-end', `url(#marker-realization${suffix})`);
                    pathElement.setAttribute('stroke-dasharray', '5,5');
                    break;
                case 'composition':
                    pathElement.setAttribute('marker-start', `url(#marker-composition${suffix})`);
                    pathElement.setAttribute('marker-end', `url(#marker-arrow${suffix})`);
                    break;
                case 'aggregation':
                    pathElement.setAttribute('marker-start', `url(#marker-aggregation${suffix})`);
                    pathElement.setAttribute('marker-end', `url(#marker-arrow${suffix})`);
                    break;
                case 'dependency':
                    pathElement.setAttribute('marker-end', `url(#marker-arrow${suffix})`);
                    pathElement.setAttribute('stroke-dasharray', '5,5');
                    break;
                case 'association':
                default:
                    pathElement.setAttribute('marker-end', `url(#marker-arrow${suffix})`);
                    break;
            }
        }

        /**
         * Render teks label relasi dan kardinalitas
         */
        function renderRelationLabels(route, labelsLayer, isSelected = false, rel = null) {
            const relData = rel || route.rel;
            const conn = route.connection;

            // Label relasi di titik tengah rute yang paling bebas rintangan
            if (relData.label && route.labelPoint) {
                const midX = route.labelPoint.x;
                const midY = route.labelPoint.y;

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'relation-label-group' + (isSelected ? ' is-selected' : ''));
                g.style.cursor = 'pointer';
                g.style.pointerEvents = 'all';

                // Klik label untuk memilih relasi
                g.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectRelation(relData);
                });

                const labelStr = String(relData.label);
                const initW = Math.max(28, labelStr.length * 7.5 + 16);
                const initH = 20;

                // Background pill agar teks tidak pernah tertutup atau terpotong garis (solid white, border, drop-shadow)
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('class', 'relation-label-bg');
                rect.setAttribute('fill', isSelected ? '#eff6ff' : '#ffffff');
                rect.setAttribute('stroke', isSelected ? '#2563eb' : '#cbd5e1');
                rect.setAttribute('stroke-width', isSelected ? '1.5' : '1');
                rect.setAttribute('rx', '4');
                rect.setAttribute('ry', '4');
                rect.setAttribute('x', midX - initW / 2);
                rect.setAttribute('y', midY - initH / 2);
                rect.setAttribute('width', initW);
                rect.setAttribute('height', initH);

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', midX);
                text.setAttribute('y', midY);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'central');
                text.setAttribute('class', 'relation-label-text');
                text.textContent = labelStr;

                g.appendChild(rect);
                g.appendChild(text);
                labelsLayer.appendChild(g);

                // Sesuaikan ukuran rect secara akurat setelah render di browser
                requestAnimationFrame(() => {
                    try {
                        const bbox = text.getBBox();
                        if (bbox && bbox.width > 0) {
                            rect.setAttribute('x', bbox.x - 7);
                            rect.setAttribute('y', bbox.y - 3);
                            rect.setAttribute('width', bbox.width + 14);
                            rect.setAttribute('height', bbox.height + 6);
                        }
                    } catch (e) {}
                });
            }

            // Kardinalitas Sumber (Source Cardinality)
            if (relData.sourceCard && conn.source) {
                renderCardinalityBadge(conn.source, conn.sourceSide, relData.sourceCard, false, labelsLayer, isSelected, relData);
            }

            // Kardinalitas Target (Target Cardinality)
            if (relData.targetCard && conn.target) {
                renderCardinalityBadge(conn.target, conn.targetSide, relData.targetCard, true, labelsLayer, isSelected, relData);
            }
        }

        /**
         * Render badge kardinalitas dengan background putih dan border pelindung (anti-tertutup garis)
         */
        function renderCardinalityBadge(point, side, text, isTarget, labelsLayer, isSelected = false, rel = null) {
            let posX = point.x;
            let posY = point.y;

            // Geser ke samping garis dan beri clearance aman agar teks tidak bertabrakan dengan panah/border
            if (side === 'top') {
                posX += 14;
                posY -= isTarget ? 22 : 16;
            } else if (side === 'bottom') {
                posX += 14;
                posY += isTarget ? 22 : 16;
            } else if (side === 'left') {
                posX -= isTarget ? 24 : 16;
                posY -= 14;
            } else if (side === 'right') {
                posX += isTarget ? 24 : 16;
                posY -= 14;
            }

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'cardinality-badge-group' + (isSelected ? ' is-selected' : ''));
            g.style.cursor = 'pointer';
            g.style.pointerEvents = 'all';

            // Klik badge kardinalitas untuk memilih relasi
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                if (rel) selectRelation(rel);
            });

            const textStr = String(text);
            const initW = Math.max(18, textStr.length * 7 + 10);
            const initH = 16;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'cardinality-badge-bg');
            rect.setAttribute('fill', isSelected ? '#eff6ff' : '#ffffff');
            rect.setAttribute('stroke', isSelected ? '#2563eb' : '#cbd5e1');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('rx', '3');
            rect.setAttribute('ry', '3');
            rect.setAttribute('x', posX - initW / 2);
            rect.setAttribute('y', posY - initH / 2);
            rect.setAttribute('width', initW);
            rect.setAttribute('height', initH);

            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', posX);
            t.setAttribute('y', posY);
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('dominant-baseline', 'central');
            t.setAttribute('class', 'cardinality-badge-text');
            t.textContent = textStr;

            g.appendChild(rect);
            g.appendChild(t);
            labelsLayer.appendChild(g);

            requestAnimationFrame(() => {
                try {
                    const bbox = t.getBBox();
                    if (bbox && bbox.width > 0) {
                        const padX = 5;
                        const padY = 2;
                        rect.setAttribute('x', bbox.x - padX);
                        rect.setAttribute('y', bbox.y - padY);
                        rect.setAttribute('width', Math.max(18, bbox.width + padX * 2));
                        rect.setAttribute('height', Math.max(16, bbox.height + padY * 2));
                    }
                } catch (e) {}
            });
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
                <!-- Pewarisan / Inheritance (Segitiga solid kontras gelap) -->
                <marker id="marker-inheritance" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto">
                    <polygon points="1 2, 13 7, 1 12" fill="#1e2025" stroke="#94a3b8" stroke-width="1.6" />
                </marker>
                <marker id="marker-inheritance-selected" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto">
                    <polygon points="1 2, 13 7, 1 12" fill="#ffffff" stroke="#3b82f6" stroke-width="2" />
                </marker>

                <!-- Realisasi / Interface Implementation -->
                <marker id="marker-realization" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto">
                    <polygon points="1 2, 13 7, 1 12" fill="#1e2025" stroke="#94a3b8" stroke-width="1.6" />
                </marker>
                <marker id="marker-realization-selected" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="11" markerHeight="11" orient="auto">
                    <polygon points="1 2, 13 7, 1 12" fill="#ffffff" stroke="#3b82f6" stroke-width="2" />
                </marker>

                <!-- Komposisi / Composition (Belah ketupat penuh) -->
                <marker id="marker-composition" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto">
                    <polygon points="1 8, 8 3, 15 8, 8 13" fill="#94a3b8" stroke="#94a3b8" />
                </marker>
                <marker id="marker-composition-selected" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto">
                    <polygon points="1 8, 8 3, 15 8, 8 13" fill="#3b82f6" stroke="#3b82f6" />
                </marker>

                <!-- Agregasi / Aggregation (Belah ketupat kontras) -->
                <marker id="marker-aggregation" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto">
                    <polygon points="1 8, 8 3, 15 8, 8 13" fill="#1e2025" stroke="#94a3b8" stroke-width="1.6" />
                </marker>
                <marker id="marker-aggregation-selected" viewBox="0 0 16 16" refX="1" refY="8" markerWidth="12" markerHeight="12" orient="auto">
                    <polygon points="1 8, 8 3, 15 8, 8 13" fill="#ffffff" stroke="#3b82f6" stroke-width="2" />
                </marker>

                <!-- Asosiasi / Panah Biasa -->
                <marker id="marker-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
                    <polyline points="2 2, 10 6, 2 10" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </marker>
                <marker id="marker-arrow-selected" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
                    <polyline points="2 2, 10 6, 2 10" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </marker>
            `;
        }

        /**
         * Interaksi Pan, Zoom, Seleksi Kotak Marquee (Shift + Drag), dan Menu Konteks (Klik Kanan):
         * - Klik kiri biasa pada latar kanvas: DRAG / PAN LAYOUT KANVAS (bebas geser)
         * - Shift + Klik kiri pada latar kanvas: KOTAK SELEKSI MARQUEE (pilih banyak kartu sekaligus)
         * - Shift + Klik kiri pada kartu: Toggle seleksi multi-kartu
         * - Klik kanan pada kartu, relasi, atau kanvas: MENU KONTEKS (Hapus, Duplikat, Tambah, Rapikan, dll)
         * - Tombol Delete / Backspace: Hapus kartu atau relasi terpilih
         */
        function setupCanvasInteractions() {
            let marqueeBox = containerElement.querySelector('#diagramMarqueeBox');
            if (!marqueeBox) {
                marqueeBox = document.createElement('div');
                marqueeBox.id = 'diagramMarqueeBox';
                marqueeBox.className = 'diagram-marquee-box';
                marqueeBox.style.display = 'none';
                containerElement.appendChild(marqueeBox);
            }

            let contextMenu = document.getElementById('diagramContextMenu');
            if (!contextMenu) {
                contextMenu = document.createElement('div');
                contextMenu.id = 'diagramContextMenu';
                contextMenu.className = 'diagram-context-menu';
                contextMenu.style.display = 'none';
                document.body.appendChild(contextMenu);
            }

            function localEscape(str) {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }

            function hideContextMenu() {
                if (contextMenu) contextMenu.style.display = 'none';
            }

            function showContextMenu(clientX, clientY, items, title = '', icon = '') {
                if (!contextMenu || !items || items.length === 0) return;

                let html = '';
                if (title) {
                    html += `<div class="ctx-menu-header"><i class="${icon || 'fa-solid fa-layer-group'}"></i> <span>${localEscape(title)}</span></div>`;
                }

                items.forEach((item, index) => {
                    if (item.divider) {
                        html += `<div class="ctx-menu-divider"></div>`;
                    } else {
                        const dangerCls = item.danger ? ' ctx-item-danger' : '';
                        const shortcutHtml = item.shortcut ? `<span class="ctx-menu-shortcut">${item.shortcut}</span>` : '';
                        html += `
                            <div class="ctx-menu-item${dangerCls}" data-index="${index}">
                                <i class="${item.icon || 'fa-solid fa-circle-dot'}"></i>
                                <span>${localEscape(item.label)}</span>
                                ${shortcutHtml}
                            </div>
                        `;
                    }
                });

                contextMenu.innerHTML = html;

                contextMenu.querySelectorAll('.ctx-menu-item').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(el.getAttribute('data-index'), 10);
                        const itm = items[idx];
                        hideContextMenu();
                        if (itm && typeof itm.action === 'function') {
                            itm.action();
                        }
                    });
                });

                contextMenu.style.display = 'block';
                const menuW = contextMenu.offsetWidth || 210;
                const menuH = contextMenu.offsetHeight || 190;
                const posX = Math.min(clientX, window.innerWidth - menuW - 12);
                const posY = Math.min(clientY, window.innerHeight - menuH - 12);
                contextMenu.style.left = Math.max(10, posX) + 'px';
                contextMenu.style.top = Math.max(10, posY) + 'px';
            }

            // Mouse down pada container kanvas
            containerElement.addEventListener('mousedown', (e) => {
                hideContextMenu();

                const isMiddleClick = (e.button === 1);
                const isSpacePan = (e.button === 0 && state.isSpacePressed);
                const isShiftDrag = (e.button === 0 && (e.shiftKey || e.ctrlKey || e.metaKey));

                // 1. Shift + Klik Kiri pada latar kanvas: Kotak Seleksi (Marquee Selection)
                if (isShiftDrag) {
                    const isCanvasBg = (
                        e.target === containerElement ||
                        e.target.classList.contains('canvas-background') ||
                        e.target.classList.contains('diagram-viewport') ||
                        e.target.tagName.toLowerCase() === 'svg' ||
                        e.target.id === 'connectorsLayer' ||
                        e.target.id === 'labelsLayer'
                    );

                    if (isCanvasBg) {
                        e.preventDefault();
                        const rect = containerElement.getBoundingClientRect();
                        state.isMarqueeSelecting = true;
                        state.marqueeStart = {
                            clientX: e.clientX,
                            clientY: e.clientY,
                            canvasX: (e.clientX - rect.left - state.panX) / state.zoom,
                            canvasY: (e.clientY - rect.top - state.panY) / state.zoom,
                            initialSelectedIds: new Set(state.selectedNodeIds)
                        };

                        marqueeBox.style.left = (e.clientX - rect.left) + 'px';
                        marqueeBox.style.top = (e.clientY - rect.top) + 'px';
                        marqueeBox.style.width = '0px';
                        marqueeBox.style.height = '0px';
                        marqueeBox.style.display = 'none';
                        return;
                    }
                }

                // 2. Klik Kiri Biasa (e.button === 0) atau Klik Tengah atau Space+Drag:
                // DRAG / PAN KANVAS LAYOUT!
                if (e.button === 0 || isMiddleClick || isSpacePan) {
                    const isCanvasBg = (
                        e.target === containerElement ||
                        e.target.classList.contains('canvas-background') ||
                        e.target.classList.contains('diagram-viewport') ||
                        e.target.tagName.toLowerCase() === 'svg' ||
                        e.target.id === 'connectorsLayer' ||
                        e.target.id === 'labelsLayer'
                    );

                    if (isCanvasBg || isMiddleClick) {
                        e.preventDefault();
                        state.isPanning = true;
                        state.hasPanned = false;
                        state.panDownClientX = e.clientX;
                        state.panDownClientY = e.clientY;
                        state.panStartX = e.clientX - state.panX;
                        state.panStartY = e.clientY - state.panY;
                        containerElement.style.cursor = 'grabbing';
                    }
                }
            });

            containerElement.addEventListener('auxclick', (e) => {
                if (e.button === 1) e.preventDefault();
            });

            // Klik kanan untuk Menu Konteks (Context Menu)
            containerElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                hideContextMenu();

                // 1. Klik kanan pada kartu kelas
                const cardElem = e.target.closest('.diagram-class-card');
                if (cardElem) {
                    const classId = cardElem.getAttribute('data-id');
                    if (!state.selectedNodeIds.has(classId) && !e.shiftKey) {
                        selectNode(classId, false);
                    } else if (e.shiftKey) {
                        selectNode(classId, true);
                    }

                    const count = state.selectedNodeIds.size;
                    const cls = state.classes.find(c => c.id === classId);

                    if (count > 1) {
                        showContextMenu(e.clientX, e.clientY, [
                            {
                                label: `Hapus ${count} Kelas Terpilih`,
                                icon: 'fa-solid fa-trash-can',
                                danger: true,
                                shortcut: 'Del',
                                action: () => {
                                    if (confirm(`Hapus ${count} kelas terpilih beserta relasinya?`)) {
                                        deleteClasses(Array.from(state.selectedNodeIds));
                                    }
                                }
                            },
                            { divider: true },
                            {
                                label: state.isLocked ? 'Buka Kunci Posisi' : 'Kunci Posisi Kartu',
                                icon: state.isLocked ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock',
                                action: () => toggleLock()
                            }
                        ], `${count} Kelas Terpilih`, 'fa-solid fa-shapes');
                    } else if (cls) {
                        showContextMenu(e.clientX, e.clientY, [
                            {
                                label: 'Hapus Kelas',
                                icon: 'fa-solid fa-trash-can',
                                danger: true,
                                shortcut: 'Del',
                                action: () => {
                                    if (confirm(`Hapus kelas "${cls.name}" beserta relasinya?`)) {
                                        deleteClass(cls.id);
                                    }
                                }
                            },
                            {
                                label: 'Duplikat Kelas',
                                icon: 'fa-solid fa-copy',
                                action: () => duplicateClass(cls.id)
                            },
                            { divider: true },
                            {
                                label: 'Tambah Atribut Baru',
                                icon: 'fa-solid fa-plus',
                                action: () => addMember(cls.id, 'attribute', '+newAttribute')
                            },
                            {
                                label: 'Tambah Method Baru',
                                icon: 'fa-solid fa-code',
                                action: () => addMember(cls.id, 'method', '+newMethod()')
                            },
                            { divider: true },
                            {
                                label: state.isLocked ? 'Buka Kunci Posisi' : 'Kunci Posisi Kartu',
                                icon: state.isLocked ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock',
                                action: () => toggleLock()
                            }
                        ], `Kelas: ${cls.name}`, 'fa-solid fa-cube');
                    }
                    return;
                }

                // 2. Klik kanan pada garis relasi atau labelnya
                const relElem = e.target.closest('.relation-path, .relation-hit-area, .relation-label-group, .cardinality-badge-group');
                if (relElem && state.selectedRelation) {
                    const rel = state.selectedRelation;
                    showContextMenu(e.clientX, e.clientY, [
                        {
                            label: 'Hapus Relasi Ini',
                            icon: 'fa-solid fa-trash-can',
                            danger: true,
                            shortcut: 'Del',
                            action: () => {
                                if (confirm(`Hapus relasi "${rel.source}" → "${rel.target}"?`)) {
                                    deleteRelation(rel);
                                }
                            }
                        }
                    ], `Relasi: ${rel.source} → ${rel.target}`, 'fa-solid fa-link');
                    return;
                }

                // 3. Klik kanan pada latar kosong kanvas
                const rect = containerElement.getBoundingClientRect();
                const worldX = Math.round((e.clientX - rect.left - state.panX) / state.zoom);
                const worldY = Math.round((e.clientY - rect.top - state.panY) / state.zoom);

                showContextMenu(e.clientX, e.clientY, [
                    {
                        label: 'Tambah Kelas Baru Di Sini',
                        icon: 'fa-solid fa-cube',
                        action: () => addClass('class', null, worldX - 130, worldY - 80)
                    },
                    { divider: true },
                    {
                        label: 'Rapikan Diagram (Auto Arrange)',
                        icon: 'fa-solid fa-wand-magic-sparkles',
                        action: () => relayout()
                    },
                    {
                        label: 'Fit to Screen (Autofit)',
                        icon: 'fa-solid fa-expand',
                        action: () => autoFit()
                    },
                    {
                        label: 'Reset Zoom (100%)',
                        icon: 'fa-solid fa-magnifying-glass',
                        action: () => resetZoom()
                    }
                ], 'Kanvas Diagram', 'fa-solid fa-diagram-project');
            });

            window.addEventListener('mousemove', (e) => {
                if (state.isPanning) {
                    if (Math.abs(e.clientX - state.panDownClientX) > 3 || Math.abs(e.clientY - state.panDownClientY) > 3) {
                        state.hasPanned = true;
                    }
                    state.panX = e.clientX - state.panStartX;
                    state.panY = e.clientY - state.panStartY;
                    applyTransform();
                    return;
                }

                if (state.isMarqueeSelecting) {
                    const rect = containerElement.getBoundingClientRect();
                    const curClientX = e.clientX;
                    const curClientY = e.clientY;

                    const diffX = curClientX - state.marqueeStart.clientX;
                    const diffY = curClientY - state.marqueeStart.clientY;

                    // Tampilkan kotak seleksi jika mouse bergerak lebih dari 3px
                    if (Math.abs(diffX) > 3 || Math.abs(diffY) > 3) {
                        marqueeBox.style.display = 'block';

                        const boxLeft = Math.min(state.marqueeStart.clientX, curClientX) - rect.left;
                        const boxTop = Math.min(state.marqueeStart.clientY, curClientY) - rect.top;
                        const boxW = Math.abs(diffX);
                        const boxH = Math.abs(diffY);

                        marqueeBox.style.left = boxLeft + 'px';
                        marqueeBox.style.top = boxTop + 'px';
                        marqueeBox.style.width = boxW + 'px';
                        marqueeBox.style.height = boxH + 'px';

                        // Koordinat bounding box di ruang kanvas (world coordinates)
                        const curCanvasX = (curClientX - rect.left - state.panX) / state.zoom;
                        const curCanvasY = (curClientY - rect.top - state.panY) / state.zoom;

                        const worldLeft = Math.min(state.marqueeStart.canvasX, curCanvasX);
                        const worldTop = Math.min(state.marqueeStart.canvasY, curCanvasY);
                        const worldRight = Math.max(state.marqueeStart.canvasX, curCanvasX);
                        const worldBottom = Math.max(state.marqueeStart.canvasY, curCanvasY);

                        // Cek kartu mana saja yang bersinggungan dengan kotak seleksi
                        const newlySelected = new Set(state.marqueeStart.initialSelectedIds);

                        state.classes.forEach(cls => {
                            const pos = state.nodePositions.get(cls.id);
                            if (pos) {
                                const cardLeft = pos.x;
                                const cardTop = pos.y;
                                const cardRight = pos.x + pos.width;
                                const cardBottom = pos.y + pos.height;

                                const intersects = (
                                    cardLeft < worldRight &&
                                    cardRight > worldLeft &&
                                    cardTop < worldBottom &&
                                    cardBottom > worldTop
                                );

                                if (intersects) {
                                    newlySelected.add(cls.id);
                                }
                            }
                        });

                        state.selectedNodeIds = newlySelected;
                        state.selectedNodeId = state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : null;
                        applySelectionUI();
                    }
                }
            });

            window.addEventListener('mouseup', (e) => {
                if (state.isPanning) {
                    state.isPanning = false;
                    containerElement.style.cursor = state.isSpacePressed ? 'grab' : 'default';

                    // Jika klik kiri murni tanpa menggeser kanvas (hanya klik biasa di latar kosong):
                    // Bersihkan seleksi kartu atau relasi
                    if (!state.hasPanned && e.button === 0 && !e.shiftKey) {
                        clearSelection();
                    }
                }

                if (state.isMarqueeSelecting) {
                    state.isMarqueeSelecting = false;
                    marqueeBox.style.display = 'none';

                    if (typeof state.onSelect === 'function') {
                        state.onSelect({
                            type: 'node',
                            id: state.selectedNodeId,
                            selectedIds: Array.from(state.selectedNodeIds)
                        });
                    }
                }
            });

            // Tutup context menu saat klik luar atau scroll
            window.addEventListener('click', (e) => {
                if (!e.target.closest('.diagram-context-menu')) {
                    hideContextMenu();
                }
            });
            window.addEventListener('wheel', () => hideContextMenu(), { passive: true });

            // Keyboard shortcut Delete / Backspace untuk hapus item terpilih, dan Escape untuk tutup menu
            window.addEventListener('keydown', (e) => {
                if (e.target.closest('input, textarea, [contenteditable="true"]')) return;

                if (e.key === 'Escape') {
                    hideContextMenu();
                    return;
                }

                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (state.selectedNodeIds.size > 0) {
                        const count = state.selectedNodeIds.size;
                        if (confirm(count === 1 ? 'Hapus kelas terpilih beserta relasinya?' : `Hapus ${count} kelas terpilih beserta relasinya?`)) {
                            deleteClasses(Array.from(state.selectedNodeIds));
                        }
                    } else if (state.selectedRelation) {
                        const rel = state.selectedRelation;
                        if (confirm(`Hapus relasi "${rel.source}" → "${rel.target}"?`)) {
                            deleteRelation(rel);
                        }
                    }
                }
            });

            // Dukungan tombol Space untuk navigasi kanvas (standar Figma/Canva)
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !state.isSpacePressed && !e.target.closest('input, textarea, [contenteditable="true"]')) {
                    state.isSpacePressed = true;
                    if (!state.isPanning) containerElement.style.cursor = 'grab';
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.code === 'Space') {
                    state.isSpacePressed = false;
                    if (!state.isPanning) containerElement.style.cursor = 'default';
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

            const padding = 60;
            const availableW = Math.max(200, containerWidth - padding * 2);
            const availableH = Math.max(200, containerHeight - padding * 2);

            const scaleX = availableW / bboxWidth;
            const scaleY = availableH / bboxHeight;
            const optimalScale = Math.min(scaleX, scaleY);

            // Skala target agar seluruh diagram muat di layar dengan proporsi sempurna
            let targetZoom;
            if (optimalScale >= 1.0) {
                targetZoom = 1.0;
            } else {
                targetZoom = Math.min(Math.max(optimalScale * 0.98, 0.15), 1.0);
            }
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

        function relayout(algorithm = null) {
            if (algorithm) {
                state.currentAlgorithm = algorithm;
            }
            state.savedLayoutData = null;
            state.nodePositions = DiagramLayout.computeLayout(state.classes, state.relations, state.currentAlgorithm);
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

        /**
         * Sinkronkan perubahan struktur kanvas ke kode Mermaid dan picu event onCodeChange
         */
        function syncToCode() {
            if (window.DiagramParser && typeof window.DiagramParser.serialize === 'function') {
                const newCode = DiagramParser.serialize(state.classes, state.relations);
                if (typeof state.onCodeChange === 'function') {
                    state.onCodeChange(newCode);
                }
            }
            if (typeof state.onUpdate === 'function') {
                state.onUpdate(getStats());
            }
        }

        /**
         * Tambah kelas baru secara manual (drag & drop dari palet atau klik tombol)
         */
        function addClass(stereotype = 'class', customName = null, worldX = null, worldY = null) {
            let baseName = stereotype === 'interface' ? 'IService' : (stereotype === 'abstract' ? 'AbstractBase' : (stereotype === 'enum' ? 'StatusType' : 'NewEntity'));
            let name = customName;
            if (!name) {
                let counter = 1;
                while (state.classes.some(c => c.name.toLowerCase() === (baseName + counter).toLowerCase())) {
                    counter++;
                }
                name = baseName + counter;
            }

            // Koordinat default jika tidak dispesifikasikan (di tengah layar saat ini)
            let posX = worldX;
            let posY = worldY;
            if (posX === null || posY === null) {
                const containerW = containerElement.clientWidth || 800;
                const containerH = containerElement.clientHeight || 600;
                posX = Math.round((containerW / 2 - state.panX) / state.zoom - 130);
                posY = Math.round((containerH / 2 - state.panY) / state.zoom - 80);
            }

            const st = (stereotype === 'class' ? null : stereotype);
            const defaultAttrs = [];
            const defaultMethods = [];

            if (st === 'enum') {
                defaultAttrs.push({ type: 'attribute', visibility: 'public', icon: '+', text: 'ACTIVE' });
                defaultAttrs.push({ type: 'attribute', visibility: 'public', icon: '+', text: 'INACTIVE' });
                defaultAttrs.push({ type: 'attribute', visibility: 'public', icon: '+', text: 'PENDING' });
            } else if (st === 'interface') {
                defaultMethods.push({ type: 'method', visibility: 'public', icon: '+', text: 'execute()' });
                defaultMethods.push({ type: 'method', visibility: 'public', icon: '+', text: 'validate()' });
            } else if (st === 'abstract') {
                defaultAttrs.push({ type: 'attribute', visibility: 'protected', icon: '#', text: 'int id' });
                defaultMethods.push({ type: 'method', visibility: 'public', icon: '+', text: 'init()' });
            } else {
                defaultAttrs.push({ type: 'attribute', visibility: 'public', icon: '+', text: 'int id' });
                defaultAttrs.push({ type: 'attribute', visibility: 'public', icon: '+', text: 'string name' });
                defaultMethods.push({ type: 'method', visibility: 'public', icon: '+', text: 'save()' });
            }

            const newCls = {
                id: name,
                name: name,
                stereotype: st,
                attributes: defaultAttrs,
                methods: defaultMethods
            };

            state.classes.push(newCls);
            state.nodePositions.set(name, {
                x: posX,
                y: posY,
                width: 260,
                height: 160
            });

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();

            return newCls;
        }

        /**
         * Tambah member (atribut atau method) ke kelas tertentu
         */
        function addMember(classId, type, text) {
            const cls = state.classes.find(c => c.id === classId || c.name === classId);
            if (!cls) return;

            let parsed = null;
            if (window.DiagramParser && typeof window.DiagramParser.parseMember === 'function') {
                parsed = DiagramParser.parseMember(text);
            }
            if (!parsed) {
                parsed = {
                    type: type,
                    visibility: 'public',
                    icon: '+',
                    text: text.replace(/^[+\-#~]\s*/, '')
                };
            }

            if (type === 'attribute') {
                cls.attributes.push(parsed);
            } else {
                cls.methods.push(parsed);
            }

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
        }

        /**
         * Hapus baris member pada kelas
         */
        function deleteMember(classId, type, index) {
            const cls = state.classes.find(c => c.id === classId || c.name === classId);
            if (!cls) return;

            if (type === 'attribute') {
                if (cls.attributes[index]) cls.attributes.splice(index, 1);
            } else {
                if (cls.methods[index]) cls.methods.splice(index, 1);
            }

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
        }

        /**
         * Hapus kelas beserta relasi yang terhubung
         */
        function deleteClass(classId) {
            state.classes = state.classes.filter(c => c.id !== classId && c.name !== classId);
            state.relations = state.relations.filter(r => r.source !== classId && r.target !== classId);
            state.nodePositions.delete(classId);
            state.selectedNodeIds.delete(classId);
            if (state.selectedNodeId === classId) {
                state.selectedNodeId = state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : null;
            }

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
        }

        /**
         * Hapus banyak kelas sekaligus (multi-item delete)
         */
        function deleteClasses(classIds) {
            if (!classIds || classIds.length === 0) return;
            const idSet = new Set(classIds);
            state.classes = state.classes.filter(c => !idSet.has(c.id) && !idSet.has(c.name));
            state.relations = state.relations.filter(r => !idSet.has(r.source) && !idSet.has(r.target));
            idSet.forEach(id => {
                state.nodePositions.delete(id);
                state.selectedNodeIds.delete(id);
            });
            state.selectedNodeId = state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : null;

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
        }

        /**
         * Hapus relasi tertentu
         */
        function deleteRelation(rel) {
            if (!rel) return;
            state.relations = state.relations.filter(r => !isSameRelation(r, rel));
            state.selectedRelation = null;

            syncToCode();
            updateConnectors();
        }

        /**
         * Duplikat kelas yang ada
         */
        function duplicateClass(classId) {
            const cls = state.classes.find(c => c.id === classId || c.name === classId);
            if (!cls) return;

            let counter = 1;
            let newName = cls.name + 'Copy';
            while (state.classes.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
                counter++;
                newName = cls.name + 'Copy' + counter;
            }

            const newId = newName;
            const newAttributes = (cls.attributes || []).map(a => Object.assign({}, a));
            const newMethods = (cls.methods || []).map(m => Object.assign({}, m));

            const curPos = state.nodePositions.get(cls.id) || { x: 100, y: 100, width: 260, height: 160 };
            const newPos = {
                x: curPos.x + 40,
                y: curPos.y + 40,
                width: curPos.width,
                height: curPos.height
            };

            const newClass = {
                id: newId,
                name: newName,
                stereotype: cls.stereotype || null,
                attributes: newAttributes,
                methods: newMethods
            };

            state.classes.push(newClass);
            state.nodePositions.set(newId, newPos);

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
            selectNode(newId);
        }

        /**
         * Perbarui nama kelas
         */
        function updateClassName(classId, newName) {
            const clean = newName.replace(/[^a-zA-Z0-9_\-]/g, '').trim();
            if (!clean) return;

            const cls = state.classes.find(c => c.id === classId || c.name === classId);
            if (!cls) return;

            const oldId = cls.id;
            cls.id = clean;
            cls.name = clean;

            if (state.nodePositions.has(oldId)) {
                const oldPos = state.nodePositions.get(oldId);
                state.nodePositions.delete(oldId);
                state.nodePositions.set(clean, oldPos);
            }

            state.relations.forEach(r => {
                if (r.source === oldId) r.source = clean;
                if (r.target === oldId) r.target = clean;
            });

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
        }

        /**
         * Perbarui teks atribut atau method secara inline
         */
        function updateMemberText(classId, type, index, newText) {
            const cls = state.classes.find(c => c.id === classId || c.name === classId);
            if (!cls) return;

            const targetArray = type === 'attribute' ? cls.attributes : cls.methods;
            if (!targetArray[index]) return;

            let parsed = null;
            if (window.DiagramParser && typeof window.DiagramParser.parseMember === 'function') {
                parsed = DiagramParser.parseMember(newText);
            }

            if (parsed) {
                targetArray[index] = parsed;
            } else {
                targetArray[index].text = newText;
            }

            syncToCode();
            renderNodeElements();
            measureActualNodeDimensions(false);
            updateConnectors();
        }

        /**
         * Atur mode Lock Position (Kunci Posisi Kartu)
         */
        function setLocked(locked) {
            state.isLocked = !!locked;
            const viewport = containerElement.querySelector('.diagram-viewport');
            if (viewport) {
                if (state.isLocked) viewport.classList.add('canvas-locked');
                else viewport.classList.remove('canvas-locked');
            }
            renderNodeElements();
            return state.isLocked;
        }

        function toggleLock() {
            return setLocked(!state.isLocked);
        }

        function isLocked() {
            return !!state.isLocked;
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
            addClass: addClass,
            addMember: addMember,
            deleteMember: deleteMember,
            deleteClass: deleteClass,
            updateClassName: updateClassName,
            updateMemberText: updateMemberText,
            setLocked: setLocked,
            toggleLock: toggleLock,
            isLocked: isLocked,
            resetLayout: () => { state.savedLayoutData = null; },
            getAlgorithm: () => state.currentAlgorithm,
            setAlgorithm: (algo) => relayout(algo),
            relayout: relayout,
            onCodeChange: (cb) => { state.onCodeChange = cb; },
            onPositionChange: (cb) => { state.onPositionChange = cb; },
            onUpdate: (cb) => { state.onUpdate = cb; },
            onSelect: (cb) => { state.onSelect = cb; },
            selectNode: selectNode,
            setMultiSelection: setMultiSelection,
            selectRelation: selectRelation,
            clearSelection: clearSelection,
            getSelectedNode: () => state.selectedNodeId,
            getSelectedNodes: () => Array.from(state.selectedNodeIds),
            getSelectedRelation: () => state.selectedRelation,
            getState: () => state
        };
    }

    return {
        create: create
    };
})();
