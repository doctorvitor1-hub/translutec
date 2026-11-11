const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// SENHA MASTER FIXA + SEGREDO SINCRONIZADO COM O PYTHON
const MASTER_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const SALT_SECRETO = 'TRANSLUTEC_SECRET_KEY_2026';
const TEMPO_VALIDADE = 300; // 5 minutos
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function getChavesDinamicasValidas() {
    const janelaAtual = Math.floor(Date.now() / 1000 / TEMPO_VALIDADE);
    const chaves = [];
    // Aceita a chave atual e a da janela anterior (tolerância de sincronização)
    for (let i = 0; i <= 1; i++) {
        const w = janelaAtual - i;
        const hash = crypto.createHash('sha256').update(`${SALT_SECRETO}_${w}`).digest('hex').substring(0, 8).toUpperCase();
        chaves.push(hash);
    }
    return chaves;
}

const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/brilhou', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'brilhou.html'));
});
app.post('/api/checkout-renas', async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const session = await stripe.checkout.sessions.create({

            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'brl',

                    product_data: {
                        name: 'Kit Família de Renas Iluminadas LED (3 Peças)',
                        description: 'Armação reforçada em metal branco, laços vermelhos e micro-LEDs bivolt.'
                    },
                    unit_amount: 19990,
                },
                quantity: 1,
            }],
            payment_method_options: {
                card: {
                    request_three_d_secure: 'automatic'
                }
            },
            success_url: `${baseUrl}/brilhou?status=aprovado`,
            cancel_url: `${baseUrl}/brilhou?status=cancelado`,

        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Erro Stripe:', err.message);
        res.status(500).json({ error: err.message });
    }
});


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

// Validação dupla: Aceita a senha master fixa OU a Chave Dinâmica do Python
app.post('/api/admin/logs', (req, res) => {
    const { password } = req.body;
    const inputClean = (password || '').trim();
    const inputHash = crypto.createHash('sha256').update(inputClean).digest('hex');
    const chavesDinamicas = getChavesDinamicasValidas();

    const autorizado = (inputHash === MASTER_HASH) || chavesDinamicas.includes(inputClean.toUpperCase());

    if (!autorizado) {
        return res.status(401).json({ error: 'Chave inválida ou expirada!' });
    }

    const logs = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    res.json({ logs });
});

app.listen(PORT, () => {
    console.log(`\n===========================================`);
    console.log(`🛡️ Translutec rodando em modo seguro na porta ${PORT}`);
    console.log(`===========================================\n`);
});