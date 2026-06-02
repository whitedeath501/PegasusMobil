const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const Car = require('../models/Car');
const Order = require('../models/Order');
const Message = require('../models/Message');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── UPLOAD CONFIG ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `car_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── MIDDLEWARE ADMIN ──
function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Não autorizado.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Acesso negado.' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido.' });
  }
}

// ── USERS ──
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar usuários.' });
  }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuário removido.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover usuário.' });
  }
});

// ── CARS ──
router.get('/cars', adminAuth, async (req, res) => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar carros.' });
  }
});

router.post('/cars', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, brand, speed, power, acc, price, tag, rarity, desc } = req.body;
    if (!name || !brand || !price)
      return res.status(400).json({ message: 'Nome, marca e preço são obrigatórios.' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || '');

    const car = new Car({ name, brand, speed: +speed, power, acc, price: +price, tag, rarity, desc, image: imageUrl });
    await car.save();

    res.status(201).json({ message: 'Carro adicionado!', car });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao adicionar carro.' });
  }
});

router.delete('/cars/:id', adminAuth, async (req, res) => {
  try {
    await Car.findByIdAndDelete(req.params.id);
    res.json({ message: 'Carro removido.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover carro.' });
  }
});

// ── ORDERS ──
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
});

router.patch('/orders/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });

    await resend.emails.send({
      from: 'PegasusMobil <onboarding@resend.dev>',
      to: order.userEmail,
      subject: `✦ PegasusMobil — Atualização do seu pedido`,
      html: `
        <div style="font-family:Georgia,serif;background:#05060a;color:#f0ece4;max-width:600px;margin:0 auto;border:1px solid #C9A84C;border-radius:4px;padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#C9A84C;font-size:2rem;letter-spacing:0.2em;margin:0;">PEGASUSMOBIL</h1>
            <p style="color:#a09880;letter-spacing:0.3em;font-size:0.7rem;margin:4px 0 0;">ATUALIZAÇÃO DE PEDIDO</p>
          </div>
          <div style="border-top:1px solid #C9A84C;padding-top:24px;">
            <p style="color:#f0ece4;line-height:1.8;">Olá, <strong>${order.userName}</strong>.</p>
            <p style="color:#a09880;line-height:1.8;">O status do seu pedido para o <strong style="color:#C9A84C;">${order.carName}</strong> foi atualizado para:</p>
            <div style="text-align:center;margin:24px 0;padding:16px;border:1px solid #C9A84C;border-radius:4px;">
              <strong style="color:#C9A84C;font-size:1.2rem;letter-spacing:0.2em;">${status.toUpperCase()}</strong>
            </div>
            <p style="color:#a09880;font-size:0.85rem;">Nossa equipe entrará em contato em breve com mais detalhes.</p>
          </div>
          <div style="margin-top:32px;text-align:center;color:#a09880;font-size:0.65rem;letter-spacing:0.2em;">© PegasusMobil S.A. — Where Engineering Meets Eternity</div>
        </div>
      `
    });

    res.json({ message: 'Status atualizado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar pedido.' });
  }
});

// ── MESSAGES ──
router.get('/messages', adminAuth, async (req, res) => {
  try {
    const messages = await Message.find({ to: process.env.ADMIN_EMAIL }).sort({ createdAt: -1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar mensagens.' });
  }
});

router.post('/send-message', adminAuth, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body)
      return res.status(400).json({ message: 'Preencha todos os campos.' });

    const msg = new Message({
      from: process.env.ADMIN_EMAIL,
      fromName: 'PegasusMobil Admin',
      to, subject, body
    });
    await msg.save();

    await resend.emails.send({
      from: 'PegasusMobil <onboarding@resend.dev>',
      to,
      subject: `✦ PegasusMobil — ${subject}`,
      html: `
        <div style="font-family:Georgia,serif;background:#05060a;color:#f0ece4;max-width:600px;margin:0 auto;border:1px solid #C9A84C;border-radius:4px;padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#C9A84C;font-size:2rem;letter-spacing:0.2em;margin:0;">PEGASUSMOBIL</h1>
            <p style="color:#a09880;letter-spacing:0.3em;font-size:0.7rem;margin:4px 0 0;">MENSAGEM EXCLUSIVA</p>
          </div>
          <div style="border-top:1px solid #C9A84C;padding-top:24px;">
            <h2 style="color:#f0ece4;font-size:1.2rem;">${subject}</h2>
            <div style="color:#a09880;line-height:1.9;margin-top:16px;white-space:pre-line;">${body}</div>
          </div>
          <div style="margin-top:32px;text-align:center;color:#a09880;font-size:0.65rem;letter-spacing:0.2em;">© PegasusMobil S.A. — Where Engineering Meets Eternity</div>
        </div>
      `
    });

    res.json({ message: 'Mensagem enviada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao enviar mensagem.' });
  }
});

module.exports = router;
