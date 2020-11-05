const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const axios = require('axios');
const cors = require('cors');

const app = express();
const router = express.Router();
const db = mongoose.connect(process.env.DB_HOST, {useNewUrlParser: true, useUnifiedTopology: true});
const port = process.env.PORT;
const weatherAppID = process.env.WEATHER_API_KEY;


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

app.use('/api/', router);

router.get('/weather/all', (req, res) => {
  const ids = '2643743,2988507,5128581,3117735,2950159,4219762';
  axios.get(`https://api.openweathermap.org/data/2.5/group?id=${ids}&units=metric&APPID=${weatherAppID}`)
    .then(response => {
      let cities = [];
      response.data.list.map(city => {
        cities.push(cleanCity(city));
      });
      Promise.all(cities)
        .then(cities => {
          res.status(200).send(cities);
        });
    })
    .catch(response => {
      res.status(500).send(response.message);
    });
});

router.get('/weather/:city', (req, res) => {
  const city = req.params.city.toLowerCase();
  axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=${weatherAppID}`)
    .then(response => {
      cleanCity(response.data)
        .then(city => {
          res.status(200).send(city);
        });
    })
    .catch(response => {
      res.status(500).send(response.message);
    });
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
  }
}

app.server = app.listen(port, () => {
  console.log(`Running on port ${port}`);
});

module.exports = app;
