import { useState, useEffect, useMemo } from 'react';
import { supabase, signInWithEmail, signUpWithEmail, logout } from './services/supabase';
import { FiLogOut, FiSearch, FiPlus, FiTrash2, FiFileText, FiCheckSquare, FiSettings, FiX, FiEdit2, FiSave } from 'react-icons/fi';
import { defaultChecklistTemplate } from './data/defaultChecklist';
import tickerData from './data/tickers.json';
import './index.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [sortBy, setSortBy] = useState('tag');
  
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // null if list, object if editing

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data
  const fetchData = async () => {
    if (!session?.user) return;
    
    // Fetch Stocks
    const { data: stocksData, error: stocksError } = await supabase
      .from('stocks')
      .select('*')
      .order('ticker', { ascending: true });
      
    if (!stocksError) {
      setStocks(stocksData || []);
      if (selectedStock) {
        const updatedSelected = (stocksData || []).find(s => s.id === selectedStock.id);
        if (updatedSelected) setSelectedStock(updatedSelected);
      }
    }
    
    // Fetch Templates
    const { data: templatesData, error: templatesError } = await supabase
      .from('checklist_templates')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (!templatesError) {
      setTemplates(templatesData || []);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up realtime subscription
    if (!session?.user) return;
    
    const channel = supabase
      .channel('public_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stocks', filter: `user_id=eq.${session.user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_templates', filter: `user_id=eq.${session.user.id}` }, () => fetchData())
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Sort logic
  const sortedStocks = useMemo(() => {
    let sorted = [...stocks];
    if (sortBy === 'name-asc') sorted.sort((a,b) => a.ticker.localeCompare(b.ticker));
    else if (sortBy === 'name-desc') sorted.sort((a,b) => b.ticker.localeCompare(a.ticker));
    else if (sortBy === 'tag') {
      const tagOrder = { 'in': 1, 'rough': 2, 'tbd': 3, 'out': 4 };
      sorted.sort((a,b) => tagOrder[a.tag] - tagOrder[b.tag]);
    }
    return sorted;
  }, [stocks, sortBy]);

  // Autocomplete logic
  const filteredTickers = useMemo(() => {
    // Filter out tickers that are already in the watchlist
    const availableTickers = tickerData.filter(t => !stocks.some(s => s.ticker === t));
    
    if (!searchTerm) return availableTickers.slice(0, 100); 
    return availableTickers.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, stocks]);

  const handleAddStock = async (ticker) => {
    if (!session?.user) return;
    const stockTicker = ticker.toUpperCase();
    
    const existing = stocks.find(s => s.ticker === stockTicker);
    if (existing) {
      setSelectedStock(existing);
      setSearchTerm('');
      setShowSuggestions(false);
      return;
    }

    const newStock = {
      user_id: session.user.id,
      ticker: stockTicker,
      tag: 'tbd',
      notes: '',
      checklist: {},
      template_id: null
    };
    
    const { data, error } = await supabase.from('stocks').insert([newStock]).select();
    if (!error && data?.length > 0) {
      setSearchTerm('');
      setShowSuggestions(false);
      setSelectedStock(data[0]);
    }
  };

  const handleUpdateStock = async (id, field, value) => {
    if (!session?.user) return;
    
    setStocks(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (selectedStock?.id === id) {
      setSelectedStock(prev => ({ ...prev, [field]: value }));
    }

    const { error } = await supabase.from('stocks').update({ [field]: value }).eq('id', id);
    if (error) fetchData(); 
  };

  const handleChecklistItemToggle = async (itemId) => {
    if (!session?.user || !selectedStock) return;
    const currentChecklist = selectedStock.checklist || {};
    
    // Backward compatibility
    const currentVal = currentChecklist[itemId];
    const isChecked = typeof currentVal === 'object' ? currentVal?.checked : !!currentVal;
    const comment = typeof currentVal === 'object' ? currentVal?.comment : '';
    
    const newValue = !isChecked;
    
    await handleUpdateStock(selectedStock.id, 'checklist', {
      ...currentChecklist,
      [itemId]: { checked: newValue, comment }
    });
  };

  const handleChecklistCommentChange = async (itemId, comment) => {
    if (!session?.user || !selectedStock) return;
    const currentChecklist = selectedStock.checklist || {};
    
    const currentVal = currentChecklist[itemId];
    const isChecked = typeof currentVal === 'object' ? currentVal?.checked : !!currentVal;
    
    await handleUpdateStock(selectedStock.id, 'checklist', {
      ...currentChecklist,
      [itemId]: { checked: isChecked, comment }
    });
  };

  const handleDeleteStock = async (id) => {
    if (!session?.user || !confirm("Bạn có chắc muốn xoá mã này khỏi danh sách?")) return;
    
    setStocks(prev => prev.filter(s => s.id !== id));
    if (selectedStock?.id === id) setSelectedStock(null);

    const { error } = await supabase.from('stocks').delete().eq('id', id);
    if (error) fetchData();
  };

  // --- TEMPLATE MANAGEMENT LOGIC ---
  const createNewTemplate = async () => {
    const name = prompt("Nhập tên mẫu Checklist mới (VD: Mẫu Lướt Sóng):");
    if (!name) return;
    const newTemplate = {
      user_id: session.user.id,
      name,
      data: JSON.parse(JSON.stringify(defaultChecklistTemplate)) // Copy default as a starting point
    };
    await supabase.from('checklist_templates').insert([newTemplate]);
  };

  const saveEditingTemplate = async () => {
    if (!editingTemplate) return;
    await supabase.from('checklist_templates').update({
      name: editingTemplate.name,
      data: editingTemplate.data
    }).eq('id', editingTemplate.id);
    setEditingTemplate(null);
  };
  
  const deleteTemplate = async (id) => {
    if (!confirm("Bạn có chắc muốn xoá mẫu này?")) return;
    await supabase.from('checklist_templates').delete().eq('id', id);
  };

  if (loading) return <div className="auth-page"><p>Loading...</p></div>;

  if (!session) {
    const handleLogin = async (e) => {
      e.preventDefault();
      setAuthError('');
      try {
        await signInWithEmail(email, password);
      } catch (err) {
        setAuthError(err.message || "Đăng nhập thất bại");
      }
    };

    const handleSignup = async (e) => {
      e.preventDefault();
      setAuthError('');
      try {
        await signUpWithEmail(email, password);
        alert("Đăng ký thành công! Hãy tiếp tục đăng nhập.");
      } catch (err) {
        setAuthError(err.message || "Đăng ký thất bại");
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card glass-panel" style={{maxWidth: '350px'}}>
          <h1 style={{fontSize: '2rem'}}>Stock Tracker</h1>
          <p style={{marginBottom: '24px'}}>Hệ thống theo dõi và đánh giá cổ phiếu</p>
          
          <form style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <input type="email" placeholder="Email" className="input-search" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" className="input-search" value={password} onChange={e => setPassword(e.target.value)} required />
            {authError && <div style={{color: 'var(--tag-out-text)', fontSize: '0.85rem', textAlign: 'left'}}>{authError}</div>}
            
            <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
              <button onClick={handleLogin} className="btn-primary" style={{flex: 1}}>Đăng nhập</button>
              <button onClick={handleSignup} className="btn-outline" style={{flex: 1}}>Đăng ký</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const user = session.user;
  
  // Determine which checklist to show for selected stock
  const currentChecklistTemplate = selectedStock?.template_id 
    ? templates.find(t => t.id === selectedStock.template_id)?.data || defaultChecklistTemplate
    : defaultChecklistTemplate;

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1 style={{margin: 0, fontSize: '1.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Stock Tracker</h1>
        </div>
        <div className="user-profile">
          <span>{user.email}</span>
          <button onClick={() => setShowTemplateModal(true)} className="btn-outline" title="Quản lý Checklist">
            <FiSettings /> Checklist
          </button>
          <button onClick={logout} className="btn-outline" title="Đăng xuất"><FiLogOut /></button>
        </div>
      </header>

      <div className="dashboard-layout">
        <div className="list-panel">
          <div className="autocomplete-wrapper">
            <input 
              type="text" 
              className="input-search" 
              placeholder="Nhập mã cổ phiếu (VD: FPT, HPG)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && (
              <div className="suggestions-list" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {filteredTickers.length > 0 ? (
                  filteredTickers.map(t => (
                    <div key={t} className="suggestion-item" onClick={() => handleAddStock(t)}>
                      <span style={{fontWeight: 'bold', color: 'var(--primary-accent)'}}>{t}</span>
                      <span style={{color: 'var(--text-muted)'}}><FiPlus /> Thêm</span>
                    </div>
                  ))
                ) : (
                  <div className="suggestion-item" style={{justifyContent: 'center', color: 'var(--text-muted)'}}>Không tìm thấy mã</div>
                )}
              </div>
            )}
          </div>
          
          <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '12px'}}>
            <select 
              className="input-search" 
              style={{width: 'auto', padding: '6px 12px', fontSize: '0.85rem'}}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Sắp xếp: Tên (A-Z)</option>
              <option value="name-desc">Sắp xếp: Tên (Z-A)</option>
              <option value="tag">Sắp xếp: Theo Tag (IN - TBD - ROUGH - OUT)</option>
            </select>
          </div>

          <div className="table-container">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Mã CP</th>
                  <th>Phân loại (Tag)</th>
                  <th>Ghi chú</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map(stock => (
                  <tr 
                    key={stock.id} 
                    onClick={() => setSelectedStock(stock)}
                    style={{ backgroundColor: selectedStock?.id === stock.id ? 'rgba(255, 255, 255, 0.05)' : '' }}
                  >
                    <td style={{fontWeight: 'bold'}}>{stock.ticker}</td>
                    <td>
                      <span className={`tag tag-${stock.tag}`}>
                        {stock.tag === 'tbd' ? 'TBD' : stock.tag === 'in' ? 'IN' : stock.tag === 'out' ? 'OUT' : 'TOO ROUGH'}
                      </span>
                    </td>
                    <td>
                      <span style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>
                        {stock.notes ? (stock.notes.length > 20 ? stock.notes.substring(0, 20) + '...' : stock.notes) : '—'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-outline" style={{padding: '6px', border: 'none', color: '#f87171'}} onClick={(e) => { e.stopPropagation(); handleDeleteStock(stock.id); }}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="detail-panel glass-panel">
          {selectedStock ? (
            <>
              <div className="stock-header">
                <div className="stock-title">
                  <h2>{selectedStock.ticker}</h2>
                </div>
              </div>

              <div className="tag-selector">
                <button className={`tbd ${selectedStock.tag === 'tbd' ? 'active' : ''}`} onClick={() => handleUpdateStock(selectedStock.id, 'tag', 'tbd')}>TBD</button>
                <button className={`in ${selectedStock.tag === 'in' ? 'active' : ''}`} onClick={() => handleUpdateStock(selectedStock.id, 'tag', 'in')}>IN</button>
                <button className={`out ${selectedStock.tag === 'out' ? 'active' : ''}`} onClick={() => handleUpdateStock(selectedStock.id, 'tag', 'out')}>OUT</button>
                <button className={`rough ${selectedStock.tag === 'rough' ? 'active' : ''}`} onClick={() => handleUpdateStock(selectedStock.id, 'tag', 'rough')}>TOO ROUGH</button>
              </div>

              <div style={{marginBottom: '24px'}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', marginBottom: '12px'}}><FiFileText /> Ghi chú</h3>
                <textarea className="notes-area" placeholder="Ghi chú..." value={selectedStock.notes || ''} onChange={(e) => handleUpdateStock(selectedStock.id, 'notes', e.target.value)} />
              </div>

              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', margin: 0}}><FiCheckSquare /> Checklist</h3>
                  <select 
                    className="input-search" 
                    style={{width: 'auto', padding: '4px 8px', fontSize: '0.8rem'}}
                    value={selectedStock.template_id || ''}
                    onChange={(e) => handleUpdateStock(selectedStock.id, 'template_id', e.target.value || null)}
                  >
                    <option value="">Mẫu mặc định</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                
                {currentChecklistTemplate.map(section => (
                  <div key={section.id} className="checklist-group">
                    <h3>{section.title}</h3>
                    {section.description && <p style={{fontSize: '0.85rem', marginBottom: '12px'}}>{section.description}</p>}
                    
                    {section.items.map(item => {
                      const currentVal = selectedStock.checklist?.[item.id];
                      const isChecked = typeof currentVal === 'object' ? currentVal?.checked : !!currentVal;
                      const comment = typeof currentVal === 'object' ? currentVal?.comment : '';
                      
                      return (
                        <div key={item.id} style={{marginBottom: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)'}}>
                          <div 
                            className="checklist-item" 
                            onClick={() => handleChecklistItemToggle(item.id)}
                            style={{display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '12px'}}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              readOnly 
                              style={{marginTop: '4px', width: '18px', height: '18px', accentColor: 'var(--primary-accent)'}}
                            />
                            <span style={{ color: isChecked ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isChecked ? 'line-through' : 'none', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                              {item.text}
                            </span>
                          </div>
                          <div style={{paddingLeft: '30px'}}>
                            <textarea 
                              className="notes-area" 
                              placeholder="Thêm phân tích/đánh giá chi tiết cho mục này..."
                              value={comment}
                              onChange={(e) => handleChecklistCommentChange(item.id, e.target.value)}
                              style={{minHeight: '80px', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.02)'}}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '40px'}}>
              <FiSearch size={48} style={{marginBottom: '16px', opacity: 0.5}} />
              <p>Chọn một cổ phiếu từ danh sách bên trái để xem và đánh giá chi tiết.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>{editingTemplate ? 'Chỉnh sửa Mẫu' : 'Quản lý Mẫu Checklist'}</h2>
              <button className="btn-outline" style={{border: 'none'}} onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}><FiX size={24} /></button>
            </div>
            
            {!editingTemplate ? (
              <div className="modal-body">
                <button className="btn-primary" style={{marginBottom: '16px'}} onClick={createNewTemplate}><FiPlus /> Tạo mẫu mới</button>
                {templates.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Chưa có mẫu nào.</p> : (
                  <ul className="template-list">
                    {templates.map(t => (
                      <li key={t.id} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-color)'}}>
                        <span>{t.name}</span>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="btn-outline" style={{padding: '4px 8px'}} onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(t)))}><FiEdit2 /></button>
                          <button className="btn-outline" style={{padding: '4px 8px', color: '#f87171'}} onClick={() => deleteTemplate(t.id)}><FiTrash2 /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="modal-body editing-mode">
                <input 
                  type="text" 
                  className="input-search" 
                  value={editingTemplate.name} 
                  onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  style={{marginBottom: '16px'}}
                />
                <div style={{maxHeight: '400px', overflowY: 'auto', marginBottom: '16px'}}>
                  {editingTemplate.data.map((section, sIdx) => (
                    <div key={section.id} style={{marginBottom: '20px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px'}}>
                      <input 
                        type="text" className="input-search" value={section.title} style={{marginBottom: '8px'}}
                        onChange={e => {
                          const newData = [...editingTemplate.data];
                          newData[sIdx].title = e.target.value;
                          setEditingTemplate({...editingTemplate, data: newData});
                        }}
                      />
                      {section.items.map((item, iIdx) => (
                        <div key={item.id} style={{display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center'}}>
                          <input 
                            type="text" className="input-search" value={item.text} 
                            onChange={e => {
                              const newData = [...editingTemplate.data];
                              newData[sIdx].items[iIdx].text = e.target.value;
                              setEditingTemplate({...editingTemplate, data: newData});
                            }}
                          />
                          <button className="btn-outline" style={{color: '#f87171', padding: '8px'}} onClick={() => {
                            const newData = [...editingTemplate.data];
                            newData[sIdx].items.splice(iIdx, 1);
                            setEditingTemplate({...editingTemplate, data: newData});
                          }}><FiX /></button>
                        </div>
                      ))}
                      <button className="btn-outline" style={{fontSize: '0.8rem'}} onClick={() => {
                        const newData = [...editingTemplate.data];
                        newData[sIdx].items.push({ id: `q-${Date.now()}`, text: "Câu hỏi mới" });
                        setEditingTemplate({...editingTemplate, data: newData});
                      }}><FiPlus /> Thêm câu hỏi</button>
                    </div>
                  ))}
                  <button className="btn-outline" style={{width: '100%'}} onClick={() => {
                    const newData = [...editingTemplate.data];
                    newData.push({ id: `sec-${Date.now()}`, title: "Phần mới", items: [] });
                    setEditingTemplate({...editingTemplate, data: newData});
                  }}><FiPlus /> Thêm Phần Mới</button>
                </div>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                  <button className="btn-outline" onClick={() => setEditingTemplate(null)}>Hủy</button>
                  <button className="btn-primary" onClick={saveEditingTemplate}><FiSave /> Lưu</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
