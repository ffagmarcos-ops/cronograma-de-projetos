import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const initAdminName = process.env.INIT_ADMIN_NAME || 'Administrador';
const initAdminEmail = process.env.INIT_ADMIN_EMAIL || 'admin@local.dev';
const initAdminPassword = process.env.INIT_ADMIN_PASSWORD || 'admin123';
const initAdminPasswordRounds = Number(process.env.INIT_ADMIN_PASSWORD_ROUNDS || '10');

const DEFAULT_STEPS = [
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

async function runInit() {
  console.log('Iniciando processo de InitDB com MariaDB...');

  try {
    const db = await getDb();

    console.log('Criando tabelas...');
    
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
    console.log('Tabelas criadas com sucesso.');

    const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [initAdminEmail]);
    if (!existingAdmin) {
      const rounds = Number.isFinite(initAdminPasswordRounds) && initAdminPasswordRounds > 3
        ? Math.floor(initAdminPasswordRounds)
        : 10;
      const adminPasswordHash = await bcrypt.hash(initAdminPassword, rounds);

      await db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, \'admin\')',
        [initAdminName, initAdminEmail, adminPasswordHash]
      );
      console.log(`Usuario admin inicial criado: ${initAdminEmail}`);
    } else {
      console.log(`Usuario admin ja existe: ${initAdminEmail}`);
    }

    // Inserir projeto padrão
    const row = await db.get('SELECT COUNT(*) as count FROM projects');
    if (row.count === 0) {
      console.log('Inserindo projeto e etapas padrão...');
      
      const sDate = new Date();
      sDate.setDate(sDate.getDate() - 10); // Projeto começou 10 dias atrás
      const start_date = sDate.toISOString().split('T')[0] as string;

      // Prazo do projeto: 15 dias * 11 etapas = 165 dias
      const totalDays = 165;
      const eDate = new Date(sDate);
      eDate.setDate(eDate.getDate() + totalDays);
      const expected_delivery = eDate.toISOString().split('T')[0] as string;

      const result = await db.run(`
        INSERT INTO projects (name, slug, client_name, banner_url, start_date, expected_delivery)
        VALUES ('Aurea Clube de Benefícios', 'aurea-clube', 'Aurea', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', ?, ?)
      `, [start_date, expected_delivery]);
      
      const projectId = result.lastID;
      
      let cascadedDate = new Date(start_date);

      for (const step of DEFAULT_STEPS) {
        cascadedDate.setDate(cascadedDate.getDate() + step.duration);
        const expectedDateStr = cascadedDate.toISOString().split('T')[0] as string;

        let perc = 0;
        let status = 'aguardando';
        if (step.order === 1) { perc = 100; status = 'concluido'; }
        if (step.order === 2) { perc = 30; status = 'andamento'; }

        await db.run(`
          INSERT INTO project_steps (project_id, step_order, name, description, percentage, status, duration_days, expected_date, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [projectId, step.order, step.name, step.desc, perc, status, step.duration, expectedDateStr, step.img]);
      }

      console.log('Projeto de demonstracao criado com 11 etapas e datas em cascata.');
    }

    console.log('InitDB executado com sucesso!');
    process.exit(0);

  } catch (err) {
    console.error('Erro no InitDB:', err);
    process.exit(1);
  }
}

runInit();
