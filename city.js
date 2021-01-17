const mongoose = require('mongoose');

const citySchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	key: {type: String, unique: true},
	description: String,
	feelsLike: Number,
	icon: String,
	max: Number,
	min: Number,
	name: String,
	temperature: Number,
	url: String,
});


module.exports = mongoose.model('City', citySchema);
