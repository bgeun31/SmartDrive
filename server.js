const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const NaverStrategy = require('passport-naver').Strategy;

dotenv.config();

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

// 네이버 전략 설정
passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/naver/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

// 네이버 로그인 라우트
app.get('/auth/naver',
  passport.authenticate('naver'));

app.get('/auth/naver/callback',
  passport.authenticate('naver', { failureRedirect: '/' }),
  function(req, res) {
    // 성공 시 리디렉션할 경로
    // 사용자의 즐겨찾기 정보를 세션에 저장
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

// 사용자 정보 미들웨어
app.use(function(req, res, next) {
  res.locals.user = req.user;
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.favorites = req.session.favorites || [];
  next();
});

// 인증 상태 체크 라우트
app.get('/isAuthenticated', (req, res) => {
  res.json({ isAuthenticated: req.isAuthenticated() });
});

// 기본 라우트 설정
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/map', function(req, res) {
  res.sendFile(path.join(__dirname, 'map.html'));
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

// 서버 시작
app.listen(8080, function() {
  console.log('Server is listening on port 8080');
});
