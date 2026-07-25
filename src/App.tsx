import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus, Search, Save, Image as ImageIcon, Trash2, ArrowLeft, Moon, Sun,
  LayoutGrid, ListOrdered, CheckCircle2, X, Upload, Settings, Copy,
  ArrowDown, ArrowRight, FilePlus, Lock, Unlock,
  RotateCcw,             // Icona normale
  RotateCcw as ResetIcon, // <--- ECCO IL FIX: Creiamo l'alias per il Timer
  Link as LinkIcon,
  Trophy, Star, Globe, MoreVertical, Filter, SortAsc, SortDesc, Edit3,
  Heart, ThumbsUp, Smile, Zap, Crown, Medal, Rocket, Music, Car, Cat, Dog,
  Flower, Palette, Download, Upload as UploadIcon, Camera, HelpCircle,
  Scissors, Printer, Book, Wand2, Crop as CropIcon, Layers, BookOpen,
  Timer, Play, Pause, Volume2, ChevronUp,
  ChevronDown, Wifi, Mouse, CheckSquare // Icone per il Timer e Suono
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import SyncBackupModal from './SyncBackupModal';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
// Aggiungi questi import in alto
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";
import { removeBackground, preloadRmbg, type EdgeMode, type RmbgProgress } from './lib/rmbg';
import { speak, stopSpeaking, isSpeechSupported, primeSpeech, listVoices, getPreferredVoice, setPreferredVoice, getRate, setRate, type VoiceOption } from './lib/speech';

// Chiama questa funzione subito fuori dal componente, o dentro uno useEffect in App
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

/**
 * ==========================================
 * CONSTANTS & CONFIG
 * ==========================================
 */
const DB_NAME = 'CaaAppDB';
const DB_VERSION = 2; // Incremented for sounds store

// Mappa delle icone predefinite con stili coordinati (Sfondo, Bordo, Icona)
// Mappa delle icone predefinite con stili coordinati (Sfondo, Bordo, Icona, RGB per timer)
const PRESET_ICONS = [
  {
    id: 'star', label: 'Stella', icon: Star, rgb: { r: 245, g: 158, b: 11 }, // Amber
    style: { bg: 'bg-amber-100', border: 'border-amber-400', icon: 'text-amber-500 fill-amber-400' }
  },
  {
    id: 'heart', label: 'Cuore', icon: Heart, rgb: { r: 239, g: 68, b: 68 }, // Red
    style: { bg: 'bg-red-100', border: 'border-red-400', icon: 'text-red-500 fill-red-500' }
  },
  {
    id: 'thumbsup', label: 'Super', icon: ThumbsUp, rgb: { r: 37, g: 99, b: 235 }, // Blue
    style: { bg: 'bg-blue-100', border: 'border-blue-400', icon: 'text-blue-600 fill-blue-400' }
  },
  {
    id: 'smile', label: 'Sorriso', icon: Smile, rgb: { r: 202, g: 138, b: 4 }, // Yellow
    style: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-600 fill-yellow-200' }
  },
  {
    id: 'crown', label: 'Re/Regina', icon: Crown, rgb: { r: 147, g: 51, b: 234 }, // Purple
    style: { bg: 'bg-purple-100', border: 'border-purple-400', icon: 'text-purple-600 fill-purple-400' }
  },
  {
    id: 'trophy', label: 'Coppa', icon: Trophy, rgb: { r: 234, g: 179, b: 8 }, // Yellow-500
    style: { bg: 'bg-yellow-50', border: 'border-yellow-500', icon: 'text-yellow-600 fill-yellow-400' }
  },
  {
    id: 'medal', label: 'Medaglia', icon: Medal, rgb: { r: 249, g: 115, b: 22 }, // Orange
    style: { bg: 'bg-orange-100', border: 'border-orange-400', icon: 'text-orange-600 fill-orange-400' }
  },
  {
    id: 'rocket', label: 'Razzo', icon: Rocket, rgb: { r: 79, g: 70, b: 229 }, // Indigo
    style: { bg: 'bg-indigo-100', border: 'border-indigo-400', icon: 'text-indigo-600 fill-indigo-400' }
  },
  {
    id: 'zap', label: 'Fulmine', icon: Zap, rgb: { r: 234, g: 179, b: 8 }, // Yellow
    style: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-500 fill-yellow-500' }
  },
  {
    id: 'flower', label: 'Fiore', icon: Flower, rgb: { r: 236, g: 72, b: 153 }, // Pink
    style: { bg: 'bg-pink-100', border: 'border-pink-400', icon: 'text-pink-500 fill-pink-400' }
  },
  {
    id: 'cat', label: 'Gatto', icon: Cat, rgb: { r: 120, g: 113, b: 108 }, // Stone
    style: { bg: 'bg-stone-200', border: 'border-stone-400', icon: 'text-stone-600 fill-stone-400' }
  },
  {
    id: 'dog', label: 'Cane', icon: Dog, rgb: { r: 146, g: 64, b: 14 }, // Amber-800
    style: { bg: 'bg-amber-200', border: 'border-amber-600', icon: 'text-amber-800 fill-amber-700' }
  },
  {
    id: 'car', label: 'Auto', icon: Car, rgb: { r: 220, g: 38, b: 38 }, // Red
    style: { bg: 'bg-red-50', border: 'border-red-500', icon: 'text-red-600 fill-red-600' }
  },
  {
    id: 'music', label: 'Musica', icon: Music, rgb: { r: 14, g: 165, b: 233 }, // Sky
    style: { bg: 'bg-sky-100', border: 'border-sky-400', icon: 'text-sky-600 fill-sky-400' }
  },
];

// Preset per il Timer (Secondi)
const TIMER_PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
];

const TIMER_SOUNDS = [
  { id: 'digital', label: 'Beep Digitale', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { id: 'classic', label: 'Sveglia Classica', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { id: 'kitchen', label: 'Timer Cucina', url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
  { id: 'school', label: 'Campanella', url: 'https://cdn.freesound.org/previews/337/337000_3232293-lq.mp3' },
  { id: 'phone', label: 'Telefono Retro', url: 'https://actions.google.com/sounds/v1/alarms/phone_alert.ogg' },
  { id: 'bell_chime', label: 'Suono Dolce', url: 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg' },
  { id: 'arcade', label: 'Arcade', url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg' },
  { id: 'whistle', label: 'Fischio', url: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg' },
  { id: 'gong', label: 'Gong', url: 'https://cdn.freesound.org/previews/536/536774_11739077-lq.mp3' },
];

// Etichette, icone e colori per tipo di progetto. Prima erano ripetuti inline
// in tre punti e coprivano solo griglia/agenda/token: storie sociali, PECS e
// timer finivano tutti etichettati come "Token".
const BOARD_TYPE_LABELS = {
  grid: 'Comunicazione',
  sequence: 'Agenda',
  token: 'Token Economy',
  story: 'Storia Sociale',
  pecs: 'PECS da Taglio',
  timer: 'Timer Visivo',
};

const BOARD_TYPE_ICONS = {
  grid: LayoutGrid,
  sequence: ListOrdered,
  token: Trophy,
  story: Book,
  pecs: Scissors,
  timer: Timer,
};

const BOARD_TYPE_COLORS = {
  grid: 'bg-blue-100 text-blue-600',
  sequence: 'bg-emerald-100 text-emerald-600',
  token: 'bg-amber-100 text-amber-600',
  story: 'bg-pink-100 text-pink-600',
  pecs: 'bg-indigo-100 text-indigo-600',
  timer: 'bg-cyan-100 text-cyan-600',
};

const getPresetStyle = (iconId) => {
  const preset = PRESET_ICONS.find(p => p.id === iconId);
  return preset ? preset.style : PRESET_ICONS[0].style;
};

const getIconComponent = (iconId) => {
  const preset = PRESET_ICONS.find(p => p.id === iconId);
  return preset ? preset.icon : Star;
};

// Funzione rapida per trovare il primo simbolo Arasaac per una parola
const quickSearchArasaac = async (word) => {
  try {
    const response = await fetch(`https://api.arasaac.org/api/pictograms/it/search/${encodeURIComponent(word)}`);
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const bestMatch = data[0]; // Prendi il primo risultato
      const imageUrl = `https://api.arasaac.org/api/pictograms/${bestMatch._id}?download=false`;
      await cacheArasaacImage(imageUrl, bestMatch._id); // Cache immediata
      const blobUrl = await getImageUrl(bestMatch._id.toString());
      return { found: true, imageUrl: blobUrl, sourceId: bestMatch._id.toString() };
    }
  } catch (e) { console.error(e); }
  return { found: false, imageUrl: null, sourceId: null };
};

/**
 * ==========================================
 * UTILITIES: BLOB & COLOR
 * ==========================================
 */
const getDominantColor = async (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        // Ignoriamo i pixel trasparenti (Alpha < 128)
        if (data[i + 3] > 128) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      if (count === 0) resolve({ r: 240, g: 240, b: 240 });
      else resolve({ r: r / count, g: g / count, b: b / count });
    };
    img.onerror = () => resolve({ r: 200, g: 200, b: 200 });
  });
};

export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const base64ToBlob = async (base64) => {
  const res = await fetch(base64);
  return await res.blob();
};

/**
 * ==========================================
 * NATIVE INDEXEDDB UTILITIES
 * ==========================================
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('boards')) {
        const store = db.createObjectStore('boards', { keyPath: 'id', autoIncrement: true });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('images')) {
        const store = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
        store.createIndex('sourceId', 'sourceId', { unique: false });
      }
      if (!db.objectStoreNames.contains('sounds')) {
        db.createObjectStore('sounds', { keyPath: 'id' });
      }
    };
  });
};

export const dbOperations = {
  async getAllBoards() {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readonly');
      const store = transaction.objectStore('boards');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllImages() {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async addBoard(board) {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const { id, ...boardData } = board;
      const request = store.add(boardData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async updateBoard(board) {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.put(board);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getBoard(id) {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readonly');
      const store = transaction.objectStore('boards');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBoard(id) {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getImageBySourceId(sourceId) {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const index = store.index('sourceId');
      const request = index.get(sourceId.toString());
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async addImage(imageRecord) {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.add(imageRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async putImage(imageRecord) {
    const db: any = await openDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.put(imageRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllSounds() {
    const db: any = await openDB();
    return new Promise<any>((resolve, reject) => {
      if (!db.objectStoreNames.contains('sounds')) return resolve([]);
      const transaction = db.transaction(['sounds'], 'readonly');
      const store = transaction.objectStore('sounds');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async putSound(soundRecord) {
    const db: any = await openDB();
    return new Promise<any>((resolve, reject) => {
      if (!db.objectStoreNames.contains('sounds')) return resolve(null);
      const transaction = db.transaction(['sounds'], 'readwrite');
      const store = transaction.objectStore('sounds');
      const request = store.put(soundRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteSound(id) {
    const db: any = await openDB();
    return new Promise<any>((resolve, reject) => {
      if (!db.objectStoreNames.contains('sounds')) return resolve(null);
      const transaction = db.transaction(['sounds'], 'readwrite');
      const store = transaction.objectStore('sounds');
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async clearDatabase() {
    const db: any = await openDB();
    return new Promise<any>((resolve, reject) => {
      const stores = Array.from(db.objectStoreNames);
      const transaction = db.transaction(stores, 'readwrite');
      if (stores.includes('boards')) transaction.objectStore('boards').clear();
      if (stores.includes('images')) transaction.objectStore('images').clear();
      if (stores.includes('sounds')) transaction.objectStore('sounds').clear();
      transaction.oncomplete = () => resolve(null);
      transaction.onerror = () => reject(transaction.error);
    });
  }
};



/**
 * ==========================================
 * UTILITY FUNCTIONS
 * ==========================================
 */

const cacheArasaacImage = async (url, arasaacId) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const existing = await dbOperations.getImageBySourceId(arasaacId.toString());
    if (!existing) {
      await dbOperations.addImage({
        sourceId: arasaacId.toString(),
        blob: blob,
        createdAt: new Date()
      });
    }
    return blob;
  } catch (error) {
    console.error("Errore caching immagine:", error);
    return null;
  }
};

const saveLocalImage = async (file) => {
  const uniqueId = 'local-' + crypto.randomUUID();
  await dbOperations.addImage({
    sourceId: uniqueId,
    blob: file,
    createdAt: new Date()
  });
  return uniqueId;
};

const getImageUrl = async (sourceId): Promise<string | null> => {
  if (!sourceId) return null;
  const idStr = sourceId.toString();
  if (idStr.startsWith('http')) return idStr;
  if (idStr.startsWith('preset-')) return null;
  const record = await dbOperations.getImageBySourceId(idStr);
  if (record && record.blob) {
    return URL.createObjectURL(record.blob);
  }
  return null;
};

/**
 * ==========================================
 * UTILITIES: IMAGE PROCESSING (AI & CANVAS)
 * ==========================================
 */

// Funzione helper per ritagliare l'immagine (FIXED per Android/Base64)
const getCroppedImg = (imageSrc: string, pixelCrop): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    // FIX CRUCIALE: Usiamo crossOrigin SOLO se è un URL web remoto.
    // Se è "data:..." (Base64) o "blob:..." (Locale), NON dobbiamo metterlo, altrimenti Android blocca tutto.
    if (typeof imageSrc === 'string' && imageSrc.startsWith('http') && !imageSrc.includes('localhost')) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        image,
        -pixelCrop.x,
        -pixelCrop.y,
        image.width,
        image.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Errore creazione blob ritaglio"));
          return;
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
    };

    image.onerror = (error) => reject(new Error("Impossibile caricare l'immagine per il ritaglio."));
    image.src = imageSrc;
  });
};

// Funzione helper sicura per caricare immagini (FIXED)
const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    // FIX CRUCIALE: Idem come sopra, niente CORS per file locali
    if (typeof src === 'string' && src.startsWith('http') && !src.includes('localhost')) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error("Errore caricamento immagine (formato non supportato o errore rete)"));
    img.src = src;
  });
};


/**
 * Pipeline di elaborazione del pittogramma.
 *
 * 1. rimozione sfondo con RMBG-1.4 (opzionale, eseguita in un worker)
 * 2. ritaglio scelto dall'utente
 * 3. composizione su tela quadrata trasparente, con ombra opzionale
 *
 * A differenza della versione precedente non c'e' alcun passaggio intermedio in
 * JPEG e il modello viene caricato una volta sola per sessione.
 */
const processAdvancedImage = async (
  originalBlobUrl: string,
  cropArea: { x: number; y: number; width: number; height: number } | null,
  enableAI: boolean,
  enableShadow: boolean,
  aiOptions: { edgeMode?: EdgeMode; onProgress?: (p: RmbgProgress) => void } = {}
): Promise<Blob> => {
  const originalImgEl = await loadImageElement(originalBlobUrl);
  let sourceForCropping: CanvasImageSource & { width: number; height: number } = originalImgEl;

  if (enableAI) {
    // Un fallimento dell'AI non deve far perdere il lavoro all'utente:
    // proseguiamo con l'immagine originale e segnaliamo il problema a monte.
    sourceForCropping = await removeBackground(originalImgEl, aiOptions);
  }

  // 2. RITAGLIO SCELTO DALL'UTENTE (coordinate in pixel dell'immagine originale)
  let croppedCanvas: CanvasImageSource & { width: number; height: number } = sourceForCropping;
  if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
    const c = document.createElement('canvas');
    c.width = Math.round(cropArea.width);
    c.height = Math.round(cropArea.height);
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      sourceForCropping,
      -cropArea.x,
      -cropArea.y,
      sourceForCropping.width,
      sourceForCropping.height
    );
    croppedCanvas = c;
  }

  // 3. COMPOSIZIONE FINALE
  const size = 512;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = size;
  finalCanvas.height = size;
  const fCtx = finalCanvas.getContext('2d')!;
  fCtx.imageSmoothingQuality = 'high';
  fCtx.clearRect(0, 0, size, size);

  const scaleFactor = Math.min((size * 0.9) / croppedCanvas.width, (size * 0.9) / croppedCanvas.height);
  const w = croppedCanvas.width * scaleFactor;
  const h = croppedCanvas.height * scaleFactor;
  const x = (size - w) / 2;
  const y = (size - h) / 2;

  if (enableShadow) {
    fCtx.save();
    fCtx.translate(x + w / 2, y + h);
    fCtx.scale(1, 0.3);
    fCtx.transform(1, 0, -0.5, 1, 0, 0);
    fCtx.filter = 'blur(10px)';
    fCtx.fillStyle = 'rgba(0,0,0,0.4)';
    fCtx.fillRect(-w / 2, -h / 5, w, h / 3);
    fCtx.restore();
  }

  fCtx.drawImage(croppedCanvas, x, y, w, h);

  const blob = await new Promise<Blob | null>(resolve => finalCanvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error("Impossibile generare l'immagine finale.");
  return blob;
};

/**
 * ==========================================
 * COMPONENTS
 * ==========================================
 */

// --- SEARCH MODAL (AGGIORNATO CON IMPORT PROGETTI) ---
// --- SEARCH MODAL (FIX IMMAGINI ROTTE + ORDINE NUMERICO) ---
const SearchModal = ({ isOpen, onClose, onSelect, initialQuery = '', boards = [] }) => {
  const [query, setQuery] = useState(initialQuery);
  const [googleQuery, setGoogleQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('arasaac');
  const fileInputRef = useRef(null);
  const [editorImage, setEditorImage] = useState(null);
  const [tempFileName, setTempFileName] = useState('');

  // Stati per la navigazione avanzata "I Miei Progetti"
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  // STATO PER LE IMMAGINI "IDRATATE" (Visibili)
  const [viewItems, setViewItems] = useState([]);

  // STATO PER LA STORIA DELLE SELEZIONI (Numeri 1, 2, 3...)
  const [selectionHistory, setSelectionHistory] = useState([]);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setQuery(initialQuery);
      setActiveTab('arasaac');
      searchArasaac(initialQuery);
    } else if (isOpen) {
      setQuery('');
      setResults([]);
      // Reset navigazione
      setSelectedBoard(null);
      setSelectedPageIndex(0);
      setSelectionHistory([]);
      setViewItems([]);
    }
  }, [isOpen, initialQuery]);

  // --- EFFETTO PER CARICARE LE IMMAGINI DEI PROGETTI (FIX DEFINITIVO) ---
  useEffect(() => {
    const hydrateImages = async () => {
      if (!selectedBoard) {
        setViewItems([]);
        return;
      }

      // 1. Recupera gli items grezzi
      let rawItems = [];
      if (selectedBoard.type === 'grid') {
        rawItems = (selectedBoard.pages && selectedBoard.pages[selectedPageIndex])
          ? selectedBoard.pages[selectedPageIndex].items
          : [];
      } else {
        rawItems = selectedBoard.items || [];
      }

      // 2. IDRATAZIONE FORZATA: Ignoriamo item.imageUrl se è vecchio.
      // Richiediamo SEMPRE una URL fresca dal DB (getImageUrl lo fa gratis se è un blob).
      const hydrated = await Promise.all(rawItems.map(async (item) => {
        // Se non ha sourceId (es. preset), imageUrl resterà null/undefined, ed è corretto.
        // Se ha sourceId, otteniamo un blob URL valido per QUESTA sessione.
        const freshUrl = item.sourceId ? await getImageUrl(item.sourceId) : item.imageUrl;

        return {
          ...item,
          imageUrl: freshUrl
        };
      }));

      setViewItems(hydrated);
    };

    hydrateImages();
  }, [selectedBoard, selectedPageIndex]);
  // -------------------------------------------------------------------------

  if (!isOpen) return null;

  const searchArasaac = async (term?: string) => {
    const q = term || query;
    if (!q) return;
    setLoading(true);
    try {
      const response = await fetch(`https://api.arasaac.org/api/pictograms/it/search/${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setResults([]); } finally { setLoading(false); }
  };

  const searchWikimedia = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=20&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
      const response = await fetch(url);
      const data = await response.json();
      const images = [];
      if (data.query && data.query.pages) {
        Object.values(data.query.pages).forEach((page) => {
          if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url && page.imageinfo[0].mime.startsWith('image/')) {
            images.push({ _id: page.pageid, url: page.imageinfo[0].url, title: page.title.replace('File:', '') });
          }
        });
      }
      setResults(images);
    } catch (e) { setResults([]); } finally { setLoading(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempFileName(file.name.split('.')[0]);
      setEditorImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // --- SELEZIONE FINALE ---
  // --- IN SEARCHMODAL: handleSelect (Versione Pulita) ---
  const handleSelect = async (item, source) => {
    if (source !== 'boardItem' && source !== 'preset') setLoading(true);

    let imageUrl = '';
    let sourceId = '';
    let dominantColor = null;

    if (source === 'arasaac') {
      imageUrl = `https://api.arasaac.org/api/pictograms/${item._id}?download=false`;
      sourceId = item._id.toString();
      await cacheArasaacImage(imageUrl, item._id);
    } else if (source === 'wikimedia') {
      imageUrl = item.url;
      sourceId = `wiki-${item._id}`;
      await cacheArasaacImage(imageUrl, sourceId);
    } else if (source === 'boardItem') {
      imageUrl = item.imageUrl;
      sourceId = item.sourceId;
      dominantColor = item.dominantColor;
    } else if (source === 'preset') {
      sourceId = `preset-${item.id}`;
    }

    if (source !== 'boardItem' && source !== 'preset') {
      const blobUrl = await getImageUrl(sourceId);
      dominantColor = await getDominantColor(blobUrl);
      imageUrl = blobUrl;
    }

    onSelect({
      id: crypto.randomUUID(),
      sourceId: sourceId,
      label: item.label || (item.keywords ? item.keywords[0]?.keyword : (item.title || query)),
      imageUrl: imageUrl,
      dominantColor: dominantColor,
      iconId: item.iconId || (source === 'preset' ? item.id : undefined),
      completed: false
    });

    setLoading(false);

    if (!initialQuery) {
      // MODALITÀ AGGIUNTA
      const trackId = item.id || item._id || ('preset-' + item.id);
      setSelectionHistory(prev => [...prev, trackId]);
    } else {
      onClose();
    }
  };

  const handleEditorSave = async (processedBlob) => {
    setLoading(true);
    const uniqueId = 'local-' + crypto.randomUUID();
    await dbOperations.addImage({
      sourceId: uniqueId,
      blob: processedBlob,
      createdAt: new Date()
    });
    const blobUrl = await getImageUrl(uniqueId);
    onSelect({ id: crypto.randomUUID(), sourceId: uniqueId, label: tempFileName, imageUrl: blobUrl, completed: false });
    setLoading(false); setEditorImage(null); onClose();
  };

  const handleUrlSubmit = async () => {
    if (!urlInput) return;
    setLoading(true);
    onSelect({ id: crypto.randomUUID(), sourceId: urlInput, label: googleQuery || 'Web', imageUrl: urlInput, completed: false });
    setLoading(false); onClose();
  };

  const handlePresetSelect = (preset) => handleSelect(preset, 'preset');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header Modale */}
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cerca Immagine</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-2 gap-2 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto">
          {['arasaac', 'presets', 'boards', 'wikimedia', 'local', 'web'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setResults([]); if (tab !== 'arasaac') setQuery(''); }} className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
              {tab === 'presets' ? 'Icone' : tab === 'arasaac' ? 'Simboli' : tab === 'boards' ? 'I Miei Progetti' : tab === 'wikimedia' ? 'Foto Reali' : tab === 'local' ? 'Galleria' : 'Link'}
            </button>
          ))}
        </div>

        {/* Contenuto Principale */}
        <div className="flex-1 overflow-y-auto p-4">

          {(activeTab === 'arasaac' || activeTab === 'wikimedia') && (
            <>
              <div className="flex gap-2 mb-4">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'arasaac' ? searchArasaac() : searchWikimedia())} placeholder={activeTab === 'arasaac' ? "Cerca simbolo..." : "Cerca foto..."} className="flex-1 px-4 py-2 rounded-lg border dark:bg-slate-700 dark:text-white" autoFocus />
                <button onClick={() => activeTab === 'arasaac' ? searchArasaac() : searchWikimedia()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><Search className="w-4 h-4" /></button>
              </div>
              {loading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {results.map((item) => {
                    const trackId = item._id;
                    const selectionIndex = selectionHistory.lastIndexOf(trackId);
                    const isSelected = selectionIndex !== -1;

                    return (
                      <button
                        key={item._id}
                        onClick={() => handleSelect(item, activeTab)}
                        className={`group aspect-square p-2 border rounded-lg overflow-hidden relative transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-500 bg-white'}`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-in zoom-in">
                            {selectionHistory.filter(id => id === trackId).length > 1 ? selectionHistory.length : selectionIndex + 1}
                          </div>
                        )}
                        <img src={activeTab === 'arasaac' ? `https://api.arasaac.org/api/pictograms/${item._id}?download=false` : item.url} className="w-full h-full object-contain" />
                        <span className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-[10px] truncate px-1">{item.keywords ? item.keywords[0]?.keyword : item.title}</span>
                      </button>
                    )
                  })}
                  {results.length === 0 && query && !loading && <p className="col-span-full text-center text-slate-400">Nessun risultato.</p>}
                </div>
              )}
            </>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {PRESET_ICONS.map((preset) => {
                const trackId = `preset-${preset.id}`;
                const selectionIndex = selectionHistory.indexOf(trackId);
                const isSelected = selectionIndex !== -1;

                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`aspect-square flex flex-col items-center justify-center p-2 rounded-xl border transition-all group relative ${preset.style.bg} ${preset.style.border} ${isSelected ? 'ring-4 ring-blue-400 scale-95' : 'hover:scale-105'}`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-20 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-in zoom-in">
                        {selectionIndex + 1}
                      </div>
                    )}
                    <preset.icon className={`w-8 h-8 mb-2 ${preset.style.icon}`} />
                    <span className="text-xs font-bold text-slate-700 truncate w-full text-center">{preset.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* TAB 3: I MIEI PROGETTI */}
          {activeTab === 'boards' && (
            <div className="h-full flex flex-col">
              {/* Livello 1: Selezione Progetto */}
              {!selectedBoard && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Scegli da dove copiare:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {boards.filter(b => b.type === 'grid' || b.type === 'sequence').map(b => (
                      <button key={b.id} onClick={() => { setSelectedBoard(b); setSelectedPageIndex(0); }} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors">
                        <div className={`p-2 rounded-lg ${b.type === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {b.type === 'grid' ? <LayoutGrid className="w-5 h-5" /> : <ListOrdered className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{b.title}</div>
                          <div className="text-xs text-slate-500">{new Date(b.updatedAt).toLocaleDateString()}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </button>
                    ))}
                    {boards.filter(b => b.type === 'grid' || b.type === 'sequence').length === 0 && (
                      <div className="text-center p-8 text-slate-400 border-2 border-dashed rounded-xl">Non hai ancora creato progetti di comunicazione.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Livello 2: Navigazione Items e Pagine */}
              {selectedBoard && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                    <button onClick={() => setSelectedBoard(null)} className="flex items-center gap-1 text-sm text-blue-600 font-bold px-2 py-1 hover:bg-blue-100 rounded">
                      <ArrowLeft className="w-4 h-4" /> Indietro
                    </button>

                    {selectedBoard.type === 'grid' && selectedBoard.pages && selectedBoard.pages.length > 1 ? (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={selectedPageIndex === 0}
                          onClick={() => setSelectedPageIndex(prev => Math.max(0, prev - 1))}
                          className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-bold uppercase text-slate-500">
                          {selectedBoard.pages[selectedPageIndex].name} ({selectedPageIndex + 1}/{selectedBoard.pages.length})
                        </span>
                        <button
                          disabled={selectedPageIndex >= selectedBoard.pages.length - 1}
                          onClick={() => setSelectedPageIndex(prev => Math.min(selectedBoard.pages.length - 1, prev + 1))}
                          className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{selectedBoard.title}</span>
                    )}
                  </div>

                  {/* Griglia Items IDRATATI */}
                  <div className="flex-1 overflow-y-auto min-h-[300px]">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {(!viewItems || viewItems.length === 0) ? (
                        <div className="col-span-full text-center text-slate-400 py-10">
                          {selectedBoard ? "Caricamento immagini..." : "Pagina vuota."}
                        </div>
                      ) : (
                        viewItems.map(item => {
                          // Gestione Numero Selezione
                          const trackId = item.id;
                          const selectionIndex = selectionHistory.indexOf(trackId);
                          const isSelected = selectionIndex !== -1;

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSelect(item, 'boardItem')}
                              className={`aspect-square p-2 border-2 rounded-xl flex flex-col items-center justify-center bg-white dark:bg-slate-700 transition-all duration-200 relative ${isSelected ? 'border-blue-500 bg-blue-50 scale-95' : 'hover:border-blue-500 hover:shadow-md'}`}
                            >
                              {/* Pallino Numerato */}
                              {isSelected && (
                                <div className="absolute top-1 right-1 z-10 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-in zoom-in">
                                  {selectionIndex + 1}
                                </div>
                              )}

                              <div className="w-full h-2/3 flex items-center justify-center overflow-hidden mb-1">
                                {/* Ora item.imageUrl è garantito dall'useEffect */}
                                {item.imageUrl ? <img src={item.imageUrl} className="max-w-full max-h-full object-contain" /> : item.iconId ? (() => { const IconComp = getIconComponent(item.iconId); return <IconComp className="w-8 h-8" /> })() : <div className="text-xs text-slate-300">No IMG</div>}
                              </div>
                              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full text-center">{item.label}</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'local' && <div className="flex flex-col items-center justify-center h-full gap-4 py-10 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50"><div className="p-4 bg-blue-100 rounded-full text-blue-600"><Upload className="w-8 h-8" /></div><p className="text-sm font-medium">Carica foto dal dispositivo</p><input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} /><button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Scegli File</button></div>}

          {activeTab === 'web' && (
            <div className="p-4 space-y-4">
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Incolla qui l'URL dell'immagine..." className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:text-white" />
              <input type="text" value={googleQuery} onChange={(e) => setGoogleQuery(e.target.value)} placeholder="Nome opzionale (etichetta)" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:text-white" />
              <button onClick={handleUrlSubmit} disabled={!urlInput} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold disabled:opacity-50">Usa Immagine</button>
            </div>
          )}
        </div>

        <ImageEditorModal
          isOpen={!!editorImage}
          imageSrc={editorImage}
          onClose={() => setEditorImage(null)}
          onSave={handleEditorSave}
        />
      </div>
    </div>
  );
};

// --- IMAGE EDITOR MODAL (TRANSFORMERS.JS) ---
// --- IMAGE EDITOR MODAL (VERSIONE FINALE BASE64) ---
const ImageEditorModal = ({ isOpen, onClose, imageSrc, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [addShadow, setAddShadow] = useState(true);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('normale');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<RmbgProgress | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Reset
  useEffect(() => {
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setAiError(null);
  }, [imageSrc]);

  // Avviamo il download del modello appena l'editor si apre con l'AI attiva:
  // quando l'utente preme "Salva" spesso e' gia' pronto.
  useEffect(() => {
    if (isOpen && removeBg) preloadRmbg();
  }, [isOpen, removeBg]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen || !imageSrc) return null;

  const handleSave = async () => {
    setProcessing(true);
    setAiError(null);
    setProgress(null);
    try {
      let finalBlob: Blob;
      try {
        finalBlob = await processAdvancedImage(imageSrc, croppedAreaPixels, removeBg, addShadow, {
          edgeMode,
          onProgress: setProgress,
        });
      } catch (aiErr) {
        if (!removeBg) throw aiErr;
        // L'AI puo' fallire (memoria, GPU, rete al primo uso): salviamo comunque
        // l'immagine ritagliata invece di far perdere il lavoro all'utente.
        console.error('Rimozione sfondo fallita, salvo senza AI:', aiErr);
        setAiError((aiErr as Error)?.message || 'Motore AI non disponibile');
        finalBlob = await processAdvancedImage(imageSrc, croppedAreaPixels, false, addShadow);
      }
      onSave(finalBlob);
      onClose();
    } catch (e) {
      console.error(e);
      setAiError("Errore elaborazione: " + (e as Error).message);
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const progressLabel = !progress
    ? 'Elaborazione...'
    : progress.phase === 'download'
      ? `Scarico il modello AI${progress.progress != null ? ` ${Math.round(progress.progress * 100)}%` : '...'}`
      : progress.phase === 'init'
        ? 'Avvio motore AI...'
        : progress.phase === 'infer'
          ? 'Ritaglio del soggetto...'
          : 'Elaborazione...';

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-0 md:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl overflow-hidden flex flex-col relative">

        {/* HEADER */}
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0 z-20">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <CropIcon className="w-5 h-5" /> Editor Immagine
          </h3>
          <button onClick={onClose} disabled={processing} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* AREA DI RITAGLIO - Layout sicuro per Android */}
        <div className="relative flex-1 w-full bg-slate-950 overflow-hidden min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            objectFit="contain"
            restrictPosition={false}
            minZoom={0.5}
            maxZoom={3}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            style={{
              containerStyle: { width: '100%', height: '100%', backgroundColor: '#020617' },
              mediaStyle: { maxWidth: 'none' }
            }}
          />
        </div>

        {/* CONTROLLI */}
        <div className="p-4 space-y-4 shrink-0 bg-white dark:bg-slate-800 z-20 border-t dark:border-slate-700 overflow-y-auto max-h-[40vh] pb-safe">
          <div className="space-y-2">
            <div className="flex justify-between px-1">
              <label className="text-xs font-bold uppercase text-slate-500">Zoom</label>
              <span className="text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
            </div>
            <input type="range" value={zoom} min={0.5} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>

          <div className="flex flex-col gap-3">
            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${removeBg ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="checkbox" checked={removeBg} onChange={() => setRemoveBg(!removeBg)} className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-blue-500" />
              <div className="flex-1">
                <div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white"><Wand2 className="w-4 h-4 text-blue-500" /> Rimuovi Sfondo (AI)</div>
                {removeBg && (
                  <>
                    <div className="mt-2 text-[11px] leading-tight p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 rounded-lg flex gap-2">
                      <span className="text-base">⚡</span>
                      <div><strong>Elaborazione sul dispositivo:</strong> nessuna immagine lascia il tablet. Il primo utilizzo scarica il modello (~44 MB), poi funziona anche offline.</div>
                    </div>
                    <div className="mt-3" onClick={(e) => e.preventDefault()}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rifinitura bordi</span>
                      <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                        {(['morbido', 'normale', 'netto'] as EdgeMode[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEdgeMode(m); }}
                            className={`px-2 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${edgeMode === m ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${addShadow ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="checkbox" checked={addShadow} onChange={() => setAddShadow(!addShadow)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <div className="flex-1"><div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white"><Layers className="w-4 h-4 text-indigo-500" /> Aggiungi Ombra</div></div>
            </label>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0 z-20 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {aiError && (
            <p role="alert" className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-2">
              Sfondo non rimosso ({aiError}). L'immagine è stata salvata comunque.
            </p>
          )}
          {processing && (
            <div className="mb-3" aria-live="polite">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                <span>{progressLabel}</span>
                {progress?.progress != null && <span>{Math.round(progress.progress * 100)}%</span>}
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-blue-600 transition-[width] duration-200 ${progress?.progress == null ? 'animate-pulse w-full' : ''}`}
                  style={progress?.progress != null ? { width: `${Math.round(progress.progress * 100)}%` } : undefined}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} disabled={processing} className="px-4 py-3 min-h-[44px] text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50">Annulla</button>
            <button onClick={handleSave} disabled={processing} className="px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg">{processing ? progressLabel : "Salva"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CONTROLLI VOCE ---
// Voce e velocità sono preferenze del dispositivo (non del singolo progetto):
// un logopedista che usa lo stesso tablet con più bambini le imposta una volta.
const VoiceControls = ({ enabled, onToggle }) => {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceUri, setVoiceUri] = useState<string>(() => getPreferredVoice() || '');
  const [rate, setRateState] = useState<number>(() => getRate());
  const supported = isSpeechSupported();

  useEffect(() => {
    if (open && supported && voices.length === 0) listVoices().then(setVoices);
  }, [open, supported, voices.length]);

  if (!supported) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
        <button
          onClick={onToggle}
          aria-pressed={enabled}
          title={enabled ? 'Voce attiva: tocca per disattivare' : 'Voce disattivata: tocca per attivare'}
          className={`flex items-center gap-2 px-3 py-2 min-h-touch rounded-md text-sm font-bold transition-colors ${enabled ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Volume2 className="w-4 h-4" /> Voce
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Impostazioni della voce"
          aria-expanded={open}
          className="p-2 min-h-touch min-w-touch flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <label htmlFor="voce-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Voce</label>
            <select
              id="voce-select"
              value={voiceUri}
              onChange={(e) => { setVoiceUri(e.target.value); setPreferredVoice(e.target.value || null); }}
              className="w-full px-2 py-2 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            >
              <option value="">Voce predefinita del dispositivo</option>
              {voices.map((v) => (<option key={v.uri} value={v.uri}>{v.name} ({v.lang})</option>))}
            </select>
            {voices.length === 0 && <p className="mt-1 text-[11px] text-slate-400">Nessuna voce italiana trovata: verrà usata quella di sistema.</p>}
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <label htmlFor="voce-velocita">Velocità</label>
              <span>{rate.toFixed(2)}×</span>
            </div>
            <input
              id="voce-velocita"
              type="range" min={0.5} max={1.5} step={0.05} value={rate}
              onChange={(e) => { const r = Number(e.target.value); setRateState(r); setRate(r); }}
              className="w-full accent-blue-600"
            />
          </div>
          <button
            onClick={() => speak('Ciao, questa è la voce scelta.')}
            className="w-full px-3 py-2 min-h-touch rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
          >
            Prova la voce
          </button>
        </div>
      )}
    </div>
  );
};

// --- CARD COMPONENT (AGGIORNATO CON EVIDENZIAZIONE) ---
const PictogramCard = ({
  item,
  onRemove,
  onEditLabel,
  onReplaceImage,
  mode,
  isLocked,
  isActive,
  onClick,
  onToggleComplete = undefined,
  orientation = undefined,
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(item.label);

  const saveLabel = () => {
    onEditLabel && onEditLabel(item.id, tempLabel);
    setIsEditing(false);
  };

  const isHorizontalSequence = mode === 'sequence' && orientation === 'horizontal';
  const isVerticalSequence = mode === 'sequence' && orientation === 'vertical';

  // Gestore del click principale
  const handleCardClick = () => {
    if (isLocked && onClick) {
      onClick(item.id); // Trigger dell'evidenziazione in modalità bambino
    } else if (!isLocked && onReplaceImage) {
      onReplaceImage(item.id); // Modifica immagine in modalità edit
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative group flex items-center p-3 rounded-xl shadow-sm border-2 transition-all duration-200
        ${/* LOGICA EVIDENZIAZIONE */ ''}
        ${isActive && isLocked ? 'ring-4 ring-blue-500 border-blue-600 scale-105 bg-blue-50 dark:bg-blue-900/30 z-10' : 'border-slate-200 dark:border-slate-700'}
        ${!isActive && isLocked ? 'hover:scale-[1.02] active:scale-95 cursor-pointer' : ''}
        ${item.completed ? 'bg-slate-100 border-slate-200 opacity-60 grayscale' : 'bg-white dark:bg-slate-800'}
        ${isVerticalSequence ? 'flex-row w-full h-24 gap-4' : 'flex-col'}
        ${isHorizontalSequence ? 'min-w-[140px] max-w-[140px] aspect-[4/5]' : ''}
        ${mode === 'grid' ? 'aspect-square flex-col' : ''}
        ${(mode === 'sequence' && !isLocked) ? 'hover:border-blue-400 cursor-grab active:cursor-grabbing hover:shadow-md' : ''}
      `}
    >
      {!isLocked && onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all z-10 shadow-sm">
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {mode === 'sequence' && (
        <button onClick={(e) => { e.stopPropagation(); onToggleComplete(item.id); }} className={`z-10 p-1 rounded-full bg-white dark:bg-slate-700 shadow-sm transition-colors ${isVerticalSequence ? 'mr-2' : 'absolute top-2 left-2'} ${item.completed ? 'text-green-600' : 'text-slate-300 hover:text-green-500'}`}>
          <CheckCircle2 className={`w-6 h-6 ${item.completed ? 'fill-green-100' : ''}`} />
        </button>
      )}

      <div className={`flex items-center justify-center p-1 overflow-hidden relative pointer-events-none ${isVerticalSequence ? 'h-full aspect-square' : 'flex-1 w-full'}`}>
        {item.iconId ? (
          (() => {
            const IconComp = getIconComponent(item.iconId);
            const style = getPresetStyle(item.iconId);
            return (
              <div className={`w-full h-full rounded-full flex items-center justify-center ${style.bg} ${style.border} border-2`}>
                <IconComp className={`w-2/3 h-2/3 ${style.icon}`} />
              </div>
            );
          })()
        ) : item.imageUrl ? (
          <img src={item.imageUrl} alt={item.label} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-lg">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {!isLocked && onReplaceImage && <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><RotateCcw className="text-white w-6 h-6 drop-shadow-md" /></div>}
      </div>

      <div className={`text-center ${isVerticalSequence ? 'flex-1 text-left px-2' : 'mt-2 w-full min-h-[1.5em]'}`}>
        {isEditing && !isLocked && onEditLabel ? (
          <input type="text" value={tempLabel} onClick={(e) => e.stopPropagation()} onChange={(e) => setTempLabel(e.target.value)} onBlur={saveLabel} onKeyDown={(e) => e.key === 'Enter' && saveLabel()} className="w-full text-sm font-bold bg-blue-50 dark:bg-slate-600 rounded px-1 outline-none border border-blue-300" autoFocus />
        ) : (
          <p onClick={(e) => { if (!isLocked && onEditLabel) { e.stopPropagation(); setIsEditing(true); } }} className={`font-bold uppercase tracking-wide truncate ${!isLocked && onEditLabel ? 'cursor-text hover:text-blue-600 dark:hover:text-blue-400' : ''} ${item.completed ? 'line-through decoration-2 text-slate-400' : 'text-slate-800 dark:text-slate-200'} ${isVerticalSequence ? 'text-xl' : 'text-sm md:text-base'}`}>{item.label}</p>
        )}
      </div>
    </div>
  );
};

// --- HELP MODAL COMPONENT ---
// --- HELP MODAL COMPONENT (COMPLETO CON ISTRUZIONI TIMER) ---
const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="p-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manuale Istruzioni</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Guida alle funzionalità v1.3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 text-slate-700 dark:text-slate-300">

          {/* 1. GLI STRUMENTI CLINICI */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              1. Gli Strumenti a Disposizione
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-slate-700/30 border border-blue-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-bold">
                  <LayoutGrid className="w-5 h-5" /> Comunicazione
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  Tabelle a griglia con simboli. Supporta più pagine e navigazione per categorie.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-slate-700/30 border border-emerald-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <ListOrdered className="w-5 h-5" /> Agenda Visiva
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  Routine giornaliere o sequenze. Spunta le azioni completate <CheckCircle2 className="w-3 h-3 inline" />.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-slate-700/30 border border-amber-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300 font-bold">
                  <Trophy className="w-5 h-5" /> Token Economy
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  Rinforzo a gettoni con premio finale.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-pink-50/50 dark:bg-slate-700/30 border border-pink-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-pink-700 dark:text-pink-300 font-bold">
                  <Book className="w-5 h-5" /> Storia Sociale
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  Narrazioni con simboli automatici (stile SymWriter) pronte per la stampa.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-slate-700/30 border border-indigo-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-bold">
                  <Scissors className="w-5 h-5" /> Costruttore PECS
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  Crea griglie di etichette su misura (cm) da stampare e ritagliare.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-cyan-50/50 dark:bg-slate-700/30 border border-cyan-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-cyan-700 dark:text-cyan-300 font-bold">
                  <Timer className="w-5 h-5" /> Timer Visivo
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  Conto alla rovescia "liquido" per rendere tangibile il passaggio del tempo.
                </p>
              </div>
            </div>
          </section>

          {/* 2. MODALITÀ GENITORE VS BAMBINO */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              2. Modalità d'Uso (Il Lucchetto)
            </h4>
            <div className="flex flex-col md:flex-row gap-6">

              {/* EDIT MODE */}
              <div className="flex-1 flex gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl h-min">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white mb-2">Modalità Modifica (Aperto)</h5>
                  <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 text-xs font-bold mt-0.5">1</span>
                      <span><strong>Aggiungi:</strong> Usa il tasto <Plus className="w-3 h-3 inline" /> per inserire nuovi simboli.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 text-xs font-bold mt-0.5">2</span>
                      <span><strong>Sposta (Drag & Drop):</strong> Tieni premuto un simbolo e trascinalo. Una <span className="text-blue-500 font-bold">linea blu</span> apparirà per indicarti esattamente dove verrà inserito.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 text-xs font-bold mt-0.5">3</span>
                      <span><strong>Modifica:</strong> Tocca un'immagine per cambiarla o il testo per riscriverlo.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* KID MODE */}
              <div className="flex-1 flex gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl h-min">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white mb-2">Modalità Bambino (Chiuso)</h5>
                  <p className="text-sm mb-2">
                    L'interfaccia si blocca per evitare modifiche accidentali.
                  </p>
                  <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300 list-disc pl-4">
                    <li>Le immagini <strong>non si spostano</strong> più.</li>
                    <li>Toccando un simbolo, questo viene <strong>evidenziato</strong> o spuntato (Agenda).</li>
                    <li>Ideale per l'utilizzo quotidiano.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 2-bis. VOCE E STRISCIA DI FRASE */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              3. Voce e Striscia di Frase
            </h4>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Con la <strong>modalità bambino attiva</strong> (lucchetto chiuso), toccare un simbolo lo fa
                pronunciare ad alta voce. Nei comunicatori a griglia i simboli toccati si accodano anche nella
                <strong> striscia di frase</strong> in alto: il tasto <Volume2 className="w-4 h-4 inline mx-0.5" /> legge
                l'intera frase costruita.
              </p>
              <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-4">
                <li><strong>Attivare o spegnere la voce:</strong> pulsante "Voce" nella barra degli strumenti (visibile in modalità modifica).</li>
                <li><strong>Scegliere voce e velocità:</strong> icona ingranaggio accanto a "Voce". Una velocità più bassa (0,7–0,9×) aiuta la comprensione.</li>
                <li><strong>Correggere la frase:</strong> la freccia indietro toglie l'ultimo simbolo, il cestino svuota tutto.</li>
              </ul>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La sintesi vocale usa le voci già installate sul dispositivo e funziona anche senza connessione.
                Su iPhone e iPad si possono scaricare voci italiane migliori da Impostazioni → Accessibilità → Contenuto pronunciato.
              </p>
            </div>
          </section>

          {/* 4. SFONDO AI */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              4. Ritagliare lo Sfondo dalle Foto (AI)
            </h4>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Quando si carica una foto dalla galleria, l'editor propone <strong>Rimuovi Sfondo (AI)</strong>.
                Il soggetto viene isolato e il risultato somiglia a un pittogramma, uniforme con i simboli ARASAAC.
              </p>
              <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-4">
                <li><strong>Tutto sul dispositivo:</strong> nessuna foto viene inviata su internet. Al primo utilizzo l'app scarica il modello (circa 44 MB), poi funziona anche offline.</li>
                <li><strong>Rifinitura bordi:</strong> <em>morbido</em> conserva capelli e contorni sfumati; <em>normale</em> va bene quasi sempre; <em>netto</em> elimina gli aloni sui contorni definiti.</li>
                <li>Se il ritaglio non riesce, l'immagine viene comunque salvata senza rimozione dello sfondo.</li>
              </ul>
            </div>
          </section>

          {/* 5. RICERCA E AGGIUNTA VELOCE */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              5. Ricerca Immagini & Trucchi
            </h4>

            {/* Box Multi Selezione */}
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex gap-4 items-start">
              <div className="bg-indigo-100 dark:bg-indigo-800 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-300 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h5 className="font-bold text-indigo-900 dark:text-indigo-100 text-base">Novità: Inserimento Multiplo Veloce</h5>
                <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1 leading-relaxed">
                  Non devi aggiungere un simbolo alla volta! Quando cerchi le immagini, <strong>clicca su tutte quelle che ti servono</strong>.
                  Vedrai apparire dei numeri blu <strong>(1, 2, 3...)</strong> sulle card selezionate.
                  Quando hai finito, chiudi la finestra e verranno aggiunte tutte insieme nella tua griglia, nell'ordine in cui le hai scelte.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-700 rounded-lg border dark:border-slate-600 flex flex-col gap-1">
                <span className="font-bold text-blue-600 dark:text-blue-400">Arasaac & Wiki</span>
                <span>Simboli standard e foto reali.</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-700 rounded-lg border dark:border-slate-600 flex flex-col gap-1">
                <span className="font-bold text-purple-600 dark:text-purple-400">I Miei Progetti</span>
                <span>Copia velocemente simboli da altri comunicatori che hai già creato.</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-700 rounded-lg border dark:border-slate-600 flex flex-col gap-1">
                <span className="font-bold text-orange-600 dark:text-orange-400">Galleria & Web</span>
                <span>Carica foto dal tuo dispositivo o incolla link da Google.</span>
              </div>
            </div>
          </section>

          {/* 4. TIMER VISIVO */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              6. Timer Visivo
            </h4>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-xl border border-cyan-100 dark:border-cyan-800 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Strumento fondamentale per gestire le attese e i turni. Il tempo è rappresentato da un "liquido" che si svuota, rendendo il concetto astratto del tempo visibile e concreto.
              </p>
              <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-4">
                <li>
                  <strong>Imposta il Tempo:</strong> Clicca direttamente sui numeri del display (es. "05") per scrivere i minuti o i secondi con la tastiera, oppure usa le freccette e i tasti rapidi (es. +10s, 5 min).
                </li>
                <li>
                  <strong>Scegli il Suono:</strong> Dal menu a tendina in alto, seleziona il suono che verrà riprodotto allo scadere del tempo (es. Campanella, Beep, Telefono).
                </li>
                <li>
                  <strong>Immagine Motivante:</strong> Clicca al centro del cerchio liquido per scegliere un'immagine o un'icona (es. il premio finale o l'attività successiva). L'immagine verrà rivelata man mano che il tempo passa.
                </li>
              </ul>
            </div>
          </section>

          {/* 5. GESTIONE DATI */}
          <section className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-700 dark:text-slate-300">
              <Save className="w-4 h-4" /> Salvataggio e Backup
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              L'app salva tutto in automatico nel tuo dispositivo. Tuttavia, è buona norma fare dei backup regolari.
            </p>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1 text-blue-600"><Download className="w-3 h-3" /> Esporta Backup (file .json)</span>
              <span className="flex items-center gap-1 text-green-600"><UploadIcon className="w-3 h-3" /> Importa Backup</span>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:scale-105 transition-all">
            Ho capito, iniziamo!
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE TIMER VISIVO AVANZATO (FIX LOOP E POSIZIONE) ---
// --- SOTTOCOMPONENTE INPUT (Super Compatto per Mobile) ---
const TimeInput = ({ value, onChange, onFocus, onBlur, label, type, onArrowClick }) => {
  return (
    <div className="flex flex-col items-center gap-0.5 group">
      {/* Freccia Su */}
      <button
        onClick={() => onArrowClick(type, 1)}
        aria-label={type === 'min' ? 'Aumenta i minuti' : 'Aumenta i secondi'}
        className="w-full h-9 flex items-center justify-center rounded-t-md bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 text-slate-500 dark:text-slate-300 hover:text-blue-700 transition-colors active:bg-blue-200"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      {/* Campo Input (Ridotto font e width) */}
      <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-0.5 py-1 rounded-lg w-12 md:w-[4.5rem] text-center shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onFocus={onFocus}
          onChange={(e) => onChange(type, e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }}
          className="w-full bg-transparent text-center text-xl md:text-3xl font-mono font-bold text-slate-700 dark:text-white outline-none appearance-none p-0 leading-none placeholder-slate-200"
          placeholder="00"
          autoComplete="off"
        />
        {/* Label nascosta su mobile piccolissimo, visibile su desktop */}
        <span className="hidden md:block absolute top-1/2 -translate-y-1/2 -right-2 text-slate-300 font-bold text-xl pointer-events-none">{label}</span>
      </div>

      {/* Freccia Giù */}
      <button
        onClick={() => onArrowClick(type, -1)}
        aria-label={type === 'min' ? 'Riduci i minuti' : 'Riduci i secondi'}
        className="w-full h-9 flex items-center justify-center rounded-b-md bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 text-slate-500 dark:text-slate-300 hover:text-blue-700 transition-colors active:bg-blue-200"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- ICONE E COMPONENTI SET TIMER MOUSE ---
const CheeseWedge = ({ isEaten, isEating }: { isEaten: boolean, isEating: boolean }) => {
  if (isEaten) {
    return (
      <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 opacity-30 drop-shadow-none">
        <circle cx="30" cy="30" r="8" fill="#D1D5DB" />
        <circle cx="70" cy="60" r="5" fill="#D1D5DB" />
        <circle cx="40" cy="80" r="6" fill="#D1D5DB" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full p-1 md:p-2 transition-all duration-300 ${isEating ? 'scale-90 animate-pulse drop-shadow-none -rotate-3' : 'scale-100 hover:scale-105 drop-shadow-md'}`}
    >
      <path d="M15 80 L85 80 Q95 80 95 70 L75 25 Q70 15 60 15 L20 25 Q10 25 10 35 Z" fill="#FBBF24" />
      <path d="M15 80 L85 80 Q95 80 95 70 L75 25 Q70 15 60 15 L20 25 Q10 25 10 35 Z" fill="none" stroke="#D97706" strokeWidth="4" />
      <circle cx="35" cy="50" r="8" fill="#D97706" opacity="0.6" />
      <circle cx="65" cy="65" r="12" fill="#D97706" opacity="0.6" />
      <circle cx="45" cy="75" r="6" fill="#D97706" opacity="0.6" />
      <circle cx="55" cy="35" r="5" fill="#D97706" opacity="0.6" />
    </svg>
  );
};

const MouseCharacter = ({ isActive, facesLeft, isFinished }: { isActive: boolean, facesLeft: boolean, isFinished: boolean }) => {
  if (isFinished) {
    return <div className="text-4xl md:text-6xl animate-bounce leading-none mt-2">🐭🎉</div>;
  }
  return (
    <div className={`w-12 h-12 md:w-16 md:h-16 drop-shadow-xl transition-transform duration-700 ease-in-out origin-center ${facesLeft ? 'scale-x-[-1]' : 'scale-x-100'} ${isActive ? 'animate-bounce' : ''}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <path d="M 20 70 Q -10 90 0 40" fill="none" stroke="#FCA5A5" strokeWidth="5" strokeLinecap="round" className={isActive ? 'animate-pulse' : ''} />
        <ellipse cx="45" cy="70" rx="30" ry="20" fill="#9CA3AF" />
        <circle cx="70" cy="45" r="14" fill="#6B7280" />
        <path d="M 40 50 Q 70 50 90 75 Q 60 90 40 90 Z" fill="#9CA3AF" />
        <circle cx="55" cy="50" r="16" fill="#9CA3AF" />
        <circle cx="55" cy="50" r="8" fill="#FCA5A5" />
        <circle cx="75" cy="65" r="3" fill="#1F2937" />
        <circle cx="92" cy="75" r="5" fill="#EF4444" />
        <path d="M 85 75 L 100 65 M 85 77 L 105 77 M 85 79 L 100 89" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// --- COMPONENTE TIMER VISIVO PRINCIPALE (Mobile Fit) ---
const VisualTimer = ({ settings, onUpdateSettings, onSelectImage, customSounds = [], onAddCustomSound }) => {
  const [timeLeft, setTimeLeft] = useState(settings.duration || 60);
  const [isActive, setIsActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  // Stati Input
  const [inputMin, setInputMin] = useState("01");
  const [inputSec, setInputSec] = useState("00");
  const [activeField, setActiveField] = useState(null);

  // Input Preset custom
  const [newMin, setNewMin] = useState("");
  const [newSec, setNewSec] = useState("");

  const audioRef = useRef(null);
  const isDark = document.documentElement.classList.contains('dark');
  const presets = settings.presets || [60, 180, 300, 600];

  const getProgressColorHex = (pct) => {
    if (pct > 50) return '#10b981'; // emerald-500
    if (pct > 20) return '#facc15'; // yellow-400
    return '#ef4444';             // red-500
  };

  const getBackgroundColor = () => {
    let color = null;
    if (settings.timerImage?.iconId) {
      const preset = PRESET_ICONS.find(p => p.id === settings.timerImage.iconId);
      if (preset && preset.rgb) color = preset.rgb;
    } else if (settings.timerImage?.dominantColor) {
      color = settings.timerImage.dominantColor;
    }
    if (color) return `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`;
    return isDark ? '#1e293b' : '#f1f5f9';
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
    }
    setIsRinging(false);
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsRinging(true);
      if (audioRef.current) {
        const soundId = settings.soundId || 'digital';
        const customObj = customSounds.find((s: any) => s.id === soundId);
        const soundObj = customObj || TIMER_SOUNDS.find(s => s.id === soundId) || TIMER_SOUNDS[0];
        audioRef.current.src = soundObj.url;
        audioRef.current.loop = true;
        audioRef.current.play().catch((e: any) => console.log("Audio blocked", e));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, settings.soundId]);

  useEffect(() => {
    if (activeField === null) {
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      setInputMin(m);
      setInputSec(s);
    }
  }, [timeLeft, activeField]);

  const handleInputChange = (field, value) => {
    if (!/^\d{0,2}$/.test(value)) return;
    if (field === 'min') setInputMin(value);
    else setInputSec(value);
  };

  const commitTime = () => {
    const m = parseInt(inputMin || "0", 10);
    const s = parseInt(inputSec || "0", 10);
    const newTotal = (m * 60) + s;
    setTimeLeft(newTotal);
    if (!isActive) onUpdateSettings('duration', newTotal);
    setActiveField(null);
  };

  const handleArrowClick = (field, direction) => {
    let m = parseInt(inputMin || "0", 10);
    let s = parseInt(inputSec || "0", 10);
    if (field === 'min') { m = Math.max(0, m + direction); }
    else { s = s + direction; if (s > 59) { s = 0; m++; } if (s < 0) { if (m > 0) { s = 59; m--; } else s = 0; } }
    const newTotal = (m * 60) + s;
    setTimeLeft(newTotal);
    if (!isActive) onUpdateSettings('duration', newTotal);
  };

  const manualUpdateTime = (newTotal) => {
    const val = Math.max(0, newTotal);
    setTimeLeft(val);
    if (!isActive) onUpdateSettings('duration', val);
  };

  const toggleTimer = () => { if (isRinging) stopAudio(); else setIsActive(!isActive); };
  const resetTimer = () => { stopAudio(); setIsActive(false); setTimeLeft(settings.duration || 60); };

  const addPreset = () => {
    const m = parseInt(newMin) || 0;
    const s = parseInt(newSec) || 0;
    const total = (m * 60) + s;
    if (total > 0) {
      onUpdateSettings('presets', [...presets, total].sort((a, b) => a - b));
      setNewMin(""); setNewSec("");
    }
  };

  const percentage = Math.min(100, (timeLeft / (settings.duration || 1)) * 100);
  const currentColor = getProgressColorHex(percentage);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-0 animate-in fade-in">
      <audio ref={audioRef} preload="auto" />

      {/* HEADER CONTROLLI COMPATTI */}
      <div className="w-full bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 flex flex-col gap-3">

        <div className="flex flex-wrap justify-between items-start gap-2">

          {/* STILE DEL TIMER (Nuovo Selettore) */}
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 shrink-0">
            <button onClick={() => onUpdateSettings('timerStyle', 'liquid')} aria-label="Stile boccia liquida" aria-pressed={settings.timerStyle !== 'mouse'} className={`p-3 min-h-touch min-w-touch flex items-center justify-center rounded-lg transition-all ${settings.timerStyle !== 'mouse' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Boccia Liquida">
              <Timer className="w-5 h-5" />
            </button>
            <button onClick={() => onUpdateSettings('timerStyle', 'mouse')} aria-label="Stile topolino e formaggio" aria-pressed={settings.timerStyle === 'mouse'} className={`p-3 min-h-touch min-w-touch flex items-center justify-center rounded-lg transition-all ${settings.timerStyle === 'mouse' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`} title="Topolino e Formaggio">
              <Mouse className="w-5 h-5" />
            </button>
          </div>

          {/* BOX SINISTRA: Input Tempo e Play */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex gap-1 pr-2 border-r border-slate-200 dark:border-slate-700">
              <TimeInput value={inputMin} type="min" label=":" onFocus={() => setActiveField('min')} onBlur={commitTime} onChange={handleInputChange} onArrowClick={handleArrowClick} />
              <TimeInput value={inputSec} type="sec" label="" onFocus={() => setActiveField('sec')} onBlur={commitTime} onChange={handleInputChange} onArrowClick={handleArrowClick} />
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={toggleTimer} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95 ${isActive ? 'bg-amber-100 text-amber-600' : isRinging ? 'bg-red-600 text-white animate-bounce' : 'bg-green-500 text-white'}`}>
                {isRinging || isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button onClick={resetTimer} className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center active:bg-slate-100">
                <ResetIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BOX DESTRA: Suoni e Preset Rapidi */}
          <div className="w-full sm:flex-1 sm:w-auto min-w-0 flex flex-col items-stretch sm:items-end gap-2">
            <div className="w-full min-w-0 flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative">
              <Volume2 className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
              <select aria-label="Suono di fine timer" value={settings.soundId || 'digital'} onChange={(e) => onUpdateSettings('soundId', e.target.value)} className="min-w-0 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer py-2 w-full text-right truncate">
                <optgroup label="Predefiniti">
                  {TIMER_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
                {customSounds.length > 0 && (
                  <optgroup label="Personalizzati">
                    {customSounds.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </optgroup>
                )}
              </select>
              <button
                className="ml-1 p-2 min-h-touch min-w-touch flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg flex-shrink-0 hover:bg-blue-600 hover:text-white transition-colors"
                aria-label="Aggiungi un suono personalizzato"
                title="Aggiungi suono (mp3/ogg/wav)"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      const label = prompt("Inserisci il nome per questo suono:", file.name.split('.')[0]);
                      if (label) onAddCustomSound(file, label);
                    }
                  };
                  input.click();
                }}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="flex w-full gap-1">
              <button onClick={() => manualUpdateTime(Math.max(0, timeLeft - 10))} className="flex-1 py-2 min-h-touch bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold border border-red-200 dark:border-red-800 hover:bg-red-100 active:scale-95 transition-all">-10s</button>
              <button onClick={() => manualUpdateTime(timeLeft + 10)} className="flex-1 py-2 min-h-touch bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800 hover:bg-green-100 active:scale-95 transition-all">+10s</button>
            </div>
          </div>
        </div>

        {/* PRESET SCROLLABILI */}
        <div className="w-full border-t dark:border-slate-700 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full touch-pan-x">
            {presets.map(p => (
              <div key={p} className="relative group shrink-0">
                <button onClick={() => { stopAudio(); setIsActive(false); manualUpdateTime(p); }} className="px-3 py-2 min-h-touch bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all min-w-[56px]">
                  {Math.floor(p / 60)}:{(p % 60).toString().padStart(2, '0')}
                </button>
                <button onClick={() => onUpdateSettings('presets', presets.filter(val => val !== p))} aria-label={`Rimuovi preset ${Math.floor(p / 60)}:${(p % 60).toString().padStart(2, '0')}`} className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-red-600 border border-red-200 rounded-full p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-sm z-10"><X className="w-3 h-3" /></button>
              </div>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <input type="number" min="0" aria-label="Minuti del nuovo preset" placeholder="M" value={newMin} onChange={(e) => setNewMin(e.target.value)} className="w-9 py-2 bg-transparent text-center font-bold outline-none text-sm dark:text-white" />
              <span className="text-slate-400 text-sm">:</span>
              <input type="number" min="0" max="59" aria-label="Secondi del nuovo preset" placeholder="S" value={newSec} onChange={(e) => setNewSec(e.target.value)} className="w-9 py-2 bg-transparent text-center font-bold outline-none text-sm dark:text-white" />
              <button onClick={addPreset} aria-label="Aggiungi preset" className="p-2 min-h-touch min-w-touch flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER STILE TIMER */}
      {/* RENDER STILE TIMER */}
      {settings.timerStyle === 'mouse' ? (() => {
        const totalCheese = 20;
        const cols = 5;
        const isFinished = timeLeft === 0 && (!isActive || settings.duration > 0);
        const progressNorm = isFinished ? 1 : 1 - (timeLeft / Math.max(1, settings.duration));
        const currentIdx = Math.min(totalCheese - 1, Math.floor(progressNorm * totalCheese));

        const getRowCol = (idx: number) => {
          const r = Math.floor(idx / cols);
          const isOdd = r % 2 !== 0;
          const c = isOdd ? (cols - 1) - (idx % cols) : (idx % cols);
          return { r, c, isOdd };
        }

        const { r: mouseRow, c: mouseCol, isOdd: mouseFacesLeft } = getRowCol(currentIdx);

        return (
          <div className="w-full mt-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 md:p-8 border border-slate-200 dark:border-slate-700 relative overflow-hidden flex flex-col items-center shadow-sm">

            {/* Play/Pause Overlay se spento */}
            {!isActive && !isFinished && timeLeft > 0 && (
              <div className="absolute inset-0 z-40 bg-black/5 dark:bg-black/20 flex flex-col items-center justify-center cursor-pointer backdrop-blur-[1px] transition-all hover:bg-black/10" onClick={toggleTimer}>
                <Play className="w-16 h-16 text-amber-500 bg-white/90 rounded-full p-4 shadow-xl mb-2 hover:scale-110 transition-transform" />
                <span className="font-bold text-amber-700 bg-white/90 px-4 py-1.5 rounded-full text-sm shadow-sm">Tocca per Avviare</span>
              </div>
            )}

            {/* Main Area */}
            <div className="relative w-full max-w-sm aspect-[5/4] bg-white dark:bg-slate-800 rounded-2xl shadow-inner border-4 border-amber-100 dark:border-slate-700 overflow-hidden">

              {/* Base Reward Image layer */}
              <div className="absolute inset-0 flex items-center justify-center p-6 cursor-pointer z-0 transition-opacity duration-1000" onClick={onSelectImage}>
                {settings.timerImage ? (
                  settings.timerImage.imageUrl ? <img src={settings.timerImage.imageUrl} className={`w-full h-full object-contain drop-shadow-xl transition-all duration-1000 ease-out ${isFinished ? 'scale-110 opacity-100' : 'opacity-40 grayscale-[30%]'}`} /> :
                    settings.timerImage.iconId ? (() => { const IconComp = getIconComponent(settings.timerImage.iconId); const style = getPresetStyle(settings.timerImage.iconId); return <IconComp className={`w-32 h-32 ${style.icon} transition-all duration-1000 ease-out ${isFinished ? 'scale-125 opacity-100 drop-shadow-2xl' : 'opacity-40'}`} />; })() : null
                ) : (
                  <div className="text-center text-slate-300 dark:text-slate-600"><ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" /><span className="text-xs font-bold uppercase tracking-widest text-center">Tocca img finale</span></div>
                )}
              </div>

              {/* Grid Layer */}
              <div className="absolute inset-0 z-10 grid grid-cols-5 grid-rows-4 p-1 md:p-2 gap-1 md:gap-2">
                {Array.from({ length: totalCheese }).map((_, physicalIdx) => {
                  const r = Math.floor(physicalIdx / cols);
                  const c = physicalIdx % cols;
                  const isOdd = r % 2 !== 0;
                  const logicalIdx = isOdd ? r * cols + (cols - 1 - c) : r * cols + c;

                  const isEaten = isFinished || logicalIdx < currentIdx;
                  const isEating = !isFinished && logicalIdx === currentIdx;

                  return (
                    <div key={physicalIdx} className="w-full aspect-square flex items-center justify-center relative">
                      <CheeseWedge isEaten={isEaten} isEating={isEating && isActive} />
                    </div>
                  )
                })}
              </div>

              {/* Mouse Layer */}
              <div className="absolute z-20 pointer-events-none transition-all duration-700 ease-out"
                style={{
                  top: `calc((${mouseRow} * 100%) / 4)`,
                  left: `calc((${mouseCol} * 100%) / 5)`,
                  width: '20%',
                  height: '25%'
                }}>
                <div className="w-full h-full flex items-center justify-center">
                  <MouseCharacter isActive={isActive} facesLeft={mouseFacesLeft} isFinished={isFinished} />
                </div>
              </div>
            </div>

            {/* Countdown */}
            {isActive && !isFinished && (
              <div className="mt-6 font-black text-4xl text-amber-500 tabular-nums drop-shadow-sm">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
            {isFinished && (
              <div className="mt-6 font-black text-4xl text-green-500 tabular-nums animate-bounce drop-shadow-sm">
                Finito!
              </div>
            )}
          </div>
        );
      })() : (
        /* BOCCIA LIQUIDA RIDOTTA (w-56 mobile / w-96 desktop) */
        <div
          className="relative mt-4 w-56 h-56 md:w-96 md:h-96 rounded-full border-[10px] md:border-[12px] border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-700 bg-white dark:bg-slate-900 mx-auto"
          style={{ backgroundColor: getBackgroundColor() }}
        >
          {/* 1. Immagine Sotto */}
          <div className="absolute inset-0 flex items-center justify-center p-10 md:p-16 z-0 cursor-pointer" onClick={onSelectImage}>
            {settings.timerImage ? (
              settings.timerImage.imageUrl ? <img src={settings.timerImage.imageUrl} className="w-full h-full object-contain animate-in fade-in zoom-in duration-500 drop-shadow-md" /> :
                settings.timerImage.iconId ? (() => { const IconComp = getIconComponent(settings.timerImage.iconId); const style = getPresetStyle(settings.timerImage.iconId); return <IconComp className={`w-28 h-28 md:w-40 md:h-40 ${style.icon} filter drop-shadow-sm`} />; })() : null
            ) : (
              <div className="flex flex-col items-center text-slate-300 dark:text-slate-600 transition-colors hover:text-blue-400"><ImageIcon className="w-12 h-12 md:w-20 md:h-20 mb-2 opacity-50" /><span className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-center">Tocca per immagine</span></div>
            )}
          </div>

          {/* 2. Liquido e Onde SVG (Doppio ciclo per loop perfetto) */}
          <div className="liquid-container" style={{ height: `${percentage}%`, backgroundColor: currentColor }}>
            {percentage > 0.5 && percentage < 99.5 && (
              <div className="wave-wrapper" style={{ color: currentColor, marginBottom: '-1px' }}>
                <svg className="wave-svg wave-back" viewBox="0 0 2000 100" preserveAspectRatio="none">
                  <path d="M 0 100 V 50 Q 250 10 500 50 T 1000 50 T 1500 50 T 2000 50 V 100 H 0 Z" fill="currentColor" />
                </svg>
                <svg className="wave-svg wave-front" viewBox="0 0 2000 100" preserveAspectRatio="none">
                  <path d="M 0 100 V 50 Q 250 10 500 50 T 1000 50 T 1500 50 T 2000 50 V 100 H 0 Z" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>

          {/* 3. Countdown */}
          {isActive && (
            <div className="absolute z-30 font-black text-4xl md:text-6xl text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] opacity-90 pointer-events-none">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- APP COMPONENT ---
/**
 * Riduce in scala il foglio A4 del generatore PECS quando lo schermo è più
 * stretto di 21 cm, così su telefono si vede tutta la pagina invece di dover
 * scorrere in orizzontale. In stampa la scala torna a 1.
 */
const PX_PER_CM = 96 / 2.54;
const A4_WIDTH_CM = 21;

function useFitToWidth(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) { setScale(1); return; }
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const available = el.clientWidth;
      if (!available) return;
      setScale(Math.min(1, available / (A4_WIDTH_CM * PX_PER_CM)));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return { ref, scale };
}

export default function App() {
  // Il tema è già applicato da uno script in index.html prima del primo paint:
  // qui leggiamo lo stesso valore per restare allineati.
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });
  const [view, setView] = useState('dashboard');
  const [boards, setBoards] = useState([]);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState('all');
  const [dashboardSort, setDashboardSort] = useState('date-desc');
  const [currentBoard, setCurrentBoard] = useState<any>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [editingContext, setEditingContext] = useState(null);
  const [linkedSchedule, setLinkedSchedule] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const fileInputRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null); // NUOVO STATO
  const [dropIndicator, setDropIndicator] = useState({ index: null, position: null }); // { index: 0, position: 'before' | 'after' }
  const [customSounds, setCustomSounds] = useState<any[]>([]); // Suoni custom in memoria

  // --- COMUNICAZIONE VOCALE ---
  // La striscia di frase è il cuore di un ausilio CAA: il bambino tocca i
  // simboli, questi si accodano in alto e l'app pronuncia la frase intera.
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem('caa_voice_enabled') !== 'false'; } catch { return true; }
  });
  const [sentence, setSentence] = useState<any[]>([]);
  const speechAvailable = isSpeechSupported();

  useEffect(() => {
    try { localStorage.setItem('caa_voice_enabled', String(voiceEnabled)); } catch { /* storage pieno */ }
  }, [voiceEnabled]);

  useEffect(() => { primeSpeech(); }, []);

  // Uscendo dalla modalità bambino la striscia si azzera e la voce tace.
  useEffect(() => {
    if (!isLocked) {
      setSentence([]);
      stopSpeaking();
    }
  }, [isLocked]);

  const handleChildClick = (itemId) => {
    setActiveItemId(itemId);
    setTimeout(() => setActiveItemId(null), 2000);

    const item = getActiveItems().find((i) => i.id === itemId);
    if (!item) return;

    if (voiceEnabled && item.label) speak(item.label);

    // La striscia ha senso solo sulle griglie di comunicazione: sulle agende
    // l'ordine è già dato dalla sequenza.
    if (currentBoard?.type === 'grid') {
      setSentence((prev) => [...prev, { key: crypto.randomUUID(), ...item }]);
    }
  };

  const speakSentence = () => {
    const text = sentence.map((i) => i.label).filter(Boolean).join(' ');
    if (text) speak(text);
  };

  useEffect(() => {
    loadBoards();
  }, []);

  // La scelta del tema va ricordata: prima si riazzerava ad ogni avvio.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('caa_dark_mode', String(darkMode));
    } catch { /* modalità privata o storage pieno: pazienza */ }
  }, [darkMode]);

  useEffect(() => {
    let unmounted = false;
    let listener: PluginListenerHandle | null = null;

    const setupListener = async () => {
      listener = await CapApp.addListener('backButton', () => {
        // Usa una funzione in setState se hai bisogno del valore corrente 
        // oppure sfrutta le dipendenze in un deps array (qui lo facciamo re-registrando il listener)
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        if (showSyncModal) {
          setShowSyncModal(false);
          return;
        }
        if (showSearch) {
          setShowSearch(false);
          setEditingContext(null);
          return;
        }
        if (view === 'editor') {
          setView('dashboard');
          setCurrentBoard(null);
          return;
        }
        CapApp.exitApp();
      });
    };
    setupListener();

    return () => {
      unmounted = true;
      if (listener) listener.remove();
    };
  }, [showHelp, showSyncModal, showSearch, view]);

  useEffect(() => {
    const fetchLinked = async () => {
      if (currentBoard?.type === 'token' && currentBoard.settings?.linkedScheduleId) {
        try {
          const linked = await dbOperations.getBoard(currentBoard.settings.linkedScheduleId);
          if (linked && linked.items) {
            linked.items = await Promise.all(linked.items.map(async (item) => ({ ...item, imageUrl: await getImageUrl(item.sourceId) })));
            setLinkedSchedule(linked);
          } else { setLinkedSchedule(null); }
        } catch (e) { setLinkedSchedule(null); }
      } else { setLinkedSchedule(null); }
    };
    fetchLinked();
  }, [currentBoard]);

  const loadBoards = async () => {
    const allBoards: any[] = await dbOperations.getAllBoards() as any;
    const boardsWithCovers = await Promise.all(allBoards.map(async (b) => {
      if (b.coverImage && b.coverImage.sourceId && !b.coverImage.sourceId.startsWith('preset-')) {
        b.coverImage.imageUrl = await getImageUrl(b.coverImage.sourceId);
      }
      return b;
    }));
    setBoards(boardsWithCovers as any);

    // Carica anche i suoni personalizzati
    try {
      const sounds: any[] = await dbOperations.getAllSounds() as any;
      if (sounds) {
        const mappedSounds = sounds.map(s => ({
          id: s.id,
          label: s.label,
          url: URL.createObjectURL(s.blob)
        }));
        setCustomSounds(mappedSounds);
      }
    } catch (e) { console.error("Error loading sounds", e); }
  };

  const handleAddCustomSound = async (file: File, label: string) => {
    const newSoundId = 'custom-' + crypto.randomUUID();
    await dbOperations.putSound({
      id: newSoundId,
      label,
      blob: file
    });
    // Ricarica la lista per aggiornare lo state
    await loadBoards();
    // Auto-seleziona il nuovo suono
    setCurrentBoard((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, soundId: newSoundId }
    }));
    setIsSaving(true);
  };

  // --- SNAPSHOT SYSTEM (AUTO-SAVE) ---

  // 1. Salva automaticamente ogni volta che currentBoard cambia
  useEffect(() => {
    if (currentBoard) {
      // Usiamo un timeout per non salvare ad ogni singola lettera digitata (Debounce 1s)
      const timeoutId = setTimeout(() => {
        // Salviamo solo i metadati, le immagini Blob non si possono salvare in localStorage.
        // Ma va bene così! Al ripristino useremo gli ID per ricaricarle dal DB.
        localStorage.setItem('caa_snapshot_board', JSON.stringify(currentBoard));
        localStorage.setItem('caa_snapshot_page', String(activePageIndex));
        localStorage.setItem('caa_snapshot_view', view);
        localStorage.setItem('caa_snapshot_date', new Date().toISOString());
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else if (view === 'dashboard') {
      localStorage.removeItem('caa_snapshot_board');
    }
  }, [currentBoard, activePageIndex, view]);

  // 2. Ripristino all'avvio (Check Snapshot)
  useEffect(() => {
    const checkSnapshot = async () => {
      const savedBoard = localStorage.getItem('caa_snapshot_board');
      if (savedBoard) {
        try {
          const parsedBoard = JSON.parse(savedBoard);
          const savedDate = new Date(localStorage.getItem('caa_snapshot_date') || 0);
          const diffMins = (Date.now() - savedDate.getTime()) / 1000 / 60;

          // Se lo snapshot è recente (meno di 24 ore) chiediamo, altrimenti ignoriamo
          if (diffMins < 1440) {
            if (confirm(`Ho trovato un progetto aperto non salvato ("${parsedBoard.title}"). Vuoi ripristinarlo?`)) {

              // CRUCIALE: Reidratiamo le immagini dal DB IndexedDB
              // perché i Blob URL del localStorage sono morti.
              const rehydrate = async (board) => {
                const refreshItems = async (items) => Promise.all((items || []).map(async (item) => ({
                  ...item,
                  imageUrl: await getImageUrl(item.sourceId)
                })));

                if (board.items) board.items = await refreshItems(board.items);
                if (board.pages) board.pages = await Promise.all(board.pages.map(async p => ({ ...p, items: await refreshItems(p.items) })));

                // Gestione immagini speciali (Token, Timer, Cover)
                if (board.settings?.tokenImage?.sourceId) board.settings.tokenImage.imageUrl = await getImageUrl(board.settings.tokenImage.sourceId);
                if (board.settings?.rewardImage?.sourceId) board.settings.rewardImage.imageUrl = await getImageUrl(board.settings.rewardImage.sourceId);
                if (board.settings?.timerImage?.sourceId) board.settings.timerImage.imageUrl = await getImageUrl(board.settings.timerImage.sourceId);

                return board;
              };

              const hydratedBoard = await rehydrate(parsedBoard);

              setCurrentBoard(hydratedBoard);
              setActivePageIndex(Number(localStorage.getItem('caa_snapshot_page')) || 0);
              setView('editor');
            } else {
              // Se dice no, puliamo
              localStorage.removeItem('caa_snapshot_board');
            }
          }
        } catch (e) {
          console.error("Errore ripristino snapshot", e);
          localStorage.removeItem('caa_snapshot_board');
        }
      }
    };

    // Eseguiamo il controllo dopo un breve ritardo per non bloccare il render iniziale
    setTimeout(checkSnapshot, 500);
  }, []);


  const createBoard = (type) => {
    const newBoard = {
      title: type === 'sequence' ? 'Nuova Agenda' :
        type === 'token' ? 'Token Economy' :
          type === 'story' ? 'Nuova Storia Sociale' :
            type === 'pecs' ? 'Griglia PECS' :
              type === 'timer' ? 'Nuovo Timer Visivo' : // <--- NUOVO
                'Nuova Comunicazione',
      type: type,
      pages: (type === 'grid' || type === 'pecs') ? [{ id: crypto.randomUUID(), name: 'Pagina 1', items: [] }] : undefined,
      items: (type === 'sequence' || type === 'story') ? [] : undefined,
      settings: type === 'sequence' ? { orientation: 'vertical' } :
        type === 'token' ? { tokenCount: 5, earnedCount: 0, linkedScheduleId: '', tokenImage: null, rewardImage: null } :
          type === 'pecs' ? { cardWidth: 4, cardHeight: 4, gap: 0, showCutLines: true, labelPosition: 'bottom' } :
            type === 'story' ? { printOrientation: 'portrait' } :
              type === 'timer' ? { duration: 60, timerImage: null, timerStyle: 'liquid' } : // <--- NUOVO CON timerStyle di default
                {},
      updatedAt: new Date()
    };
    setCurrentBoard(newBoard);
    setActivePageIndex(0);
    setIsLocked(false);
    setView('editor');
  };

  const createLinkedBoard = async () => {
    if (!currentBoard || currentBoard.type !== 'token') return;
    await saveBoard();
    const newAgenda = { title: `Agenda per ${currentBoard.title}`, type: 'sequence', items: [], settings: { orientation: 'vertical' }, updatedAt: new Date() };
    const newId = await dbOperations.addBoard(newAgenda);
    const updatedTokenBoard = { ...currentBoard, settings: { ...currentBoard.settings, linkedScheduleId: newId } };
    await dbOperations.updateBoard(updatedTokenBoard);
    setCurrentBoard({ ...newAgenda, id: newId });
    setLinkedSchedule(null);
  };

  const openBoard = async (boardId) => {
    const board = await dbOperations.getBoard(boardId);
    const refreshImages = async (items) => Promise.all(items.map(async (item) => ({ ...item, imageUrl: await getImageUrl(item.sourceId) })));
    if (board.items) board.items = await refreshImages(board.items);
    if (board.pages) board.pages = await Promise.all(board.pages.map(async (page) => ({ ...page, items: await refreshImages(page.items) })));
    if (board.type === 'token' && board.settings) {
      if (board.settings.tokenImage) board.settings.tokenImage.imageUrl = await getImageUrl(board.settings.tokenImage.sourceId);
      if (board.settings.rewardImage) board.settings.rewardImage.imageUrl = await getImageUrl(board.settings.rewardImage.sourceId);
    }
    if (board.type === 'grid' && !board.pages && board.items) { board.pages = [{ id: crypto.randomUUID(), name: 'Principale', items: board.items }]; board.items = undefined; }
    if (board.type === 'sequence' && !board.settings) board.settings = { orientation: 'vertical' };
    setCurrentBoard(board);
    setActivePageIndex(0);
    setIsLocked(false);
    setView('editor');
  };

  const saveBoard = async () => {
    if (!currentBoard) return;
    setIsSaving(true);
    const boardToSave = { ...currentBoard, updatedAt: new Date() };
    if (currentBoard.id) { await dbOperations.updateBoard(boardToSave); }
    else { const id = await dbOperations.addBoard(boardToSave); setCurrentBoard({ ...boardToSave, id }); }
    await loadBoards();
    setTimeout(() => setIsSaving(false), 500);
  };

  const duplicateBoard = async (e, board) => {
    e.stopPropagation();
    const newBoard = { ...board, id: undefined, title: `${board.title} (Copia)`, updatedAt: new Date() };
    await dbOperations.addBoard(newBoard);
    await loadBoards();
    setOpenMenuId(null);
  };

  const deleteBoard = async (e, id) => {
    e.stopPropagation();
    if (confirm("Sei sicuro di voler eliminare questo progetto?")) {
      await dbOperations.deleteBoard(id);
      await loadBoards();
    }
    setOpenMenuId(null);
  };

  const handleChangeCover = (e, board) => {
    e.stopPropagation();
    setEditingContext({ type: 'boardCover', boardId: board.id });
    setShowSearch(true);
    setOpenMenuId(null);
  };

  // --- IN APP: handleSearchSelect (Versione Finale Corretta) ---
  const handleSearchSelect = async (selectedData) => {
    // Gestiamo sia il caso di un singolo oggetto che di un array (selezione multipla)
    const itemsToAdd = Array.isArray(selectedData) ? selectedData : [selectedData];
    const firstItem = itemsToAdd[0];

    // Determiniamo se stiamo sostituendo un elemento esistente
    const isReplacing = editingContext?.type === 'boardCover' ||
      editingContext?.type === 'tokenImage' ||
      editingContext?.type === 'rewardImage' ||
      editingContext?.type === 'timerImage' ||
      (editingContext?.type === 'item' && editingContext.id);

    if (editingContext?.type === 'boardCover') {
      const boardToUpdate = await dbOperations.getBoard(editingContext.boardId);
      if (boardToUpdate) {
        boardToUpdate.coverImage = firstItem;
        await dbOperations.updateBoard(boardToUpdate);
        await loadBoards();
      }
    } else if (editingContext?.type === 'tokenImage') {
      setCurrentBoard(prev => ({
        ...prev,
        settings: { ...prev.settings, tokenImage: firstItem }
      }));
    } else if (editingContext?.type === 'rewardImage') {
      setCurrentBoard(prev => ({
        ...prev,
        settings: { ...prev.settings, rewardImage: firstItem }
      }));
    } else if (editingContext?.type === 'timerImage') {
      const itemToSave = Array.isArray(selectedData) ? selectedData[0] : selectedData;

      // Calcolo colore dominante sicuro (fallback se manca)
      const domColor = itemToSave.dominantColor || { r: 240, g: 240, b: 240 };

      setCurrentBoard(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          timerImage: {
            ...itemToSave,
            id: itemToSave.id || crypto.randomUUID(), // Assicuriamo un ID
            imageUrl: itemToSave.imageUrl,
            iconId: itemToSave.iconId, // FONDAMENTALE per i preset
            dominantColor: domColor    // Salviamo il colore per lo sfondo
          }
        }
      }));
      setEditingContext(null);
      setShowSearch(false);
    } else if (editingContext?.type === 'item' && editingContext.id) {
      // Sostituzione di un singolo simbolo in griglia o agenda
      setCurrentBoard(prev => {
        const copy = { ...prev };
        const updateFn = (item) => item.id === editingContext.id ? {
          ...item,
          ...firstItem,
          label: item.label // Mantiene l'etichetta originale durante la sostituzione immagine
        } : item;

        if (copy.type === 'grid') copy.pages[activePageIndex].items = copy.pages[activePageIndex].items.map(updateFn);
        else copy.items = copy.items.map(updateFn);
        return copy;
      });
    } else {
      // --- MODALITÀ AGGIUNTA (Supporta Multi-Selezione) ---
      setCurrentBoard(prev => {
        const copy = { ...prev };
        if (copy.type === 'grid') {
          if (!copy.pages[activePageIndex].items) copy.pages[activePageIndex].items = [];
          copy.pages[activePageIndex].items.push(...itemsToAdd);
        } else {
          if (!copy.items) copy.items = [];
          copy.items.push(...itemsToAdd);
        }
        return copy;
      });
    }

    // Reset del contesto e chiusura ricerca se abbiamo finito la sostituzione
    if (isReplacing) {
      setEditingContext(null);
      setShowSearch(false);
    }
  };

  const removeItem = (itemId) => {
    setCurrentBoard(prev => {
      const copy = { ...prev };
      if (copy.type === 'grid') copy.pages[activePageIndex].items = copy.pages[activePageIndex].items.filter(i => i.id !== itemId);
      else copy.items = copy.items.filter(i => i.id !== itemId);
      return copy;
    });
  };

  const updateLabel = (itemId, newLabel) => {
    setCurrentBoard(prev => {
      const copy = { ...prev };
      const updateFn = i => i.id === itemId ? { ...i, label: newLabel } : i;
      if (copy.type === 'grid') copy.pages[activePageIndex].items = copy.pages[activePageIndex].items.map(updateFn);
      else copy.items = copy.items.map(updateFn);
      return copy;
    });
  };

  const toggleComplete = (itemId) => {
    if (currentBoard.type === 'sequence') {
      setCurrentBoard(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i) }));
    } else if (currentBoard.type === 'token') {
      setLinkedSchedule(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i) }));
    }
  };

  const updateTokenSettings = (field, value) => {
    setCurrentBoard(prev => ({ ...prev, settings: { ...prev.settings, [field]: value } }));
  };

  const toggleToken = (index) => {
    const currentEarned = currentBoard.settings.earnedCount || 0;
    const newEarned = index < currentEarned ? index : index + 1;
    setCurrentBoard(prev => ({ ...prev, settings: { ...prev.settings, earnedCount: newEarned } }));
  };

  const getActiveItems = () => {
    if (!currentBoard) return [];
    if (currentBoard.type === 'grid') return currentBoard.pages[activePageIndex]?.items || [];
    return currentBoard.items || [];
  };

  // --- DRAG & DROP LOGIC (AGGIORNATA) ---
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const dragOverPage = useRef<string | null>(null); // pagina sotto il cursore, se presente

  const handleDragStart = (e, position) => {
    dragItem.current = position;
    // Opzionale: Effetto visivo di trascinamento
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e, position) => {
    dragOverItem.current = position;
    dragOverPage.current = null; // Resetta pagina se siamo su un item
  };

  // NUOVO: Gestisce quando trascini sopra una linguetta pagina
  const handleDragEnterPage = (e, pageId) => {
    e.preventDefault(); // Necessario per permettere il drop
    dragOverPage.current = pageId;
    dragOverItem.current = null; // Resetta item se siamo su una pagina
  };

  // Calcola se mostrare la riga PRIMA o DOPO l'elemento
  const handleDragOver = (e, index) => {
    e.preventDefault(); // Fondamentale per permettere il drop

    // Se stiamo trascinando sopra una pagina (tab), non mostrare indicatori item
    if (dragOverPage.current) {
      setDropIndicator({ index: null, position: null });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const isVertical = currentBoard.type === 'sequence' && currentBoard.settings.orientation === 'vertical';

    // Calcoliamo il punto medio
    const midpoint = isVertical
      ? rect.y + rect.height / 2
      : rect.x + rect.width / 2;

    // Calcoliamo la posizione del cursore/dito
    const clientPos = isVertical ? e.clientY : e.clientX;

    const position = clientPos < midpoint ? 'before' : 'after';

    // Aggiorniamo solo se è cambiato (per performance)
    if (dropIndicator.index !== index || dropIndicator.position !== position) {
      setDropIndicator({ index, position });
      dragOverItem.current = index; // Teniamo aggiornato anche il ref classico
    }
  };

  // Reset quando usciamo
  const handleDragLeave = () => {
    // Non resettiamo subito altrimenti la riga lampeggia, 
    // il reset vero avviene nel DragEnd o se entriamo in un altro item
  };

  const handleDragEnd = (e) => {
    setDropIndicator({ index: null, position: null }); // Pulisci la riga blu

    if (isLocked) return;

    // Logica spostamento tra pagine (rimane uguale a prima)
    if (dragOverPage.current && currentBoard.type === 'grid') {
      // ... (copia la logica precedente per le pagine, non cambia) ...
      const items = [...getActiveItems()];
      const targetPageId = dragOverPage.current;
      if (currentBoard.pages[activePageIndex].id === targetPageId) return;
      const itemToMove = items[dragItem.current];

      setCurrentBoard(prev => {
        const copy = { ...prev };
        copy.pages[activePageIndex].items.splice(dragItem.current, 1);
        const targetPage = copy.pages.find(p => p.id === targetPageId);
        if (targetPage) targetPage.items.push(itemToMove);
        return copy;
      });
      return;
    }

    // NUOVA LOGICA RIORDINAMENTO PRECISO CON LINEA
    if (dragOverItem.current !== null && dragOverItem.current !== undefined) {
      const items = [...getActiveItems()];
      const oldIndex = dragItem.current;
      const hoverIndex = dragOverItem.current;
      const position = dropIndicator.position || 'after'; // Fallback

      // Rimuovi l'elemento dalla vecchia posizione
      const [movedItem] = items.splice(oldIndex, 1);

      // Calcola il nuovo indice
      // Attenzione: se togliamo un elemento prima del target, gli indici scalano
      let newIndex = hoverIndex;

      // Aggiustamenti matematici per array
      if (oldIndex < hoverIndex) {
        newIndex = position === 'after' ? hoverIndex : hoverIndex - 1;
      } else {
        newIndex = position === 'after' ? hoverIndex + 1 : hoverIndex;
      }

      // Inserisci nella nuova posizione
      items.splice(newIndex, 0, movedItem);

      setCurrentBoard(prev => {
        const copy = { ...prev };
        if (copy.type === 'grid') copy.pages[activePageIndex].items = items;
        else copy.items = items;
        return copy;
      });
    }

    // Reset References
    dragItem.current = null;
    dragOverItem.current = null;
    dragOverPage.current = null;
  };

  const activeItems = getActiveItems();
  const { ref: pecsWrapRef, scale: pecsScale } = useFitToWidth(currentBoard?.type === 'pecs');

  const filteredBoards = useMemo(() => {
    let result = [...boards];
    if (dashboardFilter !== 'all') result = result.filter(b => b.type === dashboardFilter);
    if (dashboardSearch.trim()) result = result.filter(b => b.title.toLowerCase().includes(dashboardSearch.toLowerCase()));
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime(), dateB = new Date(b.updatedAt).getTime();
      if (dashboardSort === 'date-desc') return dateB - dateA;
      if (dashboardSort === 'date-asc') return dateA - dateB;
      if (dashboardSort === 'alpha') return a.title.localeCompare(b.title);
      return 0;
    });
    return result;
  }, [boards, dashboardFilter, dashboardSearch, dashboardSort]);

  // Stili per la stampa e visualizzazione PECS (DINAMICO & AGGRESSIVO)
  // Stili per la stampa e visualizzazione PECS (E ANIMAZIONE TIMER)
  useEffect(() => {
    const orientation = currentBoard?.settings?.printOrientation || 'portrait';

    const style = document.createElement('style');
    style.innerHTML = `
      /* --- FIX FLUIDITÀ DRAG AND DROP ANDROID --- */
      .dnd-poly-drag-image {
        opacity: 0.9 !important;
        transform: translate3d(0,0,0) !important;
        will-change: transform;
        transition: none !important;
        z-index: 9999 !important;
      }
      .dnd-poly-drag-source {
        opacity: 0.3 !important;
      }

      /* --- STILI DI STAMPA --- */
      @media print {
        @page { 
          margin: 0; 
          size: A4 ${orientation}; 
        }
        body * { visibility: hidden; }
        .print-only-content, .print-only-content * { visibility: visible; }
        .print-only-content {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
        }
        html, body { 
          height: 100%; 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important; 
          overflow: visible !important;
        }
        .print\\:hidden { display: none !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

        /* L'anteprima PECS è rimpicciolita a schermo per stare nei telefoni:
           in stampa deve tornare esattamente 1:1, altrimenti le tessere
           non escono della misura in centimetri richiesta. */
        .pecs-sheet {
          transform: none !important;
          width: 21cm !important;
          height: 29.7cm !important;
        }
        .pecs-sheet-wrap {
          height: auto !important;
          overflow: visible !important;
        }
      } /* <--- QUESTA CHIUSURA ERA MESSA NEL POSTO SBAGLIATO PRIMA */

      /* --- FIX INPUT NUMERICI (Nasconde frecce default) --- */
      input[type=number]::-webkit-inner-spin-button, 
      input[type=number]::-webkit-outer-spin-button { 
        -webkit-appearance: none; 
        margin: 0; 
      }
      input[type=number] {
        -moz-appearance: textfield;
      }

      /* --- TIMER VISIVO LIQUIDO (SVG FILL - NO GAP) --- */
      
      @keyframes wave-front {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      @keyframes wave-back {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      .liquid-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        /* Transizione fluida altezza e colore */
        transition: height 1s linear, background-color 0.5s ease;
        z-index: 10;
        /* Nessun pointer events per lasciar cliccare l'immagine sotto */
        pointer-events: none; 
      }

      /* Contenitore delle onde SVG che sta SOPRA il liquido */
      .wave-wrapper {
        position: absolute;
        bottom: 99%; /* Sovrapposizione dell'1% per sicurezza estrema */
        left: 0;
        width: 100%;
        height: 60px; /* Altezza dell'onda visibile */
        overflow: hidden;
      }

      /* Le SVG delle onde */
      .wave-svg {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 200%; /* Larghezza doppia per il loop */
        height: 100%;
      }

      .wave-back {
        animation: wave-back 7s linear infinite;
        opacity: 0.6; /* Profondità */
        transform: scaleY(0.9); /* Leggermente diversa */
      }

      .wave-front {
        animation: wave-front 4s linear infinite;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, [currentBoard?.settings?.printOrientation]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`} onClick={() => setOpenMenuId(null)}>

      <header className="print:hidden sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 px-3 sm:px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-3">
          {view === 'editor' && <button onClick={() => setView('dashboard')} aria-label="Torna ai progetti" className="p-3 min-h-touch min-w-touch flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white"><LayoutGrid className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">CAA <span className="text-blue-600">Facile</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'dashboard' && (
            <>
              <button onClick={() => setShowHelp(true)} className="p-3 min-h-touch min-w-touch flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Manuale Istruzioni" aria-label="Manuale istruzioni">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
              <button onClick={() => setShowSyncModal(true)} className="p-3 min-h-touch min-w-touch flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-blue-600 dark:text-blue-400" title="Sincronizzazione e Backup" aria-label="Sincronizzazione e backup"><Wifi className="w-5 h-5" /></button>
            </>
          )}
          {view === 'editor' && <button onClick={saveBoard} className={`flex items-center gap-2 px-4 py-3 min-h-touch rounded-lg font-bold text-sm transition-all ${isSaving ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'}`}><Save className="w-4 h-4" /> {isSaving ? 'Salvato!' : 'Salva'}</button>}
          <button onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Passa al tema chiaro' : 'Passa al tema scuro'} aria-pressed={darkMode} className="p-3 min-h-touch min-w-touch flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="text-center py-8 space-y-4">
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">Strumenti Clinici</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6 max-w-5xl mx-auto">
                <button onClick={() => createBoard('grid')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all w-full min-h-touch focus-visible:border-blue-500">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 mb-3 group-hover:scale-110 transition-transform"><LayoutGrid className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Comunicazione</span>
                </button>
                <button onClick={() => createBoard('sequence')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all w-full min-h-touch focus-visible:border-blue-500">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 mb-3 group-hover:scale-110 transition-transform"><ListOrdered className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Agenda Visiva</span>
                </button>
                <button onClick={() => createBoard('token')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 transition-all w-full min-h-touch focus-visible:border-blue-500">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 mb-3 group-hover:scale-110 transition-transform"><Trophy className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Token Economy</span>
                </button>
                <button onClick={() => createBoard('story')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-pink-500 transition-all w-full min-h-touch focus-visible:border-blue-500">
                  <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl text-pink-600 mb-3 group-hover:scale-110 transition-transform"><Book className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Storia Sociale</span>
                </button>
                <button onClick={() => createBoard('pecs')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all w-full min-h-touch focus-visible:border-blue-500">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform"><Scissors className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Costruttore PECS</span>
                </button>
                <button onClick={() => createBoard('timer')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-all w-full min-h-touch focus-visible:border-blue-500">
                  <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 mb-3 group-hover:scale-110 transition-transform"><Timer className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Timer Visivo</span>
                </button>
              </div>
            </section>

            <div className="sticky top-20 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
              <div className="relative w-full md:w-auto md:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="search" aria-label="Cerca fra i tuoi progetti" placeholder="Cerca i tuoi progetti..." value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto">
                <select aria-label="Filtra per tipo di progetto" value={dashboardFilter} onChange={(e) => setDashboardFilter(e.target.value)} className="min-w-0 w-full md:w-auto px-3 py-3 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none cursor-pointer">
                  <option value="all">Tutti i tipi</option>
                  <option value="grid">Comunicazione</option>
                  <option value="sequence">Agenda</option>
                  <option value="token">Token Economy</option>
                  <option value="story">Storie Sociali</option> {/* Nuovo */}
                  <option value="pecs">PECS da Taglio</option>
                  <option value="timer">Timer Visivo</option>
                </select>
                <select aria-label="Ordina i progetti" value={dashboardSort} onChange={(e) => setDashboardSort(e.target.value)} className="min-w-0 w-full md:w-auto px-3 py-3 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none cursor-pointer">
                  <option value="date-desc">Più recenti</option>
                  <option value="date-asc">Più vecchi</option>
                  <option value="alpha">Alfabetico (A-Z)</option>
                </select>
              </div>
            </div>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBoards.length === 0 ? <div className="col-span-full text-center py-12 text-slate-400">Nessun progetto trovato.</div> : filteredBoards.map(board => (
                <div key={board.id} onClick={() => openBoard(board.id)} className="group bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden relative">
                  <div className={`h-32 w-full flex items-center justify-center relative bg-slate-100 dark:bg-slate-700/50 ${board.coverImage ? 'p-0' : 'p-4'}`}>
                    {board.coverImage && board.coverImage.iconId ? (
                      (() => {
                        const IconComp = getIconComponent(board.coverImage.iconId);
                        const style = getPresetStyle(board.coverImage.iconId);
                        return <div className={`w-full h-full flex items-center justify-center ${style.bg}`}><IconComp className={`w-16 h-16 ${style.icon}`} /></div>;
                      })()
                    ) : board.coverImage ? (
                      <img src={board.coverImage.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`p-4 rounded-full ${BOARD_TYPE_COLORS[board.type] || 'bg-blue-100 text-blue-600'}`}>
                        {(() => { const Fallback = BOARD_TYPE_ICONS[board.type] || LayoutGrid; return <Fallback className="w-8 h-8" />; })()}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 dark:bg-black/70 text-xs font-bold shadow-sm backdrop-blur-sm">{BOARD_TYPE_LABELS[board.type] || 'Progetto'}</div>
                    <div className="absolute top-2 right-2">
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === board.id ? null : board.id); }} aria-label={`Opzioni per ${board.title}`} aria-expanded={openMenuId === board.id} className="p-2.5 min-h-touch min-w-touch flex items-center justify-center rounded-full bg-white/80 dark:bg-black/60 hover:bg-white text-slate-700 dark:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                      {openMenuId === board.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                          <button onClick={(e) => handleChangeCover(e, board)} className="w-full text-left px-4 py-3 min-h-touch text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Cambia Copertina</button>
                          <button onClick={(e) => duplicateBoard(e, board)} className="w-full text-left px-4 py-3 min-h-touch text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><Copy className="w-4 h-4" /> Duplica</button>
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                          <button onClick={(e) => deleteBoard(e, board.id)} className="w-full text-left px-4 py-3 min-h-touch text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Elimina</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg truncate mb-1">{board.title}</h4>
                    <p className="text-xs text-slate-500">Ultima modifica: {new Date(board.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {view === 'editor' && currentBoard && (
          <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
            {/*
              STRISCIA DI FRASE — visibile in modalità bambino sulle griglie di
              comunicazione. Toccando i simboli si compone la frase, che l'app
              può poi pronunciare per intero.
            */}
            {isLocked && currentBoard.type === 'grid' && (
              <div className="print:hidden sticky top-[4.25rem] z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-3 flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 overflow-x-auto min-h-[72px] scrollbar-hide" aria-live="polite" aria-label="Frase composta">
                  {sentence.length === 0 ? (
                    <p className="text-sm text-slate-400 px-2">Tocca i simboli per comporre una frase…</p>
                  ) : (
                    sentence.map((item) => (
                      <div key={item.key} className="shrink-0 w-16 flex flex-col items-center gap-1">
                        <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                          {item.iconId ? (() => {
                            const IconComp = getIconComponent(item.iconId);
                            const style = getPresetStyle(item.iconId);
                            return <IconComp className={`w-8 h-8 ${style.icon}`} />;
                          })() : item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase truncate w-full text-center text-slate-600 dark:text-slate-300">{item.label}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={speakSentence}
                    disabled={sentence.length === 0 || !speechAvailable}
                    aria-label="Pronuncia la frase"
                    title={speechAvailable ? 'Pronuncia la frase' : 'Sintesi vocale non disponibile su questo dispositivo'}
                    className="p-3 min-h-touch min-w-touch flex items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setSentence((prev) => prev.slice(0, -1))}
                    disabled={sentence.length === 0}
                    aria-label="Cancella l'ultimo simbolo"
                    className="p-3 min-h-touch min-w-touch flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setSentence([]); stopSpeaking(); }}
                    disabled={sentence.length === 0}
                    aria-label="Svuota la frase"
                    className="p-3 min-h-touch min-w-touch flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            <div className={`print:hidden flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all ${isLocked ? 'opacity-90' : ''}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto flex-1">
                  {!isLocked && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Titolo</label>}
                  {isLocked ? <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">{currentBoard.title}</h2> : <input type="text" aria-label="Titolo del progetto" value={currentBoard.title} onChange={(e) => setCurrentBoard({ ...currentBoard, title: e.target.value })} className="text-2xl font-extrabold bg-transparent text-slate-800 dark:text-white outline-none w-full min-h-touch py-1 border-b border-transparent focus:border-blue-500" placeholder="Titolo..." />}
                </div>
                {!isLocked && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    {currentBoard.type === 'sequence' && (
                      <button onClick={() => updateTokenSettings('orientation', currentBoard.settings?.orientation === 'vertical' ? 'horizontal' : 'vertical')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200">{currentBoard.settings?.orientation === 'vertical' ? <ArrowDown className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />} Orientamento</button>
                    )}
                    {currentBoard.type === 'token' && (
                      <div className="flex flex-wrap gap-3 items-center w-full md:w-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-500">Punti:</span><input type="number" min="1" max="20" aria-label="Numero di token da guadagnare" value={currentBoard.settings.tokenCount} onChange={(e) => { const n = parseInt(e.target.value, 10); updateTokenSettings('tokenCount', Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 1); }} className="w-16 px-2 py-2 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" /></div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <button onClick={() => { setEditingContext({ type: 'tokenImage' }); setShowSearch(true); }} className="flex items-center gap-1.5 px-3 py-2 min-h-touch rounded-lg text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"><Star className="w-4 h-4" /> Timbro</button>
                        <button onClick={() => { setEditingContext({ type: 'rewardImage' }); setShowSearch(true); }} className="flex items-center gap-1.5 px-3 py-2 min-h-touch rounded-lg text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50"><Trophy className="w-4 h-4" /> Premio</button>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <div className="flex items-center gap-1">
                          <select aria-label="Agenda collegata" value={currentBoard.settings.linkedScheduleId || ''} onChange={(e) => updateTokenSettings('linkedScheduleId', e.target.value)} className="text-sm px-2 py-2 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white max-w-[150px]">
                            <option value="">Nessuna Agenda</option>
                            {boards.filter(b => b.type === 'sequence').map(b => (<option key={b.id} value={b.id}>{b.title}</option>))}
                          </select>
                          <button onClick={createLinkedBoard} className="p-2.5 min-h-touch min-w-touch flex items-center justify-center bg-green-100 text-green-800 hover:bg-green-200 rounded-lg border border-green-300" title="Crea Nuova Agenda" aria-label="Crea nuova agenda collegata"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                    {(currentBoard.type === 'grid' || currentBoard.type === 'sequence' || currentBoard.type === 'story') && (
                      <VoiceControls enabled={voiceEnabled} onToggle={() => setVoiceEnabled((v) => !v)} />
                    )}
                    {currentBoard.type !== 'token' && (
                      <button onClick={() => { setEditingContext(null); setShowSearch(true); }} className="bg-slate-900 dark:bg-blue-600 text-white px-5 py-3 min-h-touch rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Aggiungi</button>
                    )}
                  </div>
                )}
              </div>
              {currentBoard.type === 'grid' && (
                <div className="flex items-end gap-1 overflow-x-auto pb-0 border-b border-slate-200 dark:border-slate-700 mt-4 px-2 scrollbar-hide">
                  {currentBoard.pages.map((page, index) => (
                    <div
                      key={page.id}
                      onClick={() => setActivePageIndex(index)}
                      onDragEnter={(e) => handleDragEnterPage(e, page.id)}
                      onDragOver={(e) => e.preventDefault()}
                      className={`
                        group relative flex items-center gap-2 px-4 py-3 rounded-t-xl cursor-pointer whitespace-nowrap border-t border-x transition-all select-none min-w-[120px] justify-center
                        ${activePageIndex === index
                          ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 border-b-transparent text-blue-600 dark:text-blue-400 font-bold z-10 translate-y-[1px]'
                          : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 border-transparent hover:border-slate-200 mb-0.5'
                        }
                      `}
                    >
                      {/* Doppio click per rinominare */}
                      <span onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isLocked) return;
                        const newName = prompt("Rinomina categoria/pagina:", page.name);
                        if (newName && newName.trim()) {
                          setCurrentBoard(p => {
                            const c = { ...p };
                            c.pages[index].name = newName.trim();
                            return c;
                          });
                        }
                      }} title="Doppio click per rinominare">
                        {page.name}
                      </span>

                      {!isLocked && currentBoard.pages.length > 1 && activePageIndex === index && (
                        <button
                          className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-colors ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Eliminare la pagina "${page.name}" e tutti i suoi simboli?`)) {
                              setCurrentBoard(p => {
                                const c = { ...p };
                                c.pages.splice(index, 1);
                                return c;
                              });
                              setActivePageIndex(0);
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Tasto Aggiungi Pagina (Sempre visibile e indipendente) */}
                  {!isLocked && (
                    <button
                      onClick={() => {
                        const defaultName = `Pagina ${currentBoard.pages.length + 1}`;
                        const name = prompt('Nome nuova categoria (es. Cibo, Giochi):', defaultName);
                        if (name) {
                          setCurrentBoard(p => ({
                            ...p,
                            pages: [...p.pages, { id: crypto.randomUUID(), name, items: [] }]
                          }));
                          // Switch automatico alla nuova pagina
                          setTimeout(() => setActivePageIndex(currentBoard.pages.length), 50);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-2 mb-1 ml-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Aggiungi nuova pagina vuota"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={`min-h-[60vh] p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border-2 ${isLocked ? 'border-transparent' : 'border-dashed border-slate-200 dark:border-slate-700'} ${getActiveItems().length === 0 && currentBoard.type !== 'token' ? 'flex items-center justify-center' : ''}`}>
              {/* --- RENDERER TIMER VISIVO --- */}
              {currentBoard.type === 'timer' && (
                <VisualTimer
                  settings={currentBoard.settings}
                  customSounds={customSounds}
                  onAddCustomSound={handleAddCustomSound}
                  onUpdateSettings={(key: any, value: any) => {
                    setCurrentBoard({
                      ...currentBoard,
                      settings: { ...currentBoard.settings, [key]: value }
                    });
                  }}
                  onSelectImage={() => { setEditingContext({ type: 'timerImage' }); setShowSearch(true); }}
                />
              )}
              {currentBoard.type === 'token' && (
                <div className={`flex flex-col md:flex-row h-full gap-6 ${linkedSchedule ? 'justify-between' : 'justify-center'}`}>
                  {linkedSchedule && (
                    <div className="w-full md:w-1/3 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                      <h3 className="font-bold text-slate-500 mb-3 flex items-center gap-2"><ListOrdered className="w-4 h-4" /> Agenda</h3>
                      <div className="flex-1 overflow-y-auto space-y-3">
                        {linkedSchedule.items && linkedSchedule.items.map(item => (
                          <div key={item.id} onClick={() => toggleComplete(item.id)} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${item.completed ? 'bg-slate-100 opacity-60 grayscale' : 'bg-white dark:bg-slate-700'}`}>
                            <div className={`p-1 rounded-full mr-3 ${item.completed ? 'text-green-600' : 'text-slate-300'}`}><CheckCircle2 className="w-6 h-6" /></div>
                            <div className="w-12 h-12 mr-3 flex items-center justify-center">
                              {item.iconId ? (() => { const IconComp = getIconComponent(item.iconId); const style = getPresetStyle(item.iconId); return <IconComp className={`w-8 h-8 ${style.icon}`} />; })() : item.imageUrl ? <img src={item.imageUrl} className="max-w-full max-h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <ImageIcon className="text-slate-300" />}
                            </div>
                            <span className={`font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={`flex flex-col items-center justify-center space-y-8 ${linkedSchedule ? 'w-full md:w-2/3' : 'w-full max-w-2xl'}`}>
                    <div className="flex flex-wrap justify-center gap-4">
                      {Array.from({ length: currentBoard.settings.tokenCount }).map((_, idx) => {
                        const isEarned = idx < (currentBoard.settings.earnedCount || 0);
                        const tokenImg = currentBoard.settings.tokenImage;
                        const isPreset = tokenImg?.iconId;
                        const style = isPreset ? getPresetStyle(tokenImg.iconId) : { bg: 'bg-white dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600' };

                        // Dynamic color for custom images
                        const customStyle = !isPreset && isEarned && tokenImg?.dominantColor ? {
                          backgroundColor: `rgba(${tokenImg.dominantColor.r}, ${tokenImg.dominantColor.g}, ${tokenImg.dominantColor.b}, 0.2)`,
                          borderColor: `rgb(${tokenImg.dominantColor.r}, ${tokenImg.dominantColor.g}, ${tokenImg.dominantColor.b})`
                        } : {};

                        return (
                          <div key={idx} onClick={() => toggleToken(idx)}
                            style={customStyle}
                            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-sm ${isEarned ? (isPreset ? `${style.bg} ${style.border}` : 'bg-amber-100 border-amber-400') : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                            {isEarned && (
                              tokenImg ? (
                                tokenImg.iconId ? (
                                  (() => { const IconComp = getIconComponent(tokenImg.iconId); const iconStyle = getPresetStyle(tokenImg.iconId); return <IconComp className={`w-14 h-14 ${iconStyle.icon} animate-in zoom-in spin-in-12 duration-300`} />; })()
                                ) : (
                                  <img src={tokenImg.imageUrl} className="w-14 h-14 object-contain animate-in zoom-in spin-in-12 duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                )
                              ) : <Star className="w-12 h-12 text-amber-500 fill-amber-500 animate-in zoom-in duration-300" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <ArrowDown className="w-10 h-10 text-slate-300 animate-bounce" />
                    <div className={`w-64 aspect-square rounded-2xl border-4 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 shadow-xl transition-all ${(currentBoard.settings.earnedCount >= currentBoard.settings.tokenCount) ? 'border-green-500 ring-4 ring-green-200 scale-105' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-2">
                        {currentBoard.settings.rewardImage ? (currentBoard.settings.rewardImage.iconId ? (() => { const IconComp = getIconComponent(currentBoard.settings.rewardImage.iconId); const style = getPresetStyle(currentBoard.settings.rewardImage.iconId); return <IconComp className={`w-24 h-24 ${style.icon}`} />; })() : <img src={currentBoard.settings.rewardImage.imageUrl} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />) : <Trophy className="w-24 h-24 text-slate-200" />}
                      </div>
                      <span className="font-extrabold text-xl text-slate-700 dark:text-white uppercase">PREMIO</span>
                    </div>
                  </div>
                </div>
              )}
              {/* --- RENDERER STORIE SOCIALI (Print Optimized) --- */}
              {currentBoard.type === 'story' && (
                <div className="flex flex-col h-full relative pb-32">
                  {/* Header Strumenti Storia (Visibile solo a schermo) */}
                  <div className="print:hidden w-full bg-pink-50 dark:bg-pink-900/20 p-3 rounded-xl border border-pink-100 dark:border-pink-800 mb-4 flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 text-pink-800 dark:text-pink-200 text-sm font-bold">
                      <BookOpen className="w-5 h-5" />
                      <span>Editor Storia</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Selettore Orientamento Stampa */}
                      <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-pink-200 dark:border-pink-800">
                        <button
                          onClick={() => updateTokenSettings('printOrientation', 'portrait')}
                          className={`px-3 py-2 min-h-touch rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${(!currentBoard.settings.printOrientation || currentBoard.settings.printOrientation === 'portrait') ? 'bg-pink-100 text-pink-800' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                          <div className="w-3 h-4 border-2 border-current rounded-sm"></div> Vert.
                        </button>
                        <button
                          onClick={() => updateTokenSettings('printOrientation', 'landscape')}
                          className={`px-3 py-2 min-h-touch rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${(currentBoard.settings.printOrientation === 'landscape') ? 'bg-pink-100 text-pink-800' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                          <div className="w-4 h-3 border-2 border-current rounded-sm"></div> Orizz.
                        </button>
                      </div>
                      <button onClick={() => window.print()} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 min-h-touch rounded-lg font-bold flex items-center gap-2 shadow-sm text-sm">
                        <Printer className="w-4 h-4" /> Stampa
                      </button>
                    </div>
                  </div>

                  {/* Area Contenuto Storia - AGGIUNTA CLASSE print-only-content */}
                  <div className="story-print-container print-only-content flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-y-auto min-h-[50vh]">
                    {activeItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 print:hidden">
                        <BookOpen className="w-16 h-16 mb-4" />
                        <p>Scrivi la tua storia nella barra in basso...</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-end gap-x-4 gap-y-8 content-start">
                        {activeItems.map((item, index) => (
                          <div key={item.id} className="group relative flex flex-col items-center justify-end w-[3.5cm] break-inside-avoid">

                            {/* Pulsante Unisci parole */}
                            {!isLocked && index < activeItems.length - 1 && (
                              <button
                                onClick={async () => {
                                  const nextItem = activeItems[index + 1];
                                  const newLabel = item.label + " " + nextItem.label;
                                  removeItem(nextItem.id);
                                  updateLabel(item.id, newLabel);
                                  const result = await quickSearchArasaac(newLabel);
                                  if (result.found) {
                                    setCurrentBoard(prev => {
                                      const copy = { ...prev };
                                      copy.items = copy.items.map(i => i.id === item.id ? { ...i, imageUrl: result.imageUrl, sourceId: result.sourceId } : i);
                                      return copy;
                                    });
                                  }
                                }}
                                className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-slate-100 border border-slate-300 hover:bg-blue-500 hover:text-white text-slate-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm print:hidden"
                              >
                                <LinkIcon className="w-3 h-3" />
                              </button>
                            )}

                            {/* Immagine */}
                            <div
                              onClick={() => {
                                if (!isLocked) {
                                  setEditingContext({ type: 'item', id: item.id, initialTerm: item.label });
                                  setShowSearch(true);
                                }
                              }}
                              className={`w-full aspect-square border-2 ${!isLocked ? 'border-slate-100 hover:border-pink-400 cursor-pointer' : 'border-transparent'} rounded-xl overflow-hidden mb-1 bg-white relative shadow-sm print:border-none print:shadow-none`}
                            >
                              {item.imageUrl ? (
                                <img src={item.imageUrl} className="w-full h-full object-contain p-1" />
                              ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 font-bold text-xs uppercase p-2 text-center break-words print:bg-transparent">
                                  {item.label}
                                </div>
                              )}
                              {!isLocked && <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 print:hidden"><button onClick={(e) => { e.stopPropagation(); removeItem(item.id) }} className="bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button></div>}
                            </div>

                            {/* Testo Editabile (Input a schermo, Testo in stampa) */}
                            {!isLocked ? (
                              <input
                                className="w-full text-center font-sans font-bold text-lg bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none transition-colors text-slate-800 dark:text-slate-200 print:hidden"
                                value={item.label}
                                onChange={(e) => updateLabel(item.id, e.target.value)}
                              />
                            ) : null}
                            {/* Testo visibile SEMPRE in stampa o se bloccato */}
                            <span className={`text-lg font-bold font-sans text-center leading-tight text-slate-800 dark:text-slate-200 ${!isLocked ? 'hidden print:block' : ''}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Barra Input */}
                  {!isLocked && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 print:hidden">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex gap-2 items-center ring-4 ring-pink-50 dark:ring-pink-900/20">
                        <input
                          type="text"
                          placeholder="Scrivi qui la storia..."
                          className="flex-1 bg-transparent px-4 py-3 outline-none text-slate-800 dark:text-white text-lg placeholder:text-slate-400"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const text = e.currentTarget.value;
                              e.currentTarget.value = '';
                              const words = text.split(' ').filter(w => w.trim());
                              setIsSaving(true);
                              const newItems = await Promise.all(words.map(async (word) => {
                                const search = await quickSearchArasaac(word);
                                return { id: crypto.randomUUID(), label: word, imageUrl: search.imageUrl, sourceId: search.sourceId, completed: false };
                              }));
                              setCurrentBoard(prev => ({ ...prev, items: [...(prev.items || []), ...newItems] }));
                              setIsSaving(false);
                            }
                          }}
                        />
                        <div className="bg-pink-600 text-white p-3 rounded-xl"><ArrowRight className="w-6 h-6" /></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- RENDERER PECS GENERATOR (Grid Fissa & Sicura) --- */}
              {currentBoard.type === 'pecs' && (
                <div className="flex flex-col items-center w-full">
                  <div className="print:hidden w-full max-w-4xl bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-6 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-4 items-end">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="pecs-lato" className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-300">Lato (cm)</label>
                        <input id="pecs-lato" type="number" step="0.5" min="1" max="10" value={currentBoard.settings.cardWidth} onChange={(e) => updateTokenSettings('cardWidth', parseFloat(e.target.value))} className="w-20 px-2 py-2 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="pecs-etichetta" className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-300">Etichetta</label>
                        <select id="pecs-etichetta" value={currentBoard.settings.labelPosition} onChange={(e) => updateTokenSettings('labelPosition', e.target.value)} className="px-3 py-2 min-h-touch rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                          <option value="bottom">Sotto</option>
                          <option value="top">Sopra</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 min-h-touch rounded-lg font-bold flex items-center gap-2 shadow-md"><Printer className="w-4 h-4" /> Stampa / PDF</button>
                  </div>

                  {/*
                    Anteprima A4 a dimensione reale: su schermi stretti la
                    riduciamo in scala invece di far scorrere la pagina in
                    orizzontale. In stampa la scala torna sempre a 1:1.
                  */}
                  <div ref={pecsWrapRef} className="pecs-sheet-wrap w-full overflow-hidden print:overflow-visible" style={{ height: `calc(29.7cm * ${pecsScale})` }}>
                  <div
                    className="print-only-content pecs-sheet bg-white shadow-2xl print:shadow-none w-[21cm] h-[29.7cm] print:w-full print:h-full relative border box-border print:border-none origin-top-left"
                    style={{ transform: `scale(${pecsScale})` }}
                  >
                    {/* Grid Container */}
                    <div className="w-full h-full flex flex-wrap content-start">
                      {(() => {
                        // USARE 29.0cm INVECE DI 29.7cm PER EVITARE IL TAGLIO
                        const SAFE_PRINTABLE_HEIGHT = 29.0;

                        const size = currentBoard.settings.cardWidth; // cm
                        const cols = Math.floor(21 / size);
                        const rows = Math.floor(SAFE_PRINTABLE_HEIGHT / size);
                        const totalCells = cols * rows;

                        const displayItems = [...activeItems];
                        while (displayItems.length < totalCells) {
                          displayItems.push({ id: `ghost-${displayItems.length}`, isGhost: true });
                        }

                        return displayItems.slice(0, totalCells).map((item, idx) => (
                          <div
                            key={item.id}
                            className="relative box-border flex items-center justify-center overflow-hidden"
                            style={{
                              width: `${size}cm`,
                              height: `${size}cm`,
                              borderRight: '1px solid black',
                              borderBottom: '1px solid black',
                              borderTop: idx < cols ? '1px solid black' : 'none',
                              borderLeft: (idx % cols) === 0 ? '1px solid black' : 'none'
                            }}
                          >
                            {!item.isGhost ? (
                              <div className="w-full h-full p-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 print:hover:bg-transparent" onClick={() => { if (isLocked) return; setEditingContext({ type: 'item', id: item.id, initialTerm: item.label }); setShowSearch(true); }}>
                                {currentBoard.settings.labelPosition === 'top' && <span className="text-[10px] font-bold uppercase text-center w-full truncate mb-0.5 leading-none font-sans text-black">{item.label}</span>}
                                <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-contain" /> : item.iconId ? (() => { const IconComp = getIconComponent(item.iconId); return <IconComp className="w-4/5 h-4/5 text-black" />; })() : null}
                                </div>
                                {currentBoard.settings.labelPosition === 'bottom' && <span className="text-[10px] font-bold uppercase text-center w-full truncate mt-0.5 leading-none font-sans text-black">{item.label}</span>}
                                {!isLocked && <button onClick={(e) => { e.stopPropagation(); removeItem(item.id) }} className="absolute top-0.5 right-0.5 z-10 text-red-500 hover:text-red-700 print:hidden"><X className="w-3 h-3" /></button>}
                              </div>
                            ) : (
                              !isLocked ? (
                                <div onClick={() => { setEditingContext(null); setShowSearch(true); }} className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer text-indigo-300 hover:bg-indigo-50 transition-all print:hidden">
                                  <Plus className="w-6 h-6" />
                                </div>
                              ) : null
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  </div>
                </div>
              )}
              {/* Messaggio "Vuoto" (NASCOSTO PER IL TIMER) */}
              {currentBoard.type !== 'token' && currentBoard.type !== 'story' && currentBoard.type !== 'pecs' && currentBoard.type !== 'timer' && activeItems.length === 0 && (
                <div className="text-center text-slate-400">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-full inline-block mb-3 shadow-sm"><ImageIcon className="w-8 h-8 opacity-50" /></div>
                  <p>{isLocked ? "Nessun elemento." : "Clicca \"Aggiungi\" per iniziare."}</p>
                </div>
              )}

              {/* Render Standard per Grid e Sequence */}
              {(currentBoard.type === 'grid' || currentBoard.type === 'sequence') && (
                currentBoard.type === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {activeItems.map((item, index) => (
                      <div
                        key={item.id}
                        draggable={!isLocked}
                        onDragStart={(e) => handleDragStart(e, index)}
                        // USARE IL NUOVO GESTORE
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`relative ${!isLocked ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform' : ''}`}
                      >
                        {/* --- INDICATORE LINEA BLU (GRID) --- */}
                        {!isLocked && dropIndicator.index === index && (
                          <div className={`absolute z-50 bg-blue-500 rounded-full shadow-md pointer-events-none
                            ${dropIndicator.position === 'before' ? '-left-3' : '-right-3'}
                            top-0 bottom-0 w-1.5 h-full`}
                          />
                        )}
                        {/* ----------------------------------- */}

                        <PictogramCard
                          item={item}
                          mode="grid"
                          isLocked={isLocked}
                          isActive={activeItemId === item.id}
                          onClick={handleChildClick}
                          onRemove={removeItem}
                          onReplaceImage={(id) => { setEditingContext({ type: 'item', id }); setShowSearch(true); }}
                          onEditLabel={updateLabel}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${currentBoard.settings?.orientation === 'vertical' ? 'flex flex-col gap-4 w-full max-w-md mx-auto' : 'flex gap-4 overflow-x-auto pb-6 pt-2 snap-x px-2 h-full items-center w-full'}`}>
                    {activeItems.map((item, index) => (
                      <div
                        key={item.id}
                        draggable={!isLocked}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`relative ${currentBoard.settings?.orientation === 'vertical' ? 'w-full' : 'snap-center'}`}
                      >
                        {/* --- INDICATORE LINEA BLU (SEQUENCE) --- */}
                        {!isLocked && dropIndicator.index === index && (
                          <div className={`absolute z-50 bg-blue-500 rounded-full shadow-md pointer-events-none
                             ${currentBoard.settings?.orientation === 'vertical'
                              ? (dropIndicator.position === 'before' ? '-top-3 left-0 right-0 h-1.5 w-full' : '-bottom-3 left-0 right-0 h-1.5 w-full') // Orizzontale per lista vert.
                              : (dropIndicator.position === 'before' ? '-left-3 top-0 bottom-0 w-1.5 h-full' : '-right-3 top-0 bottom-0 w-1.5 h-full') // Verticale per lista orizz.
                            }`}
                          />
                        )}
                        {/* --------------------------------------- */}

                        <PictogramCard
                          item={item}
                          mode="sequence"
                          orientation={currentBoard.settings?.orientation}
                          isLocked={isLocked}
                          isActive={activeItemId === item.id}
                          onClick={handleChildClick}
                          onRemove={removeItem}
                          onReplaceImage={(id) => { setEditingContext({ type: 'item', id }); setShowSearch(true); }}
                          onEditLabel={updateLabel}
                          onToggleComplete={toggleComplete}
                        />
                        {index < activeItems.length - 1 && <div className="flex justify-center p-2 text-slate-300">{currentBoard.settings?.orientation === 'vertical' ? <ArrowDown className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}</div>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            <div className="print:hidden fixed bottom-safe right-4 sm:right-6 z-50">
              <button
                onClick={() => setIsLocked(!isLocked)}
                aria-pressed={isLocked}
                aria-label={isLocked ? 'Sblocca la modifica del progetto' : 'Blocca il progetto per l\'uso con il bambino'}
                title={isLocked ? 'Modalità bambino attiva — tocca per modificare' : 'Blocca per l\'uso con il bambino'}
                className={`p-4 min-h-touch min-w-touch rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center text-white ${isLocked ? 'bg-red-600' : 'bg-emerald-600'}`}
              >
                {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}
      </main>
      <SearchModal
        isOpen={showSearch}
        onClose={() => { setShowSearch(false); setEditingContext(null); }}
        onSelect={handleSearchSelect}
        initialQuery={editingContext?.initialTerm}
        boards={boards} // <--- AGGIUNTO QUI: Passiamo la lista progetti al modale
      />
      {/* AGGIUNGI QUESTO: */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <SyncBackupModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} boards={boards} onRefresh={loadBoards} />

    </div>
  );
}