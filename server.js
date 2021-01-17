const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const axios = require('axios');
const cors = require('cors');

const app = express();
const router = express.Router();
const db = mongoose.connection;
const port = process.env.PORT;
const weatherAppID = process.env.WEATHER_API_KEY;
const City = require('./city');

mongoose.connect(process.env.DB_HOST, {useNewUrlParser: true, useUnifiedTopology: true});


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

app.use('/api/', router);


db.once('open', async function () {
	let numberOfCities = await City.count();
	
	if (!numberOfCities) {
		addInitialCitiesToDB();
	}
});


router.get('/weather/all', (req, res) => {
	City.find()
		.then(cities => res.status(200).send(cities))
});


router.get('/weather/:city', async (req, res) => {
	const cityName = req.params.city;
	const dbCity = await City.findOne({name: cityName});

	if (dbCity) {
		res.status(200).send(dbCity);
	} else {
		try {
			const cityRequest = await axios.get(`${process.env.BASE_WEATHER}/weather?q=${cityName.toLowerCase()}&units=metric&APPID=${weatherAppID}`);
			const cityData = await cleanCity(cityRequest.data)
			const city = new City(cityData);
			
			await city.save();
			res.status(200).send(city);
		} catch (e) {
			res.status(500).send(e.message);
		}
	}
});


router.get('/cities/', (req, res) => {
	axios.get('https://wft-geo-db.p.rapidapi.com/v1/geo/cities?limit=10&countryIds=US&minPopulation=2000000', {
		headers: {
			'x-rapidapi-key': process.env.GEODB_API_KEY,
		}
	}).then((response) => {
		let cities = [];
		response.data.data.map((city) => {
			cities.push(city.name);
		})
		res.status(200).send(cities);
	}).catch(response => {
		res.status(500).send(response.message);
	});
});


function addInitialCitiesToDB() {
	const ids = '2643743,2988507,5128581,3117735,2950159,4219762';
	axios
		.get(`${process.env.BASE_WEATHER}/group?id=${ids}&units=metric&APPID=${weatherAppID}`)
		.then(response => {
			let cities = [];
			response.data.list.map(city => {
				cities.push(cleanCity(city));
			});
			
			Promise.all(cities)
				.then(cities => {
					cities = cities.map(city => {
						return new City({
							...city,
							_id: new mongoose.Types.ObjectId(),
						});
					});
					db.collection('cities').insertMany(cities);
				});
		});
}


async function getImageUrl(city) {
	const clientId = process.env.UNSPLASH_API_KEY;
	const url = 'https://api.unsplash.com/search/photos';
	const cityName = city.toLowerCase();
	return axios.get(`${url}?page=1&per_page=1&orientation=landscape&query=${cityName}&client_id=${clientId}`)
		.then(response => {
			return response.data.results[0].urls.small;
		})
		.catch(response => {
			return response.message;
		});
}


async function cleanCity(city) {
	return {
		name: city.name,
		url: await getImageUrl(city.name.toLowerCase()),
		temperature: city.main.temp,
		description: city.weather[0].description,
		icon: city.weather[0].main.toLowerCase(),
		feelsLike: city.main.feels_like,
		min: city.main.temp_min,
		max: city.main.temp_max,
		key: city.id,
		
	}
}


app.server = app.listen(port, () => {
	console.log(`Running on port ${port}`);
});

module.exports = app;
