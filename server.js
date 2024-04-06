const express = require('express');
const app = express();

app.listen(8080, function(){
    console.log('listening on 8080');
});

app.get('/', function(요청, 응답){
    응답.sendfile(__dirname + '/index.html');
});