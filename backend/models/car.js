const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  speed: { type: Number, default: 0 },
  power: { type: String, default: '' },
  acc: { type: String, default: '' },
  price: { type: Number, required: true },
  tag: { type: String, default: '' },
  rarity: { type: String, default: '' },
  image: { type: String, default: '' },
  desc: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);