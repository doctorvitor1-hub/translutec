const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// SENHA BLINDADA (Hash SHA-256 da sua senha master: admin123)
const MASTER_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// ATIVA O PROCESSAMENTO DE DADOS E ARQUIVOS VISUAIS
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ROTA DO PAINEL DO DONO
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ROTA DA CAMPANHA SOS SUL
app.get('/ajuda', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'donate.html'));
});

// Tradução Segura
app.post('/api/translate', async (req, res) => {
    const { email, text, targetLang } = req.body;
    if (!email || !text) return res.status(400).json({ error: 'Incompleto' });

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|${targetLang}`);
        const data = await response.json();
        const translatedText = data.responseData ? data.responseData.translatedText : 'Erro na tradução';

        const logs = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        logs.unshift({
            id: Date.now(),
            email: email,
            dataHora: new Date().toLocaleString('pt-BR'),
            textoOriginal: text,
            idioma: targetLang,
            traducao: translatedText
        });
        fs.writeFileSync(DB_FILE, JSON.stringify(logs, null, 2));

        res.json({ translatedText });
    } catch (err) {
        res.status(500).json({ error: 'Falha' });
    }
});

// Acesso com validação criptográfica do Dono
app.post('/api/admin/logs', (req, res) => {
    const { password } = req.body;
    const inputHash = crypto.createHash('sha256').update(password || '').digest('hex');

    if (inputHash !== MASTER_HASH) {
        return res.status(401).json({ error: 'Acesso negado!' });
    }

    const logs = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    res.json({ logs });
});

app.listen(PORT, () => {
    console.log(`\n===========================================`);
    console.log(`🛡️ Translutec rodando em modo seguro na porta ${PORT}`);
    console.log(`===========================================\n`);
});