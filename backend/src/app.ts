import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { getDb } from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos de upload
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configuração do Multer para Uploads Locais
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, fileName);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  const publicUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  res.json({ url: publicUrl });
});

const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Portal de Projetos API', version: '1.0.0' },
  paths: {}
};
try {
  const doc = YAML.load(path.join(__dirname, '../swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(doc));
} catch(e) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

async function recalculateProjectDates(db: any, projectId: string | number) {
  const proj = await db.get('SELECT start_date FROM projects WHERE id = ?', [projectId]);
  if (!proj || !proj.start_date) return;
  
  const steps = await db.all('SELECT * FROM project_steps WHERE project_id = ? ORDER BY step_order ASC', [projectId]);
  
  let currentDate = new Date(proj.start_date);
  let totalPerc = 0;

  for (const step of steps) {
    if (step.status === 'concluido') {
      if (step.expected_date) {
        currentDate = new Date(step.expected_date);
      } else {
        currentDate.setDate(currentDate.getDate() + (step.duration_days || 0));
        const expectedDateStr = currentDate.toISOString().split('T')[0];
        await db.run('UPDATE project_steps SET expected_date = ? WHERE id = ?', [expectedDateStr, step.id]);
      }
    } else {
      currentDate.setDate(currentDate.getDate() + (step.duration_days || 0));
      const expectedDateStr = currentDate.toISOString().split('T')[0];
      await db.run('UPDATE project_steps SET expected_date = ? WHERE id = ?', [expectedDateStr, step.id]);
    }
    totalPerc += step.percentage;
  }

  const newExpectedDelivery = currentDate.toISOString().split('T')[0];
  const generalProgress = steps.length > 0 ? Math.round(totalPerc / steps.length) : 0;

  await db.run('UPDATE projects SET progress = ?, expected_delivery = ? WHERE id = ?', [generalProgress, newExpectedDelivery, projectId]);
}

app.get('/projects', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM projects');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const db = await getDb();
    const row = await db.get('SELECT * FROM projects WHERE slug = ?', [slug]);
    if (!row) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, client_name, banner_url, logo_url, start_date, expected_delivery, status, progress, color } = req.body;
    const db = await getDb();
    await db.run(`
      UPDATE projects 
      SET name=?, client_name=?, banner_url=?, logo_url=?, start_date=?, expected_delivery=?, status=?, progress=?, color=?
      WHERE id=?
    `, [name, client_name, banner_url, logo_url, start_date, expected_delivery, status, progress, color, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/projects/:projectId/steps', async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = await getDb();
    const rows = await db.all('SELECT * FROM project_steps WHERE project_id = ? ORDER BY step_order ASC', [projectId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/projects/:projectId/steps', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, duration_days, image_url } = req.body;
    const db = await getDb();
    
    // Obter o max order
    const lastStep = await db.get('SELECT MAX(step_order) as maxOrder FROM project_steps WHERE project_id = ?', [projectId]);
    const nextOrder = (lastStep?.maxOrder || 0) + 1;

    const result = await db.run(`
      INSERT INTO project_steps (project_id, step_order, name, description, percentage, status, duration_days, image_url)
      VALUES (?, ?, ?, ?, 0, 'aguardando', ?, ?)
    `, [projectId, nextOrder, name, description, duration_days || 15, image_url]);
    
    await recalculateProjectDates(db, projectId);

    res.status(201).json({ id: result.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/projects/:projectId/steps/reorder', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { orderedStepIds } = req.body; // array de IDs na nova ordem
    const db = await getDb();
    
    for (let i = 0; i < orderedStepIds.length; i++) {
      await db.run('UPDATE project_steps SET step_order = ? WHERE id = ? AND project_id = ?', [i + 1, orderedStepIds[i], projectId]);
    }
    
    await recalculateProjectDates(db, projectId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/projects/:projectId/steps/:stepId/set_current', async (req, res) => {
  try {
    const { projectId, stepId } = req.params;
    const db = await getDb();
    
    const targetStep = await db.get('SELECT step_order FROM project_steps WHERE id = ?', [stepId]);
    if (!targetStep) return res.status(404).json({ error: 'Step not found' });
    
    await db.run('UPDATE project_steps SET status = \'concluido\', percentage = 100 WHERE project_id = ? AND step_order < ?', [projectId, targetStep.step_order]);
    await db.run('UPDATE project_steps SET status = \'andamento\' WHERE project_id = ? AND step_order = ?', [projectId, targetStep.step_order]);
    await db.run('UPDATE project_steps SET status = \'aguardando\', percentage = 0 WHERE project_id = ? AND step_order > ?', [projectId, targetStep.step_order]);
    
    await recalculateProjectDates(db, projectId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/projects', async (req, res) => {
  try {
    const { name, slug, client_name, banner_url, start_date, expected_delivery } = req.body;
    const db = await getDb();
    
    // Inserir Projeto
    const result = await db.run(`
      INSERT INTO projects (name, slug, client_name, banner_url, start_date, expected_delivery, status, progress, color)
      VALUES (?, ?, ?, ?, ?, ?, 'aguardando', 0, '#2563EB')
    `, [name, slug, client_name, banner_url, start_date, expected_delivery]);
    
    const projectId = result.lastID;

    // Criar as 11 etapas padrão automaticamente
    const DEFAULT_STEPS = [
      { order: 1, name: 'Requisitos e Coleta de Dados', desc: 'Compreensão das necessidades e regras de negócio.', img: 'http://localhost:3000/uploads/step_1.png' },
      { order: 2, name: 'Planejamento do Projeto', desc: 'Definição de prazos, milestones e arquitetura.', img: 'http://localhost:3000/uploads/step_2.png' },
      { order: 3, name: 'Design UI/UX', desc: 'Prototipação das telas e fluxo de navegação.', img: 'http://localhost:3000/uploads/step_3.png' },
      { order: 4, name: 'Aprovação do Design', desc: 'Validação visual com o cliente.', img: 'http://localhost:3000/uploads/step_4.png' },
      { order: 5, name: 'Estruturação e Banco de Dados', desc: 'Setup de servidores, repositórios e banco de dados.', img: 'http://localhost:3000/uploads/step_5.png' },
      { order: 6, name: 'Desenvolvimento Backend', desc: 'Criação das APIs, lógica de servidor e segurança.', img: 'http://localhost:3000/uploads/step_6.png' },
      { order: 7, name: 'Desenvolvimento Frontend', desc: 'Construção da interface e integração com a API.', img: 'https://images.unsplash.com/photo-1547082299-de196ea013d6' },
      { order: 8, name: 'Testes Internos (QA)', desc: 'Testes de qualidade para garantir que não existam bugs.', img: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2' },
      { order: 9, name: 'Versão Beta para Cliente', desc: 'Disponibilização da versão Beta para o cliente validar.', img: 'https://images.unsplash.com/photo-1555421689-d68471e189f2' },
      { order: 10, name: 'Ajustes Finais', desc: 'Correção de feedback gerado na versão Beta.', img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40' },
      { order: 11, name: 'Publicação nas Lojas', desc: 'Subida oficial do projeto para produção.', img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c' }
    ];

    for (const step of DEFAULT_STEPS) {
      await db.run(`
        INSERT INTO project_steps (project_id, step_order, name, description, percentage, status, duration_days, image_url)
        VALUES (?, ?, ?, ?, 0, 'aguardando', 15, ?)
      `, [projectId, step.order, step.name, step.desc, step.img]);
    }

    await recalculateProjectDates(db, projectId);

    res.json({ success: true, projectId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/projects/:projectId/steps/:stepId', async (req, res) => {
  try {
    const { projectId, stepId } = req.params;
    const { percentage, status, duration_days } = req.body;
    const db = await getDb();
    
    // Atualiza a etapa (o front já envia a duração correta, mesmo se a data for editada)
    await db.run('UPDATE project_steps SET percentage = ?, status = ?, duration_days = ? WHERE id = ? AND project_id = ?', 
      [percentage, status, duration_days, stepId, projectId]);
    
    await recalculateProjectDates(db, projectId);

    const proj = await db.get('SELECT progress FROM projects WHERE id = ?', [projectId]);

    res.json({ success: true, newProgress: proj.progress });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
