/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  Calendar,
  AlertCircle,
  Play,
  FileCode,
  Download,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';
import { Agenda, AgendaItem } from './types';
import ExportMenu from './components/ExportMenu';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>('');
  const [totalTime, setTotalTime] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [selectedActionItems, setSelectedActionItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleActionItem = (item: string) => {
    const newSelected = new Set(selectedActionItems);
    if (newSelected.has(item)) {
        newSelected.delete(item);
    } else {
        newSelected.add(item);
    }
    setSelectedActionItems(newSelected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ['.docx', '.md', '.pdf', 'text/markdown', 'text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (validTypes.some(type => droppedFile.name.endsWith(type) || droppedFile.type === type)) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a .docx, .md, or .pdf file.');
      }
    }
  };

  const generateAgenda = async () => {
    if (!file && !description.trim()) {
      setError('Please provide a meeting description or upload a document.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let documentText = '';
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/process-doc', {
          method: 'POST',
          body: formData,
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           const text = await res.text();
           console.error("Received non-JSON response:", text);
           throw new Error(`Server error: received unexpected format.`);
        }

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to process document');
        }

        documentText = data.text;
      }

      const prompt = `Act as an expert meeting facilitator and project manager. 
      Analyze the provided context and create a highly structured meeting agenda.
      Total meeting time allowed is exactly ${totalTime} minutes.
      
      Context provided by user:
      ${description || 'No manual description provided.'}
      
      Supporting Document Content:
      ${documentText || 'No supporting document provided.'}
      
      For each agenda item, provide:
      1. A clear Title.
      2. A concise 1-2 sentence Summary.
      3. A list of 1-3 detailed Action Items. Include critical keywords, specific metrics, or numbers if present in the context.
      4. Key Stakeholders involved for that topic.
      5. Allocated Time in minutes.
      
      Ensure the total allocated time for all items equals exactly ${totalTime} minutes.
      Structure the response as a formal meeting agenda with a title, a high-level objective, and the list of items.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              objective: { type: Type.STRING },
              totalDuration: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                    stakeholders: { type: Type.ARRAY, items: { type: Type.STRING } },
                    durationMinutes: { type: Type.NUMBER },
                  },
                  required: ['title', 'summary', 'actionItems', 'stakeholders', 'durationMinutes']
                }
              }
            },
            required: ['title', 'objective', 'totalDuration', 'items']
          }
        }
      });

      const agendaData = JSON.parse(response.text);
      setAgenda(agendaData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while generating the agenda.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105">
            <Calendar size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AgendAI</h1>
        </div>
        <div className="flex items-center gap-4">
          {file && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
              <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">{file.name}</span>
            </div>
          )}
          {agenda && (
            <ExportMenu agenda={agenda} selectedActionItems={Array.from(selectedActionItems)} />
          )}
          <button 
            onClick={() => window.location.reload()}
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors"
          >
            New
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6 h-[calc(100vh-64px)]">
        {/* Left Sidebar: Controls & Inputs */}
        <aside className="w-72 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-6">
            <section className="space-y-2">
              <h2 className="text-lg font-bold tracking-tight leading-tight">
                Craft effortless <br /><span className="text-indigo-600">meeting agendas.</span>
              </h2>
              <p className="text-slate-400 text-xs">
                Provide meeting details or upload a document to get started.
              </p>
            </section>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Meeting Context</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this meeting about? Include key topics, goals, and any necessary info..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-300 font-medium"
                />
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                  <span className="bg-white px-3 text-slate-300 font-bold">OR / Supporting Document</span>
                </div>
              </div>

              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Upload Context</label>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer group",
                  file 
                    ? "border-indigo-200 bg-indigo-50/30" 
                    : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".docx,.md,.pdf,text/markdown,application/pdf"
                  className="hidden" 
                />
                
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                  file ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {file ? <FileText size={20} /> : <Upload size={20} />}
                </div>
                
                <div className="text-center overflow-hidden w-full">
                  <p className="font-bold text-sm truncate px-2">
                    {file ? file.name : "Upload a file"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "DOCX, PDF, MD"}
                  </p>
                </div>

                {file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 z-10"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Meeting Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map(time => (
                    <button 
                      key={time}
                      onClick={() => setTotalTime(time)}
                      className={cn(
                        "px-1 py-2 rounded-lg text-[9px] font-bold transition-all border",
                        totalTime === time 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {time} min
                    </button>
                  ))}
                </div>
                
                {/* Duration Slider */}
                <div className="flex items-center gap-1 mt-4 mb-4 justify-between w-full">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">10m</span>
                  <div className="flex-1 relative py-3 px-2">
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      step="5"
                      value={totalTime}
                      onChange={(e) => setTotalTime(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div 
                      className="absolute top-0 text-[11px] font-bold text-indigo-600 whitespace-nowrap"
                      style={{ 
                        left: `${((totalTime - 10) / (90 - 10)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {totalTime} min
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">90m</span>
                </div>
              </div>

              <button 
                onClick={generateAgenda}
                disabled={(!file && !description.trim()) || isLoading}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] mt-4 shadow-sm",
                  (!file && !description.trim()) || isLoading
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:shadow-lg"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    Draft Agenda
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={14} />
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">{error}</p>
                </motion.div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">Recent Context</label>
            <div className="space-y-1 text-[11px] text-slate-500 font-medium">
               <p>• Optimized for {totalTime} minutes</p>
               <p>• Language: English (US)</p>
               <p>• Engine: Gemini 3 Flash</p>
            </div>
          </div>
        </aside>

        {/* Center Column: Generated Agenda */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden relative">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-700 tracking-tight flex items-center gap-2">
                <FileCode size={14} className="text-indigo-600" />
                Generated Agenda
              </h2>
              {agenda && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  Ready
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
              <AnimatePresence mode="wait">
                {agenda ? (
                  <motion.div 
                    key="results"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <header className="space-y-4">
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{agenda.title}</h3>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-4">
                        <div className="w-1 h-auto bg-indigo-200 rounded-full shrink-0"></div>
                        <p className="text-xs text-slate-600 leading-relaxed italic">
                          "{agenda.objective}"
                        </p>
                      </div>
                    </header>

                    <div className="space-y-2">
                      {agenda.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 group">
                          <div className="w-16 shrink-0 flex flex-col items-center pt-1">
                            <span className="text-xs font-bold text-indigo-600">
                              {/* Calculate cumulative time or just show segment size? 
                                  Standard agenda often shows cumulative. 
                                  For simplicity and matching design, let's show segment index or cumulative 
                              */}
                              {idx === 0 ? "00:00" : `+${item.durationMinutes}m`}
                            </span>
                            <div className="w-px flex-1 bg-slate-100 my-2 group-last:bg-transparent" />
                          </div>
                          <div className="pb-8 flex-1">
                            <div className="flex items-start justify-between">
                              <h4 className="text-sm font-bold text-indigo-700 group-hover:text-indigo-800 transition-colors">
                                {item.title}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                {item.durationMinutes}m
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {item.summary}
                            </p>
                            
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                               {item.stakeholders.length > 0 && (
                                 <div className="flex flex-wrap gap-1.5">
                                   {item.stakeholders.slice(0, 3).map((sh, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                                        <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[8px] font-bold">
                                          {sh.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-600">{sh}</span>
                                      </div>
                                   ))}
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                      <FileText size={32} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Draft your first agenda</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Select source file to begin</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Context & Actions */}
        <aside className="w-64 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="bg-white rounded-xl p-5 text-slate-800 shadow-sm border border-slate-200">
              <label className="text-[11px] font-bold text-rose-700 uppercase tracking-widest mb-4 block border-b border-rose-100 pb-2">Key Deliverables</label>
              <ul className="space-y-3">
                {agenda ? agenda.items.flatMap(i => i.actionItems).slice(0, 10).map((ai, idx) => (
                  <li key={idx} className="flex gap-3 animate-in fade-in slide-in-from-right-4 duration-300 fill-mode-both" style={{ animationDelay: `${idx * 100}ms` }}>
                    <input 
                        type="checkbox"
                        checked={selectedActionItems.has(ai)}
                        onChange={() => toggleActionItem(ai)}
                        className="w-4 h-4 mt-0.5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-700 leading-tight">{ai}</p>
                  </li>
                )) : (
                  <li className="flex gap-3 opacity-50">
                    <div className="w-4 h-4 rounded border-2 border-slate-300 mt-0.5 shrink-0"></div>
                    <p className="text-[11px] text-slate-400 italic">No tasks identified</p>
                  </li>
                )}
              </ul>
            </div>
          
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-1 flex flex-col">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">Efficiency Meter</label>
            <div className="space-y-5 flex-1">
              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <span className="text-[10px] text-slate-500 font-medium">Total Sections</span>
                <span className="text-lg font-bold text-slate-800">{agenda?.items.length || 0}</span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <span className="text-[10px] text-slate-500 font-medium">Avg Time / Topic</span>
                <span className="text-lg font-bold text-slate-800">
                  {agenda ? Math.round(agenda.totalDuration / agenda.items.length) : 0}m
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <span className="text-[10px] text-slate-500 font-medium">Stakeholders</span>
                <span className="text-lg font-bold text-slate-800">
                  {agenda ? Array.from(new Set(agenda.items.flatMap(i => i.stakeholders))).length : 0}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-slate-500 font-medium">AI Confidence</span>
                <span className="text-lg font-bold text-emerald-600">99.9%</span>
              </div>
            </div>
            
            <div className="mt-8 p-3 bg-slate-50 rounded-lg border border-slate-100">
               <div className="flex items-center gap-2 mb-2">
                 <AlertCircle size={10} className="text-indigo-400" />
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Pro Tip</span>
               </div>
               <p className="text-[10px] text-slate-500 leading-relaxed italic">
                 Keep sections under 20 minutes for maximum engagement.
               </p>
            </div>
          </div>
        </aside>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
        @media print {
          aside, header, footer { display: none !important; }
          main { display: block !important; p: 0 !important; h: auto !important; }
          section { border: none !important; shadow: none !important; overflow: visible !important; }
          .bg-slate-50 { background: white !important; }
        }
      `}} />
    </div>
  );
}
