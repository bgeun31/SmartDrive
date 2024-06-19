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

// MySQL 연결 설정
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'smart_drive'
});

db.connect((err) => {
  if (err) {
    console.error('MySQL 연결 오류:', err);
    throw err;
  }
  console.log('MySQL Connected...');
});

// Passport 설정
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

app.use(express.json()); // JSON 본문 파싱

app.use(cors());

// 세션 설정
app.use(session({
  secret: 'd3MHfBcvbO',
  resave: false,
  saveUninitialized: true
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 정적 파일 제공
app.use(express.static(path.join(__dirname)));

// Passport 시리얼라이즈 설정
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// multer 설정
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 업로드 디렉토리 생성
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 네이버 로그인 라우트
app.get('/auth/naver',
  passport.authenticate('naver'));

app.get('/auth/naver/callback',
  passport.authenticate('naver', { failureRedirect: '/' }),
  function(req, res) {
    req.session.favorites = req.user.favorites || [];
    if (!req.user.nickname) {
      res.redirect('/set-nickname.html'); // 닉네임 설정 페이지로 리디렉션
    } else {
      res.redirect('/'); // 메인 페이지로 리디렉션
    }
  });

// 로그아웃 라우트
app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.error('로그아웃 오류:', err);
      return res.status(500).json({ error: '로그아웃 도중 오류가 발생했습니다.' });
    }
    res.redirect('/');
  });
});

// 인증 상태 체크 미들웨어
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

// 기본 라우트 설정
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

app.get('/isAuthenticated', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true, user: req.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});






// GET endpoint to fetch drive posts
app.get('/api/drive-posts', (req, res) => {
  const query = 'SELECT * FROM drive_posts';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching drive posts:', err);
          res.status(500).json({ success: false, error: 'Failed to fetch drive posts' });
      } else {
          res.status(200).json({ success: true, posts: results });
      }
  });
});

// POST endpoint to add a drive post
app.post('/api/drive-posts', (req, res) => {
  const { nickname, gender, age, description } = req.body;
  const insertQuery = 'INSERT INTO drive_posts (nickname, gender, age, description) VALUES (?, ?, ?, ?)';
  const values = [nickname, gender, age, description];
  db.query(insertQuery, values, (err, result) => {
      if (err) {
          console.error('Error inserting drive post:', err);
          res.status(500).json({ success: false, error: 'Failed to insert drive post' });
      } else {
          res.status(201).json({ success: true, message: 'Drive post inserted successfully' });
      }
  });
});




// 게시물 댓글 추가 API
app.post('/api/drive-posts/:id/comment', (req, res) => {
  const postId = req.params.id;
  const { author, comment } = req.body;

  if (!author || !comment) {
      return res.status(400).json({ success: false, error: '작성자와 댓글 내용을 모두 입력해 주세요.' });
  }

  const sql = "INSERT INTO drive_post_comments (post_id, author, comment) VALUES (?, ?, ?)";
  db.query(sql, [postId, author, comment], (err, result) => {
      if (err) {
          console.error('댓글 저장 오류:', err);
          return res.status(500).json({ success: false, error: '댓글 저장 중 오류가 발생했습니다.' });
      }
      res.json({ success: true, comment: { id: result.insertId, author, comment } });
  });
});






app.post('/api/posts', upload.single('image'), (req, res) => {
    const { title, author, content } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = "INSERT INTO posts (title, author, content, image_url) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, author, content, imageUrl], (err, result) => {
        if (err) {
            console.error('게시물 저장 오류:', err);
            return res.status(500).json({ success: false, error: '게시물 저장 중 오류가 발생했습니다.' });
        }
        res.json({ success: true, post: { id: result.insertId, title, author, content, image_url: imageUrl, likes: 0 } });
    });
});

// 게시물 댓글 추가 API
app.post('/api/posts/:id/comment', (req, res) => {
  const postId = req.params.id;
  const { author, comment } = req.body;

  if (!author || !comment) {
      return res.status(400).json({ success: false, error: '작성자와 댓글 내용을 모두 입력해 주세요.' });
  }

  const sql = "INSERT INTO comments (post_id, author, comment) VALUES (?, ?, ?)";
  db.query(sql, [postId, author, comment], (err, result) => {
      if (err) {
          console.error('댓글 저장 오류:', err);
          return res.status(500).json({ success: false, error: '댓글 저장 중 오류가 발생했습니다.' });
      }
      res.json({ success: true, comment: { id: result.insertId, author, comment } });
  });
});

app.get('/api/posts/:postId/comments', (req, res) => {
  const postId = req.params.postId;
  const query = 'SELECT author, comment FROM comments WHERE post_id = ?';
  
  db.query(query, [postId], (error, results) => {
      if (error) {
          console.error('Error fetching comments:', error);
          res.status(500).json({ error: 'Error fetching comments' });
      } else {
          res.json(results);
      }
  });
});

// 닉네임 설정 API

// 닉네임 중복 확인 엔드포인트
app.post('/api/check-nickname', (req, res) => {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: '닉네임을 입력해주세요.' });
  }
  
  const sql = "SELECT * FROM users WHERE nickname = ?";
  db.query(sql, [nickname], (err, results) => {
      if (err) {
          console.error('닉네임 중복 확인 오류:', err);
          return res.status(500).json({ error: '서버 오류로 인해 닉네임을 확인할 수 없습니다.' });
      }
  
      if (results.length > 0) {
          res.json({ exists: true });
      } else {
          res.json({ exists: false });
      }
  });
  
});

// 닉네임 설정 엔드포인트
app.post('/api/set-nickname', (req, res) => {
  const { nickname } = req.body;

  if (!nickname) {
      return res.status(400).json({ success: false, error: '닉네임을 입력해주세요.' });
  }

  const sql = "UPDATE users SET nickname = ? WHERE naver_id = ?";
  db.query(sql, [nickname, req.user.id], (err, results) => {
      if (err) {
          console.error('닉네임 저장 오류:', err);
          return res.status(500).json({ success: false, error: '닉네임을 저장하는 도중 오류가 발생했습니다.' });
      }

        console.log('닉네임 설정 완료:', nickname);
      req.user.nickname = nickname; // 세션 사용자 정보 업데이트
      res.json({ success: true });
  });
});

// 인기 게시물 API
app.get('/api/popular-posts', function(req, res) {
  db.query('SELECT * FROM posts ORDER BY likes DESC, created_at DESC LIMIT 3', function(err, results) {
    if (err) {
      console.error('인기 게시물 조회 오류:', err);
      return res.status(500).json({ error: '인기 게시물을 가져오는 도중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});

// 일반 게시물 API
app.get('/api/posts', function(req, res) {
  db.query('SELECT * FROM posts ORDER BY created_at DESC', function(err, results) {
    if (err) {
      console.error('게시물 조회 오류:', err);
      return res.status(500).json({ error: '게시물을 가져오는 도중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});

// 특정 게시물 조회 API
app.get('/api/posts/:id', function(req, res) {
  const postId = req.params.id;
  db.query('SELECT * FROM posts WHERE id = ?', [postId], function(err, results) {
    if (err) {
      console.error('게시물 조회 오류:', err);
      return res.status(500).json({ error: '게시물을 가져오는 도중 오류가 발생했습니다.' });
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    }
  });
});


// 좋아요 추가 API
app.post('/api/posts/:id/like', isAuthenticated, function(req, res) {
  const postId = req.params.id;
  db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId], function(err, results) {
      if (err) {
          console.error('좋아요 추가 오류:', err);
          return res.status(500).json({ error: '좋아요 추가 중 오류가 발생했습니다.' });
      }
      res.json({ success: true });
  });
});

app.post('/api/posts/:id/unlike', isAuthenticated, function(req, res) {
  const postId = req.params.id;
  db.query('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId], function(err, results) {
      if (err) {
          console.error('좋아요 제거 오류:', err);
          return res.status(500).json({ error: '좋아요 제거 중 오류가 발생했습니다.' });
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
