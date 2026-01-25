import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Save, 
  Image as ImageIcon, 
  Trash2, 
  ArrowLeft, 
  Moon, 
  Sun, 
  LayoutGrid, 
  ListOrdered, 
  CheckCircle2, 
  X, 
  Upload,
  Settings,
  Copy,
  ArrowDown,
  ArrowRight,
  FilePlus,
  Lock,
  Unlock,
  RotateCcw,
  Link as LinkIcon,
  Trophy,
  Star,
  Globe,
  MoreVertical,
  Filter,
  SortAsc,
  SortDesc,
  Edit3,
  Heart,
  ThumbsUp,
  Smile,
  Zap,
  Crown,
  Medal,
  Rocket,
  Music,
  Car,
  Cat,
  Dog,
  Flower,
  Palette,
  Download,
  Upload as UploadIcon,
  Camera,
  HelpCircle,
  Scissors, // Nuovo
  Printer,  // Nuovo
  Book,
  Wand2, // Aggiungi questa icona per l'AI
  Crop as CropIcon, // Aggiungi questa icona
  Layers,
  BookOpen
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { removeBackground } from "@imgly/background-removal";

/**
 * ==========================================
 * CONSTANTS & CONFIG
 * ==========================================
 */
const DB_NAME = 'CaaAppDB';
const DB_VERSION = 1;

// Mappa delle icone predefinite con stili coordinati (Sfondo, Bordo, Icona)
const PRESET_ICONS = [
  { id: 'star', label: 'Stella', icon: Star, 
    style: { bg: 'bg-amber-100', border: 'border-amber-400', icon: 'text-amber-500 fill-amber-400' } },
  { id: 'heart', label: 'Cuore', icon: Heart, 
    style: { bg: 'bg-red-100', border: 'border-red-400', icon: 'text-red-500 fill-red-500' } },
  { id: 'thumbsup', label: 'Super', icon: ThumbsUp, 
    style: { bg: 'bg-blue-100', border: 'border-blue-400', icon: 'text-blue-600 fill-blue-400' } },
  { id: 'smile', label: 'Sorriso', icon: Smile, 
    style: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-600 fill-yellow-200' } },
  { id: 'crown', label: 'Re/Regina', icon: Crown, 
    style: { bg: 'bg-purple-100', border: 'border-purple-400', icon: 'text-purple-600 fill-purple-400' } },
  { id: 'trophy', label: 'Coppa', icon: Trophy, 
    style: { bg: 'bg-yellow-50', border: 'border-yellow-500', icon: 'text-yellow-600 fill-yellow-400' } },
  { id: 'medal', label: 'Medaglia', icon: Medal, 
    style: { bg: 'bg-orange-100', border: 'border-orange-400', icon: 'text-orange-600 fill-orange-400' } },
  { id: 'rocket', label: 'Razzo', icon: Rocket, 
    style: { bg: 'bg-indigo-100', border: 'border-indigo-400', icon: 'text-indigo-600 fill-indigo-400' } },
  { id: 'zap', label: 'Fulmine', icon: Zap, 
    style: { bg: 'bg-yellow-100', border: 'border-yellow-400', icon: 'text-yellow-500 fill-yellow-500' } },
  { id: 'flower', label: 'Fiore', icon: Flower, 
    style: { bg: 'bg-pink-100', border: 'border-pink-400', icon: 'text-pink-500 fill-pink-400' } },
  { id: 'cat', label: 'Gatto', icon: Cat, 
    style: { bg: 'bg-stone-200', border: 'border-stone-400', icon: 'text-stone-600 fill-stone-400' } },
  { id: 'dog', label: 'Cane', icon: Dog, 
    style: { bg: 'bg-amber-200', border: 'border-amber-600', icon: 'text-amber-800 fill-amber-700' } },
  { id: 'car', label: 'Auto', icon: Car, 
    style: { bg: 'bg-red-50', border: 'border-red-500', icon: 'text-red-600 fill-red-600' } },
  { id: 'music', label: 'Musica', icon: Music, 
    style: { bg: 'bg-sky-100', border: 'border-sky-400', icon: 'text-sky-600 fill-sky-400' } },
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
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve({ r, g, b });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
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

// Funzione helper per ritagliare l'immagine (Supporta padding/bordi esterni)
const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = "anonymous"; // Importante per evitare problemi CORS su canvas sporchi
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      // Impostiamo la dimensione del canvas pari alla dimensione del RITAGLIO, non dell'immagine
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      // Pulisci il canvas (trasparente)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // LOGICA CRUCIALE PER RITAGLIO ESTERNO:
      // Invece di usare i parametri di ritaglio sorgente (che falliscono con numeri negativi),
      // trasliamo il contesto.
      // Esempio: Se il crop parte da x: -50 (50px fuori a sinistra), 
      // disegniamo l'immagine spostata di +50px a destra dentro il nuovo canvas.
      
      ctx.drawImage(
        image, 
        -pixelCrop.x, // Sposta l'immagine rispetto all'origine del crop
        -pixelCrop.y, 
        image.width, 
        image.height
      );

      canvas.toBlob((blob) => {
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
    };
  });
};

import { pipeline, env, AutoModel, AutoProcessor, RawImage, Tensor } from '@xenova/transformers';

// --- CONFIGURAZIONE STRICT LOCAL (OFFLINE) ---
// Disabilita completamente la ricerca online per evitare errori 401/Unauthorized
env.allowRemoteModels = false; 
env.allowLocalModels = true;

// Configurazione per usare SOLO i file nella cartella public/models
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';

// Assicurati che gli import siano presenti in cima al file:
// import { pipeline, env, AutoModel, AutoProcessor, RawImage } from '@xenova/transformers';

// Configurazione Offline
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';

const processAdvancedImage = async (originalBlobUrl, cropArea, enableAI, enableShadow) => {
  try {
    // 1. Ritaglio preliminare
    let currentUrl = originalBlobUrl;
    if (cropArea) {
      currentUrl = await getCroppedImg(originalBlobUrl, cropArea);
    }

    let imgBitmap;

    if (enableAI) {
      // --- CONFIGURAZIONE AI ---
      const modelId = 'rmbg-1.4-v2'; 

      // A. Carichiamo il modello (Manual Mode)
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
            do_pad: false,
            do_rescale: true,
            do_resize: true,
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
      // Passiamo esplicitamente 'input' per evitare errori di mapping
      const { output } = await model({ input: pixel_values });

      // --- FIX: RICOSTRUZIONE MANUALE DELL'IMMAGINE ---
      // Invece di usare RawImage.fromTensor (che dava errore),
      // prendiamo i dati grezzi e costruiamo noi i pixel RGBA.
      
      // 1. Ottieni i dati della maschera (valori 0-255)
      // output[0] è un tensore 1x1024x1024. .data ci dà l'array lineare.
      const rawData = output[0].mul(255).to('uint8').data;
      
      // 2. Crea un buffer per l'immagine RGBA (4 canali)
      const width = 1024;
      const height = 1024;
      const pixelCount = width * height;
      const rgbaData = new Uint8ClampedArray(pixelCount * 4);
      
      // 3. Riempi il buffer: Mettiamo il valore della maschera nel canale ALPHA
      for (let i = 0; i < pixelCount; i++) {
        const val = rawData[i]; // Valore predizione (0=sfondo, 255=soggetto)
        rgbaData[i * 4] = 0;     // R (nero)
        rgbaData[i * 4 + 1] = 0; // G (nero)
        rgbaData[i * 4 + 2] = 0; // B (nero)
        rgbaData[i * 4 + 3] = val; // Alpha (Trasparenza!)
      }
      
      // 4. Crea l'oggetto ImageData
      const maskImageData = new ImageData(rgbaData, width, height);

      // E. Applicazione Maschera (Blending)
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');

      // Disegna immagine originale
      const originalBitmap = await createImageBitmap(await (await fetch(currentUrl)).blob());
      ctx.drawImage(originalBitmap, 0, 0);

      // Prepara la maschera su canvas temporaneo per poterla scalare
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width; 
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.putImageData(maskImageData, 0, 0);

      // Applica la maschera: mantiene l'originale solo dove l'Alpha della maschera è 255
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0, width, height, 0, 0, image.width, image.height);

      // Risultato finale
      const processedBlob = await new Promise(r => canvas.toBlob(r));
      imgBitmap = await createImageBitmap(processedBlob);

    } else {
      // FALLBACK (No AI)
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      imgBitmap = await createImageBitmap(blob);
    }

    // --- Composizione Card Finale (500x500) ---
    const finalCanvas = document.createElement('canvas');
    const fCtx = finalCanvas.getContext('2d');
    const size = 500; 
    finalCanvas.width = size;
    finalCanvas.height = size;

    fCtx.clearRect(0, 0, size, size);

    // Centratura e Scala
    const scaleFactor = Math.min((size * 0.9) / imgBitmap.width, (size * 0.9) / imgBitmap.height);
    const w = imgBitmap.width * scaleFactor;
    const h = imgBitmap.height * scaleFactor;
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

    fCtx.drawImage(imgBitmap, x, y, w, h);

    return new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));

  } catch (error) {
    console.error("Errore elaborazione immagine:", error);
    alert("Errore AI: " + error.message);
    return processAdvancedImage(originalBlobUrl, cropArea, false, enableShadow);
  }
};

/**
 * ==========================================
 * COMPONENTS
 * ==========================================
 */

const SearchModal = ({ isOpen, onClose, onSelect, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [googleQuery, setGoogleQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('arasaac'); // Default su Arasaac per velocità
  const fileInputRef = useRef(null);
  const [editorImage, setEditorImage] = useState(null); // URL immagine temporanea per editor
  const [tempFileName, setTempFileName] = useState(''); // Nome file temporaneo

  // Effetto: Quando si apre il modale, se c'è una query iniziale, cerca subito
  useEffect(() => {
    if (isOpen && initialQuery) {
      setQuery(initialQuery);
      setActiveTab('arasaac');
      searchArasaac(initialQuery);
    } else if (isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const searchArasaac = async (term) => {
    const q = term || query;
    if (!q) return;
    setLoading(true);
    try {
      const response = await fetch(`https://api.arasaac.org/api/pictograms/it/search/${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Errore API Arasaac", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
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

  const handleSelect = async (item, source) => {
    setLoading(true);
    let imageUrl = '';
    let sourceId = '';

    if (source === 'arasaac') {
      imageUrl = `https://api.arasaac.org/api/pictograms/${item._id}?download=false`;
      sourceId = item._id.toString();
      await cacheArasaacImage(imageUrl, item._id);
    } else if (source === 'wikimedia') {
      imageUrl = item.url;
      sourceId = `wiki-${item._id}`;
      await cacheArasaacImage(imageUrl, sourceId); 
    }

    const blobUrl = await getImageUrl(sourceId);
    const dominantColor = await getDominantColor(blobUrl);

    onSelect({
      id: crypto.randomUUID(), 
      sourceId: sourceId,
      label: item.keywords ? item.keywords[0]?.keyword : (item.title || query),
      imageUrl: blobUrl,
      dominantColor: dominantColor,
      completed: false
    });
    setLoading(false);
    onClose();
  };

  const handlePresetSelect = (preset) => {
    onSelect({ id: crypto.randomUUID(), sourceId: `preset-${preset.id}`, label: preset.label, imageUrl: null, iconId: preset.id, completed: false });
    onClose();
  };

  const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  // Invece di salvare subito, apriamo l'editor
  const url = URL.createObjectURL(file);
  setTempFileName(file.name.split('.')[0]);
  setEditorImage(url);
  // Reset input per permettere ricaricamento stesso file
  e.target.value = null; 
};

const handleEditorSave = async (processedBlob) => {
  setLoading(true);
  // Salva il blob processato nel DB
  const uniqueId = 'local-' + crypto.randomUUID();
  await dbOperations.addImage({
    sourceId: uniqueId,
    blob: processedBlob,
    createdAt: new Date()
  });

  const blobUrl = await getImageUrl(uniqueId);

  onSelect({ 
    id: crypto.randomUUID(), 
    sourceId: uniqueId, 
    label: tempFileName, 
    imageUrl: blobUrl, 
    completed: false 
  });

  setLoading(false);
  setEditorImage(null); // Chiudi editor
  onClose(); // Chiudi modale ricerca
};

  const handleUrlSubmit = async () => {
    if(!urlInput) return;
    setLoading(true);
    onSelect({ id: crypto.randomUUID(), sourceId: urlInput, label: googleQuery || 'Web', imageUrl: urlInput, completed: false });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cerca Immagine</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="flex p-2 gap-2 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto">
          {['arasaac', 'presets', 'wikimedia', 'local', 'web'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setResults([]); if(tab !== 'arasaac') setQuery(''); }} className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
              {tab === 'presets' ? 'Icone' : tab === 'arasaac' ? 'Simboli' : tab === 'wikimedia' ? 'Foto Reali' : tab === 'local' ? 'Galleria' : 'Link'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {(activeTab === 'arasaac' || activeTab === 'wikimedia') && (
            <>
              <div className="flex gap-2 mb-4">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'arasaac' ? searchArasaac() : searchWikimedia())} placeholder={activeTab === 'arasaac' ? "Cerca simbolo..." : "Cerca foto..."} className="flex-1 px-4 py-2 rounded-lg border dark:bg-slate-700 dark:text-white" autoFocus />
                <button onClick={() => activeTab === 'arasaac' ? searchArasaac() : searchWikimedia()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><Search className="w-4 h-4" /></button>
              </div>
              {loading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {results.map((item) => (
                    <button key={item._id} onClick={() => handleSelect(item, activeTab)} className="group aspect-square p-2 border rounded-lg hover:border-blue-500 bg-white overflow-hidden relative">
                      <img src={activeTab === 'arasaac' ? `https://api.arasaac.org/api/pictograms/${item._id}?download=false` : item.url} className="w-full h-full object-contain" />
                      <span className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-[10px] truncate px-1">{item.keywords ? item.keywords[0]?.keyword : item.title}</span>
                    </button>
                  ))}
                  {results.length === 0 && query && !loading && <p className="col-span-full text-center text-slate-400">Nessun risultato.</p>}
                </div>
              )}
            </>
          )}
          {/* ... Altri tab (presets, local, web) rimangono invariati ma per brevità ometto il rendering se non sono attivi, il codice originale li gestisce ... */}
          {activeTab === 'presets' && <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">{PRESET_ICONS.map((preset) => (<button key={preset.id} onClick={() => handlePresetSelect(preset)} className={`aspect-square flex flex-col items-center justify-center p-2 rounded-xl border hover:scale-105 transition-all group ${preset.style.bg} ${preset.style.border}`}><preset.icon className={`w-8 h-8 mb-2 ${preset.style.icon}`} /><span className="text-xs font-bold text-slate-700 truncate w-full text-center">{preset.label}</span></button>))}</div>}
          {activeTab === 'local' && <div className="flex flex-col items-center justify-center h-full gap-4 py-10 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50"><div className="p-4 bg-blue-100 rounded-full text-blue-600"><Upload className="w-8 h-8" /></div><p className="text-sm font-medium">Carica foto dal dispositivo</p><input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} /><button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Scegli File</button></div>}
        </div>
        {/* ... resto del JSX ... */}
      <ImageEditorModal 
        isOpen={!!editorImage} 
        imageSrc={editorImage} 
        onClose={() => setEditorImage(null)} 
        onSave={handleEditorSave} 
      />
    </div> // Chiusura del div principale del modale esistente
  </div> // Chiusura del div overlay
);
};

// --- IMAGE EDITOR MODAL (TOTAL FREEDOM CROP) ---
// --- IMAGE EDITOR MODAL (TRANSFORMERS.JS) ---
const ImageEditorModal = ({ isOpen, onClose, imageSrc, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [addShadow, setAddShadow] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen || !imageSrc) return null;

  const handleSave = async () => {
    setProcessing(true);
    try {
      // Nessun parametro "path" necessario, fa tutto la libreria
      const finalBlob = await processAdvancedImage(imageSrc, croppedAreaPixels, removeBg, addShadow);
      onSave(finalBlob);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore durante l'elaborazione. Verifica la console.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col h-[90vh]">
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
          <h3 className="font-bold flex items-center gap-2"><CropIcon className="w-5 h-5"/> Editor Immagine</h3>
          <button onClick={onClose} disabled={processing}><X className="w-6 h-6"/></button>
        </div>
        
        <div className="relative flex-1 bg-slate-900 w-full overflow-hidden flex items-center justify-center">
           <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            objectFit="contain" 
            restrictPosition={false} 
            minZoom={0.5}
            initialCroppedAreaPercentages={{ width: 90, height: 90, x: 5, y: 5 }}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            style={{ 
              containerStyle: { width: '100%', height: '100%', backgroundColor: '#0f172a' },
            }}
          />
        </div>

        <div className="p-6 space-y-6 shrink-0 bg-white dark:bg-slate-800 z-10 border-t dark:border-slate-700">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-bold uppercase text-slate-500">Zoom</label>
              <span className="text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
            </div>
            <input type="range" value={zoom} min={0.5} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-blue-600"/>
          </div>

          <div className="flex flex-col gap-3">
             <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${removeBg ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="checkbox" checked={removeBg} onChange={() => setRemoveBg(!removeBg)} className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-blue-500" />
                <div className="flex-1">
                   <div className="font-bold text-sm flex items-center gap-2"><Wand2 className="w-4 h-4 text-blue-500"/> Rimuovi Sfondo (AI)</div>
                   <p className="text-xs text-slate-500 mb-2">Usa il modello neurale Xenova/modnet.</p>
                   {/* --- TESTO AGGIORNATO --- */}
                   {removeBg && (
                     <div className="text-[11px] leading-tight p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex gap-2">
                       <span className="text-base">⏳</span>
                       <div>
                         <strong>Elaborazione locale:</strong> L'operazione avviene sul dispositivo per garantire la privacy. 
                         <br/>Potrebbe essere lenta (alcuni secondi), specialmente al primo avvio.
                       </div>
                     </div>
                   )}
                   {/* ----------------------- */}
                </div>
             </label>

             <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${addShadow ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="checkbox" checked={addShadow} onChange={() => setAddShadow(!addShadow)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                <div className="flex-1">
                   <div className="font-bold text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500"/> Aggiungi Ombra</div>
                   <p className="text-xs text-slate-500">Crea profondità realistica.</p>
                </div>
             </label>
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0">
           <button onClick={onClose} disabled={processing} className="px-4 py-2 text-slate-600 font-bold">Annulla</button>
           <button onClick={handleSave} disabled={processing} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 min-w-[160px] justify-center">
             {processing ? (
               <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Elaborazione AI...</>
             ) : (
               <><CheckCircle2 className="w-4 h-4"/> Salva Immagine</>
             )}
           </button>
        </div>
      </div>
    </div>
  );
};

// --- CARD COMPONENT ---
const PictogramCard = ({ item, onRemove, onToggleComplete, onEditLabel, onReplaceImage, mode, orientation, isLocked }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(item.label);

  const saveLabel = () => {
    onEditLabel && onEditLabel(item.id, tempLabel);
    setIsEditing(false);
  };

  const isHorizontalSequence = mode === 'sequence' && orientation === 'horizontal';
  const isVerticalSequence = mode === 'sequence' && orientation === 'vertical';

  return (
    <div 
      className={`
        relative group flex items-center p-3 rounded-xl shadow-sm border-2 transition-all
        ${item.completed ? 'bg-slate-100 border-slate-200 opacity-60 grayscale' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}
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
        <button onClick={() => onToggleComplete(item.id)} className={`z-10 p-1 rounded-full bg-white dark:bg-slate-700 shadow-sm transition-colors ${isVerticalSequence ? 'mr-2' : 'absolute top-2 left-2'} ${item.completed ? 'text-green-600' : 'text-slate-300 hover:text-green-500'}`}>
          <CheckCircle2 className={`w-6 h-6 ${item.completed ? 'fill-green-100' : ''}`} />
        </button>
      )}

      <div onClick={() => !isLocked && onReplaceImage && onReplaceImage(item.id)} className={`flex items-center justify-center p-1 overflow-hidden relative ${isVerticalSequence ? 'h-full aspect-square' : 'flex-1 w-full'} ${!isLocked && onReplaceImage ? 'cursor-pointer hover:opacity-80' : ''}`}>
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
          <input type="text" value={tempLabel} onChange={(e) => setTempLabel(e.target.value)} onBlur={saveLabel} onKeyDown={(e) => e.key === 'Enter' && saveLabel()} className="w-full text-sm font-bold bg-blue-50 dark:bg-slate-600 rounded px-1 outline-none border border-blue-300" autoFocus />
        ) : (
          <p onClick={() => !isLocked && onEditLabel && setIsEditing(true)} className={`font-bold uppercase tracking-wide truncate ${!isLocked && onEditLabel ? 'cursor-text hover:text-blue-600 dark:hover:text-blue-400' : ''} ${item.completed ? 'line-through decoration-2 text-slate-400' : 'text-slate-800 dark:text-slate-200'} ${isVerticalSequence ? 'text-xl' : 'text-sm md:text-base'}`}>{item.label}</p>
        )}
      </div>
    </div>
  );
};

// --- HELP MODAL COMPONENT ---
const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manuale Istruzioni</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Guida visiva a tutte le funzionalità</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 text-slate-700 dark:text-slate-300">
          
          {/* 1. GLI STRUMENTI CLINICI (Aggiornato) */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              1. Gli Strumenti a Disposizione
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Comunicazione */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-slate-700/30 border border-blue-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-bold">
                  <LayoutGrid className="w-5 h-5" /> Comunicazione
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Tabelle a griglia con simboli e foto (CAA classica). Supporta navigazione a più pagine per categorie (es. Cibo, Emozioni).
                </p>
              </div>
              
              {/* Agenda Visiva */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-slate-700/30 border border-emerald-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <ListOrdered className="w-5 h-5" /> Agenda Visiva
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Sequenze di azioni (task analysis) o routine giornaliere. I passaggi possono essere spuntati <CheckCircle2 className="w-3 h-3 inline"/> al completamento.
                </p>
              </div>

              {/* Token Economy */}
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-slate-700/30 border border-amber-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300 font-bold">
                  <Trophy className="w-5 h-5" /> Token Economy
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Rinforzo positivo a gettoni. Definisci l'obiettivo, il numero di token e il premio finale. Integrabile con l'Agenda.
                </p>
              </div>

              {/* Storia Sociale (NUOVO) */}
              <div className="p-4 rounded-xl bg-pink-50/50 dark:bg-slate-700/30 border border-pink-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-pink-700 dark:text-pink-300 font-bold">
                  <Book className="w-5 h-5" /> Storia Sociale
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Crea narrazioni per spiegare contesti sociali o emozioni. Scrivi la frase e l'app abbina automaticamente i simboli al testo (stile SymWriter).
                </p>
              </div>

              {/* Costruttore PECS (NUOVO) */}
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-slate-700/30 border border-indigo-100 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-bold">
                  <Scissors className="w-5 h-5" /> Costruttore PECS
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Generatore di griglie ottimizzate per la stampa (A4). Imposta le misure in cm e stampa direttamente per creare materiale cartaceo da ritagliare.
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
              <div className="flex-1 flex gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl h-min">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white">Modalità Modifica</h5>
                  <p className="text-sm mt-1">
                    Quando il lucchetto è <strong>aperto</strong>, sei in modalità editing.
                    Puoi aggiungere <Plus className="w-3 h-3 inline bg-slate-200 rounded-sm"/> elementi, trascinarli per riordinare, cambiare i testi e cliccare sulle immagini per sostituirle <RotateCcw className="w-3 h-3 inline"/>.
                  </p>
                </div>
              </div>
              
              <div className="flex-1 flex gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl h-min">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white">Modalità Bambino</h5>
                  <p className="text-sm mt-1">
                    Clicca il lucchetto per <strong>bloccare</strong>. L'interfaccia si pulisce: spariscono i tasti di modifica.
                    Il bambino può solo spuntare le azioni completate o ricevere i token cliccando sugli spazi vuoti.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. TOKEN ECONOMY AVANZATA */}
          <section className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Funzioni Speciali Token Economy
            </h4>
            <ul className="grid md:grid-cols-2 gap-4 text-sm">
              <li className="flex items-start gap-2">
                <Palette className="w-4 h-4 mt-1 text-purple-500" />
                <span>
                  <strong>Colori Adattivi:</strong> Se carichi una foto personale come timbro, il bordo e lo sfondo del gettone si coloreranno automaticamente in base al colore dominante della foto.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <LayoutGrid className="w-4 h-4 mt-1 text-blue-500" />
                <span>
                  <strong>Agenda Affiancata:</strong> Puoi collegare un'agenda visiva esistente alla Token Economy. Lo schermo si dividerà: a sinistra i compiti da svolgere, a destra i punti guadagnati.
                </span>
              </li>
            </ul>
          </section>

          {/* 4. FONTI IMMAGINI */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              3. Dove trovare le immagini
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600">
                <div className="font-bold mb-1 text-blue-600 dark:text-blue-400">Arasaac</div>
                Simboli CAA standardizzati.
              </div>
              <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600">
                <div className="font-bold mb-1 text-emerald-600 dark:text-emerald-400">Foto Reali</div>
                Ricerca automatica su Wikimedia (foto vere).
              </div>
              <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600">
                <div className="font-bold mb-1 text-orange-600 dark:text-orange-400">Predefiniti</div>
                Icone vettoriali (stelle, cuori, razzi) pronte all'uso.
              </div>
              <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600">
                <div className="font-bold mb-1 text-purple-600 dark:text-purple-400">Galleria</div>
                Carica le tue foto dal dispositivo.
              </div>
              <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600">
                <div className="font-bold mb-1 text-slate-600 dark:text-slate-400">Web / Google</div>
                Copia-incolla link di immagini da internet.
              </div>
            </div>
          </section>

          {/* 5. GESTIONE DATI */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b pb-2 dark:border-slate-700">
              4. Gestione e Backup
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <MoreVertical className="w-4 h-4 text-slate-400" />
                <span>
                  Nella Dashboard, usa i tre puntini sulle card per <strong>Duplicare</strong> un progetto o cambiare l'<strong>Immagine di Copertina</strong> per riconoscerlo subito.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-blue-500" />
                <span>
                  <strong>Esporta (Backup):</strong> Scarica un file unico con tutti i tuoi lavori e le immagini. Utile per cambiare computer o fare copie di sicurezza.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <UploadIcon className="w-4 h-4 text-green-500" />
                <span>
                  <strong>Importa:</strong> Ripristina un backup. <em>Attenzione: sovrascrive i dati attuali!</em>
                </span>
              </div>
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Le immagini vengono salvate nel browser e funzionano anche offline.
          </p>
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all">
            Ho capito, iniziamo!
          </button>
        </div>
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
             type === 'story' ? 'Nuova Storia Sociale' : // Nuovo
             type === 'pecs' ? 'Griglia PECS da Stampare' : // Nuovo
             'Nuova Comunicazione',
      type: type,
      // Grid e Pecs usano la struttura a pagine, le altre liste piatte
      pages: (type === 'grid' || type === 'pecs') ? [{ id: crypto.randomUUID(), name: 'Pagina 1', items: [] }] : undefined,
      items: (type === 'sequence' || type === 'story') ? [] : undefined,
      // Aggiungi printOrientation alle settings della storia
      settings: type === 'sequence' ? { orientation: 'vertical' } : 
                type === 'token' ? { tokenCount: 5, earnedCount: 0, linkedScheduleId: '', tokenImage: null, rewardImage: null } : 
                type === 'pecs' ? { cardWidth: 4, cardHeight: 4, gap: 0, showCutLines: true, labelPosition: 'bottom' } :
                type === 'story' ? { printOrientation: 'portrait' } : // Nuovo default
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

  const handleSearchSelect = async (newItemData) => {
    if (editingContext?.type === 'boardCover') {
      const boardToUpdate = await dbOperations.getBoard(editingContext.boardId);
      if (boardToUpdate) {
        boardToUpdate.coverImage = newItemData;
        await dbOperations.updateBoard(boardToUpdate);
        await loadBoards();
      }
    } else if (editingContext?.type === 'tokenImage') {
      setCurrentBoard(prev => ({ ...prev, settings: { ...prev.settings, tokenImage: newItemData } }));
    } else if (editingContext?.type === 'rewardImage') {
       setCurrentBoard(prev => ({ ...prev, settings: { ...prev.settings, rewardImage: newItemData } }));
    } else if (editingContext?.type === 'item' && editingContext.id) {
      setCurrentBoard(prev => {
        const copy = { ...prev };
        // Aggiorniamo l'item ma PRESERVIAMO la label originale (l'ultimo attributo vince)
        const updateFn = (item) => item.id === editingContext.id ? { 
          ...item, 
          ...newItemData, 
          label: item.label // <--- QUI STA LA MAGIA: Forziamo la label originale
        } : item;
        
        if (copy.type === 'grid') copy.pages[activePageIndex].items = copy.pages[activePageIndex].items.map(updateFn);
        else copy.items = copy.items.map(updateFn);
        return copy;
      });
    } else {
      setCurrentBoard(prev => {
        const copy = { ...prev };
        if (copy.type === 'grid') {
          copy.pages[activePageIndex].items.push(newItemData);
        } else if (copy.type === 'sequence' || copy.type === 'story' || copy.type === 'pecs') {
          // Ora gestisce anche story e pecs!
          if (!copy.items) copy.items = [];
          copy.items.push(newItemData);
        }
        return copy;
      });
    }
    setEditingContext(null);
    setShowSearch(false);
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

  const dragItem = useRef();
  const dragOverItem = useRef();
  const handleDragStart = (e, position) => { dragItem.current = position; };
  const handleDragEnter = (e, position) => { dragOverItem.current = position; };
  const handleDragEnd = (e) => {
    if (currentBoard.type === 'grid' || isLocked) return;
    const items = [...currentBoard.items];
    const dragItemContent = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setCurrentBoard(prev => ({ ...prev, items }));
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
  useEffect(() => {
    const orientation = currentBoard?.settings?.printOrientation || 'portrait';
    
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { 
          margin: 0; 
          size: A4 ${orientation}; 
        }
        
        /* 1. NASCONDI TUTTO DI DEFAULT */
        body * {
          visibility: hidden;
        }

        /* 2. RENDI VISIBILE SOLO IL CONTENUTO DI STAMPA E I SUOI FIGLI */
        .print-only-content, .print-only-content * {
          visibility: visible;
        }

        /* 3. POSIZIONAMENTO ASSOLUTO PER COPRIRE L'INTERFACCIA */
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

        /* 4. SETUP GENERALE */
        html, body { 
          height: 100%; 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important; 
          overflow: visible !important;
        }
        
        /* 5. FIX SPECIFICI */
        .print\\:hidden { display: none !important; }
        
        /* Forza colori e sfondi */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
                    <div key={page.id} onClick={() => setActivePageIndex(index)} className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap border ${activePageIndex === index ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><span>{page.name}</span>{!isLocked && currentBoard.pages.length > 1 && <X className="w-3 h-3 hover:text-red-500 ml-1" onClick={(e) => { e.stopPropagation(); if(confirm('Eliminare pagina?')) setCurrentBoard(p => { const c = {...p}; c.pages.splice(index,1); return c; }); setActivePageIndex(0); }} />}</div>
                  ))}
                  {!isLocked && <button onClick={() => { const name = prompt('Nome pagina:'); if(name) setCurrentBoard(p => ({...p, pages: [...p.pages, {id:crypto.randomUUID(), name, items:[]}]}))}} className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-blue-600 text-sm font-medium"><FilePlus className="w-4 h-4" /> Nuova Pagina</button>}
                </div>
              )}
            </div>

            <div className={`min-h-[60vh] p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border-2 ${isLocked ? 'border-transparent' : 'border-dashed border-slate-200 dark:border-slate-700'} ${getActiveItems().length === 0 && currentBoard.type !== 'token' ? 'flex items-center justify-center' : ''}`}>
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
              {(currentBoard.type === 'grid' || currentBoard.type === 'sequence') && activeItems.length > 0 && (
                currentBoard.type === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{activeItems.map(item => <PictogramCard key={item.id} item={item} mode="grid" isLocked={isLocked} onRemove={removeItem} onReplaceImage={(id) => { setEditingContext({type:'item', id}); setShowSearch(true); }} onEditLabel={updateLabel} />)}</div>
                ) : (
                  <div className={`${currentBoard.settings?.orientation === 'vertical' ? 'flex flex-col gap-4 w-full max-w-md mx-auto' : 'flex gap-4 overflow-x-auto pb-6 pt-2 snap-x px-2 h-full items-center w-full'}`}>
                    {activeItems.map((item, index) => (
                      <div key={item.id} draggable={!isLocked} onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`${currentBoard.settings?.orientation === 'vertical' ? 'w-full' : 'snap-center'}`}>
                        <PictogramCard item={item} mode="sequence" orientation={currentBoard.settings?.orientation} isLocked={isLocked} onRemove={removeItem} onReplaceImage={(id) => { setEditingContext({type:'item', id}); setShowSearch(true); }} onEditLabel={updateLabel} onToggleComplete={toggleComplete} />
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
      <SearchModal isOpen={showSearch} onClose={() => { setShowSearch(false); setEditingContext(null); }} onSelect={handleSearchSelect} initialQuery={editingContext?.initialTerm} />
        {/* AGGIUNGI QUESTO: */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}