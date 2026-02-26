import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Download, Smartphone, CheckCircle2, Wifi, QrCode, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Peer from 'peerjs';

import { dbOperations, blobToBase64, base64ToBlob } from './App';

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SyncBackupModal({ isOpen, onClose, boards, onRefresh }: any) {
    const [activeTab, setActiveTab] = useState('export'); // 'export', 'import', 'p2p'
    const [selectedBoards, setSelectedBoards] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // P2P State
    const [p2pMode, setP2pMode] = useState(null); // 'sender' | 'receiver'
    const [myPeerId, setMyPeerId] = useState('');
    const [targetPeerId, setTargetPeerId] = useState('');
    const [estimatedSize, setEstimatedSize] = useState(0);
    const [transferStatus, setTransferStatus] = useState('');

    const peerRef = useRef(null);
    const connRef = useRef(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedBoards(boards.map(b => b.id));
            setActiveTab('export');
            setP2pMode(null);
            setTransferStatus('');
        } else {
            cleanupP2P();
        }
    }, [isOpen, boards]);

    const cleanupP2P = () => {
        if (connRef.current) connRef.current.close();
        if (peerRef.current) peerRef.current.destroy();
        if (scannerRef.current) {
            scannerRef.current.clear().catch(e => console.log(e));
            scannerRef.current = null;
        }
        peerRef.current = null;
        connRef.current = null;
    };

    const getPayloadData = async () => {
        const boardsToExport = boards.filter((b: any) => selectedBoards.includes(b.id));
        const imagesData: any[] = await dbOperations.getAllImages() as any;

        // Solo le immagini necessarie (ottimizzazione potenziale, ma per sicurezza esportiamo tutte per ora)
        // O esportiamo solo le immagini usate? Lasciamo tutte per backcompatibilità
        const imagesExport = await Promise.all(imagesData.map(async (img) => ({
            ...img,
            blob: await blobToBase64(img.blob)
        })));

        const soundsData: any[] = await dbOperations.getAllSounds() as any;
        const soundsExport = await Promise.all(soundsData.map(async (snd) => ({
            ...snd,
            blob: await blobToBase64(snd.blob)
        })));

        return {
            date: new Date().toISOString(),
            version: 2, // version increment
            boards: boardsToExport,
            images: imagesExport,
            sounds: soundsExport
        };
    };

    const handleExportFile = async () => {
        if (selectedBoards.length === 0) return alert("Seleziona almeno un progetto.");
        setIsProcessing(true);
        try {
            const backup = await getPayloadData();
            const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `caa_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Errore durante l'esportazione.");
            console.error(e);
        }
        setIsProcessing(false);
    };

    const processImportData = async (backup: any) => {
        if (!backup.boards) throw new Error("Dati non validi");
        const totalSteps = (backup.images ? backup.images.length : 0) + backup.boards.length + (backup.sounds ? backup.sounds.length : 0);
        let step = 0;

        // Importing images (upsert)
        if (backup.images) {
            for (const img of backup.images) {
                const blob = await base64ToBlob(img.blob);
                await dbOperations.putImage({ ...img, blob });
                step++;
                setProgress((step / totalSteps) * 100);
            }
        }

        // Importing custom sounds (upsert)
        if (backup.sounds) {
            for (const snd of backup.sounds) {
                const blob = await base64ToBlob(snd.blob);
                await dbOperations.putSound({ ...snd, blob });
                step++;
                setProgress((step / totalSteps) * 100);
            }
        }

        // Deep merge function
        const existingBoards: any[] = await dbOperations.getAllBoards() as any;

        for (const board of backup.boards) {
            const existing = existingBoards.find(b => b.id === board.id);
            if (existing) {
                // Deep merge of arrays like items, pages
                const merged = { ...existing, ...board };
                if (board.items && existing.items) {
                    const mergedItems = [...existing.items];
                    for (const item of board.items) {
                        const idx = mergedItems.findIndex(i => i.id === item.id);
                        if (idx >= 0) mergedItems[idx] = { ...mergedItems[idx], ...item };
                        else mergedItems.push(item);
                    }
                    merged.items = mergedItems;
                }
                if (board.pages && existing.pages) {
                    const mergedPages = [...existing.pages];
                    for (const page of board.pages) {
                        const idx = mergedPages.findIndex(p => p.id === page.id);
                        if (idx >= 0) {
                            const newPageItems = [...(mergedPages[idx].items || [])];
                            for (const item of (page.items || [])) {
                                const iIdx = newPageItems.findIndex(i => i.id === item.id);
                                if (iIdx >= 0) newPageItems[iIdx] = { ...newPageItems[iIdx], ...item };
                                else newPageItems.push(item);
                            }
                            mergedPages[idx] = { ...mergedPages[idx], ...page, items: newPageItems };
                        } else {
                            mergedPages.push(page);
                        }
                    }
                    merged.pages = mergedPages;
                }
                await dbOperations.updateBoard(merged);
            } else {
                await dbOperations.addBoard(board);
            }
            step++;
            setProgress((step / totalSteps) * 100);
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsProcessing(true);
        setProgress(0);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                await processImportData(backup);
                alert("Importazione completata con successo!");
                onRefresh();
                onClose();
            } catch (err) {
                alert("Errore durante il ripristino. Il file potrebbe essere corrotto.");
                console.error(err);
            }
            setIsProcessing(false);
        };
        reader.readAsText(file);
    };

    // --- P2P LOGIC ---
    const startP2PSender = async () => {
        if (selectedBoards.length === 0) return alert("Seleziona almeno un progetto.");
        setIsProcessing(true);
        setP2pMode('sender');
        setTransferStatus('Calcolo dati in corso...');

        try {
            const payloadData = await getPayloadData();
            const payloadStr = JSON.stringify(payloadData);
            const sizeBytes = new Blob([payloadStr]).size;
            setEstimatedSize(sizeBytes);

            const idStr = 'caasync-' + Math.random().toString(36).substring(2, 8);

            const peer = new Peer(idStr);
            peerRef.current = peer;

            peer.on('open', (id) => {
                setMyPeerId(id);
                setTransferStatus('In attesa di connessione dal dispositivo ricevente...');
                setIsProcessing(false);
            });

            peer.on('error', (err) => {
                setTransferStatus('Errore di connessione: ' + err.message);
                setIsProcessing(false);
            });

            peer.on('connection', (conn) => {
                connRef.current = conn;
                setTransferStatus('Dispositivo connesso! Invio dati...');
                conn.on('open', () => {
                    sendChunks(conn, payloadStr);
                });
            });
        } catch (e) {
            setTransferStatus('Errore: ' + e.message);
            setIsProcessing(false);
        }
    };

    const sendChunks = (conn, payloadStr) => {
        const CHUNK_SIZE = 64 * 1024; // 64KB
        const totalChunks = Math.ceil(payloadStr.length / CHUNK_SIZE);

        conn.send({ type: 'meta', totalChunks, totalSize: payloadStr.length });

        let chunkIndex = 0;
        const sendNext = () => {
            if (chunkIndex < totalChunks) {
                const chunkData = payloadStr.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
                conn.send({ type: 'chunk', index: chunkIndex, data: chunkData });

                setProgress(((chunkIndex + 1) / totalChunks) * 100);
                chunkIndex++;

                // Timeout 0 previene blocchi UI e dà tempo alla connessione
                setTimeout(sendNext, 0);
            } else {
                conn.send({ type: 'done' });
                setTransferStatus('Invio terminato!');
                setTimeout(() => onClose(), 2000);
            }
        };
        sendNext();
    };

    const receiveChunksRef = useRef([]);
    let expectedChunks = 0;

    const startP2PReceiver = () => {
        setP2pMode('receiver');
    };

    const connectToPeer = () => {
        if (!targetPeerId) return;
        setIsProcessing(true);
        setTransferStatus('Connessione in corso...');

        // Random receiver ID
        const peer = new Peer('caarx-' + Math.random().toString(36).substring(2, 8));
        peerRef.current = peer;

        peer.on('open', () => {
            const conn = peer.connect(targetPeerId, { reliable: true });
            connRef.current = conn;

            conn.on('open', () => {
                setTransferStatus('Connesso! In attesa di ricevere...');
            });

            conn.on('data', async (msg) => {
                if (msg.type === 'meta') {
                    expectedChunks = msg.totalChunks;
                    receiveChunksRef.current = new Array<any>(expectedChunks);
                    setTransferStatus(`Ricezione file in corso... (${formatBytes(msg.totalSize)})`);
                } else if (msg.type === 'chunk') {
                    receiveChunksRef.current[msg.index] = msg.data;
                    setProgress(((msg.index + 1) / expectedChunks) * 100);
                } else if (msg.type === 'done') {
                    setTransferStatus('Ricezione completata! Elaborazione dati...');
                    try {
                        const fullStr = receiveChunksRef.current.join('');
                        const backup = JSON.parse(fullStr);
                        await processImportData(backup);
                        setTransferStatus('Importazione completata!');
                        setTimeout(() => { onRefresh(); onClose(); }, 1500);
                    } catch (e) {
                        setTransferStatus('Errore elaborazione dati.');
                    }
                    setIsProcessing(false);
                }
            });

            conn.on('error', (e) => { setTransferStatus('Errore:' + e.message); setIsProcessing(false); });
        });
    };

    const toggleBoardSelection = (id) => {
        if (selectedBoards.includes(id)) setSelectedBoards(selectedBoards.filter(b => b !== id));
        else setSelectedBoards([...selectedBoards, id]);
    };

    useEffect(() => {
        if (p2pMode === 'receiver' && isOpen && !isProcessing && !myPeerId && document.getElementById('qr-reader')) {
            // Inizializza lo scanner
            if (!scannerRef.current) {
                const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
                scanner.render((decodedText) => {
                    setTargetPeerId(decodedText);
                    scanner.clear();
                }, (error) => { });
                scannerRef.current = scanner;
            }
        }
    }, [p2pMode, isOpen, isProcessing, myPeerId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="flex items-center justify-between p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                        <Wifi className="w-5 h-5 text-blue-500" /> Sincronizzazione & Backup
                    </h2>
                    <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* TABS (Se non in P2P attivo) */}
                {!p2pMode && (
                    <div className="flex gap-2 p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                        <button onClick={() => setActiveTab('export')} className={`flex-1 flex gap-2 justify-center items-center py-2 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'export' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <Upload className="w-4 h-4" /> Esporta
                        </button>
                        <button onClick={() => setActiveTab('import')} className={`flex-1 flex gap-2 justify-center items-center py-2 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'import' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <Download className="w-4 h-4" /> Importa
                        </button>
                        <button onClick={() => setActiveTab('p2p')} className={`flex-1 flex gap-2 justify-center items-center py-2 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'p2p' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <Smartphone className="w-4 h-4" /> Sync Wireless
                        </button>
                    </div>
                )}

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* TAB EXPORT */}
                    {activeTab === 'export' && !p2pMode && (
                        <div className="animate-in fade-in space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Scegli quali progetti includere nel file di esportazione JSON.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-700 p-2 max-h-60 overflow-y-auto">
                                {boards.length === 0 && <p className="text-center p-4 text-slate-400">Nessun progetto trovato.</p>}

                                {Array.from(new Set(boards.map(b => b.type))).map(type => {
                                    const typeBoards = boards.filter(b => b.type === type);
                                    const allSelected = typeBoards.every(b => selectedBoards.includes(b.id));
                                    const someSelected = typeBoards.some(b => selectedBoards.includes(b.id));

                                    return (
                                        <div key={type} className="mb-2">
                                            <div className="flex items-center gap-2 p-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer font-bold"
                                                onClick={() => {
                                                    if (allSelected) {
                                                        setSelectedBoards(selectedBoards.filter(id => !typeBoards.find(b => b.id === id)));
                                                    } else {
                                                        const newSelection = new Set([...selectedBoards, ...typeBoards.map(b => b.id)]);
                                                        setSelectedBoards([...newSelection]);
                                                    }
                                                }}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${allSelected ? 'bg-blue-600 border-blue-600' : someSelected ? 'bg-blue-400 border-blue-400' : 'border-slate-400'}`}>
                                                    {allSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                    {!allSelected && someSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                                </div>
                                                <span className="capitalize">{type === 'sequence' ? 'Agende Visive' : type === 'token' ? 'Token Economy' : type === 'story' ? 'Storie Sociali' : type === 'pecs' ? 'Griglie PECS' : type === 'timer' ? 'Timer Visivi' : type === 'grid' ? 'Tabelle di Comunicazione' : type}</span>
                                                <span className="ml-auto text-xs text-slate-500">({typeBoards.length})</span>
                                            </div>

                                            <div className="ml-4 pl-2 border-l-2 border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                                                {typeBoards.map(b => (
                                                    <div key={b.id} onClick={() => toggleBoardSelection(b.id)} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedBoards.includes(b.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                                            {selectedBoards.includes(b.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{b.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setSelectedBoards(boards.map(b => b.id))} className="text-xs text-blue-600 font-bold hover:underline">Seleziona tutti</button>
                                <button onClick={() => setSelectedBoards([])} className="text-xs text-slate-500 font-bold hover:underline">Deseleziona tutti</button>
                            </div>

                            <div className="pt-4 flex items-center justify-center">
                                <button disabled={isProcessing || boards.length === 0} onClick={handleExportFile} className="flex gap-2 items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                                    {isProcessing ? 'Elaborazione...' : <><Download className="w-5 h-5" /> Scarica File .json</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB IMPORT */}
                    {activeTab === 'import' && !p2pMode && (
                        <div className="animate-in fade-in space-y-6 flex flex-col items-center py-8">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-sm leading-relaxed mb-4 text-center">
                                L'importazione è <strong>intelligente</strong>: aggiungerà i nuovi progetti e aggiornerà quelli esistenti (senza cancellare tutto in blocco).
                            </div>

                            {isProcessing ? (
                                <div className="w-full space-y-3">
                                    <p className="text-center font-bold text-slate-700 dark:text-slate-300">Importazione in corso...</p>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-4 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <input type="file" id="file-upload" accept=".json" className="hidden" onChange={handleImportFile} />
                                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-64 h-48 border-2 border-dashed border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-3xl transition-colors">
                                        <Upload className="w-12 h-12 text-blue-500 mb-4" />
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Scegli file .json</span>
                                    </label>
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB P2P OVERVIEW */}
                    {activeTab === 'p2p' && !p2pMode && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div onClick={() => setActiveTab('export') || setTimeout(startP2PSender, 100)} className="bg-purple-50 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-slate-700 border-2 border-purple-200 dark:border-purple-800 p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center text-center">
                                <Upload className="w-12 h-12 text-purple-600 mb-3" />
                                <h3 className="font-bold text-lg dark:text-white">Invia (Mittente)</h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Invia dati da questo dispositivo ad un altro selezionando prima cosa inviare nella Checklist.</p>
                            </div>

                            <div onClick={startP2PReceiver} className="bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 border-2 border-emerald-200 dark:border-emerald-800 p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center text-center">
                                <Download className="w-12 h-12 text-emerald-600 mb-3" />
                                <h3 className="font-bold text-lg dark:text-white">Ricevi (Ricevente)</h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Apri lo scanner QR Code o inserisci l'ID per ricevere i dati dall'altro dispositivo nello stesso locale.</p>
                            </div>
                        </div>
                    )}

                    {/* P2P SENDER ACTIVE */}
                    {p2pMode === 'sender' && (
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in-95">
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Modalità Mittente</h3>

                            {myPeerId ? (
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                    <QRCodeSVG value={myPeerId} size={200} />
                                    <p className="mt-6 text-sm text-slate-500 uppercase tracking-widest font-bold">Oppure inserisci il Codice:</p>
                                    <p className="text-4xl font-mono font-black text-purple-600 mt-1 select-all">{myPeerId}</p>
                                </div>
                            ) : (
                                <div className="flex justify-center py-10"><Wifi className="w-10 h-10 text-slate-400 animate-pulse" /></div>
                            )}

                            {estimatedSize > 0 && <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold">Dimensione Stimata: {formatBytes(estimatedSize)}</span>}
                            <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-lg">{transferStatus}</p>

                            {progress > 0 && (
                                <div className="w-full space-y-2">
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                                        <div className="bg-purple-500 h-full transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-center text-xs text-slate-500">{progress.toFixed(0)}% Completato</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* P2P RECEIVER ACTIVE */}
                    {p2pMode === 'receiver' && (
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95">
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Modalità Ricevente</h3>

                            {!isProcessing ? (
                                <>
                                    <div id="qr-reader" className="w-full max-w-sm rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700"></div>

                                    <div className="flex items-center gap-2 w-full mt-4 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl">
                                        <QrCode className="w-5 h-5 text-slate-400 ml-2" />
                                        <input
                                            type="text"
                                            value={targetPeerId}
                                            onChange={e => setTargetPeerId(e.target.value)}
                                            placeholder="Inserisci l'ID (es. caasync-abcde)"
                                            className="flex-1 bg-transparent border-0 outline-none p-2 dark:text-white font-mono"
                                        />
                                        <button onClick={connectToPeer} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold">Connetti</button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full p-8 flex flex-col items-center gap-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{transferStatus}</p>
                                    {progress > 0 && (
                                        <div className="w-full">
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-4 rounded-full overflow-hidden shadow-inner">
                                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <p className="text-center text-sm font-bold mt-2 text-emerald-600">{progress.toFixed(0)}%</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
