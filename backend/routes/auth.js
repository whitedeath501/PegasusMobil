const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { sendAdminNotification, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/mailer');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Senha deve ter pelo menos 8 caracteres.' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Este email já está cadastrado.' });

    const user = new User({ firstName, lastName, email, password });
    const verifyToken = user.generateEmailVerificationToken();
    await user.save();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await sendWelcomeEmail(user);
    await sendAdminNotification({
      action: 'Novo cadastro',
      firstName, lastName, email, ip,
      time: new Date().toLocaleString('pt-BR')
    });

    res.status(201).json({ message: 'Conta criada com sucesso! Verifique seu email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Preencha todos os campos.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    const isFirstLogin = user.loginCount === 0;
    user.lastLogin = new Date();
    user.loginCount += 1;
    user.ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (isFirstLogin) {
      await sendAdminNotification({
        action: 'Primeiro login',
        firstName: user.firstName, lastName: user.lastName,
        email: user.email, ip,
        time: new Date().toLocaleString('pt-BR')
      });
    }

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const token = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await sendPasswordResetEmail(user, token);
      await sendAdminNotification({
        action: 'Solicitação de recuperação de senha',
        firstName: user.firstName, lastName: user.lastName,
        email: user.email, ip,
        time: new Date().toLocaleString('pt-BR')
      });
    }
    res.json({ message: 'Se este email estiver cadastrado, você receberá as instruções.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// VERIFY EMAIL
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: Date.now() }
    });
    if (!user)
      return res.status(400).json({ message: 'Token inválido ou expirado.' });

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save({ validateBeforeSave: false });

    res.redirect(`${process.env.FRONTEND_URL}?verified=true`);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

module.exports = router;