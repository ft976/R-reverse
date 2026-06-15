'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Search, AlertCircle, Link as LinkIcon, Loader2, Image as ImageIcon, Crosshair, Globe, Camera, FileText, Download, ExternalLink, Type, Database, ScanFace, Info, XCircle, Github, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import exifr from 'exifr';
import WebSourceCard from './web-source-card';

export default function OsintDashboard() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'nvidia/llama-3.1-nemotron-nano-vl-8b-v1' | 'moonshot-v1-8k'>('nvidia/llama-3.1-nemotron-nano-vl-8b-v1');
  const [showInfo, setShowInfo] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [telegramOffset, setTelegramOffset] = useState<number>(0);

  // Telegram Background Polling Loop
  useEffect(() => {
    let isPolling = true;
    
    const pollTelegram = async () => {
      try {
        const res = await fetch('/api/telegram/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: telegramOffset })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.nextOffset) {
            setTelegramOffset(data.nextOffset);
          }
        }
      } catch (err) {
        // Silent error for background polling
      }
      
      if (isPolling) {
        setTimeout(pollTelegram, 3000);
      }
    };
    
    pollTelegram();
    
    return () => {
      isPolling = false;
    };
  }, [telegramOffset]);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [exifData, setExifData] = useState<any>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [webSources, setWebSources] = useState<any[]>([]);
  const [publicImageUrl, setPublicImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeAndCompressImage = (dataUrl: string, maxWidth = 1024, maxHeight = 1024, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const img = typeof window !== 'undefined' ? new window.Image() : null;
      if (!img) {
        resolve(dataUrl);
        return;
      }
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setFileType(file.type);
    const reader = new FileReader();
    reader.onloadend = async () => {
      let finalData = reader.result as string;
      if (file.type.startsWith('image/')) {
        finalData = await resizeAndCompressImage(finalData);
      }
      setImage(finalData);
      resetResults();
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) return;

    setImageFile(file);
    setFileType(file.type);
    const reader = new FileReader();
    reader.onloadend = async () => {
      let finalData = reader.result as string;
      if (file.type.startsWith('image/')) {
        finalData = await resizeAndCompressImage(finalData);
      }
      setImage(finalData);
      resetResults();
    };
    reader.readAsDataURL(file);
  };

  const resetResults = () => {
    setExifData(null);
    setAiReport(null);
    setWebSources([]);
    setPublicImageUrl(null);
    setError(null);
    setLogs([]);
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${message}`]);
    setProcessingStep(message);
  };

  const runGlobalOSINT = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);
    resetResults();
    addLog('INITIALIZING OMNISEARCH PROTOCOL...');

    try {
      // 1. Extract EXIF Locally (Hidden Data)
      addLog('Extracting hidden EXIF Metadata...');
      let localExifData: any = null;
      try {
        if (fileType.startsWith('video/')) {
           localExifData = {
             message: 'Basic Video Metadata Extracted.',
             fileName: imageFile?.name,
             fileSize: imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
             fileType: fileType,
             lastModified: imageFile ? new Date(imageFile.lastModified).toISOString() : 'Unknown'
           };
           setExifData(localExifData);
        } else {
          const dataToParse = imageFile || image;
          const parsedExif = await exifr.parse(dataToParse, {
            tiff: true,
            xmp: true,
            icc: true,
            iptc: true,
            exif: true,
            gps: true,
            interop: true,
            makerNote: true,
            userComment: true,
            mergeOutput: true,
          });
          if (parsedExif && Object.keys(parsedExif).length > 0) {
            localExifData = parsedExif;
            setExifData(parsedExif);
          } else {
            localExifData = { message: 'No hidden EXIF metadata found in this image.' };
            setExifData(localExifData);
          }
        }
      } catch (e: any) {
        console.log('EXIF format unsupported or suppressed:', e.message);
        localExifData = { message: 'No hidden EXIF metadata found or format unsupported.' };
        setExifData(localExifData);
      }

      // 2. Global AI Analysis
      if (selectedModel === 'moonshot-v1-8k') {
        addLog('Connecting to Kimi (Moonshot AI) Deep Analysis Engine...');
      } else {
        addLog('Connecting to NVIDIA Global Analysis (Nemotron VL)...');
      }
      
      const base64Data = image.split(',')[1];

      const prompt = `You are an elite, world-class OSINT (Open Source Intelligence) investigator. I need you to perform a PERFECT, FLAWLESS, and EXHAUSTIVE analysis of this ${fileType.startsWith('video/') ? 'video' : 'image'} using advanced IMINT (Imagery Intelligence), GEOINT (Geospatial Intelligence), and SOCMINT (Social Media Intelligence) methodologies. Every micro-detail is of critical forensic or intelligence value. Do not omit anything.

TASK 1: ULTRA-FINE IMINT (IMAGERY INTELLIGENCE) & OCR EXTRACTION
- Extract ALL visible text, characters, license plates, signs, graffiti, street markers, serial numbers, labels, product packaging, and documents with 100% precision. Transcribe them exactly as they appear. Identify the language(s) and any specific regional dialects or character sets.
- Detect and identify all logos, insignia, symbols, branding, retail marks, patches, flags, security seals, and military/governmental graphics.
- Catalog every visible object, electronic device, vehicle (specify make, model, sub-model, year group, color, visible registration tags), clothing brand, footwear, wristwatch/accessory, visible weapons, and generic utensils.
- Analyze any human/facial features, estimated demographics, uniform details, badge numbers, or behavioral interactions.

TASK 2: DEEP GEOINT (GEOSPATIAL INTELLIGENCE) EXTRACTION
- Document all environmental structures: architectural styles (Gothic, modern, colonial, tenement, vernacular, etc.), building materials (brick patterns, concrete form, roofing styles), road styles (cobblestone, fresh asphalt, gravel, road lanes, painted indicators), utility infrastructure (power lines, transformers, sewer grates, street lights).
- Identify species of trees, plants, shrubbery, soil texture, geological formations, terrain elevation, surrounding bodies of water, and general climate profile.
- Analyze temporal and meteorological clues: shadow length, angle, and sharpness to estimate the exact time of day, absolute sun orientation, light source coordinates, estimated weather condition (humidity, atmospheric haziness, cloud coverage), and seasonal phase.
- Deduce the absolute or highly probable geolocation (continent, country, administrative state/province, city, neighborhood, or specific street intersection). Provide a precise Confidence Score (0-100%) and detail the step-by-step logical cross-referencing of visual clues that led to this geo-hypothesis.

${fileType.startsWith('video/') ? `TASK 3: AUDIOLOGY & SEQUENCE OF EVENTS
- If the video has audio, perform a detailed forensic analysis of all background hums, industrial noise, sirens, animal sounds, wind noise, or echoing signatures.
- Transcribe spoken words, analyze speech patterns, accents, languages, and tone of voice.
- Provide a timeline sequence of events for frames, detailing changes in background, movement vectors, or light dynamics.` : ''}

TASK ${fileType.startsWith('video/') ? '4' : '3'}: SOCMINT & ONLINE SOURCE ESTIMATION
- Infer the likely distribution channel: raw raw mobile clip, CCTV feed, corporate PR, dashcam, professional broadcast, or curated social post.
- List distinct investigative leads, searchable strings, domain registry angles, or public ledger queries for digital tracing.

OUTPUT FORMAT:
Provide an ultra-detailed, highly analytical intelligence report in clean markdown. Structure your findings exactly as follows:
1. **Executive Summary** (Comprehensive operational overview of findings)
2. **Exhaustive IMINT Analysis & OCR** (Exact text transcription, translated content, symbols, objects, brands, uniform/person profiles)
3. **Deep GEOINT Analysis** (Logical geo-deduction process, Confidence Score %, micro-location, environmental structures, weather, shadows, time estimate)
${fileType.startsWith('video/') ? '4. **Temporal, Motion & Forensic Audio Analysis** (Timestamp-by-timestamp description of frames and background audio/speech features)' : ''}
${fileType.startsWith('video/') ? '5' : '4'}. **SOCMINT Profiling & Contextual Investigative Leads** (Actionable OSINT pivoting directions, target lookup strategies)`;

      addLog(`Analyzing ${fileType.startsWith('video/') ? 'video' : 'image'} (IMINT/GEOINT)...`);
      
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          base64Data, 
          fileType: fileType || 'image/jpeg', 
          prompt, 
          model: selectedModel,
          exifData: localExifData
        })
      });

      if (!analyzeRes.ok) {
        const contentType = analyzeRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errData = await analyzeRes.json();
          throw new Error(errData.error || 'Failed to analyze media.');
        } else {
          const text = await analyzeRes.text();
          throw new Error(`Analysis API failed with status ${analyzeRes.status}: ${text.substring(0, 100)}`);
        }
      }
      
      const data = await analyzeRes.json();
      setAiReport(data.report || 'No intelligence report generated.');
      
      if (data.webSources && data.webSources.length > 0) {
        setWebSources(data.webSources);
        addLog(`Grounding sources indexed: ${data.webSources.length} matching locations & public profiles identified.`);
      } else {
        setWebSources([]);
        addLog('Analysis report generated.');
      }

      // 3. Prepare Reverse Image Search Links (for exact visual matches)
      if (fileType.startsWith('video/')) {
        addLog('Skipping reverse image search links for video file.');
      } else {
        addLog('Generating Global Reverse Search Links...');
        try {
          let fileToUpload = imageFile;
          if (!fileToUpload && image) {
            const res = await fetch(image);
            const blob = await res.blob();
            fileToUpload = new File([blob], 'annotated_image.png', { type: 'image/png' });
          }

          if (fileToUpload) {
            const formData = new FormData();
            formData.append('reqtype', 'fileupload');
            formData.append('time', '1h'); // litterbox
            formData.append('fileToUpload', fileToUpload);
            
            // Using our proxy API route to avoid CORS issues
            const uploadRes = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData
            });
            
            if (uploadRes.ok) {
              const contentType = uploadRes.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await uploadRes.json();
                if (data.url && data.url.startsWith('http')) {
                  setPublicImageUrl(data.url);
                  addLog('Image successfully staged for reverse search.');
                }
              } else {
                const text = await uploadRes.text();
                throw new Error(`Upload API returned non-JSON: ${text.substring(0, 100)}`);
              }
            } else {
              throw new Error(`Upload API failed with status ${uploadRes.status}`);
            }
          }
        } catch (e) {
          console.error('Failed to upload for reverse search:', e);
          // Non-fatal, we just won't have the 1-click links
        }
      }

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred during global analysis.');
      addLog(`ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      addLog('PROCESS COMPLETE.');
    }
  };

  const renderExifValue = (value: any): React.ReactNode => {
    if (value === undefined || value === null) return <span className="text-zinc-600 italic">null</span>;
    
    // Handle Buffers and TypedArrays
    if (value instanceof Uint8Array || value instanceof ArrayBuffer || value?.type === 'Buffer' || ArrayBuffer.isView(value)) {
      const size = value.byteLength || value.data?.length || 0;
      const typeName = value.constructor?.name || 'Binary Data';
      return <span className="text-blue-400/70 italic">[{typeName} - {size} bytes]</span>;
    }
    
    // Handle Arrays
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-zinc-800/80 border border-zinc-700/50 rounded text-[10px] text-zinc-300">
              {typeof v === 'object' && v !== null ? (ArrayBuffer.isView(v) ? `[${v.constructor.name}]` : (typeof v === 'bigint' ? v.toString() + 'n' : JSON.stringify(v, (key, val) => typeof val === 'bigint' ? val.toString() + 'n' : val))) : (typeof v === 'bigint' ? v.toString() + 'n' : String(v))}
            </span>
          ))}
        </div>
      );
    }
    
    // Handle Dates
    if (value instanceof Date) {
      return <span className="text-zinc-300">{value.toLocaleString()}</span>;
    }

    // Handle Objects
    if (typeof value === 'object') {
      let stringified = '';
      try {
        stringified = JSON.stringify(value, (key, val) => {
          if (typeof val === 'bigint') return val.toString() + 'n';
          if (val && val.type === 'Buffer') return `[Buffer ${val.data?.length} bytes]`;
          if (val instanceof ArrayBuffer) return `[ArrayBuffer ${val.byteLength} bytes]`;
          if (ArrayBuffer.isView(val)) return `[${val.constructor.name} ${val.byteLength} bytes]`;
          // Truncate very long arrays to prevent UI freezing
          if (Array.isArray(val) && val.length > 50) {
            return `[Array(${val.length}) - truncated]`;
          }
          return val;
        }, 2);
      } catch (e) {
        stringified = String(value);
      }

      return (
        <div className="bg-[#0a0a0a] p-3 rounded-md border border-zinc-800/50 overflow-x-auto">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-400">
            {stringified}
          </pre>
        </div>
      );
    }
    
    // Handle primitives
    if (typeof value === 'bigint') {
      return <span className="text-zinc-300">{value.toString()}n</span>;
    }
    return <span className="text-zinc-300">{String(value)}</span>;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-zinc-800 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Database className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-mono font-bold text-white tracking-tight">OmniSearch OSINT Terminal</h1>
                <p className="text-zinc-500 text-sm mt-1">Global Web Indexing & Deep Data Extraction</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInfo(true)}
              className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-zinc-900 rounded-full"
            >
              <Info className="w-6 h-6" />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f0f0f] border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl"
              >
                <button 
                  onClick={() => setShowInfo(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-mono font-bold text-white mb-4">About OmniSearch OSINT Terminal</h2>
                <div className="space-y-4 text-sm text-zinc-400 font-mono">
                  <p>
                    OmniSearch is an intelligence platform engineered for comprehensive global web indexing and deep data extraction.
                  </p>
                  
                  <div className="border-t border-zinc-800 pt-4 mt-6">
                    <strong className="text-zinc-200">Developer Information:</strong>
                    <div className="mt-2 text-zinc-500 space-y-2">
                      <p>
                        Developed by <strong>Rehan97</strong> for rapid intelligence gathering leveraging integrated Vision processing systems.
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                        <a href="https://github.com/ft976" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          <Github className="w-4 h-4" />
                          GitHub: ft976
                        </a>
                        <a href="https://www.linkedin.com/in/rehan-ahmad-863386382" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          <Linkedin className="w-4 h-4" />
                          LinkedIn Profile
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Tools */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Section */}
            <div className="">
              <div className="pb-4 flex items-center justify-between">
                <h2 className="text-sm font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-blue-500" /> Target Subject
                </h2>
                {image && (
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => { setImage(null); setImageFile(null); resetResults(); }}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              
              <div className="py-4">
                {!image ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all rounded-lg p-8 text-center cursor-pointer group flex flex-col items-center justify-center min-h-[250px]"
                  >
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-zinc-800">
                      <Upload className="w-8 h-8 text-zinc-500 group-hover:text-blue-400" />
                    </div>
                    <p className="text-zinc-300 font-medium mb-2">Initialize Target Media</p>
                    <p className="text-zinc-600 text-xs">Drag & drop or click to browse (Image/Video)</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*,video/*" 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-square flex items-center justify-center">
                      {fileType.startsWith('video/') ? (
                        <video src={image} controls className="max-w-full max-h-full object-contain" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={image} alt="Target" className="max-w-full max-h-full object-contain" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Section */}
            <div className="pt-6">
              <div className="pb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                  Global Search Parameters
                </h2>
              </div>
              
              <div className="space-y-6">
                <p className="text-xs text-zinc-500 font-mono leading-relaxed">
                  This tool will extract all text, faces, and objects from the media, then query the global internet index (including public social media and websites) to find exact or similar matches.
                </p>

                {/* OSINT Analysis Model Selector */}
                <div className="space-y-2 border-t border-zinc-900 pt-4">
                  <label className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    Forensic AI Model
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedModel('nvidia/llama-3.1-nemotron-nano-vl-8b-v1')}
                        className={`font-mono text-[11px] p-3 rounded-md border transition-all flex flex-col justify-between text-left ${
                          selectedModel === 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1'
                            ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-blue-400">Nemotron VL 8B</span>
                          <span className="block text-[8px] opacity-75 mt-0.5 text-zinc-500 uppercase tracking-wider">NVIDIA Cloud Vision</span>
                        </div>
                        <span className="text-[9px] opacity-75 mt-3 text-zinc-400">High-performance target imagery and video frame analysis.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedModel('moonshot-v1-8k')}
                        className={`font-mono text-[11px] p-3 rounded-md border transition-all flex flex-col justify-between text-left ${
                          selectedModel === 'moonshot-v1-8k'
                            ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-emerald-400">Kimi Model</span>
                          <span className="block text-[8px] opacity-75 mt-0.5 text-zinc-500 uppercase tracking-wider">Moonshot AI</span>
                        </div>
                        <span className="text-[9px] opacity-75 mt-3 text-zinc-400">Deep tabular cross-examination & forensic text/EXIF reports.</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={runGlobalOSINT}
                  disabled={isProcessing || !image}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {processingStep || 'QUERYING...'}
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      EXECUTE GLOBAL SEARCH
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            <div className="min-h-[700px] flex flex-col">
              <div className="pb-4 flex items-center gap-2 border-b border-zinc-900/50">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                  Intelligence Report
                </h2>
              </div>
              
              <div className="py-6 flex-1 overflow-auto space-y-8">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 text-red-400 mb-6">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {!image && !isProcessing && !aiReport && !exifData && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 min-h-[400px]">
                    <Globe className="w-12 h-12 opacity-20" />
                    <p className="font-mono text-sm">Awaiting target image to begin global scan...</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="h-full flex flex-col items-center justify-center text-blue-500 space-y-8 min-h-[400px]">
                    <div className="relative">
                      <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping"></div>
                      <div className="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <Globe className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="w-full max-w-md bg-black border border-zinc-800 rounded-lg p-4 font-mono text-xs text-left shadow-inner overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                      <p className="text-blue-400 font-bold mb-2 tracking-widest animate-pulse">TERMINAL OUTPUT</p>
                      <div className="space-y-1 text-zinc-400 h-32 overflow-y-auto flex flex-col justify-end">
                        {logs.map((log, i) => (
                          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <span className="text-zinc-600 mr-2">&gt;</span>
                            {log}
                          </div>
                        ))}
                        <div className="animate-pulse flex items-center mt-1">
                          <span className="text-zinc-600 mr-2">&gt;</span>
                          <span className="w-2 h-3 bg-blue-500 inline-block"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {(aiReport || exifData) && !isProcessing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      
                      {/* AI & Web Search Report */}
                      {aiReport && (
                        <div className="py-2">
                          <h3 className="text-sm font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Search className="w-4 h-4 text-blue-500" /> Analysis Report
                          </h3>
                          <div className="prose prose-invert prose-blue max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-img:rounded-lg prose-headings:font-mono prose-headings:font-semibold">
                            <ReactMarkdown>{aiReport}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Exact Match Reverse Image Search Links */}
                      {publicImageUrl && (
                        <div className="py-6">
                          <h3 className="text-sm font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Crosshair className="w-4 h-4 text-blue-500" /> Exact Image Matches (Reverse Search)
                          </h3>
                          <p className="text-xs text-zinc-500 font-mono mb-4">
                            To find this exact picture on Instagram, public profiles, or other websites, use these direct links. The image has been securely staged to enable deep visual search.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <a 
                              href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(publicImageUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-sm font-medium text-zinc-300 hover:text-blue-400"
                            >
                              <Search className="w-4 h-4" /> Google Lens
                            </a>
                            <a 
                              href={`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(publicImageUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-sm font-medium text-zinc-300 hover:text-blue-400"
                            >
                              <Globe className="w-4 h-4" /> Yandex Images
                            </a>
                            <a 
                              href={`https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIRP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(publicImageUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-sm font-medium text-zinc-300 hover:text-blue-400"
                            >
                              <Search className="w-4 h-4" /> Bing Visual
                            </a>
                            <a 
                              href={`https://tineye.com/search?url=${encodeURIComponent(publicImageUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-sm font-medium text-zinc-300 hover:text-blue-400"
                            >
                              <ScanFace className="w-4 h-4" /> TinEye
                            </a>
                            <a 
                              href={`https://graph.baidu.com/details?isfrom=wise&origin=wise&tn=wise&sign=&url=${encodeURIComponent(publicImageUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-sm font-medium text-zinc-300 hover:text-blue-400"
                            >
                              <Globe className="w-4 h-4" /> Baidu Image
                            </a>
                            <a 
                              href={`https://images.google.com/searchbyimage?image_url=${encodeURIComponent(publicImageUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-sm font-medium text-zinc-300 hover:text-blue-400"
                            >
                              <Search className="w-4 h-4" /> Google Images
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Web Sources Links */}
                      {webSources.length > 0 && (
                        <div className="py-6">
                          <h3 className="text-sm font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-500" /> Public Profiles & Similar Images Found
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {webSources.map((chunk, idx) => {
                              const webData = chunk.web;
                              if (!webData) return null;
                              return <WebSourceCard key={idx} webData={webData} />;
                            })}
                          </div>
                        </div>
                      )}

                      {/* EXIF Results */}
                      {exifData && (
                        <div className="py-6">
                          <h3 className="text-sm font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-blue-500" /> Hidden EXIF Metadata
                          </h3>
                          <div className="">
                            {exifData.message ? (
                              <div className="py-4 text-sm text-zinc-500 font-mono">{exifData.message}</div>
                            ) : (
                              <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                  <tbody className="divide-y divide-zinc-900">
                                    {Object.entries(exifData).map(([key, value]) => (
                                      <tr key={key} className="hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/50 last:border-0">
                                        <td className="py-3 pr-4 font-mono text-xs text-blue-400 font-semibold w-1/4 align-top uppercase tracking-wider">
                                          {key}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs text-zinc-300 break-all align-top">
                                          {renderExifValue(value)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

