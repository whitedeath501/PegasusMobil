require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./backend/models/User');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB conectado');

  const existing = await User.findOne({ email: 'Pegasusmobile@proton.me' });
  if (existing) {
    console.log('Admin já existe!');
    process.exit(0);
  }

  const admin = new User({
    firstName: 'Pegasus',
    lastName: 'Admin',
    email: 'Pegasusmobile@proton.me',
    password: '*Pegasus71Mobil&#',
    role: 'admin',
    isEmailVerified: true
  });

  await admin.save();
  console.log('✦ Conta admin criada com sucesso!');
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });