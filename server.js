const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const NaverStrategy = require('passport-naver').Strategy;
const mysql = require('mysql2'); // MySQL 연동
const multer = require('multer'); // 파일 업로드를 위한 multer 라이브러리
const fs = require('fs');

dotenv.config(); // 가장 먼저 환경 변수를 로드

// MySQL 연결 설정
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
    db.query(
      'INSERT INTO users (naver_id, nickname, profile_image, email) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname=?, profile_image=?, email=?',
      [id, nickname, profileImage, email, nickname, profileImage, email],
      (err, results) => {
        if (err) throw err;
        return done(null, profile);
      }
    );
  });
}
));

const app = express();

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
    res.redirect('/');
  });

// 로그아웃 라우트
app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) { return next(err); }
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

app.get('/community', function(req, res) {
  res.sendFile(path.join(__dirname, 'community.html'));
});

// 인기 게시물 API
app.get('/api/popular-posts', function(req, res) {
  db.query('SELECT * FROM posts ORDER BY likes DESC, views DESC LIMIT 3', function(err, results) {
    if (err) throw err;
    res.json(results);
  });
});

// 일반 게시물 API
app.get('/api/posts', function(req, res) {
  db.query('SELECT * FROM posts ORDER BY created_at DESC', function(err, results) {
    if (err) throw err;
    res.json(results);
  });
});

// 좋아요 기능 API
app.post('/api/posts/:id/like', function(req, res) {
  const postId = req.params.id;
  db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId], function(err, result) {
    if (err) throw err;
    res.json({ success: true });
  });
});

// 게시글 작성 API
app.post('/api/posts', upload.single('image'), function(req, res) {
  const { title, author, content } = req.body;
  const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
  db.query('INSERT INTO posts (title, author, content, image_url) VALUES (?, ?, ?, ?)', 
    [title, author, content, imageUrl], function(err, result) {
    if (err) throw err;
    res.json({ success: true });
  });
});

// 서버 시작
app.listen(8080, function() {
  console.log('Server is listening on port 8080');
});
