import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Clock, Calendar, Check, Rocket, X, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function ClientPortal() {
  const { slug } = useParams();
  const [project, setProject] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStepModal, setSelectedStepModal] = useState<any>(null);

  function getStepImportance(stepName: string) {
    const name = stepName.toLowerCase();
    if (name.includes('requisito') || name.includes('coleta')) {
      return "Nesta fase, nós mapeamos todas as suas necessidades. O prazo aqui é crucial porque qualquer funcionalidade não mapeada agora exigirá retrabalho nas fases futuras, o que atrasaria todo o projeto. Cumprir esta etapa garante que estamos na mesma página antes de escrever a primeira linha de código.";
    }
    if (name.includes('planejamento')) {
      return "Esta é a construção do alicerce do projeto. O prazo é importante para que a equipe saiba exatamente o que fazer, quando fazer e quem vai fazer. Sem o planejamento finalizado no prazo, os designers e desenvolvedores ficarão bloqueados.";
    }
    if (name.includes('design') || name.includes('prototipação')) {
      return "Aqui damos vida à aparência do seu app. O cumprimento deste prazo é fundamental porque os programadores dependem da interface aprovada para começar a montar as telas no código. Atrasar o design causa um efeito dominó direto no desenvolvimento.";
    }
    if (name.includes('estrutura') || name.includes('banco de dados')) {
      return "É a criação da arquitetura invisível (servidores e banco de dados). O prazo é vital: sem a estrutura pronta, o sistema não tem onde salvar as informações do usuário. É como construir as tubulações antes de erguer as paredes.";
    }
    if (name.includes('backend') || name.includes('servidor')) {
      return "A inteligência do aplicativo está sendo construída. Este prazo é rigoroso porque o Frontend (as telas) precisa consultar essa inteligência. Se o Backend atrasa, o aplicativo fica sem dados reais para mostrar nas telas, travando a equipe visual.";
    }
    if (name.includes('frontend') || name.includes('visual')) {
      return "Nesta etapa unimos o Design com a inteligência do Backend. O prazo aqui dita quando o aplicativo ganhará vida e poderá ser tocado por você pela primeira vez. Atrasos aqui empurram os testes de qualidade para frente.";
    }
    if (name.includes('testes') || name.includes('qa')) {
      return "A fase de caça aos bugs! O rigor neste prazo garante que teremos tempo suficiente para quebrar o sistema e consertá-lo antes que seus clientes reais o utilizem. Diminuir esse prazo significa lançar um app com falhas na versão final.";
    }
    if (name.includes('beta')) {
      return "O momento em que você experimenta o aplicativo na prática. Cumprir este prazo significa que teremos tempo hábil para ouvir seus feedbacks e lapidar os detalhes finais antes do grande lançamento nas lojas.";
    }
    if (name.includes('ajustes')) {
      return "Refinamento baseado no seu feedback do Beta. O prazo é estrito porque ajustes não podem durar para sempre; precisamos 'fechar o pacote' para que os servidores da Apple e do Google aprovem a versão pública a tempo.";
    }
    if (name.includes('publicação') || name.includes('lojas')) {
      return "A submissão do aplicativo para a Apple App Store e Google Play Store. O prazo aqui é estratégico, pois essas empresas costumam levar alguns dias para analisar e aprovar o app. Enviar no prazo garante que a data do seu lançamento oficial não seja furada pelas regras da Apple ou do Google.";
    }
    if (name.includes('entrega')) {
      return "A conclusão absoluta. Este prazo marca o fim do nosso ciclo de desenvolvimento ativo e a passagem de bastão oficial do código para a sua posse, garantindo a sua autonomia sobre o produto.";
    }
    // Default fallback
    return "Esta etapa prepara as bases para a fase seguinte. Cumprir este prazo mantém a equipe fluindo sem bloqueios e garante que a data final de entrega ao mercado não sofra impactos em cadeia.";
  }

  useEffect(() => {
    async function loadData() {
      try {
        const projRes = await axios.get(`${API_URL}/projects/${slug}`);
        setProject(projRes.data);
        const stepsRes = await axios.get(`${API_URL}/projects/${projRes.data.id}/steps`);
        setSteps(stepsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  if (loading) return <div style={{padding: '50px', textAlign:'center'}}>Carregando Projeto...</div>;
  if (!project) return <div style={{padding: '50px', textAlign:'center'}}>Projeto não encontrado (404)</div>;

  let completedCount = 0;
  let currentStageIndex = -1;

  steps.forEach((s, idx) => {
    if (s.status === 'concluido') completedCount++;
    if (s.status === 'andamento' && currentStageIndex === -1) {
      currentStageIndex = idx;
    } else if (s.status === 'aguardando' && currentStageIndex === -1 && (idx === 0 || steps[idx-1].status === 'concluido')) {
      currentStageIndex = idx;
    }
  });

  if (currentStageIndex === -1 && completedCount === steps.length) {
    currentStageIndex = steps.length - 1; 
  }

  const sDate = new Date(project.start_date);
  const eDate = new Date(project.expected_delivery);
  const totalDays = Math.ceil(Math.abs(eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  const fakeToday = new Date(); 
  const elapsedDays = Math.ceil(Math.abs(fakeToday.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) || 0;
  let remainingDays = totalDays - elapsedDays;
  if (remainingDays < 0) remainingDays = 0;

  const curS = steps[currentStageIndex];
  const proxs = steps.slice(currentStageIndex + 1);

  return (
    <>
      {/* Header Global */}
      <header className="top-nav">
        <div className="brand">
          <div className="logo-box" style={{ borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', background: 'transparent', padding: 0 }}>
            <img src="/favicon.svg" alt="CRP Logo" width="36" height="36" />
          </div>
          <div className="logo-text">
            <h1 style={{ letterSpacing: '-0.5px' }}>CRP</h1>
            <span className="sub-logo" style={{ letterSpacing: '1px' }}>CRONOGRAMA</span>
          </div>
        </div>
        
        <div className="nav-actions">
          <span className="contact-text">Dúvidas? Fale conosco</span>
          <button className="btn btn-whatsapp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wa-icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Fale no WhatsApp
          </button>
        </div>
      </header>

      <section id="client-panel" className="panel-section active">
        <div className="container hero-container">
          
          {/* HERO BANNER */}
          <div className="hero-banner">
            <div className="hero-left">
              <div className="hero-tag">PROJETO</div>
              <h1>{project.name}</h1>
              <p className="hero-subtitle">Acompanhamento Transparente</p>
              
              <div className="hero-dates">
                <div className="date-box">
                  <div className="date-icon">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="date-label">Início do projeto</div>
                    <div className="date-value">{new Date(project.start_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="date-box">
                  <div className="date-icon">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="date-label">Previsão de entrega</div>
                    <div className="date-value">{new Date(project.expected_delivery).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-right">
              <div className="hero-card-floating">
                <div className="floating-header">
                  <h3>Progresso Geral</h3>
                  <span className="badge-status-top">Em Desenvolvimento</span>
                </div>
                
                <div className="floating-body">
                  <div className="floating-stats">
                    <div className="perc-large">{project.progress}%</div>
                    <div className="perc-label">Concluído</div>
                  </div>
                  
                  <div className="circular-progress">
                    <div className="rocket-icon-center">🚀</div>
                    <svg className="circular-chart" viewBox="0 0 36 36">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle-fill" strokeDasharray={`${project.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                  </div>
                </div>

                <div className="floating-footer">
                  <div className="progress-bar-thin">
                    <div className="progress-bar-thin-fill" style={{ width: `${project.progress}%` }}></div>
                  </div>
                  <div className="steps-count-text">{completedCount} de {steps.length} etapas concluídas</div>
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE DE CARDS VISUAIS */}
          <div className="white-section mt-4 mb-4">
            <h3 className="section-title">Galeria de Progresso</h3>
            <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '2rem' }}>Acompanhe visualmente cada etapa da construção do seu projeto.</p>
            
            <div style={{ display: 'flex', overflowX: 'auto', gap: '1.5rem', paddingBottom: '1.5rem', scrollSnapType: 'x mandatory', padding: '0.5rem' }}>
              {steps.map((step, idx) => {
                const isActive = idx === currentStageIndex;
                const isConcluido = step.status === 'concluido';
                const cleanStatus = step.status === 'andamento' ? 'Em andamento' : (step.status === 'concluido' ? 'Concluído' : 'Aguardando');
                
                return (
                  <div key={step.id} 
                       className="card-visual-hover"
                       onClick={() => setSelectedStepModal(step)}
                       style={{ 
                         flex: '0 0 280px', background: 'white', borderRadius: 16, overflow: 'hidden', 
                         border: `2px solid ${isActive ? '#2563EB' : (isConcluido ? '#10B981' : '#E2E8F0')}`, 
                         cursor: 'pointer', transition: 'all 0.3s', scrollSnapAlign: 'start',
                         boxShadow: isActive ? '0 10px 25px -5px rgba(37, 99, 235, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)'
                       }}>
                    
                    <div style={{ height: 160, backgroundImage: `url(${step.image_url || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)' }}></div>
                      
                      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', backdropFilter: 'blur(4px)' }}>
                        Etapa {idx + 1}
                      </div>

                      {step.expected_date && (
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(37, 99, 235, 0.95)', padding: '4px 10px', borderRadius: 8, fontSize: '0.70rem', fontWeight: 700, color: 'white', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {new Date(step.expected_date).toLocaleDateString()}
                        </div>
                      )}
                      
                      <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isConcluido && <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Check size={14} /></div>}
                        {isActive && <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Rocket size={14} /></div>}
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.name}</h4>
                      </div>
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <span>{cleanStatus}</span>
                        <span style={{ color: isConcluido ? '#10B981' : (isActive ? '#2563EB' : '#64748B') }}>{step.percentage}%</span>
                      </div>
                      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: isConcluido ? '#10B981' : (isActive ? '#2563EB' : '#CBD5E1'), width: `${step.percentage}%`, transition: 'width 0.5s ease-out' }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTTOM GRID */}
          <div className="bottom-grid">
            
            {/* COL 1: Etapa Atual */}
            <div className="white-section col-etapa-atual">
              <div className="section-header-flex">
                <h3 className="section-title" style={{marginBottom: 0}}>Detalhes da Etapa Atual</h3>
                <span className="badge-etapa">Etapa {currentStageIndex + 1} de {steps.length}</span>
              </div>

              {curS ? (
                <div className="etapa-atual-content mt-4">
                  <div className="etapa-main-box">
                    <div className="etapa-icon-large">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    </div>
                    <div className="etapa-info">
                      <h4>{curS.name}</h4>
                      <p>{curS.description}</p>
                    </div>
                  </div>
                  <div className="etapa-progress-row">
                    <div className="etapa-progress-bar"><div className="etapa-progress-fill" style={{ width: `${curS.percentage}%` }}></div></div>
                    <div className="etapa-progress-txt">{curS.percentage}%</div>
                  </div>
                  <div className="entregaveis">
                    <h5>Resumo de Importância</h5>
                    <p style={{fontSize: '0.875rem', color: '#718096', lineHeight: 1.5}}>
                      Esta etapa é essencial para o desenvolvimento seguro do projeto. Cumprir este prazo garante que as próximas integrações ocorram sem gargalos estruturais.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted mt-4">Nenhuma etapa pendente.</p>
              )}
            </div>

            {/* COL 2: Próximas Etapas */}
            <div className="white-section col-proximas">
              <h3 className="section-title">Próximas Etapas</h3>
              <div className="proximas-list">
                 {proxs.length === 0 ? <p className="text-muted">Nenhuma etapa restante.</p> : proxs.map((p, index) => (
                   <div className="proxima-item" key={p.id} onClick={() => setSelectedStepModal(p)} style={{ cursor: 'pointer' }}>
                     <div className="p-left">
                       <div className="p-num" style={{ background: '#F8FAFC' }}>{currentStageIndex + 2 + index}</div>
                       <div className="p-name hover-underline">{p.name}</div>
                     </div>
                   </div>
                 ))}
              </div>
            </div>

            {/* COL 3: Resumo do Cronograma */}
            <div className="white-section col-resumo">
              <h3 className="section-title">Resumo do Cronograma</h3>
              <div className="resumo-list">
                <div className="resumo-item">
                  <div className="r-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Tempo total estimado</div>
                  <div className="r-value font-bold">{totalDays} dias</div>
                </div>
                <div className="resumo-item">
                  <div className="r-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Tempo decorrido</div>
                  <div className="r-value font-bold">{elapsedDays} dias</div>
                </div>
                <div className="resumo-item border-bottom-none">
                  <div className="r-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Dias restantes</div>
                  <div className="r-value font-bold">{remainingDays} dias</div>
                </div>
                <div className="resumo-situation">
                  <div className="r-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>Situação</div>
                  <div className="badge-success-light">Dentro do prazo</div>
                </div>
              </div>
            </div>

          </div> 

          {/* FOOTER BANNER */}
          <div className="footer-banner mt-4">
            <div className="fb-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div className="fb-text">
              <h4>Acompanhamento transparente, do início à entrega!</h4>
              <p>Aqui você acompanha cada etapa do desenvolvimento do seu aplicativo em tempo real.</p>
            </div>
          </div>

        </div>
      </section>

      {/* MODAL DE DETALHES DA ETAPA (GLASSMORPHISM) */}
      {selectedStepModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: '2.5rem', width: '90%', maxWidth: 500,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <button 
              onClick={() => setSelectedStepModal(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#F5F3FF', color: '#6B46C1', padding: '0.5rem 1rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              <Info size={14} /> DETALHES DA ETAPA
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>{selectedStepModal.name}</h2>
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {selectedStepModal.description}
            </p>

            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '1.5rem', border: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#2563EB" /> Por que este prazo é importante?
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                {getStepImportance(selectedStepModal.name)}
              </p>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Status Atual:</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: selectedStepModal.status === 'concluido' ? '#10B981' : (selectedStepModal.status === 'andamento' ? '#6B46C1' : '#64748B') }}>
                  {selectedStepModal.status === 'concluido' ? 'Concluído' : (selectedStepModal.status === 'andamento' ? 'Em andamento' : 'Aguardando início')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Data Limite Prevista:</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedStepModal.expected_date ? new Date(selectedStepModal.expected_date).toLocaleDateString() : '--/--/----'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Percentual:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{selectedStepModal.percentage}%</div>
              </div>
            </div>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .card-visual-hover:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0,0,0,0.15) !important; }
        ::-webkit-scrollbar { height: 8px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        
        .clickable-node { cursor: pointer; transition: transform 0.2s; }
        .clickable-node:hover { transform: translateY(-5px); }
        .hover-grow { transition: transform 0.2s; }
        .clickable-node:hover .hover-grow { transform: scale(1.15); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
        .hover-underline:hover { text-decoration: underline; color: #2563EB; }
        
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </>
  );
}
