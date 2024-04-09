// 페이지 로드가 완료되면 초기화 함수를 호출합니다.
document.addEventListener('DOMContentLoaded', initializeMap);

// 지도 초기화 함수
function initializeMap() {
  fetchApiKeyAndInitializeMap();
}

// API 키를 가져와서 지도를 초기화하는 함수
function fetchApiKeyAndInitializeMap() {
  fetch('/api/keys') // 서버의 '/api/keys' 경로에 GET 요청을 보냅니다.
    .then(response => {
      if (!response.ok) {
        throw new Error('Error fetching API key');
      }
      return response.json(); // 응답을 JSON 형태로 파싱합니다.
    })
    .then(data => {
      // 응답에서 API 키를 추출합니다.
      const apiKeyMap = data.apiKeyMap;

      // Google Maps API를 호출하고 지도를 초기화합니다.
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyMap}&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    })
    .catch(error => {
      console.error('Error fetching API key:', error.message);
    });
}

// Google Maps API에서 호출될 콜백 함수
function initMap() {
  // 지도를 표시할 위치 설정
  var seoul = { lat: 37.5665, lng: 126.9780 };

  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12, // 확대 수준 설정
    center: seoul // 초기 중심 위치 설정
  });

  // 마커를 생성하여 지도에 추가
  var marker = new google.maps.Marker({
    position: seoul,
    map: map,
    title: '서울'
  });
}
