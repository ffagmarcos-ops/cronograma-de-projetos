import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const initAdminName = process.env.INIT_ADMIN_NAME || 'Administrador';
const initAdminEmail = process.env.INIT_ADMIN_EMAIL || 'admin@local.dev';
const initAdminPassword = process.env.INIT_ADMIN_PASSWORD || 'admin123';
const initAdminPasswordRounds = Number(process.env.INIT_ADMIN_PASSWORD_ROUNDS || '10');

type DefaultStep = {
  order: number;
  name: string;
  desc: string;
  duration: number;
  img: string;
};

const DEFAULT_STEPS: DefaultStep[] = [
  { order: 1, name: 'Requisitos e Coleta de Dados', desc: 'Compreensão das necessidades e regras de negócio.', duration: 15, img: `${publicBaseUrl}/uploads/step_1.png` },
  { order: 2, name: 'Planejamento do Projeto', desc: 'Definição de prazos, milestones e arquitetura.', duration: 15, img: `${publicBaseUrl}/uploads/step_2.png` },
  { order: 3, name: 'Design UI/UX', desc: 'Prototipação das telas e fluxo de navegação.', duration: 15, img: `${publicBaseUrl}/uploads/step_3.png` },
  { order: 4, name: 'Aprovação do Design', desc: 'Validação visual com o cliente.', duration: 15, img: `${publicBaseUrl}/uploads/step_4.png` },
  { order: 5, name: 'Estruturação e Banco de Dados', desc: 'Setup de servidores, repositórios e banco de dados.', duration: 15, img: `${publicBaseUrl}/uploads/step_5.png` },
  { order: 6, name: 'Desenvolvimento Backend', desc: 'Criação das APIs, lógica de servidor e segurança.', duration: 15, img: `${publicBaseUrl}/uploads/step_6.png` },
  { order: 7, name: 'Desenvolvimento Frontend', desc: 'Construção da interface e integração com a API.', duration: 15, img: 'https://images.unsplash.com/photo-1547082299-de196ea013d6' },
  { order: 8, name: 'Testes Internos (QA)', desc: 'Testes de qualidade para garantir que não existam bugs.', duration: 15, img: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2' },
  { order: 9, name: 'Versão Beta para Cliente', desc: 'Disponibilização da versão Beta para o cliente validar.', duration: 15, img: 'https://images.unsplash.com/photo-1512758684364-eaf5bb1562b7' },
  { order: 10, name: 'Ajustes Finais', desc: 'Correção de feedback gerado na versão Beta.', duration: 15, img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40' },
  { order: 11, name: 'Publicação nas Lojas', desc: 'Subida oficial do projeto para produção.', duration: 15, img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113' },
];

async function ensureColumn(db: Awaited<ReturnType<typeof getDb>>, tableName: string, columnName: string, definition: string) {
  const column = await db.get<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]);

  if (!column || column.count === 0) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

async function ensureSchema(db: Awaited<ReturnType<typeof getDb>>) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      client_name VARCHAR(255),
      banner_url TEXT,
      logo_url TEXT,
      start_date DATE,
      expected_delivery DATE,
      current_delivery DATE,
      status VARCHAR(50) DEFAULT 'aguardando',
      progress INT DEFAULT 0,
      color VARCHAR(20) DEFAULT '#6B46C1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_steps (
      id INT PRIMARY KEY AUTO_INCREMENT,
      project_id INT NOT NULL,
      step_order INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      percentage INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'aguardando',
      duration_days INT DEFAULT 15,
      expected_date DATE,
      image_url TEXT,
      start_date DATE,
      finish_date DATE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_updates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      project_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, 'projects', 'client_name', 'client_name VARCHAR(255)');
  await ensureColumn(db, 'projects', 'banner_url', 'banner_url TEXT');
  await ensureColumn(db, 'projects', 'logo_url', 'logo_url TEXT');
  await ensureColumn(db, 'projects', 'start_date', 'start_date DATE');
  await ensureColumn(db, 'projects', 'expected_delivery', 'expected_delivery DATE');
  await ensureColumn(db, 'projects', 'current_delivery', 'current_delivery DATE');
  await ensureColumn(db, 'projects', 'status', "status VARCHAR(50) DEFAULT 'aguardando'");
  await ensureColumn(db, 'projects', 'progress', 'progress INT DEFAULT 0');
  await ensureColumn(db, 'projects', 'color', "color VARCHAR(20) DEFAULT '#6B46C1'");
  await ensureColumn(db, 'projects', 'created_at', 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  await ensureColumn(db, 'project_steps', 'description', 'description TEXT');
  await ensureColumn(db, 'project_steps', 'percentage', 'percentage INT DEFAULT 0');
  await ensureColumn(db, 'project_steps', 'status', "status VARCHAR(50) DEFAULT 'aguardando'");
  await ensureColumn(db, 'project_steps', 'duration_days', 'duration_days INT DEFAULT 15');
  await ensureColumn(db, 'project_steps', 'expected_date', 'expected_date DATE');
  await ensureColumn(db, 'project_steps', 'image_url', 'image_url TEXT');
  await ensureColumn(db, 'project_steps', 'start_date', 'start_date DATE');
  await ensureColumn(db, 'project_steps', 'finish_date', 'finish_date DATE');

  await ensureColumn(db, 'project_updates', 'created_at', 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  console.log('Schema validado e atualizado com sucesso.');
}

async function seedAdmin(db: Awaited<ReturnType<typeof getDb>>) {
  const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [initAdminEmail]);
  if (existingAdmin) {
    await db.run(
      'UPDATE users SET name = ?, role = ?, password_hash = ? WHERE email = ?',
      [initAdminName, 'admin', await bcrypt.hash(initAdminPassword, Number.isFinite(initAdminPasswordRounds) && initAdminPasswordRounds > 3 ? Math.floor(initAdminPasswordRounds) : 10), initAdminEmail]
    );
    console.log(`Usuario admin atualizado: ${initAdminEmail}`);
    return;
  }

  const rounds = Number.isFinite(initAdminPasswordRounds) && initAdminPasswordRounds > 3
    ? Math.floor(initAdminPasswordRounds)
    : 10;
  const adminPasswordHash = await bcrypt.hash(initAdminPassword, rounds);

  await db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, \'admin\')',
    [initAdminName, initAdminEmail, adminPasswordHash]
  );
  console.log(`Usuario admin inicial criado: ${initAdminEmail}`);
}

async function seedDemoProject(db: Awaited<ReturnType<typeof getDb>>) {
  const sDate = new Date();
  sDate.setDate(sDate.getDate() - 10);
  const startDate = sDate.toISOString().split('T')[0] as string;

  const totalDays = 165;
  const eDate = new Date(sDate);
  eDate.setDate(eDate.getDate() + totalDays);
  const expectedDelivery = eDate.toISOString().split('T')[0] as string;

  let project = await db.get<{ id: number }>('SELECT id FROM projects WHERE slug = ?', ['aurea-clube']);

  if (!project) {
    const result = await db.run(`
      INSERT INTO projects (name, slug, client_name, banner_url, start_date, expected_delivery, status, progress, color)
      VALUES ('Aurea Clube de Benefícios', 'aurea-clube', 'Aurea', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', ?, ?, 'aguardando', 0, '#6B46C1')
    `, [startDate, expectedDelivery]);

    project = { id: result.lastID };
    console.log('Projeto de demonstracao criado.');
  } else {
    await db.run(`
      UPDATE projects
      SET name = 'Aurea Clube de Benefícios',
          client_name = 'Aurea',
          banner_url = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
          start_date = ?,
          expected_delivery = ?,
          status = COALESCE(status, 'aguardando'),
          progress = COALESCE(progress, 0),
          color = COALESCE(color, '#6B46C1')
      WHERE id = ?
    `, [startDate, expectedDelivery, project.id]);
    console.log('Projeto de demonstracao atualizado.');
  }

  if (!project) {
    throw new Error('Nao foi possivel preparar o projeto de demonstracao.');
  }

  let cascadedDate = new Date(startDate);
  for (const step of DEFAULT_STEPS) {
    cascadedDate.setDate(cascadedDate.getDate() + step.duration);
    const expectedDateStr = cascadedDate.toISOString().split('T')[0] as string;

    let percentage = 0;
    let status = 'aguardando';
    if (step.order === 1) {
      percentage = 100;
      status = 'concluido';
    } else if (step.order === 2) {
      percentage = 30;
      status = 'andamento';
    }

    const existingStep = await db.get<{ id: number }>(
      'SELECT id FROM project_steps WHERE project_id = ? AND step_order = ?',
      [project.id, step.order]
    );

    if (!existingStep) {
      await db.run(`
        INSERT INTO project_steps (project_id, step_order, name, description, percentage, status, duration_days, expected_date, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [project.id, step.order, step.name, step.desc, percentage, status, step.duration, expectedDateStr, step.img]);
      continue;
    }

    await db.run(`
      UPDATE project_steps
      SET name = ?,
          description = ?,
          percentage = ?,
          status = ?,
          duration_days = ?,
          expected_date = ?,
          image_url = ?
      WHERE project_id = ? AND step_order = ?
    `, [step.name, step.desc, percentage, status, step.duration, expectedDateStr, step.img, project.id, step.order]);
  }

  const steps = await db.all<{ id: number }>('SELECT id FROM project_steps WHERE project_id = ?', [project.id]);
  if (steps.length < DEFAULT_STEPS.length) {
    console.log('Etapas adicionais foram criadas para completar o projeto de demonstracao.');
  }
}

async function runInit() {
  console.log('Iniciando processo de InitDB com MariaDB...');

  try {
    const db = await getDb();

    console.log('Validando e atualizando schema...');
    await ensureSchema(db);

    console.log('Atualizando usuarios e dados padrao...');
    await seedAdmin(db);
    await seedDemoProject(db);

    console.log('InitDB executado com sucesso!');
    process.exit(0);

  } catch (err) {
    console.error('Erro no InitDB:', err);
    process.exit(1);
  }
}

runInit();
