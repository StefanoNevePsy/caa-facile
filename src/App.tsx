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
  ChevronDown // Icone per il Timer e Suono
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { removeBackground } from "@imgly/background-removal";
// Aggiungi questi import in alto
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

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
const DB_VERSION = 1;

// Mappa delle icone predefinite con stili coordinati (Sfondo, Bordo, Icona)
// Mappa delle icone predefinite con stili coordinati (Sfondo, Bordo, Icona, RGB per timer)
const PRESET_ICONS = [
  { id: 'star', label: 'Stella', icon: Star, rgb: {r:245, g:158, b:11}, // Amber
    style: { bg: 'bg-amber-100', border: 'border-amber-400', icon: 'text-amber-500 fill-amber-400' } },
  { id: 'heart', label: 'Cuore', icon: Heart, rgb: {r:239, g:68, b:68}, // Red
    style: { bg: 'bg-red-100', border: 'border-red-400', icon: 'text-red-500 fill-red-500' } },
  { id: 'thumbsup', label: 'Super', icon: ThumbsUp, rgb: {r:37, g:99, b:235}, // Blue
    style: { bg: 'bg-blue-100', border: 'border-blue-400', icon: 'text-blue-600 fill-blue-400' } },
  { id: 'smile', label: 'Sorriso', icon: Smile, rgb: {r:202, g:138, b:4}, // Yellow
    style: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-600 fill-yellow-200' } },
  { id: 'crown', label: 'Re/Regina', icon: Crown, rgb: {r:147, g:51, b:234}, // Purple
    style: { bg: 'bg-purple-100', border: 'border-purple-400', icon: 'text-purple-600 fill-purple-400' } },
  { id: 'trophy', label: 'Coppa', icon: Trophy, rgb: {r:234, g:179, b:8}, // Yellow-500
    style: { bg: 'bg-yellow-50', border: 'border-yellow-500', icon: 'text-yellow-600 fill-yellow-400' } },
  { id: 'medal', label: 'Medaglia', icon: Medal, rgb: {r:249, g:115, b:22}, // Orange
    style: { bg: 'bg-orange-100', border: 'border-orange-400', icon: 'text-orange-600 fill-orange-400' } },
  { id: 'rocket', label: 'Razzo', icon: Rocket, rgb: {r:79, g:70, b:229}, // Indigo
    style: { bg: 'bg-indigo-100', border: 'border-indigo-400', icon: 'text-indigo-600 fill-indigo-400' } },
  { id: 'zap', label: 'Fulmine', icon: Zap, rgb: {r:234, g:179, b:8}, // Yellow
    style: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-500 fill-yellow-500' } },
  { id: 'flower', label: 'Fiore', icon: Flower, rgb: {r:236, g:72, b:153}, // Pink
    style: { bg: 'bg-pink-100', border: 'border-pink-400', icon: 'text-pink-500 fill-pink-400' } },
  { id: 'cat', label: 'Gatto', icon: Cat, rgb: {r:120, g:113, b:108}, // Stone
    style: { bg: 'bg-stone-200', border: 'border-stone-400', icon: 'text-stone-600 fill-stone-400' } },
  { id: 'dog', label: 'Cane', icon: Dog, rgb: {r:146, g:64, b:14}, // Amber-800
    style: { bg: 'bg-amber-200', border: 'border-amber-600', icon: 'text-amber-800 fill-amber-700' } },
  { id: 'car', label: 'Auto', icon: Car, rgb: {r:220, g:38, b:38}, // Red
    style: { bg: 'bg-red-50', border: 'border-red-500', icon: 'text-red-600 fill-red-600' } },
  { id: 'music', label: 'Musica', icon: Music, rgb: {r:14, g:165, b:233}, // Sky
    style: { bg: 'bg-sky-100', border: 'border-sky-400', icon: 'text-sky-600 fill-sky-400' } },
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
        if (data[i+3] > 128) { 
          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }
      }

      if (count === 0) resolve({ r: 240, g: 240, b: 240 });
      else resolve({ r: r/count, g: g/count, b: b/count });
    };
    img.onerror = () => resolve({ r: 200, g: 200, b: 200 });
  });
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = async (base64) => {
  const res = await fetch(base64);
  return await res.blob();
};

/**
 * ==========================================
 * NATIVE INDEXEDDB UTILITIES
 * ==========================================
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('boards')) {
        const store = db.createObjectStore('boards', { keyPath: 'id', autoIncrement: true });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('images')) {
        const store = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
        store.createIndex('sourceId', 'sourceId', { unique: false });
      }
    };
  });
};

const dbOperations = {
  async getAllBoards() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readonly');
      const store = transaction.objectStore('boards');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async getAllImages() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async addBoard(board) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.put(board);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getBoard(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readonly');
      const store = transaction.objectStore('boards');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBoard(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getImageBySourceId(sourceId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.add(imageRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async clearDatabase() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards', 'images'], 'readwrite');
      transaction.objectStore('boards').clear();
      transaction.objectStore('images').clear();
      transaction.oncomplete = () => resolve();
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

const getImageUrl = async (sourceId) => {
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
const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
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
const loadImageElement = (src) => {
  return new Promise((resolve, reject) => {
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

import { pipeline, env, AutoModel, AutoProcessor, RawImage, Tensor } from '@xenova/transformers';

// Assicurati che gli import siano corretti:
// import { env, AutoModel, AutoProcessor, RawImage } from '@xenova/transformers';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';

const processAdvancedImage = async (originalBlobUrl, cropArea, enableAI, enableShadow) => {
  try {
    // 1. Ritaglio preliminare (se necessario)
    let currentUrl = originalBlobUrl;
    if (cropArea) {
      currentUrl = await getCroppedImg(originalBlobUrl, cropArea);
    }

    let resultImageElement; // Useremo elementi Image standard HTML

    if (enableAI) {
      // --- CONFIGURAZIONE AI ---
      const modelId = 'rmbg-1.4-v2'; 

      // A. Carichiamo il modello
      const model = await AutoModel.from_pretrained(modelId, {
        quantized: true,
        local_files_only: true,
        config: { model_type: 'segformer' } 
      });

      // B. Carichiamo il processore
      const processor = await AutoProcessor.from_pretrained(modelId, {
    local_files_only: true,
    config: {
        do_normalize: true,
        do_pad: true, // Cambiato in true per gestire meglio i riquadri bianchi esterni
        do_rescale: true,
            image_mean: [0.5, 0.5, 0.5],
            feature_extractor_type: "ImageFeatureExtractor",
            image_std: [1, 1, 1],
            resample: 2,
            rescale_factor: 0.00392156862745098,
            size: { width: 1024, height: 1024 }
        }
      });

      // C. Prepariamo l'input
      const image = await RawImage.fromURL(currentUrl);
      const { pixel_values } = await processor(image);

      // D. Inferenza (AI)
      const { output } = await model({ input: pixel_values });

      // --- RICOSTRUZIONE MANUALE (NO createBitmap) ---
      
      // 1. Dati Maschera
      const rawData = output[0].mul(255).to('uint8').data;
      const width = 1024;
      const height = 1024;
      const pixelCount = width * height;
      const rgbaData = new Uint8ClampedArray(pixelCount * 4);
      
      // 2. Creiamo il buffer RGBA per la maschera
      for (let i = 0; i < pixelCount; i++) {
        const val = rawData[i]; 
        rgbaData[i * 4] = 0;     
        rgbaData[i * 4 + 1] = 0; 
        rgbaData[i * 4 + 2] = 0; 
        rgbaData[i * 4 + 3] = val; // Alpha
      }
      
      const maskImageData = new ImageData(rgbaData, width, height);

      // E. Applicazione Maschera (Blending) su Canvas
      const canvas = document.createElement('canvas');
      // Carichiamo l'originale usando il metodo sicuro per Android
      const originalImgEl = await loadImageElement(currentUrl);
      
      canvas.width = originalImgEl.width;
      canvas.height = originalImgEl.height;
      const ctx = canvas.getContext('2d');

      // Disegna immagine originale
      ctx.drawImage(originalImgEl, 0, 0);

      // Prepara la maschera
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width; 
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.putImageData(maskImageData, 0, 0);

      // Applica la maschera
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0, width, height, 0, 0, originalImgEl.width, originalImgEl.height);

      // Risultato intermedio come URL per ricaricarlo come elemento
      const processedBlob = await new Promise(r => canvas.toBlob(r));
      const processedUrl = URL.createObjectURL(processedBlob);
      resultImageElement = await loadImageElement(processedUrl);

    } else {
      // FALLBACK (No AI) - Caricamento sicuro
      resultImageElement = await loadImageElement(currentUrl);
    }

    // --- Composizione Card Finale (500x500) ---
    const finalCanvas = document.createElement('canvas');
    const fCtx = finalCanvas.getContext('2d');
    const size = 500; 
    finalCanvas.width = size;
    finalCanvas.height = size;

    fCtx.clearRect(0, 0, size, size);

    // Centratura e Scala
    const scaleFactor = Math.min((size * 0.9) / resultImageElement.width, (size * 0.9) / resultImageElement.height);
    const w = resultImageElement.width * scaleFactor;
    const h = resultImageElement.height * scaleFactor;
    const x = (size - w) / 2;
    const y = (size - h) / 2;

    // Ombra
    if (enableShadow) {
      fCtx.save();
      fCtx.translate(x + w / 2, y + h); 
      fCtx.scale(1, 0.3); 
      fCtx.transform(1, 0, -0.5, 1, 0, 0); 
      fCtx.filter = 'blur(10px)';
      fCtx.fillStyle = 'rgba(0,0,0,0.4)'; 
      fCtx.fillRect(-w/2, -h/5, w, h/3); 
      fCtx.restore();
    }

    // Disegna l'elemento immagine finale
    fCtx.drawImage(resultImageElement, x, y, w, h);

    return new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));

  } catch (error) {
    console.error("Errore elaborazione immagine:", error);
    alert("Errore: " + error.message);
    // Fallback sicuro in caso di errore
    return processAdvancedImage(originalBlobUrl, cropArea, false, enableShadow);
  }
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

  const searchArasaac = async (term) => {
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
    if(!urlInput) return;
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
            <button key={tab} onClick={() => { setActiveTab(tab); setResults([]); if(tab !== 'arasaac') setQuery(''); }} className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
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
                  )})}
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
                             {b.type === 'grid' ? <LayoutGrid className="w-5 h-5"/> : <ListOrdered className="w-5 h-5"/>}
                           </div>
                           <div className="flex-1">
                             <div className="font-bold text-slate-800 dark:text-slate-200">{b.title}</div>
                             <div className="text-xs text-slate-500">{new Date(b.updatedAt).toLocaleDateString()}</div>
                           </div>
                           <ArrowRight className="w-4 h-4 text-slate-300"/>
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
                           <ArrowLeft className="w-4 h-4"/> Indietro
                        </button>
                        
                        {selectedBoard.type === 'grid' && selectedBoard.pages && selectedBoard.pages.length > 1 ? (
                           <div className="flex items-center gap-2">
                              <button 
                                disabled={selectedPageIndex === 0}
                                onClick={() => setSelectedPageIndex(prev => Math.max(0, prev - 1))}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                              >
                                <ArrowLeft className="w-5 h-5"/>
                              </button>
                              <span className="text-xs font-bold uppercase text-slate-500">
                                 {selectedBoard.pages[selectedPageIndex].name} ({selectedPageIndex + 1}/{selectedBoard.pages.length})
                              </span>
                              <button 
                                disabled={selectedPageIndex >= selectedBoard.pages.length - 1}
                                onClick={() => setSelectedPageIndex(prev => Math.min(selectedBoard.pages.length - 1, prev + 1))}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                              >
                                <ArrowRight className="w-5 h-5"/>
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
                                        {item.imageUrl ? <img src={item.imageUrl} className="max-w-full max-h-full object-contain"/> : item.iconId ? (() => { const IconComp = getIconComponent(item.iconId); return <IconComp className="w-8 h-8"/> })() : <div className="text-xs text-slate-300">No IMG</div>}
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
  const [processing, setProcessing] = useState(false);
  
  // Reset
  useEffect(() => {
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }, [imageSrc]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen || !imageSrc) return null;

  const handleSave = async () => {
    setProcessing(true);
    try {
      const finalBlob = await processAdvancedImage(imageSrc, croppedAreaPixels, removeBg, addShadow);
      onSave(finalBlob);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore elaborazione: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-0 md:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl overflow-hidden flex flex-col relative">
        
        {/* HEADER */}
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0 z-20">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <CropIcon className="w-5 h-5"/> Editor Immagine
          </h3>
          <button onClick={onClose} disabled={processing} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
            <X className="w-6 h-6"/>
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
            <input type="range" value={zoom} min={0.5} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
          </div>

          <div className="flex flex-col gap-3">
             <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${removeBg ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="checkbox" checked={removeBg} onChange={() => setRemoveBg(!removeBg)} className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-blue-500" />
                <div className="flex-1">
                   <div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white"><Wand2 className="w-4 h-4 text-blue-500"/> Rimuovi Sfondo (AI)</div>
                   {removeBg && <div className="mt-2 text-[11px] leading-tight p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 rounded-lg flex gap-2"><span className="text-base">⚡</span><div><strong>Elaborazione su dispositivo:</strong> Sfrutta la potenza del tuo processore.</div></div>}
                </div>
             </label>
             <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${addShadow ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="checkbox" checked={addShadow} onChange={() => setAddShadow(!addShadow)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                <div className="flex-1"><div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white"><Layers className="w-4 h-4 text-indigo-500"/> Aggiungi Ombra</div></div>
             </label>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0 z-20 pb-8 md:pb-4">
           <button onClick={onClose} disabled={processing} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Annulla</button>
           <button onClick={handleSave} disabled={processing} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg">{processing ? "Elaborazione..." : "Salva"}</button>
        </div>
      </div>
    </div>
  );
};

// --- CARD COMPONENT (AGGIORNATO CON EVIDENZIAZIONE) ---
const PictogramCard = ({ 
  item, 
  onRemove, 
  onToggleComplete, 
  onEditLabel, 
  onReplaceImage, 
  mode, 
  orientation, 
  isLocked, 
  // Nuove props per l'interazione
  isActive, 
  onClick 
}) => {
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
          <p onClick={(e) => { if(!isLocked && onEditLabel) { e.stopPropagation(); setIsEditing(true); }}} className={`font-bold uppercase tracking-wide truncate ${!isLocked && onEditLabel ? 'cursor-text hover:text-blue-600 dark:hover:text-blue-400' : ''} ${item.completed ? 'line-through decoration-2 text-slate-400' : 'text-slate-800 dark:text-slate-200'} ${isVerticalSequence ? 'text-xl' : 'text-sm md:text-base'}`}>{item.label}</p>
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
                  Routine giornaliere o sequenze. Spunta le azioni completate <CheckCircle2 className="w-3 h-3 inline"/>.
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
                        <span><strong>Aggiungi:</strong> Usa il tasto <Plus className="w-3 h-3 inline"/> per inserire nuovi simboli.</span>
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

          {/* 3. RICERCA E AGGIUNTA VELOCE */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              3. Ricerca Immagini & Trucchi
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
              4. Timer Visivo
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
                <Save className="w-4 h-4"/> Salvataggio e Backup
             </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                L'app salva tutto in automatico nel tuo dispositivo. Tuttavia, è buona norma fare dei backup regolari.
             </p>
             <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-1 text-blue-600"><Download className="w-3 h-3"/> Esporta Backup (file .json)</span>
                <span className="flex items-center gap-1 text-green-600"><UploadIcon className="w-3 h-3"/> Importa Backup</span>
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
// --- SOTTOCOMPONENTE INPUT (Definito FUORI per evitare problemi di focus) ---
const TimeInput = ({ value, onChange, onFocus, onBlur, label, type, onArrowClick }) => {
  return (
    <div className="flex flex-col items-center gap-1 group">
       {/* Freccia Su */}
       <button 
         onClick={() => onArrowClick(type, 1)} 
         className="w-full h-5 flex items-center justify-center rounded-t-md bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
       >
         <ChevronUp className="w-3 h-3"/>
       </button>
       
       {/* Campo Input */}
       <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-2 rounded-lg w-[4.5rem] text-center shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <input 
            type="text"
            inputMode="numeric"
            value={value}
            onFocus={onFocus}
            onChange={(e) => onChange(type, e.target.value)}
            onBlur={onBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            className="w-full bg-transparent text-center text-3xl font-mono font-bold text-slate-700 dark:text-white outline-none appearance-none p-0 leading-none placeholder-slate-200"
            placeholder="00"
            autoComplete="off"
          />
          <span className="absolute top-1/2 -translate-y-1/2 -right-2 text-slate-300 font-bold text-xl pointer-events-none">{label}</span>
       </div>

       {/* Freccia Giù */}
       <button 
         onClick={() => onArrowClick(type, -1)} 
         className="w-full h-5 flex items-center justify-center rounded-b-md bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
       >
         <ChevronDown className="w-3 h-3"/>
       </button>
    </div>
  );
};

// --- COMPONENTE TIMER VISIVO PRINCIPALE ---
const VisualTimer = ({ settings, onUpdateSettings, onSelectImage }) => {
  const [timeLeft, setTimeLeft] = useState(settings.duration || 60);
  const [isActive, setIsActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  
  // --- STATI INPUT INDIPENDENTI ---
  const [inputMin, setInputMin] = useState("01");
  const [inputSec, setInputSec] = useState("00");
  const [activeField, setActiveField] = useState(null); // 'min', 'sec' o null

  // Input per nuovi preset (in basso)
  const [newMin, setNewMin] = useState("");
  const [newSec, setNewSec] = useState("");
  
  const audioRef = useRef(null);
  const isDark = document.documentElement.classList.contains('dark');
  const presets = settings.presets || [60, 180, 300, 600];

  const getProgressColor = (pct) => {
    if (pct > 50) return 'bg-emerald-500';
    if (pct > 20) return 'bg-yellow-400';
    return 'bg-red-500';
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

  // 1. MOTORE DEL TIMER (Solo logic)
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsRinging(true);
      if (audioRef.current) {
        const soundId = settings.soundId || 'beep';
        const soundObj = TIMER_SOUNDS.find(s => s.id === soundId) || TIMER_SOUNDS[0];
        audioRef.current.src = soundObj.url;
        audioRef.current.loop = true;
        audioRef.current.play().catch(e => console.log("Audio blocked", e));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, settings.soundId]);

  // 2. SINCRONIZZAZIONE UNIDIREZIONALE (Timer -> Input)
  // Aggiorna gli input SOLO se l'utente NON sta scrivendo
  useEffect(() => {
    if (activeField === null) {
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      setInputMin(m);
      setInputSec(s);
    }
  }, [timeLeft, activeField]);

  // 3. AGGIORNAMENTO MANUALE (Input -> Stato Locale)
  const handleInputChange = (field, value) => {
    if (!/^\d{0,2}$/.test(value)) return; // Accetta solo 2 cifre
    if (field === 'min') setInputMin(value);
    else setInputSec(value);
  };

  // 4. COMMIT (Input -> Timer) - Quando esci dal campo
  const commitTime = () => {
    const m = parseInt(inputMin || "0", 10);
    const s = parseInt(inputSec || "0", 10);
    const newTotal = (m * 60) + s;
    
    setTimeLeft(newTotal);
    if (!isActive) onUpdateSettings('duration', newTotal);
    setActiveField(null); // Rilascia il lock
  };

  // Gestione Frecce
  const handleArrowClick = (field, direction) => {
    let m = parseInt(inputMin || "0", 10);
    let s = parseInt(inputSec || "0", 10);

    if (field === 'min') {
      m = Math.max(0, m + direction);
    } else {
      s = s + direction;
      if (s > 59) { s = 0; m++; }
      if (s < 0) { if (m > 0) { s = 59; m--; } else s = 0; }
    }
    
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
      onUpdateSettings('presets', [...presets, total].sort((a,b) => a-b));
      setNewMin(""); setNewSec("");
    }
  };

  const percentage = Math.min(100, (timeLeft / (settings.duration || 1)) * 100);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 animate-in fade-in">
      <audio ref={audioRef} preload="auto" />
      
      {/* HEADER CONTROLLI */}
      <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col gap-6">
        <div className="flex flex-wrap justify-between items-center gap-6">
           {/* GRUPPO CONTROLLO TEMPO */}
           <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex gap-4 pr-4 border-r border-slate-200 dark:border-slate-700">
                 <TimeInput 
                    value={inputMin} 
                    type="min" 
                    label=":" 
                    onFocus={() => setActiveField('min')}
                    onBlur={commitTime}
                    onChange={handleInputChange}
                    onArrowClick={handleArrowClick}
                 />
                 <TimeInput 
                    value={inputSec} 
                    type="sec" 
                    label="" 
                    onFocus={() => setActiveField('sec')}
                    onBlur={commitTime}
                    onChange={handleInputChange}
                    onArrowClick={handleArrowClick}
                 />
              </div>
              <div className="flex gap-2">
                 <button onClick={toggleTimer} className={`w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95 ${isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : isRinging ? 'bg-red-600 text-white animate-bounce' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                    {isRinging || isActive ? <Pause className="w-7 h-7 fill-current"/> : <Play className="w-7 h-7 fill-current ml-1"/>}
                 </button>
                 <button onClick={resetTimer} className="w-14 h-14 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-2xl flex items-center justify-center transition-colors">
                    <ResetIcon className="w-6 h-6"/>
                 </button>
              </div>
           </div>

           {/* OPZIONI RAPIDE */}
           <div className="flex flex-col items-end gap-2 ml-auto">
             <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <Volume2 className="w-4 h-4 text-slate-400 ml-2"/>
                <select value={settings.soundId || 'beep'} onChange={(e) => onUpdateSettings('soundId', e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer py-1 pr-2 max-w-[140px]">
                  {TIMER_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
             </div>
             <div className="flex items-center gap-1">
               <button onClick={() => manualUpdateTime(Math.max(0, timeLeft - 10))} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-100 transition-colors">-10s</button>
               <button onClick={() => manualUpdateTime(timeLeft + 10)} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-100 transition-colors">+10s</button>
             </div>
           </div>
        </div>
        
        {/* PRESET */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
           {presets.map(p => (
             <div key={p} className="relative group shrink-0">
                <button onClick={() => { stopAudio(); setIsActive(false); manualUpdateTime(p); }} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all shadow-sm min-w-[60px]">
                  {Math.floor(p / 60)}:{(p % 60).toString().padStart(2, '0')}
                </button>
                <button onClick={() => onUpdateSettings('presets', presets.filter(val => val !== p))} className="absolute -top-1.5 -right-1.5 bg-white text-red-500 border border-red-100 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"><X className="w-3 h-3"/></button>
             </div>
           ))}
           <div className="w-px h-8 bg-slate-200 mx-1"></div>
           <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200">
               <input type="number" placeholder="M" value={newMin} onChange={(e) => setNewMin(e.target.value)} className="w-8 bg-transparent text-center font-bold outline-none text-xs" />
               <span className="text-slate-300 text-xs">:</span>
               <input type="number" placeholder="S" value={newSec} onChange={(e) => setNewSec(e.target.value)} className="w-8 bg-transparent text-center font-bold outline-none text-xs" />
               <button onClick={addPreset} className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors"><Plus className="w-3 h-3"/></button>
           </div>
        </div>
      </div>

      {/* BOCCIA LIQUIDA */}
      <div 
        className="relative w-80 h-80 sm:w-[450px] sm:h-[450px] rounded-full border-[12px] border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-700"
        style={{ backgroundColor: getBackgroundColor() }}
      >
         {/* 1. Immagine Sotto */}
         <div className="absolute inset-0 flex items-center justify-center p-20 z-0 cursor-pointer" onClick={onSelectImage}>
            {settings.timerImage ? (
                settings.timerImage.imageUrl ? <img src={settings.timerImage.imageUrl} className="w-full h-full object-contain animate-in fade-in zoom-in duration-500 drop-shadow-md"/> : 
                settings.timerImage.iconId ? (() => { const IconComp = getIconComponent(settings.timerImage.iconId); const style = getPresetStyle(settings.timerImage.iconId); return <IconComp className={`w-40 h-40 ${style.icon} filter drop-shadow-sm`} />; })() : null
            ) : (
               <div className="flex flex-col items-center text-slate-300 dark:text-slate-600 transition-colors hover:text-blue-400"><ImageIcon className="w-20 h-20 mb-2 opacity-50"/><span className="text-xs font-bold uppercase tracking-widest">Tocca per immagine</span></div>
            )}
         </div>

         {/* 2. Liquido Coprente */}
         <div 
           className={`liquid-container ${getProgressColor(percentage)}`} 
           style={{ height: `${percentage}%` }} 
         >
            {percentage > 0.5 && percentage < 99.5 && (
              <>
                <div className="wave wave-back"></div>
                <div className="wave wave-front"></div>
              </>
            )}
         </div>

         {/* 3. Countdown */}
         {isActive && (
            <div className="absolute z-30 font-black text-6xl text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] opacity-90 pointer-events-none">
               {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
         )}
      </div>
    </div>
  );
};

// --- APP COMPONENT ---
export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [view, setView] = useState('dashboard'); 
  const [boards, setBoards] = useState([]);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState('all'); 
  const [dashboardSort, setDashboardSort] = useState('date-desc');
  const [currentBoard, setCurrentBoard] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(0); 
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [editingContext, setEditingContext] = useState(null); 
  const [linkedSchedule, setLinkedSchedule] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const fileInputRef = useRef(null); 
  const [showHelp, setShowHelp] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null); // NUOVO STATO
  const [dropIndicator, setDropIndicator] = useState({ index: null, position: null }); // { index: 0, position: 'before' | 'after' }

  const handleChildClick = (itemId) => {
    setActiveItemId(itemId);
    // Opzionale: Rimuovi l'evidenziazione dopo 2 secondi
    setTimeout(() => setActiveItemId(null), 2000);
    };

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);
    loadBoards();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

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
    const allBoards = await dbOperations.getAllBoards();
    const boardsWithCovers = await Promise.all(allBoards.map(async (b) => {
      if (b.coverImage && b.coverImage.sourceId && !b.coverImage.sourceId.startsWith('preset-')) {
           b.coverImage.imageUrl = await getImageUrl(b.coverImage.sourceId);
      }
      return b;
    }));
    setBoards(boardsWithCovers);
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
        localStorage.setItem('caa_snapshot_page', activePageIndex);
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
          const savedDate = new Date(localStorage.getItem('caa_snapshot_date'));
          const diffMins = (new Date() - savedDate) / 1000 / 60;

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
                    if (board.pages) board.pages = await Promise.all(board.pages.map(async p => ({...p, items: await refreshItems(p.items)})));
                    
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

  const exportData = async () => {
    try {
      const boardsData = await dbOperations.getAllBoards();
      const imagesData = await dbOperations.getAllImages();
      const imagesExport = await Promise.all(imagesData.map(async (img) => ({
        ...img,
        blob: await blobToBase64(img.blob)
      })));
      const backup = {
        date: new Date().toISOString(),
        version: 1,
        boards: boardsData,
        images: imagesExport
      };
      const blob = new Blob([JSON.stringify(backup)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caa_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Errore durante l'esportazione.");
      console.error(e);
    }
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("ATTENZIONE: L'importazione cancellerà tutti i dati attuali. Vuoi continuare?")) {
      e.target.value = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.boards || !backup.images) throw new Error("File non valido");
        await dbOperations.clearDatabase();
        for (const img of backup.images) {
          const blob = await base64ToBlob(img.blob);
          await dbOperations.addImage({ ...img, blob });
        }
        for (const board of backup.boards) {
          await dbOperations.addBoard(board);
        }
        alert("Ripristino completato con successo!");
        window.location.reload();
      } catch (err) {
        alert("Errore durante il ripristino. Il file potrebbe essere corrotto.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

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
                type === 'timer' ? { duration: 60, timerImage: null } : // <--- NUOVO
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
  const dragItem = useRef();
  const dragOverItem = useRef();
  const dragOverPage = useRef(); // NUOVO: Serve per capire se siamo sopra una pagina

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

  const filteredBoards = useMemo(() => {
    let result = [...boards];
    if (dashboardFilter !== 'all') result = result.filter(b => b.type === dashboardFilter);
    if (dashboardSearch.trim()) result = result.filter(b => b.title.toLowerCase().includes(dashboardSearch.toLowerCase()));
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt), dateB = new Date(b.updatedAt);
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

      /* --- TIMER VISIVO LIQUIDO (FIX DEFINITIVO GAP - OVERLAP 10PX) --- */
      
      @keyframes wave-front {
        0% { transform: translate3d(0, 10px, 0); }   /* Spinto giù di 10px dentro il liquido */
        50% { transform: translate3d(-25%, 15px, 0); } /* Oscilla tra 10px e 15px */
        100% { transform: translate3d(-50%, 10px, 0); }
      }

      @keyframes wave-back {
        0% { transform: translate3d(0, 10px, 0); }
        50% { transform: translate3d(-25%, 5px, 0); } /* Oscilla tra 10px e 5px */
        100% { transform: translate3d(-50%, 10px, 0); }
      }

      .liquid-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        /* Transizione fluida */
        transition: height 1s linear, background-color 0.5s ease;
        z-index: 10;
        pointer-events: none;
      }

      .wave {
        position: absolute;
        bottom: 100%; 
        left: 0;
        width: 200%;
        height: 60px; 
        background-color: inherit; 
        
        /* Non usiamo margin-bottom, usiamo il transform nell'animazione */
        
        /* Maschera Sinusoidale */
        -webkit-mask-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 100 V 50 Q 250 10 500 50 T 1000 50 V 100 H 0 Z" fill="black"/></svg>');
        mask-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 100 V 50 Q 250 10 500 50 T 1000 50 V 100 H 0 Z" fill="black"/></svg>');
        
        -webkit-mask-size: 50% 100%;
        mask-size: 50% 100%;
        -webkit-mask-repeat: repeat-x;
        mask-repeat: repeat-x;
        -webkit-mask-position: bottom;
        mask-position: bottom;
      }

      .wave-back {
        opacity: 0.7; /* Opacità alta per coprire bene */
        animation: wave-back 7s linear infinite;
        height: 65px; /* Onda dietro più alta */
      }

      .wave-front {
        opacity: 1; /* Opaca al 100% per coprire la giuntura */
        animation: wave-front 4s linear infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if(document.head.contains(style)) document.head.removeChild(style);
    };
  }, [currentBoard?.settings?.printOrientation]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`} onClick={() => setOpenMenuId(null)}>
      
      <header className="print:hidden sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {view === 'editor' && <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white"><LayoutGrid className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">CAA <span className="text-blue-600">Facile</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'dashboard' && (
            <>
            <button onClick={() => setShowHelp(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-1" title="Manuale Istruzioni">
        <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </button>
      <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
      <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
              <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Importa Backup"><UploadIcon className="w-5 h-5" /></button>
              <button onClick={exportData} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Esporta Backup"><Download className="w-5 h-5" /></button>
            </>
          )}
          {view === 'editor' && <button onClick={saveBoard} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isSaving ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'}`}><Save className="w-4 h-4" /> {isSaving ? 'Salvato!' : 'Salva'}</button>}
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="text-center py-8 space-y-4">
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">Strumenti Clinici</h2>
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <button onClick={() => createBoard('grid')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all w-44">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 mb-3 group-hover:scale-110 transition-transform"><LayoutGrid className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Comunicazione</span>
                </button>
                <button onClick={() => createBoard('sequence')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all w-44">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 mb-3 group-hover:scale-110 transition-transform"><ListOrdered className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Agenda Visiva</span>
                </button>
                <button onClick={() => createBoard('token')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 transition-all w-44">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 mb-3 group-hover:scale-110 transition-transform"><Trophy className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Token Economy</span>
                </button>
                <button onClick={() => createBoard('story')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-pink-500 transition-all w-44">
                  <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl text-pink-600 mb-3 group-hover:scale-110 transition-transform"><Book className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Storia Sociale</span>
                </button>
                <button onClick={() => createBoard('pecs')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all w-44">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform"><Scissors className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Costruttore PECS</span>
                </button>
                <button onClick={() => createBoard('timer')} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-all w-44">
                  <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 mb-3 group-hover:scale-110 transition-transform"><Timer className="w-8 h-8" /></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Timer Visivo</span>
                </button>
              </div>
            </section>

            <div className="sticky top-20 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
              <div className="relative w-full md:w-auto md:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Cerca i tuoi progetti..." value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <select value={dashboardFilter} onChange={(e) => setDashboardFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none cursor-pointer">
                  <option value="all">Tutti i tipi</option>
                  <option value="grid">Comunicazione</option>
                  <option value="sequence">Agenda</option>
                  <option value="token">Token Economy</option>
                  <option value="story">Storie Sociali</option> {/* Nuovo */}
                  <option value="pecs">PECS da Taglio</option> {/* Nuovo */}
                </select>
                <select value={dashboardSort} onChange={(e) => setDashboardSort(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none cursor-pointer">
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
                      <div className={`p-4 rounded-full ${board.type === 'sequence' ? 'bg-emerald-100 text-emerald-600' : board.type === 'token' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {board.type === 'sequence' ? <ListOrdered className="w-8 h-8" /> : board.type === 'token' ? <Trophy className="w-8 h-8"/> : <LayoutGrid className="w-8 h-8" />}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 dark:bg-black/70 text-xs font-bold shadow-sm backdrop-blur-sm">{board.type === 'grid' ? 'Comunicazione' : board.type === 'sequence' ? 'Agenda' : 'Token'}</div>
                    <div className="absolute top-2 right-2">
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === board.id ? null : board.id); }} className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white text-slate-700 dark:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                      {openMenuId === board.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                          <button onClick={(e) => handleChangeCover(e, board)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Cambia Copertina</button>
                          <button onClick={(e) => duplicateBoard(e, board)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><Copy className="w-4 h-4" /> Duplica</button>
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                          <button onClick={(e) => deleteBoard(e, board.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Elimina</button>
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
            <div className={`print:hidden flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all ${isLocked ? 'opacity-90' : ''}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto flex-1">
                  {!isLocked && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Titolo</label>}
                  {isLocked ? <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">{currentBoard.title}</h2> : <input type="text" value={currentBoard.title} onChange={(e) => setCurrentBoard({ ...currentBoard, title: e.target.value })} className="text-2xl font-extrabold bg-transparent text-slate-800 dark:text-white outline-none w-full border-b border-transparent focus:border-blue-500" placeholder="Titolo..." />}
                </div>
                {!isLocked && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    {currentBoard.type === 'sequence' && (
                       <button onClick={() => updateTokenSettings('orientation', currentBoard.settings?.orientation === 'vertical' ? 'horizontal' : 'vertical')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200">{currentBoard.settings?.orientation === 'vertical' ? <ArrowDown className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />} Orientamento</button>
                    )}
                    {currentBoard.type === 'token' && (
                      <div className="flex flex-wrap gap-3 items-center w-full md:w-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-500">Punti:</span><input type="number" min="1" max="20" value={currentBoard.settings.tokenCount} onChange={(e) => updateTokenSettings('tokenCount', parseInt(e.target.value))} className="w-16 px-2 py-1 rounded border dark:bg-slate-700 dark:text-white" /></div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <button onClick={() => { setEditingContext({ type: 'tokenImage' }); setShowSearch(true); }} className="flex items-center gap-1 text-sm text-blue-600 hover:underline"><Star className="w-4 h-4" /> Timbro</button>
                        <button onClick={() => { setEditingContext({ type: 'rewardImage' }); setShowSearch(true); }} className="flex items-center gap-1 text-sm text-amber-600 hover:underline"><Trophy className="w-4 h-4" /> Premio</button>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <div className="flex items-center gap-1">
                          <select value={currentBoard.settings.linkedScheduleId || ''} onChange={(e) => updateTokenSettings('linkedScheduleId', e.target.value)} className="text-sm px-2 py-1 rounded border dark:bg-slate-700 dark:text-white max-w-[150px]">
                            <option value="">Nessuna Agenda</option>
                            {boards.filter(b => b.type === 'sequence').map(b => (<option key={b.id} value={b.id}>{b.title}</option>))}
                          </select>
                          <button onClick={createLinkedBoard} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded border border-green-200" title="Crea Nuova Agenda"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                    {currentBoard.type !== 'token' && (
                      <button onClick={() => { setEditingContext(null); setShowSearch(true); }} className="bg-slate-900 dark:bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Aggiungi</button>
                    )}
                  </div>
                )}
              </div>
              {currentBoard.type === 'grid' && (
                <div className="flex gap-2 overflow-x-auto pb-1 border-t dark:border-slate-700 pt-4">
                  {currentBoard.pages.map((page, index) => (
                    <div 
                      key={page.id} 
                      onClick={() => setActivePageIndex(index)} 
                      
                      // --- NUOVI EVENTI PER IL DROP SU PAGINA ---
                      onDragEnter={(e) => handleDragEnterPage(e, page.id)}
                      onDragOver={(e) => e.preventDefault()} // Necessario per HTML5 DnD
                      // ------------------------------------------

                      className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap border transition-all 
                        ${activePageIndex === index 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' 
                          : 'bg-white text-slate-600 hover:bg-slate-50 border-transparent hover:border-blue-300' // Feedback visivo hover
                        }`}
                    >
                      <span>{page.name}</span>
                      {!isLocked && currentBoard.pages.length > 1 && (
                        <X className="w-3 h-3 hover:text-red-500 ml-1" 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             if(confirm('Eliminare pagina?')) setCurrentBoard(p => { const c = {...p}; c.pages.splice(index,1); return c; }); 
                             setActivePageIndex(0); 
                           }} 
                        />
                      )}
                    </div>
                  ))}
                  {!isLocked && <button onClick={() => { const name = prompt('Nome pagina:'); if(name) setCurrentBoard(p => ({...p, pages: [...p.pages, {id:crypto.randomUUID(), name, items:[]}]}))}} className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-blue-600 text-sm font-medium"><FilePlus className="w-4 h-4" /> Nuova Pagina</button>}
                </div>
              )}
            </div>

            <div className={`min-h-[60vh] p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border-2 ${isLocked ? 'border-transparent' : 'border-dashed border-slate-200 dark:border-slate-700'} ${getActiveItems().length === 0 && currentBoard.type !== 'token' ? 'flex items-center justify-center' : ''}`}>
              {/* --- RENDERER TIMER VISIVO --- */}
              {currentBoard.type === 'timer' && (
                <VisualTimer 
                   settings={currentBoard.settings}
                   onUpdateSettings={(key, val) => setCurrentBoard(prev => ({...prev, settings: {...prev.settings, [key]: val}}))}
                   onSelectImage={() => { setEditingContext({type: 'timerImage'}); setShowSearch(true); }}
                />
              )}
              {currentBoard.type === 'token' && (
                <div className={`flex flex-col md:flex-row h-full gap-6 ${linkedSchedule ? 'justify-between' : 'justify-center'}`}>
                  {linkedSchedule && (
                    <div className="w-full md:w-1/3 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                       <h3 className="font-bold text-slate-500 mb-3 flex items-center gap-2"><ListOrdered className="w-4 h-4"/> Agenda</h3>
                       <div className="flex-1 overflow-y-auto space-y-3">
                         {linkedSchedule.items && linkedSchedule.items.map(item => (
                           <div key={item.id} onClick={() => toggleComplete(item.id)} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${item.completed ? 'bg-slate-100 opacity-60 grayscale' : 'bg-white dark:bg-slate-700'}`}>
                             <div className={`p-1 rounded-full mr-3 ${item.completed ? 'text-green-600' : 'text-slate-300'}`}><CheckCircle2 className="w-6 h-6" /></div>
                             <div className="w-12 h-12 mr-3 flex items-center justify-center">
                               {item.iconId ? (() => { const IconComp = getIconComponent(item.iconId); const style = getPresetStyle(item.iconId); return <IconComp className={`w-8 h-8 ${style.icon}`} />; })() : item.imageUrl ? <img src={item.imageUrl} className="max-w-full max-h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <ImageIcon className="text-slate-300"/>}
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
                           {currentBoard.settings.rewardImage ? ( currentBoard.settings.rewardImage.iconId ? (() => { const IconComp = getIconComponent(currentBoard.settings.rewardImage.iconId); const style = getPresetStyle(currentBoard.settings.rewardImage.iconId); return <IconComp className={`w-24 h-24 ${style.icon}`} />; })() : <img src={currentBoard.settings.rewardImage.imageUrl} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> ) : <Trophy className="w-24 h-24 text-slate-200" />}
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
                        <BookOpen className="w-5 h-5"/>
                        <span>Editor Storia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Selettore Orientamento Stampa */}
                        <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-pink-200 dark:border-pink-800">
                           <button 
                             onClick={() => updateTokenSettings('printOrientation', 'portrait')}
                             className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${(!currentBoard.settings.printOrientation || currentBoard.settings.printOrientation === 'portrait') ? 'bg-pink-100 text-pink-700' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                             <div className="w-3 h-4 border-2 border-current rounded-sm"></div> Vert.
                           </button>
                           <button 
                             onClick={() => updateTokenSettings('printOrientation', 'landscape')}
                             className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${(currentBoard.settings.printOrientation === 'landscape') ? 'bg-pink-100 text-pink-700' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                             <div className="w-4 h-3 border-2 border-current rounded-sm"></div> Orizz.
                           </button>
                        </div>
                        <button onClick={() => window.print()} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm text-sm">
                          <Printer className="w-4 h-4"/> Stampa
                        </button>
                      </div>
                   </div>

                   {/* Area Contenuto Storia - AGGIUNTA CLASSE print-only-content */}
                   <div className="story-print-container print-only-content flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-y-auto min-h-[50vh]">
                     {activeItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 print:hidden">
                           <BookOpen className="w-16 h-16 mb-4"/>
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
                                    const nextItem = activeItems[index+1];
                                    const newLabel = item.label + " " + nextItem.label;
                                    removeItem(nextItem.id);
                                    updateLabel(item.id, newLabel);
                                    const result = await quickSearchArasaac(newLabel);
                                    if (result.found) {
                                      setCurrentBoard(prev => {
                                        const copy = {...prev};
                                        copy.items = copy.items.map(i => i.id === item.id ? {...i, imageUrl: result.imageUrl, sourceId: result.sourceId} : i);
                                        return copy;
                                      });
                                    }
                                  }}
                                  className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-slate-100 border border-slate-300 hover:bg-blue-500 hover:text-white text-slate-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm print:hidden"
                                >
                                  <LinkIcon className="w-3 h-3"/>
                                </button>
                              )}
                              
                              {/* Immagine */}
                              <div 
                                 onClick={() => {
                                    if (!isLocked) {
                                      setEditingContext({type:'item', id: item.id, initialTerm: item.label}); 
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
                                 {!isLocked && <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 print:hidden"><button onClick={(e)=>{e.stopPropagation(); removeItem(item.id)}} className="bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3"/></button></div>}
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
                            <div className="bg-pink-600 text-white p-3 rounded-xl"><ArrowRight className="w-6 h-6"/></div>
                         </div>
                      </div>
                   )}
                </div>
              )}

              {/* --- RENDERER PECS GENERATOR (Grid Fissa & Sicura) --- */}
              {currentBoard.type === 'pecs' && (
                <div className="flex flex-col items-center">
                   <div className="print:hidden w-full max-w-4xl bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-6 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="flex flex-col">
                           <label className="text-[10px] uppercase font-bold text-indigo-400">Lato (cm)</label>
                           <input type="number" step="0.5" value={currentBoard.settings.cardWidth} onChange={(e) => updateTokenSettings('cardWidth', parseFloat(e.target.value))} className="w-16 px-2 py-1 rounded border text-sm"/>
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[10px] uppercase font-bold text-indigo-400">Etichetta</label>
                           <select value={currentBoard.settings.labelPosition} onChange={(e) => updateTokenSettings('labelPosition', e.target.value)} className="px-2 py-1 rounded border text-sm">
                             <option value="bottom">Sotto</option>
                             <option value="top">Sopra</option>
                           </select>
                        </div>
                      </div>
                      <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md"><Printer className="w-4 h-4"/> Stampa / PDF</button>
                   </div>

                   {/* Foglio A4 Simulato - AGGIUNTA CLASSE print-only-content */}
                   <div className="print-only-content bg-white shadow-2xl print:shadow-none w-[21cm] h-[29.7cm] print:w-full print:h-full mx-auto relative bg-white border box-border print:border-none">
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
                                 <div className="w-full h-full p-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 print:hover:bg-transparent" onClick={() => !isLocked && setEditingContext({type:'item', id: item.id, initialTerm: item.label}) & setShowSearch(true)}>
                                    {currentBoard.settings.labelPosition === 'top' && <span className="text-[10px] font-bold uppercase text-center w-full truncate mb-0.5 leading-none font-sans text-black">{item.label}</span>}
                                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-contain" /> : item.iconId ? (() => { const IconComp = getIconComponent(item.iconId); return <IconComp className="w-4/5 h-4/5 text-black" />; })() : null}
                                    </div>
                                    {currentBoard.settings.labelPosition === 'bottom' && <span className="text-[10px] font-bold uppercase text-center w-full truncate mt-0.5 leading-none font-sans text-black">{item.label}</span>}
                                    {!isLocked && <button onClick={(e) => {e.stopPropagation(); removeItem(item.id)}} className="absolute top-0.5 right-0.5 z-10 text-red-500 hover:text-red-700 print:hidden"><X className="w-3 h-3"/></button>}
                                 </div>
                               ) : (
                                 !isLocked ? (
                                   <div onClick={() => { setEditingContext(null); setShowSearch(true); }} className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer text-indigo-300 hover:bg-indigo-50 transition-all print:hidden">
                                      <Plus className="w-6 h-6"/>
                                   </div>
                                 ) : null
                               )}
                             </div>
                           ));
                        })()}
                      </div>
                   </div>
                </div>
              )}
              {/* Messaggio "Vuoto" solo per Grid e Sequence (Story e Pecs hanno le loro UI dedicate) */}
              {currentBoard.type !== 'token' && currentBoard.type !== 'story' && currentBoard.type !== 'pecs' && activeItems.length === 0 && (
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
                          onReplaceImage={(id) => { setEditingContext({type:'item', id}); setShowSearch(true); }} 
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
                           onReplaceImage={(id) => { setEditingContext({type:'item', id}); setShowSearch(true); }} 
                           onEditLabel={updateLabel} 
                           onToggleComplete={toggleComplete} 
                        />
                        {index < activeItems.length - 1 && <div className="flex justify-center p-2 text-slate-300">{currentBoard.settings?.orientation === 'vertical' ? <ArrowDown className="w-6 h-6"/> : <ArrowRight className="w-6 h-6"/>}</div>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            <div className="fixed bottom-6 right-6 z-50"><button onClick={() => setIsLocked(!isLocked)} className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center ${isLocked ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}</button></div>
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

    </div>
  );
}