/**
 * Greyagram - Resilient Mermaid Class Diagram Parser
 * Mendukung berbagai format Mermaid classDiagram: blok class, inline members, stereotipe, kardinalitas, dan relasi.
 */

window.DiagramParser = (function () {
    'use strict';

    /**
     * Parse kode Mermaid Class Diagram menjadi model objek terstruktur
     * @param {string} code 
     * @returns {{classes: Array, relations: Array, errors: Array}}
     */
    function parse(code) {
        const errors = [];
        const classMap = new Map();
        const relations = [];

        if (!code || typeof code !== 'string' || !code.trim()) {
            return { classes: [], relations: [], errors: ['Kode diagram kosong. Silakan masukkan kode Mermaid.'] };
        }

        const lines = code.split(/\r?\n/);
        let inClassBlock = null;
        let pendingClassDef = null;

        // Pattern untuk relasi yang sangat fleksibel
        // Mendukung: ClassA "1" --> "*" ClassB : label
        // Mendukung: ClassA <|-- ClassB
        // Mendukung: ClassA -> ClassB
        // Mendukung: ClassA --* ClassB : "label"
        const relationSymbols = [
            '<\\|--', '--\\|>', '<\\|\\.\\.', '\\.\\.\\|>',
            '\\*--', '--\\*', 'o--', '--o',
            '-->', '<--', '->', '<-',
            '\\.\\.>', '<\\.\\.',
            '\\.\\.', '--'
        ];
        const relSymbolRegexStr = '(' + relationSymbols.join('|') + ')';
        const relationRegex = new RegExp(
            '^([a-zA-Z0-9_\\-]+)\\s*(?:"([^"]+)"|\'([^\']+)\')?\\s*' +
            relSymbolRegexStr +
            '\\s*(?:"([^"]+)"|\'([^\']+)\')?\\s*([a-zA-Z0-9_\\-]+)(?:\\s*:\\s*(.+))?$'
        );

        function getOrCreateClass(name) {
            const cleanName = name.replace(/^["']|["']$/g, '').trim();
            if (!cleanName) return null;

            if (!classMap.has(cleanName)) {
                classMap.set(cleanName, {
                    id: cleanName,
                    name: cleanName,
                    stereotype: null,
                    attributes: [],
                    methods: []
                });
            }
            return classMap.get(cleanName);
        }

        function parseMember(rawMember) {
            let str = rawMember.trim();
            if (!str) return null;

            // Cek stereotipe dalam blok (misal: <<interface>> atau <<Interface>>)
            const annoMatch = str.match(/^<<([a-zA-Z0-9_]+)>>$/i);
            if (annoMatch) {
                return { type: 'stereotype', value: annoMatch[1] };
            }

            // Visibilitas: + (public), - (private), # (protected), ~ (package/internal)
            let visibility = 'public';
            let icon = '+';
            if (str.startsWith('+')) {
                visibility = 'public';
                icon = '+';
                str = str.substring(1).trim();
            } else if (str.startsWith('-')) {
                visibility = 'private';
                icon = '-';
                str = str.substring(1).trim();
            } else if (str.startsWith('#')) {
                visibility = 'protected';
                icon = '#';
                str = str.substring(1).trim();
            } else if (str.startsWith('~')) {
                visibility = 'package';
                icon = '~';
                str = str.substring(1).trim();
            }

            // Bedakan method vs attribute berdasarkan keberadaan tanda ()
            const isMethod = str.includes('(') && str.includes(')');

            return {
                type: isMethod ? 'method' : 'attribute',
                visibility: visibility,
                icon: icon,
                text: str
            };
        }

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Abaikan baris kosong dan komentar (%% atau // atau #)
            if (!line || line.startsWith('%%') || line.startsWith('//') || line.startsWith('#')) {
                continue;
            }

            // Abaikan header diagram & arahan arah (direction)
            if (line.toLowerCase() === 'classdiagram' || 
                line.toLowerCase().startsWith('direction ') ||
                line.toLowerCase().startsWith('note ')) {
                continue;
            }

            // Tangani pembukaan blok '{' jika berada di baris baru setelah 'class Nama'
            if (pendingClassDef && line === '{') {
                inClassBlock = pendingClassDef;
                pendingClassDef = null;
                continue;
            } else if (pendingClassDef) {
                pendingClassDef = null;
            }

            // Akhir blok class
            if (inClassBlock && line === '}') {
                inClassBlock = null;
                continue;
            }

            // Sedang di dalam blok class { ... }
            if (inClassBlock) {
                // Cek jika penutup '}' di akhir baris
                if (line.endsWith('}')) {
                    line = line.slice(0, -1).trim();
                    if (line) {
                        const member = parseMember(line);
                        if (member) {
                            if (member.type === 'stereotype') inClassBlock.stereotype = member.value;
                            else if (member.type === 'method') inClassBlock.methods.push(member);
                            else inClassBlock.attributes.push(member);
                        }
                    }
                    inClassBlock = null;
                    continue;
                }

                const member = parseMember(line);
                if (member) {
                    if (member.type === 'stereotype') inClassBlock.stereotype = member.value;
                    else if (member.type === 'method') inClassBlock.methods.push(member);
                    else inClassBlock.attributes.push(member);
                }
                continue;
            }

            // Cek definisi relasi (misal: ClassA "1" --> "*" ClassB : label)
            const relMatch = line.match(relationRegex);
            if (relMatch) {
                const sourceName = relMatch[1];
                const sourceCard = relMatch[2] || relMatch[3] || '';
                const relSymbol = relMatch[4];
                const targetCard = relMatch[5] || relMatch[6] || '';
                const targetName = relMatch[7];
                const label = relMatch[8] ? relMatch[8].replace(/^["']|["']$/g, '').trim() : '';

                const srcCls = getOrCreateClass(sourceName);
                const tgtCls = getOrCreateClass(targetName);

                if (srcCls && tgtCls) {
                    relations.push({
                        id: 'rel_' + relations.length,
                        source: srcCls.id,
                        target: tgtCls.id,
                        symbol: relSymbol,
                        sourceCard: sourceCard,
                        targetCard: targetCard,
                        label: label,
                        type: mapRelationType(relSymbol)
                    });
                }
                continue;
            }

            // Cek awal blok class (misal: class User { ... } atau class User)
            if (line.startsWith('class ') || line.startsWith('class\t')) {
                const isBlockOpen = line.includes('{');
                const cleanHeader = line.replace(/\{.*$/, '').trim();
                const parts = cleanHeader.split(/\s+/);
                const className = parts[1];

                if (className) {
                    const cls = getOrCreateClass(className);

                    // Cek stereotipe inline jika ada misal: class User~interface~
                    const genericMatch = cleanHeader.match(/~([^~]+)~/);
                    if (genericMatch && cls) {
                        cls.stereotype = genericMatch[1];
                    }

                    if (isBlockOpen) {
                        inClassBlock = cls;
                    } else {
                        // Simpan untuk mengecek baris berikutnya apakah berisi '{'
                        pendingClassDef = cls;
                    }
                }
                continue;
            }

            // Cek format member inline (misal: BankAccount : +int balance)
            const inlineMatch = line.match(/^([a-zA-Z0-9_\-]+)\s*:\s*(.+)$/);
            if (inlineMatch) {
                const className = inlineMatch[1];
                const rawMember = inlineMatch[2];
                const cls = getOrCreateClass(className);
                if (cls) {
                    const member = parseMember(rawMember);
                    if (member) {
                        if (member.type === 'stereotype') cls.stereotype = member.value;
                        else if (member.type === 'method') cls.methods.push(member);
                        else cls.attributes.push(member);
                    }
                }
                continue;
            }

            // Cek stereotipe terpisah (misal: <<interface>> Shape)
            const separateStereoMatch = line.match(/^<<([a-zA-Z0-9_]+)>>\s+([a-zA-Z0-9_\-]+)$/i);
            if (separateStereoMatch) {
                const stereo = separateStereoMatch[1];
                const clsName = separateStereoMatch[2];
                const cls = getOrCreateClass(clsName);
                if (cls) cls.stereotype = stereo;
                continue;
            }
        }

        const classes = Array.from(classMap.values());

        if (classes.length === 0) {
            errors.push('Tidak ditemukan definisi kelas. Pastikan format kelas ditulis seperti: "class NamaKelas { +properti }" atau "KelasA --> KelasB".');
        }

        return {
            classes: classes,
            relations: relations,
            errors: errors
        };
    }

    /**
     * Memetakan simbol relasi Mermaid ke tipe semantik
     */
    function mapRelationType(symbol) {
        switch (symbol) {
            case '<|--':
            case '--|>':
                return 'inheritance'; // Pewarisan
            case '<|..':
            case '..|>':
                return 'realization'; // Implementasi antarmuka
            case '*--':
            case '--*':
                return 'composition'; // Komposisi
            case 'o--':
            case '--o':
                return 'aggregation'; // Agregasi
            case '-->':
            case '<--':
            case '->':
            case '<-':
                return 'association'; // Asosiasi
            case '..>':
            case '<..':
                return 'dependency'; // Dependensi
            case '..':
                return 'dotted';
            case '--':
            default:
                return 'link';
        }
    }

    /**
     * Serialisasi struktur model objek classes & relations kembali ke format kode Mermaid classDiagram
     * @param {Array} classes 
     * @param {Array} relations 
     * @returns {string}
     */
    function serialize(classes, relations) {
        let out = 'classDiagram\n';

        (classes || []).forEach(cls => {
            out += `    class ${cls.name} {\n`;
            if (cls.stereotype) {
                out += `        <<${cls.stereotype}>>\n`;
            }
            (cls.attributes || []).forEach(attr => {
                let vis = attr.icon || (attr.visibility === 'private' ? '-' : attr.visibility === 'protected' ? '#' : attr.visibility === 'package' ? '~' : '+');
                let txt = (attr.text || attr.name || '').trim();
                txt = txt.replace(/^[+\-#~]\s*/, '');
                if (txt) {
                    out += `        ${vis}${txt}\n`;
                }
            });
            (cls.methods || []).forEach(m => {
                let vis = m.icon || (m.visibility === 'private' ? '-' : m.visibility === 'protected' ? '#' : m.visibility === 'package' ? '~' : '+');
                let txt = (m.text || m.name || '').trim();
                txt = txt.replace(/^[+\-#~]\s*/, '');
                if (txt) {
                    if (!txt.includes('(')) txt += '()';
                    out += `        ${vis}${txt}\n`;
                }
            });
            out += `    }\n`;
        });

        (relations || []).forEach(rel => {
            const sym = rel.symbol || '-->';
            const sCard = rel.sourceCard ? `"${rel.sourceCard}" ` : '';
            const tCard = rel.targetCard ? `"${rel.targetCard}" ` : '';
            const lbl = rel.label ? ` : ${rel.label}` : '';
            out += `    ${rel.source} ${sCard}${sym} ${tCard}${rel.target}${lbl}\n`;
        });

        return out;
    }

    return {
        parse: parse,
        parseMember: parseMember,
        serialize: serialize,
        mapRelationType: mapRelationType
    };
})();
