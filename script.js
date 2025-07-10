// HTML 요소들을 JavaScript에서 사용하기 위해 가져옵니다.
const qrVideo = document.getElementById('qr-video');
const qrResult = document.getElementById('qr-result');
const stampImages = document.querySelectorAll('.stamp'); // 모든 스탬프 이미지 (hidden 클래스 가진 것들)
const resetButton = document.getElementById('reset-button');
const adminModeButton = document.getElementById('admin-mode-button'); // 관리자 모드 버튼 (아직 기능 없음)

// QR 스캔 라이브러리 (jsQR)를 사용하기 위한 변수
// jsQR 라이브러리는 아래 코드에서 CDN으로 동적으로 로드됩니다.

// --- QR 코드 유효성 검사를 위한 비밀 값들 ---
// 중요: 이 값들은 클라이언트 코드에 노출되므로, 매우 높은 보안이 필요할 경우 서버에서 관리해야 합니다.
// 현재는 간단한 프로젝트를 위한 보안 강화책으로 사용합니다.
const VALID_QR_PREFIX = "MY_STAMP_APP:"; // 우리가 발급한 QR 코드에만 있을 고유 접두사
const VALID_SECRET_SUFFIX = ":SCHOOL_SECRET_KEY_A"; // 모든 유효한 QR 코드에 포함될 비밀 접미사 (선택 사항)
// 이 'SCHOOL_SECRET_KEY_A' 값은 여러분이 QR 코드를 생성할 때 사용한 값과 동일해야 합니다!
// ---------------------------------------------


// --- 웹캠 시작 함수 ---
async function startWebcam() {
    try {
        // 사용자에게 웹캠 접근 권한을 요청합니다.
        // { video: { facingMode: 'environment' } } 는 후면 카메라를 우선 사용하라는 의미입니다.
        // 전면 카메라를 원하면 'user'로 설정하거나, 특정 해상도 등 더 자세한 설정을 할 수 있습니다.
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        
        qrVideo.srcObject = stream; // 웹캠 스트림을 비디오 요소에 연결
        qrVideo.setAttribute('playsinline', true); // iOS에서 자동 재생되도록 설정 (모바일 호환성)
        qrVideo.play(); // 비디오 재생 시작

        qrResult.textContent = 'QR 코드를 스캔 중...';

        // jsQR 라이브러리가 로드되었는지 확인 후 스캔 시작
        if (typeof jsQR !== 'undefined') {
            requestAnimationFrame(tick); // 다음 프레임에서 tick 함수 호출
        } else {
            console.warn('jsQR 라이브러리가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
            setTimeout(() => requestAnimationFrame(tick), 500); // 0.5초 후 다시 시도
        }

    } catch (err) {
        console.error('웹캠 접근 오류:', err);
        qrResult.textContent = '웹캠을 시작할 수 없습니다. 카메라 권한을 확인해주세요.';
        alert('웹캠 접근에 실패했습니다. 카메라 권한을 허용했는지 확인하고 새로고침해주세요.');
    }
}

// --- QR 코드 스캔 로직 (jsQR 라이브러리 사용) ---
function tick() {
    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
        // 비디오 프레임이 충분히 로드되었을 때만 스캔
        const canvas = document.createElement('canvas'); // 임시 캔버스 생성
        const context = canvas.getContext('2d');

        canvas.width = qrVideo.videoWidth;
        canvas.height = qrVideo.videoHeight;
        context.drawImage(qrVideo, 0, 0, canvas.width, canvas.height); // 비디오 프레임을 캔버스에 그림

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // jsQR 라이브러리를 사용하여 QR 코드 스캔
        // inversionAttempts: 'dontInvert'는 QR 코드 색상 반전 시도를 안 함 (정확도 향상)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert', 
        });

        if (code) {
            // QR 코드를 찾았을 때
            console.log('QR 코드 스캔 성공:', code.data);
            qrResult.textContent = `스캔 성공: ${code.data}`;
            processQRData(code.data); // 스캔된 데이터 처리 함수 호출
            
            // 스캔 성공 후 잠시 스캔 중지 (반복 스캔 방지)
            qrVideo.pause();
            // 3초 후 다시 스캔 시작
            setTimeout(() => {
                qrVideo.play();
                qrResult.textContent = 'QR 코드를 스캔 중...';
                requestAnimationFrame(tick);
            }, 3000); // 3초 후에 다시 스캔 루프 시작

        } else {
            // QR 코드를 찾지 못했을 때
            qrResult.textContent = 'QR 코드를 스캔 중...';
            requestAnimationFrame(tick); // 다음 프레임에서 계속 스캔 시도
        }
    } else {
        requestAnimationFrame(tick); // 비디오 데이터가 준비될 때까지 기다림
    }
}

// --- 스캔된 QR 데이터 처리 함수 ---
function processQRData(data) {
    console.log("스캔된 원본 QR 데이터:", data);

    // 1. QR 코드 데이터가 우리가 정한 유효한 접두사 (VALID_QR_PREFIX)를 가지고 있는지 확인
    if (!data.startsWith(VALID_QR_PREFIX)) {
        qrResult.textContent = '❌ 유효하지 않은 스탬프 QR 코드입니다. (접두사 불일치)';
        console.warn('유효하지 않은 QR 코드 스캔: 접두사 불일치', data);
        return; // 유효하지 않으면 함수 종료
    }

    // 2. 유효한 접두사 뒤의 실제 데이터만 추출합니다.
    let actualData = data.substring(VALID_QR_PREFIX.length);

    // 3. (선택 사항) 비밀 접미사 (VALID_SECRET_SUFFIX)가 있는지 확인하고 제거합니다.
    // 이 부분이 없으면 QR 코드 내용을 'MY_STAMP_APP:1반'까지만 해도 됩니다.
    if (VALID_SECRET_SUFFIX && !actualData.endsWith(VALID_SECRET_SUFFIX)) {
        qrResult.textContent = '❌ 유효하지 않은 스탬프 QR 코드입니다. (보안 키 불일치)';
        console.warn('유효하지 않은 QR 코드 스캔: 보안 키 불일치', data);
        return; // 유효하지 않으면 함수 종료
    }
    if (VALID_SECRET_SUFFIX) {
        actualData = actualData.substring(0, actualData.length - VALID_SECRET_SUFFIX.length);
    }
    
    console.log("처리할 실제 데이터:", actualData); // 유효성 검사 후 남은 순수 데이터


    // 4. 추출된 실제 데이터에서 '반' 정보 찾기 (예: "1반", "2반" 형식)
    const classNumberMatch = actualData.match(/(\d+)반/); // 정규식으로 "숫자반" 형식 찾기

    if (classNumberMatch && classNumberMatch[1]) {
        const classNumber = parseInt(classNumberMatch[1]); // 숫자 부분만 추출 (예: '1')

        // 반 번호가 유효한 범위(1~10) 내에 있는지 확인
        if (classNumber >= 1 && classNumber <= 10) {
            // stampImages는 0부터 9까지의 인덱스를 가지므로 classNumber에서 1을 웁니다.
            const stampIndex = classNumber - 1; 

            if (stampImages[stampIndex]) {
                // 스탬프가 아직 찍히지 않은 경우에만 처리
                if (stampImages[stampIndex].classList.contains('hidden')) {
                    stampImages[stampIndex].classList.remove('hidden'); // hidden 클래스 제거 (스탬프 보이게 함)
                    // 스탬프가 찍혔다는 것을 로컬 스토리지에 저장 (브라우저 닫아도 유지)
                    localStorage.setItem(`class${classNumber}_stamped`, 'true');
                    qrResult.textContent = `✅ ${classNumber}반 스탬프가 찍혔습니다!`;
                    console.log(`${classNumber}반 스탬프가 찍혔습니다.`);
                } else {
                    // 이미 스탬프가 찍힌 경우
                    qrResult.textContent = `☑️ ${classNumber}반 스탬프는 이미 찍혔습니다.`;
                    console.log(`${classNumber}반 스탬프는 이미 찍혔습니다.`);
                }
            } else {
                qrResult.textContent = '스탬프 요소를 찾을 수 없습니다. (HTML 구조 확인)';
            }
        } else {
            qrResult.textContent = '⛔ 유효하지 않은 반 정보입니다. (1~10반만 가능)';
        }
    } else {
        qrResult.textContent = '❓ 알 수 없는 QR 코드 형식입니다. (예: "1반" 형식이어야 함)';
    }
}

// --- 스탬프 초기화 함수 ---
function resetStamps() {
    // 사용자에게 초기화 여부 확인
    if (confirm('모든 스탬프를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        stampImages.forEach(stamp => {
            stamp.classList.add('hidden'); // 모든 스탬프에 hidden 클래스 추가 (숨기기)
        });
        // 로컬 스토리지에서도 스탬프 정보 삭제
        for (let i = 1; i <= 10; i++) {
            localStorage.removeItem(`class${i}_stamped`);
        }
        qrResult.textContent = '모든 스탬프가 초기화되었습니다.';
        console.log('모든 스탬프 초기화 완료.');
    }
}

// --- 페이지 로드 시 스탬프 상태 복원 함수 ---
function loadStampState() {
    for (let i = 1; i <= 10; i++) {
        // 로컬 스토리지에 해당 반 스탬프 정보가 'true'로 저장되어 있으면
        if (localStorage.getItem(`class${i}_stamped`) === 'true') {
            const stampIndex = i - 1;
            if (stampImages[stampIndex]) {
                stampImages[stampIndex].classList.remove('hidden'); // 숨김 클래스 제거하여 보이게 함
            }
        }
    }
}

// --- 이벤트 리스너 연결 ---
// 웹 페이지의 모든 요소가 로드되면 실행됩니다.
window.addEventListener('load', () => {
    loadStampState(); // 페이지 로드 시 이전에 찍힌 스탬프 상태를 복원합니다.
    startWebcam(); // 웹캠을 시작합니다.
});

// '스탬프 초기화' 버튼에 클릭 이벤트 리스너 연결
resetButton.addEventListener('click', resetStamps);

// '관리자 모드' 버튼 (현재는 기능 없음, 추후 추가 가능)
adminModeButton.addEventListener('click', () => {
    alert('관리자 모드 기능은 아직 구현되지 않았습니다.');
    // 여기에 비밀번호 입력창을 띄우고, 비밀번호가 맞으면 모든 스탬프를 채우는 기능을 추가할 수 있습니다.
});


// --- jsQR 라이브러리 동적 로드 ---
// jsQR 라이브러리는 QR 코드 스캔 기능을 제공합니다.
// HTML <head> 태그에 <script src="..."> 로 직접 추가해도 되지만, 여기서는 JavaScript에서 동적으로 로드합니다.
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.0.0/dist/jsQR.min.js'; // jsQR 라이브러리 CDN 주소
script.onload = () => {
    console.log('jsQR 라이브러리 로드 완료');
    // jsQR 로드 완료 후 웹캠이 제대로 시작되지 않았다면 여기서 다시 시작을 시도할 수 있습니다.
    // (startWebcam이 window.onload에서 호출되므로 보통은 필요 없습니다.)
};
document.head.appendChild(script); // <head> 태그 안에 스크립트를 추가합니다.