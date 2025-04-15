const express = require('express');
const multer = require('multer');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configure o middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configure o armazenamento de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Configuração do cliente Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Rota para verificar se o servidor está rodando
app.get('/api/status', (req, res) => {
  res.json({ status: 'online' });
});

// Rota para enviar mensagens de voz
app.post('/api/send-voice', upload.single('audio'), async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    const audioUrl = `https://${req.get('host')}/uploads/${req.file.filename}`;
    
    const numbers = JSON.parse(phoneNumbers);
    const results = [];
    
    // Enviar para cada número da lista
    for (const phoneNumber of numbers) {
      try {
        const call = await twilioClient.calls.create({
          twiml: `<Response><Play>${audioUrl}</Play></Response>`,
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        
        results.push({
          phoneNumber,
          status: 'success',
          callSid: call.sid
        });
      } catch (error) {
        results.push({
          phoneNumber,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
