const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Order = require('../models/Order');
const Car = require('../models/Car');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── MIDDLEWARE AUTH ──
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Não autorizado.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido.' });
  }
}

// ── GET CARS ──
router.get('/cars', async (req, res) => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar carros.' });
  }
});

// ── BUY CAR ──
router.post('/orders', auth, async (req, res) => {
  try {
    const { carId, carName, carBrand, carPrice, message } = req.body;
    const User = require('../models/user');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const order = new Order({
      user: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      carId, carName, carBrand, carPrice, message
    });
    await order.save();

    // Notifica admin
    await resend.emails.send({
      from: 'PegasusMobil <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL,
      subject: `✦ PegasusMobil — Nova Solicitação de Compra`,
      html: `
        <div style="font-family:Georgia,serif;background:#05060a;color:#f0ece4;max-width:600px;margin:0 auto;border:1px solid #C9A84C;border-radius:4px;padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#C9A84C;font-size:2rem;letter-spacing:0.2em;margin:0;">PEGASUSMOBIL</h1>
            <p style="color:#a09880;letter-spacing:0.3em;font-size:0.7rem;margin:4px 0 0;">NOVA SOLICITAÇÃO DE COMPRA</p>
          </div>
          <div style="border-top:1px solid #C9A84C;padding-top:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:10px;color:#a09880;width:140px;">Cliente</td><td style="padding:10px;color:#f0ece4;">${user.firstName} ${user.lastName}</td></tr>
              <tr style="background:rgba(255,255,255,0.03)"><td style="padding:10px;color:#a09880;">Email</td><td style="padding:10px;color:#f0ece4;">${user.email}</td></tr>
              <tr><td style="padding:10px;color:#a09880;">Modelo</td><td style="padding:10px;color:#f0ece4;">${carName}</td></tr>
              <tr style="background:rgba(255,255,255,0.03)"><td style="padding:10px;color:#a09880;">Marca</td><td style="padding:10px;color:#f0ece4;">${carBrand}</td></tr>
              <tr><td style="padding:10px;color:#a09880;">Preço</td><td style="padding:10px;color:#C9A84C;">US$ ${carPrice}M</td></tr>
              <tr style="background:rgba(255,255,255,0.03)"><td style="padding:10px;color:#a09880;">Mensagem</td><td style="padding:10px;color:#f0ece4;">${message || 'Nenhuma'}</td></tr>
              <tr><td style="padding:10px;color:#a09880;">Horário</td><td style="padding:10px;color:#f0ece4;">${new Date().toLocaleString('pt-BR')}</td></tr>
            </table>
          </div>
          <div style="margin-top:32px;text-align:center;color:#a09880;font-size:0.65rem;letter-spacing:0.2em;">© PegasusMobil S.A. — Sistema Automático</div>
        </div>
      `
    });

    res.status(201).json({ message: 'Solicitação enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar solicitação.' });
  }
});

// ── GET MY ORDERS ──
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
});

// ── GET MY MESSAGES ──
router.get('/messages', auth, async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.user.id);
    const messages = await Message.find({ to: user.email }).sort({ createdAt: -1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar mensagens.' });
  }
});

// ── SEND MESSAGE TO ADMIN ──
router.post('/messages', auth, async (req, res) => {
  try {
    const { subject, body } = req.body;
    const User = require('../models/user');
    const user = await User.findById(req.user.id);

    const msg = new Message({
      from: user.email,
      fromName: `${user.firstName} ${user.lastName}`,
      to: process.env.ADMIN_EMAIL,
      subject, body
    });
    await msg.save();

    await resend.emails.send({
      from: 'PegasusMobil <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL,
      subject: `✦ PegasusMobil — Mensagem de ${user.firstName} ${user.lastName}`,
      html: `
        <div style="font-family:Georgia,serif;background:#05060a;color:#f0ece4;max-width:600px;margin:0 auto;border:1px solid #C9A84C;border-radius:4px;padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#C9A84C;font-size:2rem;letter-spacing:0.2em;margin:0;">PEGASUSMOBIL</h1>
            <p style="color:#a09880;letter-spacing:0.3em;font-size:0.7rem;margin:4px 0 0;">MENSAGEM DE CLIENTE</p>
          </div>
          <div style="border-top:1px solid #C9A84C;padding-top:24px;">
            <h2 style="color:#C9A84C;">${subject}</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              <tr><td style="padding:10px;color:#a09880;width:140px;">De</td><td style="padding:10px;color:#f0ece4;">${user.firstName} ${user.lastName}</td></tr>
              <tr style="background:rgba(255,255,255,0.03)"><td style="padding:10px;color:#a09880;">Email</td><td style="padding:10px;color:#f0ece4;">${user.email}</td></tr>
              <tr><td style="padding:10px;color:#a09880;">Horário</td><td style="padding:10px;color:#f0ece4;">${new Date().toLocaleString('pt-BR')}</td></tr>
            </table>
            <div style="padding:16px;background:rgba(255,255,255,0.03);border-left:2px solid #C9A84C;color:#f0ece4;line-height:1.8;white-space:pre-line;">${body}</div>
          </div>
          <div style="margin-top:32px;text-align:center;color:#a09880;font-size:0.65rem;letter-spacing:0.2em;">© PegasusMobil S.A. — Sistema Automático</div>
        </div>
      `
    });

    res.status(201).json({ message: 'Mensagem enviada!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao enviar mensagem.' });
  }
});

// ── MARK MESSAGE READ ──
router.patch('/messages/:id/read', auth, async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marcada como lida.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro.' });
  }
});

module.exports = router;