import React, { useEffect, useMemo, useState } from "react";
// =========================================================================
// 🚀 ÖNİZLEME ORTAMI İÇİN MOCK SUPABASE İSTEMCİSİ (HATA ÇÖZÜMÜ İÇİN EKLENDİ)
// Vercel/GitHub'a yüklerken buradaki 'mock' yapıyı silip, kendi supabaseClient importunuzu kullanın:
import { supabase } from "./supabaseClient";


// =========================================================================
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Search, 
  Plus, 
  X, 
  Download, 
  UserPlus,
  Phone,
  MessageSquare,
  CreditCard,
  Edit,
  Trash2,
  Clock,
  History,
  CheckSquare,
  Shield,
  Power,
  PowerOff,
  Filter,
  Info,
  Mail,
  Building,
  Briefcase,
  Paperclip,
  FileText
} from "lucide-react";

// --- CONSTANTS ---
const LEAD_STATUSES = ["Yeni", "Cevapsız", "Sıcak", "Soğuk", "İptal", "Düşünüyor", "İletişimde"];
const LEAD_STAGES = ["Pahalı", "Uygun", "İlgisiz", "Diğer"]; // Alt durum güncellendi

// Yeni Teklif Durumu Seçenekleri (İhtiyacınıza göre burayı düzenleyebilirsiniz)
const QUOTE_STATUSES = [
  "Teklif Yok", 
  "Fiyat İletildi", 
  "Görüşme Aşamasında", 
  "Sözleşme Gönderildi", 
  "Kabul Edildi", 
  "Reddedildi", 
  "İptal"
];

// Yeni Görüşme Türleri
const INTERACTION_TYPES = [
  "Ofis ziyareti",
  "Telefon",
  "Mail",
  "Online toplantı",
  "Dosya Yüklendi", // Dosya yükleme işlemini ayrı bir tür olarak ekleyelim
  "Diğer"
];

const QUICK_FILTERS = [
  { id: "Sıcak", label: "🔥 Sıcak" },
  { id: "İletişimde", label: "💬 İletişimde" },
  { id: "Bugün", label: "📅 Bugün" },
  { id: "Bu Ay", label: "📊 Bu Ay" },
  { id: "Son 3 Ay", label: "🕒 Son 3 Ay" }
];

function createEmptyLead(ownerId) {
  return { 
    id: null, 
    name: "", 
    phone: "", 
    mailAdresi: "", 
    kurum: "", 
    kurumGorevi: "", 
    kurumTelNo: "", 
    status: "Yeni", 
    stage: "Diğer", 
    quote: "Teklif Yok", 
    quote_file_url: null, // Veritabanından gelen URL
    quote_file_name: null, // Veritabanından gelen Dosya Adı
    selectedFile: null, // Formda seçilen yeni dosya (State için)
    owner_id: ownerId || "", 
    noteType: "Telefon", // Varsayılan görüşme türü
    noteDate: new Date().toISOString().split('T')[0], // Bugünün tarihi (YYYY-MM-DD)
    pendingNote: "", 
    notes: [] 
  };
}

function createEmptyUser() {
  return { id: null, username: "", active: true, role: "sales" };
}

export function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("leads");
  const [authLoading, setAuthLoading] = useState(true);
  
  // Lead States
  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Tümü");
  const [filterOwner, setFilterOwner] = useState("Tümü");
  const [quickFilter, setQuickFilter] = useState(""); 
  
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(createEmptyLead(null));

  // User States
  const [appUsers, setAppUsers] = useState([]); 
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilterStatus, setUserFilterStatus] = useState("Tümü");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(createEmptyUser());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { 
        fetchData(); 
        fetchUsers(session.user.id); 
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { 
        fetchData(); 
        fetchUsers(session.user.id); 
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Lead çekme hatası:", error);
    } else if (data) {
      setLeads(data);
    }
  };

  const fetchUsers = async (sessionId) => {
    const { data, error } = await supabase.from('profiles').select('*').order('username');
    
    if (error) {
      console.error("Kullanıcı çekme hatası:", error);
      setAuthLoading(false);
      return;
    }
    
    if (data) {
      setAppUsers(data);
      if (sessionId) {
        const activeUser = data.find(u => u.id === sessionId);
        setCurrentUser(activeUser);
        if (activeUser?.role !== 'admin' && activeView === 'users') {
          setActiveView('leads');
        }
      }
      setAuthLoading(false);
    }
  };

  async function handleLogin(event) {
    event.preventDefault();
    const username = event.target.username.value.trim();
    const password = event.target.password.value;
    if (!username || !password) return;

    setAuthLoading(true);
    try {
      const email = username.includes('@') ? username : `${username}@local.eponacrm`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        alert("Kullanıcı adı veya şifre hatalı.");
        setAuthLoading(false);
        return;
      }
    } catch (e) {
      console.error(e);
      alert("Giriş yapılırken beklenmeyen bir hata oluştu.");
      setAuthLoading(false);
    }
  }

  // --- LEAD FUNCTIONS ---
  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    setLeadForm({ ...leadForm, phone: cleaned });
  };

  const handleKurumPhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    setLeadForm({ ...leadForm, kurumTelNo: cleaned });
  };

  const handleDeleteLead = async (id) => {
    if (currentUser?.role !== 'admin') { 
      alert("Bu işlem için yetkiniz bulunmamaktadır."); 
      return; 
    }
    if(!window.confirm("Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    
    const { error } = await supabase.from('leads').delete().match({ id });
    if (error) {
      alert("Silme işlemi başarısız: " + error.message);
      return;
    }
    fetchData();
  };

  const handleEditLead = async (lead) => {
    setLeadForm({ 
      ...lead, 
      stage: lead.stage || "Diğer", 
      quote: lead.quote || "Teklif Yok",
      quote_file_url: lead.quote_file_url || null,
      quote_file_name: lead.quote_file_name || null,
      selectedFile: null, // Edit açılışında dosya sıfırlanır (yeni dosya seçimi için) 
      noteType: "Telefon", // Edit yaparken not kısmı sıfırlanır
      noteDate: new Date().toISOString().split('T')[0],
      pendingNote: "", 
      notes: [] 
    });
    setIsModalOpen(true);

    const { data: notesData, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Notları çekerken hata oluştu:", error);
    } else if (notesData) {
      setLeadForm(prev => ({ ...prev, notes: notesData }));
    }
  };

  const handleSaveLead = async () => {
    // Form verilerini parçalıyoruz, geçici verileri (selectedFile vb.) API'ye göndermeyeceğiz.
    const { id, pendingNote, noteType, noteDate, notes, created_at, updated_at, selectedFile, quote_file_url, quote_file_name, ...restOfLead } = leadForm;
    const payloadToSave = { ...restOfLead };
    
    let finalFileUrl = quote_file_url;
    let finalFileName = quote_file_name;
    let newlyUploadedFileUrl = null;
    let newlyUploadedFileName = null;

    // Eğer kullanıcı formda YENİ bir dosya seçtiyse, Supabase Storage'a yüklüyoruz:
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `quote-files/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead_files') // Supabase'deki Bucket Adı
        .upload(filePath, selectedFile);

      if (uploadError) {
        alert("Dosya yüklenirken hata oluştu: " + uploadError.message);
        return;
      }

      // Yüklenen dosyanın herkese açık (Public) linkini alıyoruz
      const { data: { publicUrl } } = supabase.storage
        .from('lead_files')
        .getPublicUrl(filePath);

      finalFileUrl = publicUrl;
      finalFileName = selectedFile.name;
      newlyUploadedFileUrl = publicUrl;
      newlyUploadedFileName = selectedFile.name;
    }

    // Dosya bilgilerini ana veriye ekliyoruz (Tablodaki "Aktif" dosyayı günceller)
    payloadToSave.quote_file_url = finalFileUrl;
    payloadToSave.quote_file_name = finalFileName;

    if (id) {
      payloadToSave.id = id;
    }

    const { data: savedLead, error: leadError } = await supabase
      .from('leads')
      .upsert(payloadToSave)
      .select()
      .single();

    if (leadError) {
      alert("Lead kayıt hatası: " + leadError.message);
      return;
    }

    const currentLeadId = savedLead?.id || id;

    // Eğer bir manuel not girilmişse onu normal şekilde kaydet
    if (pendingNote && pendingNote.trim() !== "" && currentLeadId) {
      const { error: noteError } = await supabase.from('lead_notes').insert([{
        lead_id: currentLeadId,
        text: pendingNote,
        note_type: noteType, 
        note_date: noteDate, 
        author_id: currentUser?.id
      }]);
      if (noteError) console.error("Not kaydedilemedi:", noteError);
    }

    // YENİ: Eğer bir dosya YÜKLENDİYSE, bunu da GEÇMİŞE ayrı bir not olarak ekle
    if (newlyUploadedFileUrl && currentLeadId) {
        const fileNoteText = `Yeni bir dosya yüklendi: ${newlyUploadedFileName}`;
        
        const { error: fileHistoryError } = await supabase.from('lead_notes').insert([{
            lead_id: currentLeadId,
            text: fileNoteText,
            note_type: "Dosya Yüklendi",
            note_date: new Date().toISOString().split('T')[0], // Bugünün tarihi
            file_url: newlyUploadedFileUrl, // Geçmişteki dosyaya her zaman ulaşabilmek için url'i de notlar tablosuna ekliyoruz
            author_id: currentUser?.id
        }]);
        if (fileHistoryError) console.error("Dosya geçmişe kaydedilemedi:", fileHistoryError);
    }


    setIsModalOpen(false);
    fetchData();
  };

  const handleSelectAll = (e) => { e.target.checked ? setSelectedLeadIds(filteredLeads.map(l => l.id)) : setSelectedLeadIds([]); };
  const handleSelectOne = (id) => { setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  const handleBulkTransfer = async () => {
    if (!targetUserId || selectedLeadIds.length === 0) return;
    
    const promises = selectedLeadIds.map(id => 
      supabase.from('leads').update({ owner_id: targetUserId }).match({ id })
    );
    
    await Promise.all(promises);
    
    alert(`${selectedLeadIds.length} kayıt başarıyla yeni temsilciye aktarıldı.`);
    setSelectedLeadIds([]);
    setIsTransferModalOpen(false);
    fetchData();
  };

  const exportToCSV = () => { 
    if (currentUser?.role !== 'admin') {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return; 
    }
    
    const headers = ["İsim,Telefon,Mail Adresi,Kurum,Kurum Görevi,Kurum Tel No,Durum,Alt Durum,Teklif Durumu,Teklif Dosyası,Sahibi,Tarih"];
    const rows = filteredLeads.map(l => {
      const ownerObj = appUsers.find(u => u.id === l.owner_id);
      const ownerName = ownerObj ? ownerObj.username : "Atanmamış";
      return `${l.name || ''},${l.phone || ''},${l.mailAdresi || ''},${l.kurum || ''},${l.kurumGorevi || ''},${l.kurumTelNo || ''},${l.status || ''},${l.stage || ''},${l.quote || ''},${l.quote_file_url || ''},${ownerName},${l.created_at || ''}`;
    });
    
    const csvData = headers.concat(rows).join("\n");
    const BOM = "\uFEFF"; 
    const csvContent = BOM + csvData;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `epona_leads_${new Date().toLocaleDateString('tr-TR')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = (
        l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.phone?.toString().includes(searchQuery) ||
        l.kurum?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.mailAdresi?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchStatus = filterStatus === "Tümü" || l.status === filterStatus;
      const matchOwner = filterOwner === "Tümü" || l.owner_id === filterOwner;
      
      let matchQuick = true;
      if (quickFilter) {
        const createdDate = new Date(l.created_at);
        const today = new Date();
        
        if (quickFilter === "Sıcak") matchQuick = l.status === "Sıcak";
        else if (quickFilter === "İletişimde") matchQuick = l.status === "İletişimde";
        else if (quickFilter === "Bugün") {
          matchQuick = createdDate.toDateString() === today.toDateString();
        } 
        else if (quickFilter === "Bu Ay") {
          matchQuick = createdDate.getMonth() === today.getMonth() && createdDate.getFullYear() === today.getFullYear();
        } 
        else if (quickFilter === "Son 3 Ay") {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          matchQuick = createdDate >= threeMonthsAgo;
        }
      }
      
      return matchSearch && matchStatus && matchOwner && matchQuick;
    });
  }, [leads, searchQuery, filterStatus, filterOwner, quickFilter]);

  // --- USER FUNCTIONS ---
  const handleSaveUser = async () => {
    if (currentUser?.role !== 'admin') return;
    
    const profileData = {
      username: userForm.username,
      role: userForm.role,
      active: userForm.active
    };

    if (userForm.id) profileData.id = userForm.id;
    
    const { error } = await supabase.from('profiles').upsert(profileData);
    
    if (error) {
      alert("Kullanıcı profil bilgileri kaydedilemedi: " + error.message);
    } else {
      setIsUserModalOpen(false);
      fetchUsers(session?.user?.id);
    }
  };

  const handleDeleteUser = async (id) => {
    if (currentUser?.role !== 'admin') return;
    if(!window.confirm("Bu kullanıcı profilini silmek istediğinize emin misiniz?")) return;
    
    await supabase.from('profiles').delete().match({ id });
    fetchUsers(session?.user?.id);
  };

  const handleToggleUserStatus = async (user) => {
    if (currentUser?.role !== 'admin') return;
    const newStatus = !user.active; 
    if(!window.confirm(`Kullanıcı durumunu '${newStatus ? 'Aktif' : 'Pasif'}' olarak değiştirmek istediğinize emin misiniz?`)) return;
    
    await supabase.from('profiles').update({ active: newStatus }).match({ id: user.id });
    fetchUsers(session?.user?.id);
  };

  const filteredUsers = useMemo(() => {
    return appUsers.filter(u => {
      const matchSearch = u.username?.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      let matchStatus = true;
      if (userFilterStatus === "Aktif") matchStatus = u.active === true;
      if (userFilterStatus === "Pasif") matchStatus = u.active === false;
      
      return matchSearch && matchStatus;
    });
  }, [appUsers, userSearchQuery, userFilterStatus]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-2xl shadow-xl w-96 text-center border border-gray-100">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!session || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-2xl shadow-xl w-96 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <span className="text-white font-bold text-2xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Epona CRM</h1>
            <p className="text-gray-500 text-sm mt-1">Lütfen giriş yapın</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
              <input name="username" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="admin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input name="password" type="password" required className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md mt-4">
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-800 text-gray-300 flex flex-col border-r border-slate-900 z-30 shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-slate-700 bg-slate-900">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-3 shadow-sm">
            <span className="text-white font-bold text-xs">E</span>
          </div>
          <h1 className="text-sm font-semibold text-white tracking-wide">Epona-CRM</h1>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li>
              <button onClick={() => setActiveView("leads")} className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${activeView === "leads" ? "bg-blue-600 text-white border-l-4 border-blue-400 font-medium" : "hover:bg-slate-700 border-l-4 border-transparent"}`}>
                <LayoutDashboard size={16} /> Lead Havuzu
              </button>
            </li>
            {currentUser?.role === 'admin' && (
              <li>
                <button onClick={() => setActiveView("users")} className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${activeView === "users" ? "bg-blue-600 text-white border-l-4 border-blue-400 font-medium" : "hover:bg-slate-700 border-l-4 border-transparent"}`}>
                  <Users size={16} /> Kullanıcılar
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="mb-4 px-2">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${currentUser.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <p className="text-xs font-bold text-white truncate">{currentUser.username}</p>
            </div>
            <p className="text-[10px] font-semibold text-blue-400 mt-1 uppercase tracking-wider">{currentUser.role === 'admin' ? 'Admin' : 'Satış Personeli'}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors border border-slate-600">
            <LogOut size={14} /> Oturumu Kapat
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">
        
        {/* HEADER */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20 shrink-0 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            {activeView === "leads" ? "Müşteri Adayı Yönetimi" : "Sistem Kullanıcıları"}
          </h2>
          
          <div className="flex items-center gap-3">
            {activeView === "leads" ? (
              <>
                {currentUser?.role === 'admin' && (
                  <button onClick={exportToCSV} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-sm transition-colors shadow-sm">
                    <Download size={14} /> Dışa Aktar
                  </button>
                )}
                <button onClick={() => { setLeadForm(createEmptyLead(currentUser.id)); setIsModalOpen(true); }} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm transition-colors shadow-sm">
                  <Plus size={14} /> Yeni Kayıt
                </button>
              </>
            ) : (
              currentUser?.role === 'admin' && (
                <button onClick={() => { setUserForm(createEmptyUser()); setIsUserModalOpen(true); }} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm transition-colors shadow-sm">
                  <UserPlus size={14} /> Profil Ekle
                </button>
              )
            )}
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
          
          {/* === LEADS VIEW === */}
          {activeView === "leads" && (
            <div className="space-y-4 max-w-[1600px] mx-auto">
              
              {/* HIZLI FİLTRELER */}
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
                  <Filter size={14} /> HIZLI FİLTRE:
                </span>
                {QUICK_FILTERS.map(qf => (
                  <button
                    key={qf.id}
                    onClick={() => setQuickFilter(qf.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      quickFilter === qf.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                    }`}
                  >
                    {qf.label}
                  </button>
                ))}
                {quickFilter && (
                  <button
                    onClick={() => setQuickFilter("")}
                    className="px-3 py-1 rounded-full text-[11px] font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all flex items-center gap-1 ml-auto md:ml-2"
                  >
                    <X size={12} /> Temizle
                  </button>
                )}
              </div>

              {/* DETAYLI FILTERS */}
              <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kapsamlı Arama</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" placeholder="İsim, Tel, Kurum veya Mail..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
                  <select className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="Tümü">Tümü</option>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* YENİ EKLENEN TEMSİLCİ FİLTRESİ */}
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Temsilci</label>
                  <select className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                    <option value="Tümü">Tümü</option>
                    {appUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
              </div>

              {/* BULK ACTIONS */}
              {selectedLeadIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-2 rounded flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <span className="text-sm text-blue-800 font-medium ml-2">
                    <CheckSquare size={16} className="inline mr-1" /> {selectedLeadIds.length} kayıt seçili
                  </span>
                  <button onClick={() => setIsTransferModalOpen(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
                    Seçilenleri Temsilciye Aktar
                  </button>
                </div>
              )}

              {/* LEAD TABLE */}
              <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex flex-col relative z-0">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200 text-left whitespace-nowrap">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2.5 w-10 text-center sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={handleSelectAll} />
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Müşteri</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Kişisel İletişim</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Mail Adresi</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Kurum Adı</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Kurum Numarası</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Durum / Teklif Durumu</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">Temsilci</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 sticky right-0 bg-gray-100 z-10 border-l border-gray-300 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] text-center w-28">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredLeads.map((l) => (
                        <tr key={l.id} className="hover:bg-blue-50/60 transition-colors group">
                          <td className="px-4 py-2 text-center sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r border-gray-100">
                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 cursor-pointer" checked={selectedLeadIds.includes(l.id)} onChange={() => handleSelectOne(l.id)} />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            <div className="text-sm font-medium text-gray-900">{l.name}</div>
                            <div className="text-[10px] text-gray-400">{new Date(l.created_at).toLocaleDateString('tr-TR')}</div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            <div className="text-sm text-gray-600">{l.phone || "-"}</div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            <div className="text-sm text-gray-600">{l.mailAdresi || "-"}</div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            <div className="text-xs text-gray-800 font-medium">{l.kurum || "-"}</div>
                            <div className="text-[10px] text-gray-500">{l.kurumGorevi || "-"}</div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            <div className="text-sm text-gray-600 flex items-center gap-1.5">
                              {l.kurumTelNo ? <><Phone size={12} className="text-gray-400"/> {l.kurumTelNo}</> : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${l.status === 'Yeni' ? 'bg-blue-100 text-blue-800 border border-blue-200' : l.status === 'Sıcak' ? 'bg-amber-100 text-amber-800 border border-amber-200' : l.status === 'İptal' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                  {l.status}
                                </span>
                                {l.stage && <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{l.stage}</span>}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-emerald-600">
                                  {l.quote !== 'Teklif Yok' ? l.quote : <span className="text-gray-400 font-normal">Teklif Yok</span>}
                                </div>
                                {/* Yeni: Dosya Linki Görünümü */}
                                {l.quote_file_url && (
                                  <a href={l.quote_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 underline max-w-[150px]" title={l.quote_file_name} onClick={(e) => e.stopPropagation()}>
                                    <FileText size={10} className="shrink-0" /> 
                                    <span className="truncate">{l.quote_file_name || "Dosyayı Gör"}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100 text-xs text-gray-700">{appUsers.find(u => u.id === l.owner_id)?.username || "Atanmamış"}</td>
                          <td className="px-4 py-2 sticky right-0 bg-white group-hover:bg-blue-50/60 z-10 border-l border-gray-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditLead(l)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded border border-transparent hover:border-blue-200 transition-colors" title="Düzenle / Not Ekle">
                                <Edit size={16} />
                              </button>
                              
                              {currentUser?.role === 'admin' && (
                                <button onClick={() => handleDeleteLead(l.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded border border-transparent hover:border-red-200 transition-colors" title="Sil">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLeads.length === 0 && <div className="py-8 text-center text-sm text-gray-500">Kriterlere uygun kayıt bulunamadı.</div>}
                </div>
              </div>
            </div>
          )}

          {/* === USERS VIEW === */}
          {activeView === "users" && currentUser?.role === 'admin' && (
            <div className="space-y-4 max-w-[1200px] mx-auto animate-in fade-in duration-300">
              
              <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kullanıcı Ara</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" placeholder="Kullanıcı adı..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sistem Durumu</label>
                  <select className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={userFilterStatus} onChange={e => setUserFilterStatus(e.target.value)}>
                    <option value="Tümü">Tümü</option>
                    <option value="Aktif">Aktif Kullanıcılar</option>
                    <option value="Pasif">Pasif (Askıda)</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex flex-col relative z-0">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200 text-left whitespace-nowrap">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 w-16 text-center">Profil</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200">Kullanıcı Adı</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 text-center">Sistem Rolü</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 text-center">Durum</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-600 text-center w-32">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="px-6 py-3 border-r border-gray-100 flex justify-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                              {(u.username || "?").charAt(0).toUpperCase()}
                            </div>
                          </td>
                          <td className="px-6 py-3 border-r border-gray-100 text-sm font-medium text-gray-900">{u.username}</td>
                          <td className="px-6 py-3 border-r border-gray-100 text-center">
                            <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role === 'admin' ? 'Admin' : 'Satış'}
                            </span>
                          </td>
                          <td className="px-6 py-3 border-r border-gray-100 text-center">
                            <span className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                              u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>
                              {u.active ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => { setUserForm({ id: u.id, username: u.username, role: u.role, active: u.active }); setIsUserModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded border border-transparent hover:border-blue-200 transition-colors" title="Kullanıcıyı Düzenle">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleToggleUserStatus(u)} className={`p-1.5 rounded border border-transparent transition-colors ${u.active ? 'text-amber-600 hover:bg-amber-100 hover:border-amber-200' : 'text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200'}`} title={u.active ? "Pasife Al (Erişimi Kes)" : "Aktif Et (Erişim Ver)"}>
                                {u.active ? <PowerOff size={16} /> : <Power size={16} />}
                              </button>
                              <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded border border-transparent hover:border-red-200 transition-colors" title="Kalıcı Olarak Sil">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && <div className="py-10 text-center text-sm text-gray-500">Kriterlere uygun kullanıcı bulunamadı.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================= MODALS ======================= */}

      {/* USER MODAL */}
      {isUserModalOpen && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded shadow-2xl w-full max-w-lg border border-gray-300 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-blue-600" />
                <h3 className="text-base font-semibold text-gray-800">{userForm.id ? "Kullanıcı Profili Düzenle" : "Yeni Profil Kaydı"}</h3>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-blue-700 text-xs font-medium mb-4">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>Güvenlik nedeniyle şifre ve e-posta tanımlamaları yalnızca Supabase "Authentication" paneli üzerinden yapılmalıdır. Bu alandan sadece sistem içi profil bilgileri yönetilir.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kullanıcı Adı (Sistemde Görünecek İsim)</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={userForm.username || ''} onChange={e => setUserForm({...userForm, username: e.target.value})} placeholder="Örn: Ayşe Demir" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kullanıcı Rolü (Yetki)</label>
                  <select className="w-full px-3 py-2 border border-blue-300 bg-blue-50/30 rounded text-sm focus:outline-none focus:border-blue-500 font-medium text-blue-900" value={userForm.role || 'sales'} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                    <option value="sales">Satış Personeli</option>
                    <option value="admin">Sistem Yöneticisi (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sistem Durumu</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={userForm.active ? 'true' : 'false'} onChange={e => setUserForm({...userForm, active: e.target.value === 'true'})}>
                    <option value="true">Aktif (Sistemi Kullanabilir)</option>
                    <option value="false">Pasif (Erişim Engelli)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded text-sm font-medium hover:bg-gray-100 transition-colors">İptal</button>
              <button onClick={handleSaveUser} className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                <CheckSquare size={16} /> Profili Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] sm:h-[85vh] border border-gray-300 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3"><Edit size={18} className="text-blue-600" /><h3 className="text-base font-semibold text-gray-800">{leadForm.id ? `Kayıt Düzenle: ${leadForm.name}` : "Yeni Müşteri Adayı Kaydı"}</h3></div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-gray-200 flex flex-col bg-white">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Müşteri ve Kurum Detayları</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  
                  {/* Yeni Form Girişleri */}
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Ad Soyad</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.name || ""} onChange={e => setLeadForm({...leadForm, name: e.target.value})} /></div>
                  
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.phone || ""} onChange={e => handlePhoneChange(e.target.value)} /></div></div>
                  
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Mail Adresi</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="email" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.mailAdresi || ""} onChange={e => setLeadForm({...leadForm, mailAdresi: e.target.value})} /></div></div>
                  
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Temsilci</label><select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.owner_id} onChange={e => setLeadForm({...leadForm, owner_id: e.target.value})}><option value="">Seçiniz...</option>{appUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}</select></div>

                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Kurum Adı</label><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.kurum || ""} onChange={e => setLeadForm({...leadForm, kurum: e.target.value})} /></div></div>
                  
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Kurum Görevi</label><div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.kurumGorevi || ""} onChange={e => setLeadForm({...leadForm, kurumGorevi: e.target.value})} /></div></div>
                  
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Kurum Tel No</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={leadForm.kurumTelNo || ""} onChange={e => handleKurumPhoneChange(e.target.value)} /></div></div>
                  
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Durum</label><select className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-blue-50/50 text-blue-900 font-semibold" value={leadForm.status} onChange={e => setLeadForm({...leadForm, status: e.target.value})}>{LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Alt Durum</label>
                    <select className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-blue-50/50 text-blue-900 font-semibold" value={leadForm.stage} onChange={e => setLeadForm({...leadForm, stage: e.target.value})}>
                      {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teklif Durumu</label>
                    <select className="w-full px-3 py-2 border border-emerald-300 rounded text-sm focus:outline-none focus:border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold" value={leadForm.quote || 'Teklif Yok'} onChange={e => setLeadForm({...leadForm, quote: e.target.value})}>
                      {QUOTE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* YENİ: DOSYA YÜKLEME ALANI */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teklif Dosyası Yükle (PDF, Word vb.)</label>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded cursor-pointer"
                      onChange={e => setLeadForm({...leadForm, selectedFile: e.target.files[0]})}
                    />
                    {/* Veritabanında zaten kayıtlı bir dosya varsa ismini gösterelim */}
                    {leadForm.quote_file_name && !leadForm.selectedFile && (
                      <div className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                        <Paperclip size={12} /> Mevcut Dosya: {leadForm.quote_file_name}
                      </div>
                    )}
                  </div>

                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-2"><MessageSquare size={14} /> YENİ GÖRÜŞME NOTU EKLE</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase">Görüşme Türü</label>
                        <select className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:border-blue-500 bg-blue-50/30 text-blue-900" value={leadForm.noteType} onChange={e => setLeadForm({...leadForm, noteType: e.target.value})}>
                          {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase">Tarih</label>
                        <input type="date" className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:border-blue-500 bg-blue-50/30 text-blue-900" value={leadForm.noteDate} onChange={e => setLeadForm({...leadForm, noteDate: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase">Görüşme Detayı</label>
                      <textarea rows="2" className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:outline-none focus:border-blue-500 resize-none bg-blue-50/30 text-gray-800 placeholder-blue-300" placeholder="Görüşme detaylarını buraya yazın..." value={leadForm.pendingNote} onChange={e => setLeadForm({...leadForm, pendingNote: e.target.value})}></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 bg-gray-50 p-0 flex flex-col border-t md:border-t-0 border-gray-200 shrink-0">
                <div className="p-4 border-b border-gray-200 bg-gray-100 flex items-center justify-between shrink-0">
                  <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5"><History size={14}/> İşlem & Not Geçmişi</h4>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-300">{leadForm.notes?.length || 0} Kayıt</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {leadForm.notes && leadForm.notes.length > 0 ? (
                    leadForm.notes.map((n) => {
                      const noteAuthor = appUsers.find(u => u.id === n.author_id)?.username || "Bilinmiyor";
                      return (
                        <div key={n.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm relative before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500 before:rounded-l">
                          <div className="flex justify-between items-start mb-1 pl-2">
                            <span className="text-[11px] font-bold text-blue-700">{noteAuthor}</span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {new Date(n.created_at).toLocaleDateString('tr-TR')} {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="pl-2">
                            {n.note_type && n.note_date && (
                              <div className="mb-1 mt-0.5 flex items-center flex-wrap gap-1">
                                <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold">{n.note_type}</span>
                                <span className="inline-block text-gray-500 text-[10px] font-medium">{new Date(n.note_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                            )}
                            
                            {/* Sadece dosya yükleme notu DEĞİLSE paragrafı gösterelim ki aynı isim tekrar etmesin */}
                            {n.note_type !== "Dosya Yüklendi" && (
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                            )}
                            
                            {/* GEÇMİŞTEKİ DOSYAYI GÖRÜNTÜLEME ALANI */}
                            {n.file_url && (
                                <a href={n.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mt-2 p-1.5 bg-blue-50 rounded border border-blue-100 w-max max-w-[220px]" title="Dosyayı İndir/Görüntüle" onClick={(e) => e.stopPropagation()}>
                                  <FileText size={12} className="shrink-0" /> 
                                  <span className="truncate font-medium">
                                    {n.text && n.text.includes('Yeni bir dosya yüklendi: ') ? n.text.replace('Yeni bir dosya yüklendi: ', '') : 'Ekli Dosya'}
                                  </span>
                                </a>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60"><Clock size={32} className="text-gray-400 mb-2" /><span className="text-xs text-gray-500 font-medium">Bu müşteri için henüz bir işlem<br/>geçmişi bulunmuyor.</span></div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 border border-gray-300 text-gray-700 bg-white rounded text-sm font-medium hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm">Vazgeç</button>
              {/* BUTON METNİ GÜNCELLENDİ */}
              <button onClick={handleSaveLead} className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"><CheckSquare size={16} /> Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded shadow-2xl w-full max-w-sm p-6 border border-gray-300 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2"><Users size={18} className="text-blue-600" /> Toplu Kayıt Aktarımı</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Seçilen Kayıt Sayısı</label><div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded border border-blue-100">{selectedLeadIds.length} Lead Aktarılacak</div></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Aktarılacak Temsilci Seçin</label><select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}><option value="">Lütfen Temsilci Seçiniz...</option>{appUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}</select></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsTransferModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors">İptal</button>
              <button onClick={handleBulkTransfer} disabled={!targetUserId} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Aktar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

export default App;
