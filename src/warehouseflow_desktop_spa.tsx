import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Box, LayoutDashboard, Package, ArrowDownToLine, Send, Users, 
  ShoppingCart, Truck, BarChart2, Settings, Search, Bell, Globe, 
  CheckCircle2, Download, Plus, Clock, AlertTriangle, Maximize, 
  ClipboardList, Grid, TrendingDown, TrendingUp, Edit, Trash2, X, Play,
  ArrowRight, Github, Mail, Loader2, Route, RadioReceiver, Bot, Sparkles,
  MessageSquare, Minimize2, Mic, MicOff, Smartphone, QrCode, MessageCircle,
  Link as LinkIcon, Cpu, UserCog, Square, CheckSquare, ListChecks, Menu
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'warehouseflow-app-id';

const callGeminiAPI = async (prompt) => {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: "Eres el experto AI de WarehouseFlow. Responde estrictamente lo que se pide, de forma profesional, concisa y en formato JSON si se solicita." }] }
  };

  const retries = [1000, 2000, 4000];
  for (let i = 0; i < retries.length; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
    } catch (err) {
      if (i === retries.length - 1) throw err;
      await new Promise(res => setTimeout(res, retries[i]));
    }
  }
};

class SKUGenerator {
  static generate(category, name) {
    const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'GEN';
    const namePrefix = name ? name.substring(0, 2).toUpperCase() : 'XX';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${catPrefix}-${namePrefix}-${randomNum}`;
  }
}

const getStatusColor = (status) => {
  const greenStatuses = ['OK', 'Activo', 'Completado', 'Disponible', 'Activa', 'Completada'];
  const orangeStatuses = ['Bajo', 'Pendiente', 'En Proceso', 'En Ruta', 'Empacando', 'Cross-Docking'];
  const redStatuses = ['Crítico', 'Inactivo', 'Mantenimiento', 'Cancelado', 'Pausada'];

  if (greenStatuses.includes(status)) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (orangeStatuses.includes(status)) return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (redStatuses.includes(status)) return 'bg-rose-100 text-rose-800 border border-rose-200';
  return 'bg-gray-100 text-gray-800 border border-gray-200';
};

const translations = {
  es: {
    dashboard: 'Panel de Operaciones', inv: 'Inventario & ABC', inOrders: 'Recepción',
    outOrders: 'Despacho', clients: 'Clientes', transport: 'Transporte y Rutas',
    picking: 'Picking Avanzado', whatsapp: 'WhatsApp AI Agent', crm: 'CRM & Leads',
    system: 'Sistema & Usuarios', search: 'Buscar SKUs, órdenes...',
    welcome: 'Bienvenido de nuevo', currentShift: 'Turno actual · Muelles A, B, C activos',
    compRate: 'Tasa de Cumplimiento', inToday: 'Entradas Hoy', pendingDisp: 'Despacho Pendiente',
    lowStock: 'Alertas de Stock', dockTime: 'Dwell Time', accuracy: 'Precisión Inventario',
    activeOrders: 'Órdenes Activas', occupancy: 'Ocupación', vsYesterday: 'vs ayer',
    objective: 'Objetivo', arriving: 'llegando ahora', outOfWindow: 'fuera de ventana',
    since: 'desde', lastCount: 'Último conteo: hoy', slots: 'slots', add: 'Añadir', save: 'Guardar',
    cancel: 'Cancelar', edit: 'Editar', delete: 'Eliminar', actions: 'Acciones',
    welcomeAuth: 'Acceso Operativo', accessPanel: 'Identifícate para iniciar tu turno',
    email: 'USUARIO / EMAIL', password: 'PIN / CONTRASEÑA', enter: 'Acceder al SGA',
    demoText: 'Demo: admin@sga.com / admin123',
    copyright: '© 2026 WarehouseFlow · WMS Enterprise', realTimeControl: 'WORLD-CLASS WAREHOUSING'
  }
};

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg mb-1 transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
    <div className="flex items-center space-x-3"><Icon size={18} className={active ? 'text-white' : 'text-gray-400'} /><span className="font-medium text-sm">{label}</span></div>
    {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{badge}</span>}
  </button>
);

const KpiCard = ({ title, value, subtitle, icon: Icon, trend, trendLabel, trendUp, bgColor, textColor, iconColor }) => (
  <div className={`p-5 rounded-xl border transition-all hover:shadow-md ${bgColor ? bgColor : 'bg-white border-gray-200'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg ${bgColor ? 'bg-white/50' : 'bg-indigo-50 text-indigo-600'}`}><Icon size={20} className={iconColor || ''} /></div>
      {trend && (
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {trendUp ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />} {trend} <span className="ml-1 opacity-80 font-medium hidden sm:inline">{trendLabel}</span>
        </div>
      )}
    </div>
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
      <div className={`text-3xl font-extrabold mb-1 tracking-tight ${textColor || 'text-gray-900'}`}>{value}</div>
      <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
    </div>
  </div>
);

const CrudView = ({ entityKey, title, data, fields, onSave, onDelete, onBatchDelete, t, isLoading, onInjectMock, totalGlobalRecords }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [aiFilling, setAiFilling] = useState(false);

  const toggleSelectAll = () => selectedIds.length === data.length ? setSelectedIds([]) : setSelectedIds(data.map(d => d.id));
  const toggleSelect = (id) => selectedIds.includes(id) ? setSelectedIds(selectedIds.filter(i => i !== id)) : setSelectedIds([...selectedIds, id]);

  const handleAIFillForm = async () => {
    setAiFilling(true);
    try {
      const prompt = `Genera un registro ficticio muy realista para almacén. Tabla: "${entityKey}". Devuelve ÚNICAMENTE JSON válido con claves: ${fields.map(f => f.key).join(', ')}. Opciones select: ${fields.filter(f => f.type === 'select').map(f => `${f.key}: ${f.options.join('|')}`).join('\n')}. Sin markdown.`;
      const res = await callGeminiAPI(prompt);
      setFormData(JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim()));
    } catch (e) { alert("Error IA."); }
    setAiFilling(false);
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setFormData(item || fields.reduce((acc, field) => ({ ...acc, [field.key]: '' }), {}));
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative">
      {selectedIds.length > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-indigo-600 text-white p-4 flex justify-between items-center z-20 animate-fade-in-down shadow-md">
          <div className="flex items-center space-x-3"><span className="bg-white text-indigo-600 px-2 py-1 rounded text-xs font-bold">{selectedIds.length}</span><span className="font-semibold text-sm">Registros seleccionados</span></div>
          <div className="flex space-x-3">
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-indigo-700 rounded-lg text-sm transition">Cancelar</button>
            <button onClick={() => {if(confirm('¿Eliminar?')){ onBatchDelete(selectedIds); setSelectedIds([]);}}} className="px-3 py-1.5 bg-rose-500 rounded-lg text-sm flex items-center transition"><Trash2 size={16} className="mr-2" /> Eliminar</button>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div><h2 className="text-xl font-bold text-gray-900">{title}</h2><p className="text-xs text-gray-500 mt-1">{data.length} registros</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onInjectMock(10)} disabled={totalGlobalRecords >= 500} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition shadow-sm disabled:opacity-50">
            <Sparkles size={16} className="mr-2 text-indigo-500" /> Generar 10 Mock
          </button>
          <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition shadow-sm"><Plus size={16} className="mr-2" /> {t.add}</button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 relative">
        {isLoading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="py-3 px-4 w-12 text-center"><button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600">{selectedIds.length === data.length && data.length > 0 ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}</button></th>
              {fields.map((f) => <th key={f.key} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{f.label}</th>)}
              <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition ${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''}`}>
                <td className="py-3 px-4 text-center"><button onClick={() => toggleSelect(item.id)} className="text-gray-400 hover:text-indigo-600">{selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}</button></td>
                {fields.map((f) => (
                  <td key={f.key} className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                    {f.key === 'status' || f.key === 'type' ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item[f.key])}`}>{item[f.key]}</span> : item[f.key]}
                  </td>
                ))}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 rounded transition mr-2"><Edit size={16} /></button>
                  <button onClick={() => {if(confirm('¿Eliminar?')) onDelete(item.id)}} className="p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded transition"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-down p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">{editingItem ? t.edit : t.add} Registro</h3>
              <div className="flex items-center space-x-2">
                {!editingItem && <button onClick={handleAIFillForm} disabled={aiFilling} className="flex items-center px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition">{aiFilling ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Sparkles size={14} className="mr-1.5" />} Auto IA</button>}
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition p-1"><X size={20} /></button>
              </div>
            </div>
            <form id="crud-form" onSubmit={(e) => { e.preventDefault(); onSave(formData, editingItem?.id); setIsModalOpen(false); }} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.key} className={f.type === 'textarea' || f.key === 'name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={formData[f.key] || ''} onChange={(e) => setFormData({...formData, [f.key]: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white" required={!f.optional}>
                        <option value="">Selecciona...</option>{f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : <input type={f.type || 'text'} value={formData[f.key] || ''} onChange={(e) => setFormData({...formData, [f.key]: e.target.value})} disabled={f.readonly && editingItem} placeholder={f.key === 'sku' ? 'Auto' : ''} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none" required={!f.optional} />}
                  </div>
                ))}
              </div>
            </form>
            <div className="p-5 flex justify-end space-x-3 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white">Cancelar</button>
              <button type="submit" form="crud-form" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdvancedPickingView = ({ dbState }) => {
  const [tasks, setTasks] = useState([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentVoiceTask, setCurrentVoiceTask] = useState(0);

  const pickingTasks = useMemo(() => dbState.outOrders.filter(o => o.status === 'Pendiente' || o.status === 'Cross-Docking').map((o, idx) => ({ id: `TASK-${1000+idx}`, zone: `Pasillo ${['A','B','C','D'][idx%4]}`, product: o.product, qty: o.items, type: o.status === 'Cross-Docking' ? 'Cross-Docking' : 'Estándar', destination: o.client })).sort((a,b) => a.zone.localeCompare(b.zone)), [dbState.outOrders]);

  const toggleVoice = () => {
    if (!('speechSynthesis' in window)) return;
    if (isVoiceActive) { window.speechSynthesis.cancel(); setIsVoiceActive(false); }
    else { setIsVoiceActive(true); speakNextTask(currentVoiceTask); }
  };
  const speakNextTask = (index) => {
    if (index >= pickingTasks.length) { window.speechSynthesis.speak(new SpeechSynthesisUtterance("Fin")); setIsVoiceActive(false); return; }
    const task = pickingTasks[index];
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Atención. Zona ${task.zone}. Recoger ${task.qty} de ${task.product}.`));
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-xl font-bold text-gray-900 flex items-center"><ListChecks className="mr-2 text-indigo-600" /> Operativa de Picking</h2><p className="text-sm text-gray-500 mt-1">Zone Picking y Cross-Docking optimizado.</p></div>
        <button onClick={toggleVoice} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition ${isVoiceActive ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-900 text-white'}`}>{isVoiceActive ? <Mic size={18} className="mr-2"/> : <MicOff size={18} className="mr-2"/>} {isVoiceActive ? 'Detener Voz' : 'Voice Picking'}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pickingTasks.length === 0 && <div className="col-span-full text-center p-8 text-gray-500">Sin tareas pendientes.</div>}
        {pickingTasks.map((task) => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3"><span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${task.type === 'Cross-Docking' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{task.type}</span><span className="text-xs font-mono text-gray-400">{task.id}</span></div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">{task.product}</h3>
            <div className="text-3xl font-black text-indigo-600 mb-4">{task.qty} <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">uds</span></div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2 border border-gray-100"><div className="flex justify-between"><span className="text-gray-500">Zona:</span> <span className="font-bold text-gray-900">{task.zone}</span></div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WhatsAppAgentView = () => {
  const [status, setStatus] = useState('disconnected');
  const [qrCodeId, setQrCodeId] = useState(1);
  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="w-full md:w-1/3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#25D366]/10 text-[#25D366] rounded-2xl flex items-center justify-center mb-4"><MessageCircle size={32} /></div>
        <h2 className="text-lg font-bold text-gray-900">WhatsApp Business API</h2><p className="text-sm text-gray-500 mt-1 mb-6">Powered by Baileys & Node.js</p>
        <div className={`w-full py-2.5 rounded-lg font-bold text-sm mb-6 flex items-center justify-center ${status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}><div className={`w-2 h-2 rounded-full mr-2 ${status === 'connected' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>{status === 'connected' ? 'Conectado' : 'Desconectado'}</div>
        {status === 'waiting_qr' ? (
          <div className="w-full flex flex-col items-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=warehouseflow-demo-qr-${qrCodeId}`} alt="QR" className="w-40 h-40 mb-4 rounded-lg" /><button onClick={() => setStatus('connected')} className="text-indigo-600 font-bold text-sm hover:underline">Simular Escaneo</button></div>
        ) : <button onClick={() => {setStatus('waiting_qr'); setQrCodeId(p=>p+1);}} className="w-full bg-[#25D366] text-white font-bold py-3 rounded-xl">Conectar Servidor</button>}
      </div>
      <div className="w-full md:w-2/3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center"><Bot className="mr-2 text-indigo-600" /> Configuración AI (System Prompt)</h3>
        <textarea className="w-full flex-1 min-h-[200px] border border-gray-300 rounded-lg p-4 text-sm font-mono mt-4" defaultValue="Eres el agente de atención al cliente de Logística Global. Tu objetivo es ayudar a los clientes con el estado de sus pedidos." />
        <button className="mt-4 bg-gray-900 text-white font-semibold py-2.5 px-6 rounded-lg self-end">Guardar Prompt</button>
      </div>
    </div>
  );
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isUIVisible, setIsUIVisible] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotMessages, setCopilotMessages] = useState([{ role: 'model', text: 'Soy Gemini, tu copiloto logístico.' }]);
  
  const [dbState, setDbState] = useState({ inventory: [], inOrders: [], outOrders: [], routes: [], crm: [], users: [] });

  useEffect(() => {
    signInAnonymously(auth).finally(() => setFirebaseUser(auth.currentUser));
    return onAuthStateChanged(auth, setFirebaseUser);
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubs = Object.keys(dbState).map(col => onSnapshot(collection(db, 'artifacts', appId, 'users', firebaseUser.uid, col), snap => setDbState(p => ({...p, [col]: snap.docs.map(d => ({id: d.id, ...d.data()}))}))));
    return () => unsubs.forEach(u => u());
  }, [firebaseUser]);

  const schemas = {
    inventory: [
      { key: 'sku', label: 'SKU', type: 'text', optional: true, readonly: true },
      { key: 'name', label: 'Producto', type: 'text' },
      { key: 'abcClass', label: 'Clase ABC', type: 'select', options: ['A', 'B', 'C'] },
      { key: 'stock', label: 'Stock Actual', type: 'number' },
      { key: 'min', label: 'Mínimo', type: 'number' },
      { key: 'status', label: 'Estado', type: 'select', options: ['OK', 'Bajo', 'Crítico'] }
    ],
    inOrders: [{ key: 'orderRef', label: 'Ref', type: 'text' }, { key: 'supplier', label: 'Proveedor', type: 'text' }, { key: 'items', label: 'Uds', type: 'number' }, { key: 'type', label: 'Operación', type: 'select', options: ['Estocaje', 'Cross-Docking'] }, { key: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Descargando', 'Completado'] }],
    outOrders: [{ key: 'orderRef', label: 'Ref', type: 'text' }, { key: 'client', label: 'Cliente', type: 'text' }, { key: 'items', label: 'Uds', type: 'number' }, { key: 'type', label: 'Operación', type: 'select', options: ['Estándar', 'Cross-Docking'] }, { key: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Empacando', 'En Ruta', 'Completada'] }],
    routes: [{ key: 'routeId', label: 'ID Ruta', type: 'text' }, { key: 'driver', label: 'Transportista', type: 'text' }, { key: 'status', label: 'Estado', type: 'select', options: ['Disponible', 'En Ruta', 'Cancelado'] }],
    crm: [{ key: 'company', label: 'Empresa', type: 'text' }, { key: 'leadScore', label: 'Lead Score', type: 'number' }, { key: 'status', label: 'Fase', type: 'select', options: ['Nuevo Lead', 'En Negociación', 'Cliente Activo'] }],
    users: [{ key: 'name', label: 'Operario', type: 'text' }, { key: 'role', label: 'Rol', type: 'select', options: ['Admin', 'Manager', 'Picker'] }, { key: 'status', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'] }]
  };

  const t = translations.es;
  const navigateTo = (view) => { setCurrentView(view); setIsMobileMenuOpen(false); };

  const handleCopilotSend = async (e) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;
    const text = copilotInput.trim();
    setCopilotInput('');
    setCopilotMessages(p => [...p, { role: 'user', text }]);
    const res = await callGeminiAPI(`Contexto almacén: ${dbState.inventory.length} SKUs. Responde breve. Pregunta: ${text}`);
    setCopilotMessages(p => [...p, { role: 'model', text: res }]);
  };

  if (!isUIVisible) return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      <div className="w-full lg:w-[40%] flex flex-col justify-center p-14 relative z-10 bg-white">
        <h2 className="text-3xl font-extrabold mb-2 text-gray-900">Bienvenido de nuevo</h2>
        <p className="text-gray-500 mb-10 text-sm font-medium">Accede al panel de control de tu almacén</p>
        <button onClick={() => setIsUIVisible(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center transition">Entrar al Panel <ArrowRight size={18} className="ml-2"/></button>
      </div>
      <div className="hidden lg:flex lg:w-[60%] relative bg-gray-900">
        <img src="watermarked_img_5528857302264779552.png" alt="Warehouse" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans overflow-hidden text-gray-900">
      {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-gray-900/60 z-40" onClick={() => setIsMobileMenuOpen(false)}/>}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0F172A] flex flex-col h-full transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between"><h1 className="font-extrabold text-white text-lg">WarehouseFlow</h1><button className="md:hidden text-gray-400" onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button></div>
        <nav className="flex-1 px-4 pb-6 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => navigateTo('dashboard')} />
          <SidebarItem icon={Box} label="Inventario" active={currentView === 'inventory'} onClick={() => navigateTo('inventory')} />
          <SidebarItem icon={ListChecks} label="Picking" active={currentView === 'picking'} onClick={() => navigateTo('picking')} />
          <SidebarItem icon={ArrowDownToLine} label="Recepciones" active={currentView === 'inOrders'} onClick={() => navigateTo('inOrders')} />
          <SidebarItem icon={Send} label="Expediciones" active={currentView === 'outOrders'} onClick={() => navigateTo('outOrders')} />
          <SidebarItem icon={Route} label="Rutas" active={currentView === 'routes'} onClick={() => navigateTo('routes')} />
          <SidebarItem icon={MessageCircle} label="WhatsApp AI" active={currentView === 'whatsapp'} onClick={() => navigateTo('whatsapp')} />
          <SidebarItem icon={Users} label="CRM Clientes" active={currentView === 'crm'} onClick={() => navigateTo('crm')} />
          <SidebarItem icon={UserCog} label="Usuarios" active={currentView === 'users'} onClick={() => navigateTo('users')} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
          <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMobileMenuOpen(true)}><Menu size={20}/></button>
          <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold"><RadioReceiver size={16}/><span>RFID Activo</span></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {currentView === 'dashboard' ? (
            <div className="max-w-7xl mx-auto space-y-6">
              <h2 className="text-3xl font-extrabold">Dashboard Operativo</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard title="Órdenes Entrada" value={dbState.inOrders.length} icon={Package} trend="+2" trendUp={true} bgColor="bg-white" />
                <KpiCard title="Órdenes Salida" value={dbState.outOrders.length} icon={Truck} trend="-1" trendUp={false} />
                <KpiCard title="Stock Crítico" value={dbState.inventory.filter(i=>i.status==='Crítico').length} icon={AlertTriangle} bgColor="bg-rose-50 border-rose-100" iconColor="text-rose-600" textColor="text-rose-900" />
                <KpiCard title="Precisión" value="99.9%" icon={Maximize} bgColor="bg-emerald-50 border-emerald-100" iconColor="text-emerald-600" textColor="text-emerald-900" />
              </div>
              <div className="bg-indigo-900 rounded-2xl p-6 text-white relative">
                 <h3 className="text-xl font-bold flex items-center mb-4"><Sparkles className="mr-2 text-yellow-400"/> IA Logistics Report</h3>
                 <button onClick={async () => { setGeneratingAi(true); setAiReport(await callGeminiAPI(`Resume el estado con ${dbState.inventory.length} SKUs`)); setGeneratingAi(false); }} className="bg-white/20 px-4 py-2 rounded-lg text-sm">{generatingAi ? 'Analizando...' : 'Generar Reporte'}</button>
                 {aiReport && <p className="mt-4 text-sm bg-black/20 p-4 rounded-lg">{aiReport}</p>}
              </div>
            </div>
          ) : currentView === 'picking' ? <AdvancedPickingView dbState={dbState} /> 
            : currentView === 'whatsapp' ? <WhatsAppAgentView /> 
            : schemas[currentView] && <CrudView entityKey={currentView} title={t[currentView]} data={dbState[currentView]} fields={schemas[currentView]} onSave={(d,id) => {if(id) updateDoc(doc(db, 'artifacts', appId, 'users', firebaseUser.uid, currentView, id), d); else addDoc(collection(db, 'artifacts', appId, 'users', firebaseUser.uid, currentView), {...d, createdAt: Date.now()});}} onDelete={(id) => deleteDoc(doc(db, 'artifacts', appId, 'users', firebaseUser.uid, currentView, id))} onBatchDelete={(ids) => {const b=writeBatch(db); ids.forEach(i=>b.delete(doc(db, 'artifacts', appId, 'users', firebaseUser.uid, currentView, i))); b.commit();}} onInjectMock={async(n)=>{const res=await callGeminiAPI(`Genera JSON array de ${n} objetos. Claves: ${schemas[currentView].map(f=>f.key).join(', ')}. Sin markdown.`); const arr=JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim()); const b=writeBatch(db); const ref=collection(db, 'artifacts', appId, 'users', firebaseUser.uid, currentView); arr.forEach(i=>b.set(doc(ref), {...i, createdAt:Date.now()})); b.commit();}} totalGlobalRecords={0} t={t} />
          }
        </div>

        {/* Copilot */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {copilotOpen && (
            <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 mb-4 h-[400px] flex flex-col overflow-hidden">
              <div className="bg-indigo-900 p-3 text-white font-bold flex justify-between"><span className="flex items-center"><Bot size={18} className="mr-2"/> Copilot IA</span><button onClick={()=>setCopilotOpen(false)}><X size={18}/></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">{copilotMessages.map((m,i) => <div key={i} className={`p-3 text-sm rounded-xl w-4/5 ${m.role==='user'?'bg-indigo-600 text-white ml-auto':'bg-white border text-gray-800 shadow-sm'}`}>{m.text}</div>)}</div>
              <form onSubmit={handleCopilotSend} className="p-3 bg-white border-t flex"><textarea value={copilotInput} onChange={e=>setCopilotInput(e.target.value)} placeholder="Escribe..." className="flex-1 resize-none h-10 p-2 text-sm outline-none border rounded-lg mr-2" /><button type="submit" className="bg-indigo-600 text-white p-2 rounded-lg"><Send size={18}/></button></form>
            </div>
          )}
          <button onClick={() => setCopilotOpen(!copilotOpen)} className="bg-indigo-600 text-white p-4 rounded-full shadow-xl"><MessageSquare size={24} /></button>
        </div>
      </main>
    </div>
  );
}