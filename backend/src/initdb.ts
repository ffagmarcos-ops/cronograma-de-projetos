import { getDb } from './db';

const DEFAULT_STEPS = [
  { order: 1, name: 'Requisitos e Coleta de Dados', desc: 'Compreensão das necessidades e regras de negócio.', duration: 15, img: 'http://localhost:3000/uploads/step_1.png' },
  { order: 2, name: 'Planejamento do Projeto', desc: 'Definição de prazos, milestones e arquitetura.', duration: 15, img: 'http://localhost:3000/uploads/step_2.png' },
  { order: 3, name: 'Design UI/UX', desc: 'Prototipação das telas e fluxo de navegação.', duration: 15, img: 'http://localhost:3000/uploads/step_3.png' },
  { order: 4, name: 'Aprovação do Design', desc: 'Validação visual com o cliente.', duration: 15, img: 'http://localhost:3000/uploads/step_4.png' },
  { order: 5, name: 'Estruturação e Banco de Dados', desc: 'Setup de servidores, repositórios e banco de dados.', duration: 15, img: 'http://localhost:3000/uploads/step_5.png' },
  { order: 6, name: 'Desenvolvimento Backend', desc: 'Criação das APIs, lógica de servidor e segurança.', duration: 15, img: 'http://localhost:3000/uploads/step_6.png' },
  { order: 7, name: 'Desenvolvimento Frontend', desc: 'Construção da interface e integração com a API.', duration: 15, img: 'https://images.unsplash.com/photo-1547082299-de196ea013d6' },
  { order: 8, name: 'Testes Internos (QA)', desc: 'Testes de qualidade para garantir que não existam bugs.', duration: 15, img: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2' },
  { order: 9, name: 'Versão Beta para Cliente', desc: 'Disponibilização da versão Beta para o cliente validar.', duration: 15, img: 'https://images.unsplash.com/photo-1512758684364-eaf5bb1562b7' },
  { order: 10, name: 'Ajustes Finais', desc: 'Correção de feedback gerado na versão Beta.', duration: 15, img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40' },
  { order: 11, name: 'Publicação nas Lojas', desc: 'Subida oficial do projeto para produção.', duration: 15, img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113' },
];

async function runInit() {
  console.log('🔄 Iniciando processo de InitDB com SQLite...');

  try {
    const db = await getDb();

    console.log('🔄 Criando tabelas...');
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        client_name TEXT,
        banner_url TEXT,
        logo_url TEXT,
        start_date TEXT,
        expected_delivery TEXT,
        current_delivery TEXT,
        status TEXT DEFAULT 'aguardando',
        progress INTEGER DEFAULT 0,
        color TEXT DEFAULT '#6B46C1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS project_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        step_order INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        percentage INTEGER DEFAULT 0,
        status TEXT DEFAULT 'aguardando',
        duration_days INTEGER DEFAULT 15,
        expected_date TEXT,
        image_url TEXT,
        start_date TEXT,
        finish_date TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS project_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabelas criadas com sucesso.');

    // Inserir projeto padrão
    const row = await db.get('SELECT COUNT(*) as count FROM projects');
    if (row.count === 0) {
      console.log('🔄 Inserindo projeto e etapas padrão...');
      
      const sDate = new Date();
      sDate.setDate(sDate.getDate() - 10); // Projeto começou 10 dias atrás
      const start_date = sDate.toISOString().split('T')[0];

      // Prazo do projeto: 15 dias * 11 etapas = 165 dias
      const totalDays = 165;
      const eDate = new Date(sDate);
      eDate.setDate(eDate.getDate() + totalDays);
      const expected_delivery = eDate.toISOString().split('T')[0];

      const result = await db.run(`
        INSERT INTO projects (name, slug, client_name, banner_url, start_date, expected_delivery)
        VALUES ('Aurea Clube de Benefícios', 'aurea-clube', 'Aurea', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', ?, ?)
      `, [start_date, expected_delivery]);
      
      const projectId = result.lastID;
      
      let cascadedDate = new Date(start_date);

      for (const step of DEFAULT_STEPS) {
        cascadedDate.setDate(cascadedDate.getDate() + step.duration);
        const expectedDateStr = cascadedDate.toISOString().split('T')[0];

        let perc = 0;
        let status = 'aguardando';
        if (step.order === 1) { perc = 100; status = 'concluido'; }
        if (step.order === 2) { perc = 30; status = 'andamento'; }

        await db.run(`
          INSERT INTO project_steps (project_id, step_order, name, description, percentage, status, duration_days, expected_date, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [projectId, step.order, step.name, step.desc, perc, status, step.duration, expectedDateStr, step.img]);
      }

      console.log('✅ Projeto de demonstração criado com 11 etapas e datas em cascata.');
    }

    console.log('🚀 InitDB executado com sucesso!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Erro no InitDB:', err);
    process.exit(1);
  }
}

runInit();
