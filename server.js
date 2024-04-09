const express = require('express');
const path = require('path');
const app = express();
const dotenv = require('dotenv');

dotenv.config();

// 정적 파일 제공을 위한 미들웨어를 추가합니다.
app.use(express.static(path.join(__dirname)));

// '/api/keys' 경로에 대한 GET 요청을 처리합니다.
app.get('/api/keys', (req, res) => {
  res.json({ 
    apiKeyMap: process.env.OPENAPI_KEY_MAP, 
    apiKeyRealTimeTraffic: process.env.OPENAPI_KEY_REALTIMETRAFFIC 
  });
});

// '/' 경로에 대한 GET 요청을 처리합니다.
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

// 서버를 8080 포트에서 시작합니다.
app.listen(8080, function() {
  console.log('Server is listening on port 8080');
});
