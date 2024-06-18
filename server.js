const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const NaverStrategy = require('passport-naver').Strategy;
const mysql = require('mysql2');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');

dotenv.config();

var xml2js = require('xml2js');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'smart_drive'
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

passport.use(new NaverStrategy({
  clientID: process.env.NAVER_CLIENT_ID,
  clientSecret: process.env.NAVER_CLIENT_SECRET,
  callbackURL: "http://localhost:8080/auth/naver/callback"
},
function(accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    const { id, nickname, profileImage, email } = profile._json;
    const user = { id, nickname, profileImage, email };
    db.query(
      'INSERT INTO users (naver_id, nickname, profile_image, email) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname=?, profile_image=?, email=?',
      [id, nickname, profileImage, email, nickname, profileImage, email],
      (err, results) => {
        if (err) throw err;
        return done(null, user);
      }
    );
  });
}
));

const app = express();

app.use(cors());

app.use(session({
  secret: 'd3MHfBcvbO',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname)));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.get('/auth/naver',
  passport.authenticate('naver'));

app.get('/auth/naver/callback',
  passport.authenticate('naver', { failureRedirect: '/' }),
  function(req, res) {
    req.session.favorites = req.user.favorites || [];
    res.redirect('/');
  });

app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// 로그인 상태 확인 API
app.get('/isAuthenticated', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true, user: req.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/map', function(req, res) {
  res.sendFile(path.join(__dirname, 'map.html'));
});

app.get('/flower', function(req, res) {
  res.sendFile(path.join(__dirname, 'flower.html'));
});

app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/favorite', isAuthenticated, function(req, res) {
  res.sendFile(path.join(__dirname, 'favorite.html'));
});

app.get('/community', isAuthenticated, function(req, res) {
  res.sendFile(path.join(__dirname, 'community.html'));
});

app.get('/api/popular-posts', function(req, res) {
  db.query('SELECT * FROM posts ORDER BY likes DESC, created_at DESC LIMIT 3', function(err, results) {
    if (err) throw err;
    res.json(results);
  });
});

app.get('/api/posts', function(req, res) {
  db.query('SELECT * FROM posts ORDER BY created_at DESC', function(err, results) {
    if (err) throw err;
    res.json(results);
  });
});

// 특정 게시물 조회 API
app.get('/api/posts/:id', function(req, res) {
  const postId = req.params.id;
  db.query('SELECT * FROM posts WHERE id = ?', [postId], function(err, results) {
    if (err) throw err;
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });
});

app.post('/api/posts/:id/like', function(req, res) {
  const postId = req.params.id;
  db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId], function(err, result) {
    if (err) throw err;
    db.query('SELECT likes FROM posts WHERE id = ?', [postId], function(err, results) {
      if (err) throw err;
      res.json({ success: true, likes: results[0].likes });
    });
  });
});

app.post('/api/posts', upload.single('image'), function(req, res) {
  const { title, author, content } = req.body;
  const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
  console.log('Received post data:', { title, author, content, imageUrl });
  
  db.query('INSERT INTO posts (title, author, content, image_url, likes) VALUES (?, ?, ?, ?, 0)', 
    [title, author, content, imageUrl], function(err, result) {
    if (err) {
      console.error('Error inserting post:', err);
      res.json({ success: false, error: 'Error inserting post' });
      return;
    }
    res.json({ success: true });
  });
});

async function getWeatherData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const baseTime = hours < 2 ? '2300' :
                   hours < 5 ? '0200' :
                   hours < 8 ? '0500' :
                   hours < 11 ? '0800' :
                   hours < 14 ? '1100' :
                   hours < 17 ? '1400' :
                   hours < 20 ? '1700' :
                   hours < 23 ? '2000' : '2300';

  const baseDate = year + month + day;

  const params = {
    serviceKey: process.env.WEATHER_API_KEY,
    pageNo: '1',
    numOfRows: '10',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: '60',
    ny: '127'
  };

  const endpoint = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

  try {
    const response = await axios.get(endpoint, { params });
    const data = response.data;
    if (data && data.response && data.response.header && data.response.header.resultCode === '00') {
      return data.response.body.items.item;
    } else {
      throw new Error(data.response.header ? data.response.header.resultMsg : 'Invalid response structure');
    }
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    return null;
  }
}

app.get('/api/weather', async function(req, res) {
  const weatherData = await getWeatherData();
  if (weatherData) {
    res.json(weatherData);
  } else {
    res.status(500).json({ error: '날씨 정보를 가져오는 데 실패했습니다.' });
  }
});

async function getSeoulAccInfo(start = 1, end = 10) {
  const url = `http://openapi.seoul.go.kr:8088/6c6d6f786673736b383449504f536a/xml/AccInfo/${start}/${end}/`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    return null;
  }
}

app.get('/api/data', async function(req, res) {
  try {
    const data = await getSeoulAccInfo();
    xml2js.parseString(data, (err, result) => {
      if (err) {
        res.status(500).send('Error occurred while parsing data');
      } else {
        if (result.AccInfo.list_total_count && result.AccInfo.row) {
          const rows = result.AccInfo.row.map(acc => ({
            acc_id: acc.acc_id[0],
            occr_date: acc.occr_date[0],
            occr_time: acc.occr_time[0],
            exp_clr_date: acc.exp_clr_date[0],
            exp_clr_time: acc.exp_clr_time[0],
            acc_type: acc.acc_type[0],
            acc_dtype: acc.acc_dtype[0],
            link_id: acc.link_id[0],
            grs80tm_x: parseFloat(acc.grs80tm_x[0]),
            grs80tm_y: parseFloat(acc.grs80tm_y[0]),
            acc_info: acc.acc_info[0],
            acc_road_code: acc.acc_road_code[0]
          }));
          res.json(rows);
        } else {
          res.json([]);
        }
      }
    });
  } catch (error) {
    res.status(500).send('Error occurred while fetching data');
  }
});

app.get('/api/direction', async (req, res) => {
  const { start, goal } = req.query;
  const apiKeyId = process.env.MAP_CLIENT_ID;
  const apiKey = process.env.MAP_CLIENT_SECRET;

  try {
      const response = await axios.get(`https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving`, {
          params: {
              start,
              goal,
              option: 'trafast'
          },
          headers: {
              'X-NCP-APIGW-API-KEY-ID': apiKeyId,
              'X-NCP-APIGW-API-KEY': apiKey
          }
      });
      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error fetching direction data');
  }
});

app.listen(8080, function() {
  console.log('Server is listening on port 8080');
});
