※ 프로젝트 실행 방법
1. 파일 다운로드
- git clone을 이용하여 파일을 내려 받는다.

2. Node.js 다운로드
- https://nodejs.org/en
- 위 사이트에서 node.js를 다운로드 받는다.

3. Visual Studio Code 다운로드
https://code.visualstudio.com/
- 위 사이트에서 Visual Studio Code를 다운로드 받는다.

4. .env 파일 추가
- 클론 받은 파일 폴더를 Visual Studio code에서 열어서 .env 파일을 생성하고 
아래 코드를 적은 후 파일을 저장한다.

NAVER_CLIENT_ID=mkpczSU0Gn7IEO6te44b
NAVER_CLIENT_SECRET=d3MHfBcvbO
MAP_CLIENT_ID=3n3v7ntkle
MAP_CLIENT_SECRET=c9xc0vQECxIbZS0s4Fh2DoYXfxHXV1dCPpKlsTig
WEATHER_API_KEY=saTwxWgl1YrJ0Ouujsyi3rnajPCoXnYbaaWnAsbSC+KjQ3D3cIYezX5Z12MfMmvbj3fM3QpLXdT8IYn49H0vOg==

5. 데이터베이스 구성
- https://dev.mysql.com/downloads/
- 위 사이트에서 Mysql Community server을 먼저 다운로드 받고 Mysql WorkBanch를 다운로드 받는다.
- WorkBanch에서 아래의 코드를 순차적으로 입력한다.
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
CREATE DATABASE smart_drive;

USE smart_drive;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    naver_id VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    profile_image VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
CREATE DATABASE IF NOT EXISTS smart_drive;

USE smart_drive;

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    comment TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
);
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
CREATE TABLE `drive_posts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nickname` VARCHAR(50) NOT NULL,
  `gender` VARCHAR(10) NOT NULL,
  `age` INT NOT NULL,
  `description` TEXT,
  PRIMARY KEY (`id`)
);
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
ALTER TABLE `posts`
ADD COLUMN `likes` INT DEFAULT 0;
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
CREATE TABLE `drive_post_comments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `post_id` INT NOT NULL,
  `author` VARCHAR(50) NOT NULL,
  `comment` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`post_id`) REFERENCES `drive_posts`(`id`) ON DELETE CASCADE
);
ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ

6. 서버 실행
- Visual Studio Code에서 터미널(Terminal)을 열어서
node server.js 명령어를 입력한다.

7. 정상작동 콘솔 메시지
- 아래와 같은 메시지가 콘솔에 출력되면 정상적으로 서버가 열렸다는 메시지이다.

Server is listening on port 8080
MySQL Connected...

8. 웹 사이트 접속
- 인터넷(크롬)을 열고 주소를 localhost:8080 으로 접속하면 웹 사이트를 이용할 수 있다.


