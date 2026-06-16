import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ExternalLink, Save, Plus, FolderKanban, CheckCircle2, X } from 'lucide-react';
import api from '../lib/api';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [authLoading, setAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  // Estados para Drag & Drop
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);

  // Estados para o Modal de Novo Projeto
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    client_name: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Estados para nova etapa customizada
  const [newCustomStep, setNewCustomStep] = useState({ name: '', description: '', duration_days: 2 });
  const [customStepImage, setCustomStepImage] = useState<File | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);

  function clearSession() {
    localStorage.removeItem('admin_token');
    setToken(null);
    setProjects([]);
    setSelectedProject(null);
    setSteps([]);
    setLoading(false);
  }

  function handleUnauthorized() {
    clearSession();
    setLoginError('Sessao expirada. Faca login novamente.');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await api.post(`${API_URL}/auth/login`, loginData);
      const nextToken = res.data?.token;

      if (!nextToken) {
        setLoginError('Falha ao autenticar.');
        return;
      }

      localStorage.setItem('admin_token', nextToken);
      setToken(nextToken);
      setLoginData({ email: '', password: '' });
      setLoading(true);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Credenciais invalidas';
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    clearSession();
  }

  useEffect(() => {
    async function validateSession() {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        await api.get(`${API_URL}/auth/me`);
      } catch {
        clearSession();
      } finally {
        setAuthLoading(false);
      }
    }

    validateSession();
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) {
      fetchProjects();
    }
  }, [authLoading, token]);

  async function fetchProjects() {
    try {
      const res = await axios.get(`${API_URL}/projects`);
      setProjects(res.data);
      if (res.data.length > 0 && !selectedProject) {
        selectProject(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function selectProject(proj: any) {
    setSelectedProject(proj);
    try {
      const res = await axios.get(`${API_URL}/projects/${proj.id}/steps`);
      setSteps(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateStep(stepId: number, percentage: number, status: string, duration_days: number) {
    try {
      await api.put(
        `${API_URL}/projects/${selectedProject.id}/steps/${stepId}`,
        {
          percentage: Number(percentage),
          status,
          duration_days: Number(duration_days)
        }
      );
      await fetchProjects();
      const res = await axios.get(`${API_URL}/projects/${selectedProject.id}/steps`);
      setSteps(res.data);
      
      setSaveSuccess(stepId);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      alert('Erro ao salvar etapa');
    }
  }

  async function triggerAutoUpdate(stepId: number, changedField?: 'days' | 'date') {
    const p = (document.getElementById(`perc-${stepId}`) as HTMLInputElement)?.value;
    const s = (document.getElementById(`status-${stepId}`) as HTMLSelectElement)?.value;
    const dInput = document.getElementById(`days-${stepId}`) as HTMLInputElement;
    const dateInput = document.getElementById(`date-${stepId}`) as HTMLInputElement;
    
    let d = Number(dInput?.value);

    // Se o usuário mudou a data, calculamos os dias no front
    if (changedField === 'date' && dateInput) {
      const stepIdx = steps.findIndex(st => st.id === stepId);
      const prevDateStr = stepIdx > 0 ? steps[stepIdx - 1].expected_date : selectedProject?.start_date;
      
      const prevDate = new Date(prevDateStr);
      const newExpected = new Date(dateInput.value);
      
      const diffTime = newExpected.getTime() - prevDate.getTime();
      d = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      dInput.value = d.toString(); // Atualiza input
    }
    
    if (p !== undefined && s !== undefined && d !== undefined) {
      await updateStep(stepId, Number(p), s, d);
    }
  }

  const handleDragStart = (idx: number) => {
    setDraggedStepIdx(idx);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir drop
  };
  
  const handleDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedStepIdx === null || draggedStepIdx === targetIdx) return;
    
    // Atualização otimista
    const newSteps = [...steps];
    const [moved] = newSteps.splice(draggedStepIdx, 1);
    newSteps.splice(targetIdx, 0, moved);
    setSteps(newSteps);
    setDraggedStepIdx(null);
    
    try {
      const orderedIds = newSteps.map(s => s.id);
      await api.put(
        `${API_URL}/projects/${selectedProject.id}/steps/reorder`,
        { orderedStepIds: orderedIds }
      );
      const res = await axios.get(`${API_URL}/projects/${selectedProject.id}/steps`);
      setSteps(res.data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      alert('Erro ao reordenar');
    }
  };

  async function handleSetCurrentStep(stepId: number) {
    try {
      await api.put(
        `${API_URL}/projects/${selectedProject.id}/steps/${stepId}/set_current`,
        {}
      );
      await fetchProjects();
      const res = await axios.get(`${API_URL}/projects/${selectedProject.id}/steps`);
      setSteps(res.data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      alert('Erro ao definir etapa atual');
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    try {
      let banner_url = 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c';
      
      if (bannerFile) {
        const formData = new FormData();
        formData.append('file', bannerFile);
        const uploadRes = await api.post(`${API_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        banner_url = uploadRes.data.url;
      }

      const slug = newProjectData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const res = await api.post(
        `${API_URL}/projects`,
        {
          ...newProjectData,
          banner_url,
          slug,
          expected_delivery: newProjectData.start_date // default inicial
        }
      );
      
      setIsNewProjectModalOpen(false);
      setNewProjectData({ name: '', client_name: '', start_date: new Date().toISOString().split('T')[0] });
      setBannerFile(null);
      
      // Recarregar e selecionar o novo
      const projectsRes = await axios.get(`${API_URL}/projects`);
      setProjects(projectsRes.data);
      const newProj = projectsRes.data.find((p:any) => p.id === res.data.projectId);
      if (newProj) {
        selectProject(newProj);
      }

    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      alert('Erro ao criar projeto');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleAddCustomStep(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return;
    setIsAddingStep(true);
    try {
      let image_url = 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c';
      
      if (customStepImage) {
        const formData = new FormData();
        formData.append('file', customStepImage);
        const uploadRes = await api.post(`${API_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        image_url = uploadRes.data.url;
      }

      await api.post(
        `${API_URL}/projects/${selectedProject.id}/steps`,
        {
          ...newCustomStep,
          image_url
        }
      );
      
      // Limpa form
      setNewCustomStep({ name: '', description: '', duration_days: 2 });
      setCustomStepImage(null);
      
      // Recarrega etapas
      const res = await axios.get(`${API_URL}/projects/${selectedProject.id}/steps`);
      setSteps(res.data);
      
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      alert('Erro ao adicionar etapa customizada');
    } finally {
      setIsAddingStep(false);
    }
  }

  if (authLoading) return <div style={{padding: '50px', textAlign:'center', color: '#64748B'}}>Validando autenticacao...</div>;

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <form
          onSubmit={handleLogin}
          style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: '2rem', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}
        >
          <h2 style={{ margin: 0, marginBottom: '0.5rem', color: '#0F172A' }}>Acesso Administrativo</h2>
          <p style={{ marginTop: 0, marginBottom: '1.25rem', color: '#64748B', fontSize: '0.9rem' }}>Entre com suas credenciais para gerenciar os projetos.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              required
              style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #CBD5E1', outline: 'none' }}
            />
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Senha"
              required
              style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #CBD5E1', outline: 'none' }}
            />
          </div>

          {loginError && <div style={{ marginTop: '0.85rem', color: '#B91C1C', fontSize: '0.85rem' }}>{loginError}</div>}

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: '#0F172A', color: 'white', fontWeight: 700, cursor: 'pointer' }}
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  if (loading) return <div style={{padding: '50px', textAlign:'center', color: '#64748B'}}>Carregando ambiente administrativo...</div>;

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Admin Premium */}
      <header className="top-nav" style={{ padding: '1rem 2rem' }}>
        <div className="brand">
          <div className="logo-box" style={{ borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <img src="/favicon.svg" alt="CRP Logo" width="32" height="32" />
          </div>
          <div className="logo-text">
            <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>CRP - Cronograma</h1>
          </div>
        </div>
        <div className="nav-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F1F5F9', padding: '0.5rem 1rem', borderRadius: 99 }}>
            <div style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Sistema Online</span>
          </div>
          <button
            onClick={handleLogout}
            style={{ marginLeft: '0.75rem', border: '1px solid #CBD5E1', background: 'white', color: '#334155', padding: '0.5rem 0.9rem', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '2rem auto', padding: '0 1rem', display: 'flex', gap: '2rem' }}>
        
        {/* Sidebar Projetos */}
        <aside style={{ width: '280px', flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '1.5rem' }}>Projetos Ativos</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projects.map(p => {
                const isActive = selectedProject?.id === p.id;
                return (
                  <div 
                    key={p.id} 
                    onClick={() => selectProject(p)}
                    style={{ 
                      padding: '1rem', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isActive ? '1px solid #93C5FD' : '1px solid transparent',
                      background: isActive ? '#EFF6FF' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if(!isActive) e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={(e) => { if(!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? '#2563EB' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'white' : '#64748B' }}>
                        <FolderKanban size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: isActive ? '#1E3A8A' : '#1E293B', fontSize: '0.9rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 30, height: 4, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: isActive ? '#2563EB' : '#94A3B8', width: `${p.progress}%` }}></div>
                          </div>
                          {p.progress}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <button 
              onClick={() => setIsNewProjectModalOpen(true)}
              style={{ width: '100%', padding: '0.875rem', marginTop: '1.5rem', background: 'white', color: '#0F172A', border: '1px dashed #CBD5E1', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A' }}>
              <Plus size={16} /> Novo Projeto
            </button>
          </div>
        </aside>

        {/* Workspace Principal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          {selectedProject ? (
            <>
              {/* Top Card do Projeto */}
              <div style={{ background: 'white', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#2563EB' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '0.25rem 0.75rem', borderRadius: 99, marginBottom: '0.75rem', display: 'inline-block' }}>GERENCIANDO PROJETO</span>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{selectedProject.name}</h2>
                    <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '0.5rem' }}>Cliente Registrado: <strong style={{color: '#334155'}}>{selectedProject.client_name}</strong></p>
                  </div>
                  
                  <a href={`/projeto/${selectedProject.slug}`} target="_blank" rel="noreferrer" 
                     style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0F172A', color: 'white', padding: '0.75rem 1.25rem', borderRadius: 12, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.2s' }}
                     onMouseEnter={(e) => e.currentTarget.style.background = '#1E293B'}
                     onMouseLeave={(e) => e.currentTarget.style.background = '#0F172A'}>
                    <ExternalLink size={16} /> Link do Cliente
                  </a>
                </div>
              </div>

              {/* Grid de Etapas */}
              <div style={{ background: 'white', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Progresso das Etapas</h3>
                  <div style={{ fontSize: '0.875rem', color: '#64748B', background: '#F8FAFC', padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    Progresso Geral Atual: <strong style={{color: '#2563EB'}}>{selectedProject.progress}%</strong>
                  </div>
                </div>
                
                <div style={{ borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'white' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ width: 40 }}></th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Etapa & Descrição</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Prazo & Data Prevista</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>% Concluído</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Situação</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((step, idx) => {
                        const isLast = idx === steps.length - 1;
                        const isSuccess = saveSuccess === step.id;

                        return (
                          <tr key={step.id} 
                              draggable
                              onDragStart={() => handleDragStart(idx)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, idx)}
                              style={{ borderBottom: isLast ? 'none' : '1px solid #F1F5F9', transition: 'background 0.2s', background: 'white' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}>
                            
                            <td style={{ paddingLeft: '1.5rem', cursor: 'grab', color: '#CBD5E1' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            </td>
                            
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>{step.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>{step.description}</div>
                                </div>
                              </div>
                            </td>
                            
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input 
                                    type="number" 
                                    defaultValue={step.duration_days || 0} 
                                    min="0"
                                    id={`days-${step.id}`}
                                    style={{ width: 70, padding: '0.6rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', fontWeight: 600, color: '#0F172A' }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = '#CBD5E1';
                                      triggerAutoUpdate(step.id);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                  />
                                  <span style={{ color: '#64748B', fontWeight: 600, fontSize: '0.875rem' }}>dias</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input 
                                    type="date"
                                    defaultValue={step.expected_date || ''}
                                    id={`date-${step.id}`}
                                    style={{ width: '130px', padding: '0.5rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', color: '#475569', fontSize: '0.8rem' }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = '#CBD5E1';
                                      triggerAutoUpdate(step.id, 'date');
                                    }}
                                    onChange={() => {
                                      triggerAutoUpdate(step.id, 'date');
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                  type="number" 
                                  defaultValue={step.percentage} 
                                  min="0" max="100"
                                  id={`perc-${step.id}`}
                                  style={{ width: 70, padding: '0.6rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', fontWeight: 600, color: '#0F172A' }}
                                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '#CBD5E1';
                                    triggerAutoUpdate(step.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                />
                                <span style={{ color: '#64748B', fontWeight: 600 }}>%</span>
                              </div>
                            </td>
                            
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ position: 'relative' }}>
                                <select 
                                  defaultValue={step.status}
                                  id={`status-${step.id}`}
                                  style={{ appearance: 'none', padding: '0.6rem 2.5rem 0.6rem 1rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', fontWeight: 600, color: '#0F172A', background: 'white', width: '160px', cursor: 'pointer' }}
                                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                  onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                                  onChange={() => triggerAutoUpdate(step.id)}
                                >
                                  <option value="aguardando">Aguardando ⏳</option>
                                  <option value="andamento">Andamento 🔥</option>
                                  <option value="concluido">Concluído ✅</option>
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                              </div>
                            </td>
                            
                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {step.status !== 'andamento' && step.status !== 'concluido' && (
                                  <button
                                    title="Trabalhando Agora"
                                    onClick={() => handleSetCurrentStep(step.id)}
                                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    🎯
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    triggerAutoUpdate(step.id, 'days');
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
                                    background: isSuccess ? '#10B981' : '#2563EB', 
                                    color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: 8, 
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {isSuccess ? (
                                    <><CheckCircle2 size={16} /> Salvo!</>
                                  ) : (
                                    <><Save size={16} /> Atualizar</>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bloco de Adicionar Etapa Customizada */}
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem' }}>Adicionar Etapa Customizada</h4>
                  <form onSubmit={handleAddCustomStep} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nome da Etapa</label>
                      <input type="text" required value={newCustomStep.name} onChange={e => setNewCustomStep({...newCustomStep, name: e.target.value})} placeholder="Ex: Gravação de Vídeo" style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Descrição</label>
                      <input type="text" value={newCustomStep.description} onChange={e => setNewCustomStep({...newCustomStep, description: e.target.value})} placeholder="Ex: Dia de filmagem externa" style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Dias</label>
                      <input type="number" required min="0" value={newCustomStep.duration_days} onChange={e => setNewCustomStep({...newCustomStep, duration_days: Number(e.target.value)})} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Imagem do Card</label>
                      <input type="file" required accept="image/*" onChange={e => setCustomStepImage(e.target.files ? e.target.files[0] : null)} style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', background: 'white' }} />
                    </div>
                    <button type="submit" disabled={isAddingStep} style={{ background: '#0F172A', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 600, cursor: isAddingStep ? 'wait' : 'pointer', height: '42px' }}>
                      {isAddingStep ? '...' : 'Adicionar'}
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div style={{ background: 'white', borderRadius: 16, padding: '4rem', border: '1px dashed #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <FolderKanban size={48} color="#94A3B8" style={{marginBottom: '1rem'}} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>Nenhum projeto selecionado</h3>
              <p style={{ color: '#64748B', marginTop: '0.5rem' }}>Selecione ou crie um novo projeto para gerenciar.</p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL CRIAR PROJETO */}
      {isNewProjectModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: '2.5rem', width: '90%', maxWidth: 500,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative'
          }}>
            <button 
              onClick={() => setIsNewProjectModalOpen(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.5rem' }}>Novo Projeto</h2>
            
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nome do Projeto</label>
                <input 
                  type="text" required
                  value={newProjectData.name}
                  onChange={e => setNewProjectData({...newProjectData, name: e.target.value})}
                  placeholder="Ex: Aurea Clube Premium"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', fontWeight: 500, color: '#0F172A' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nome do Cliente</label>
                <input 
                  type="text" required
                  value={newProjectData.client_name}
                  onChange={e => setNewProjectData({...newProjectData, client_name: e.target.value})}
                  placeholder="Ex: João da Silva"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', fontWeight: 500, color: '#0F172A' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Banner do Projeto (Imagem)</label>
                <input 
                  type="file" required accept="image/*"
                  onChange={e => setBannerFile(e.target.files ? e.target.files[0] : null)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', background: '#F8FAFC' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Data de Início do Projeto</label>
                <input 
                  type="date" required
                  value={newProjectData.start_date}
                  onChange={e => setNewProjectData({...newProjectData, start_date: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', fontWeight: 500, color: '#0F172A' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isCreating}
                style={{ 
                  width: '100%', marginTop: '1rem', padding: '1rem', background: '#2563EB', color: 'white', 
                  border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: isCreating ? 'wait' : 'pointer',
                  opacity: isCreating ? 0.7 : 1
                }}
              >
                {isCreating ? 'Cadastrando Projeto...' : 'Cadastrar Projeto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
