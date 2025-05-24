const { db, createUser } = require('../src/database');

// Aguardar a criação das tabelas antes de criar o usuário
setTimeout(() => {
    // Criar usuário admin
    const success = createUser('admin', 'admin123');
    console.log(success ? 'Usuário criado com sucesso!' : 'Erro ao criar usuário');
    process.exit(0);
}, 1000); // Aguarda 1 segundo para garantir que as tabelas foram criadas 