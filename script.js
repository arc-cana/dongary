
// HTML 요소들을 JavaScript에서 사용하기 위해 가져옵니다.
const qrVideo = document.getElementById('qr-video');
const qrResult = document.getElementById('qr-result');
const stampImages = document.querySelectorAll('.stamp'); // 모든 스탬프 이미지 (hidden 클래스 가진 것들)

// QR 스캔 라이브러리 (jsQR)를 사용하기 위한 변수

// --- QR 코드 유효성 검사를 위한 비밀 값들 ---
const VALID_QR_PREFIX = "MY_STAMP_APP:";
const VALID_SECRET_SUFFIX = ":SCHOOL_SECRET_KEY_A"; // QR 코드 생성 시 사용한 키와 동일해야 합니다!
// ---------------------------------------------

// --- 관리자 모드 관련 설정 ---
const ADMIN_QR_CODE_DATA = "ADMIN_QR_APP:ACTIVATE_ADMIN"; // **관리자 모드 활성화용 QR 코드 내용 (비밀!)**
// ADMIN_PASSWORD 변수는 이제 없습니다. QR 스캔만으로 진입.

// 마스터 키와 각 반의 비밀번호를 설정하세요! (4자리 숫자)
const MASTER_KEY = "1234"; // **마스터 키 (4자리 숫자) - 10반 제어 버튼에서 입력**
const CLASS_PASSWORDS = { // **각 반별 비밀번호 (4자리 숫자) - 20개 반 모두 설정**
    '1': "1111", '2': "2222", '3': "3333", '4': "4444", '5': "5555",
    '6': "6666", '7': "7777", '8': "8888", '9': "9999", '10': "0000",
    '11': "0001", '12': "0002", '13': "0003", '14': "0004", '15': "0005",
    '16': "0006", '17': "0007", '18': "0008", '19': "0009", '20': "0010"
};
const TOTAL_CLASSES = 20; // 총 반 개수 설정

let isAdminMode = false; // 관리자 모드 상태 변수
let isMasterMode = false; // 마스터 모드 상태 변수 (10반 비밀번호 칸에서 마스터 키 입력 시 활성화)

// --- 웹캠 시작 함수 ---
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        
        qrVideo.srcObject = stream;
        qrVideo.setAttribute('playsinline', true);
        qrVideo.play();

        qrResult.textContent = 'QR 코드를 스캔 중...';

        if (typeof jsQR !== 'undefined') {
            requestAnimationFrame(tick);
        } else {
            console.warn('jsQR 라이브러리가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
            setTimeout(() => requestAnimationFrame(tick), 500);
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
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = qrVideo.videoWidth;
        canvas.height = qrVideo.videoHeight;
        context.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert', 
        });

        if (code) {
            console.log('QR 코드 스캔 성공:', code.data);
            qrResult.textContent = `스캔 성공: ${code.data}`;
            
            // --- 여기에서 관리자 QR 코드인지 먼저 확인 (비밀번호 확인 없이 바로 진입) ---
            if (code.data === ADMIN_QR_CODE_DATA) {
                isAdminMode = true;
                alert('관리자 모드에 진입했습니다.');
                showAdminControls(); // 관리자 컨트롤 표시
            } else {
                // 일반 QR 코드 스캔 로직 실행
                processQRData(code.data);
            }
            
            qrVideo.pause(); // QR 스캔 성공 시 잠시 멈춤
            // 관리자 모드가 활성화되었으면 스캔을 재시작하지 않음
            // 일반 QR코드 스캔 성공 시에만 일정 시간 후 재시작
            if (!isAdminMode) {
                setTimeout(() => {
                    qrVideo.play();
                    qrResult.textContent = 'QR 코드를 스캔 중...';
                    requestAnimationFrame(tick);
                }, 3000); // 3초 후 재스캔 시작
            }

        } else {
            // 관리자 모드가 아닐 때만 계속 스캔 시도
            if (!isAdminMode) {
                qrResult.textContent = 'QR 코드를 스캔 중...';
                requestAnimationFrame(tick);
            }
        }
    } else {
        // 관리자 모드가 아닐 때만 계속 스캔 시도
        if (!isAdminMode) {
            requestAnimationFrame(tick);
        }
    }
}

// --- 스캔된 QR 데이터 처리 함수 ---
function processQRData(data) {
    console.log("스캔된 원본 QR 데이터:", data);

    if (!data.startsWith(VALID_QR_PREFIX)) {
        qrResult.textContent = '❌ 유효하지 않은 스탬프 QR 코드입니다.';
        console.warn('유효하지 않은 QR 코드 스캔', data);
        return;
    }

    let actualData = data.substring(VALID_QR_PREFIX.length);

    if (VALID_SECRET_SUFFIX && !actualData.endsWith(VALID_SECRET_SUFFIX)) {
        qrResult.textContent = '❌ 유효하지 않은 스탬프 QR 코드입니다. (보안 키 불일치)';
        console.warn('유효하지 않은 QR 코드 스캔: 보안 키 불일치', data);
        return;
    }
    if (VALID_SECRET_SUFFIX) {
        actualData = actualData.substring(0, actualData.length - VALID_SECRET_SUFFIX.length);
    }
    
    console.log("처리할 실제 데이터:", actualData);

    const classNumberMatch = actualData.match(/(\d+)반/);

    if (classNumberMatch && classNumberMatch[1]) {
        const classNumber = parseInt(classNumberMatch[1]);

        if (classNumber >= 1 && classNumber <= TOTAL_CLASSES) { // 총 반 개수 반영
            const stampIndex = classNumber - 1; 

            if (stampImages[stampIndex]) {
                if (stampImages[stampIndex].classList.contains('hidden')) {
                    stampImages[stampIndex].classList.remove('hidden');
                    localStorage.setItem(`class${classNumber}_stamped`, 'true');
                    qrResult.textContent = `✅ ${classNumber}반 스탬프가 찍혔습니다!`;
                    console.log(`${classNumber}반 스탬프가 찍혔습니다.`);
                } else {
                    qrResult.textContent = `☑️ ${classNumber}반 스탬프는 이미 찍혔습니다.`;
                    console.log(`${classNumber}반 스탬프는 이미 찍혔습니다.`);
                }
            } else {
                qrResult.textContent = '스탬프 요소를 찾을 수 없습니다. (HTML 구조 확인)';
            }
        } else {
            qrResult.textContent = `⛔ 유효하지 않은 반 정보입니다. (1~${TOTAL_CLASSES}반만 가능)`; // 메시지 수정
        }
    } else {
        qrResult.textContent = '❓ 알 수 없는 QR 코드 형식입니다. (예: "1반" 형식이어야 함)';
    }
}

// --- 모든 스탬프 초기화 함수 (이제 관리자 모드에서만 사용) ---
function resetAllStamps() {
    if (confirm('경고: 모든 스탬프를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        stampImages.forEach(stamp => {
            stamp.classList.add('hidden');
        });
        for (let i = 1; i <= TOTAL_CLASSES; i++) { // 총 반 개수 반영
            localStorage.removeItem(`class${i}_stamped`);
        }
        qrResult.textContent = '모든 스탬프가 초기화되었습니다.';
        console.log('모든 스탬프 초기화 완료.');
    }
}

// --- 페이지 로드 시 스탬프 상태 복원 함수 ---
function loadStampState() {
    for (let i = 1; i <= TOTAL_CLASSES; i++) { // 총 반 개수 반영
        if (localStorage.getItem(`class${i}_stamped`) === 'true') {
            const stampIndex = i - 1;
            if (stampImages[stampIndex]) {
                stampImages[stampIndex].classList.remove('hidden');
            }
        }
    }
}

// --- 관리자 모드 관련 함수들 ---

// 관리자 컨트롤을 표시하는 함수 (QR 스캔으로 활성화 후 바로 표시)
function showAdminControls() {
    const controlsDiv = document.querySelector('.controls');
    controlsDiv.innerHTML = ''; // 기존 버튼들 제거 (일반 모드에 버튼이 없으므로 비어있을 것)

    // 각 반 스탬프 제어 버튼 (1반부터 TOTAL_CLASSES까지)
    for (let i = 1; i <= TOTAL_CLASSES; i++) { // 총 반 개수 반영
        const classButton = document.createElement('button');
        classButton.textContent = `${i}반 스탬프 제어`;
        classButton.classList.add('class-control-button');
        classButton.dataset.class = i;
        classButton.addEventListener('click', handleClassStampControl);
        controlsDiv.appendChild(classButton);
    }
    
    // 관리자 모드 종료 버튼
    const exitAdminButton = document.createElement('button');
    exitAdminButton.textContent = '관리자 모드 종료';
    exitAdminButton.addEventListener('click', exitAdminMode);
    controlsDiv.appendChild(exitAdminButton);

    qrResult.textContent = '관리자 모드: 원하는 반을 선택하세요.';
    qrVideo.pause(); // 관리자 모드에서는 스캔 중지
}

// 마스터 권한일 때만 보이는 버튼을 표시하는 함수
function showMasterControls() {
    isMasterMode = true; // 마스터 모드 활성화
    const controlsDiv = document.querySelector('.controls');
    controlsDiv.innerHTML = ''; // 모든 반 제어 버튼 제거

    qrResult.textContent = 'MASTER KEY 활성화: 모든 스탬프를 제어할 수 있습니다.';

    // 모든 스탬프 채우기 버튼
    const fillAllButton = document.createElement('button');
    fillAllButton.textContent = '모든 스탬프 채우기';
    fillAllButton.addEventListener('click', fillAllStamps);
    controlsDiv.appendChild(fillAllButton);

    // 모든 스탬프 초기화 버튼
    const masterResetButton = document.createElement('button');
    masterResetButton.textContent = '모든 스탬프 초기화';
    masterResetButton.addEventListener('click', resetAllStamps);
    controlsDiv.appendChild(masterResetButton);

    // 마스터 모드 종료 버튼
    const exitMasterButton = document.createElement('button');
    exitMasterButton.textContent = '마스터 모드 종료';
    exitMasterButton.addEventListener('click', exitAdminMode); // 관리자 모드 종료와 동일하게 처리
    controlsDiv.appendChild(exitMasterButton);
}


// 각 반 스탬프 제어 함수 (마스터 키 로직 추가)
function handleClassStampControl(event) {
    const classNumber = event.target.dataset.class;
    const password = prompt(`${classNumber}반 비밀번호를 입력하세요:`);

    // 10반 버튼이고 입력된 비밀번호가 마스터 키와 일치하는 경우 (총 20반이 되어도 10반이 마스터 키 활성화)
    if (classNumber === '10' && password === MASTER_KEY) {
        showMasterControls(); // 마스터 컨트롤 화면으로 전환
        return; // 함수 종료
    }

    // 일반 반 비밀번호 확인 또는 10반 비밀번호 확인
    if (password === CLASS_PASSWORDS[classNumber]) {
        const stampIndex = classNumber - 1;
        const currentStamp = stampImages[stampIndex];

        if (currentStamp) {
            if (currentStamp.classList.contains('hidden')) {
                // 스탬프 찍기
                currentStamp.classList.remove('hidden');
                localStorage.setItem(`class${classNumber}_stamped`, 'true');
                qrResult.textContent = `✅ ${classNumber}반 스탬프가 관리자에 의해 찍혔습니다!`;
                alert(`${classNumber}반 스탬프가 찍혔습니다.`);
                console.log(`${classNumber}반 스탬프 관리자 찍기 완료.`);
            } else {
                // 스탬프 취소하기
                if (confirm(`${classNumber}반 스탬프를 취소하시겠습니까?`)) {
                    currentStamp.classList.add('hidden');
                    localStorage.removeItem(`class${classNumber}_stamped`);
                    qrResult.textContent = `❌ ${classNumber}반 스탬프가 관리자에 의해 취소되었습니다.`;
                    alert(`${classNumber}반 스탬프가 취소되었습니다.`);
                    console.log(`${classNumber}반 스탬프 관리자 취소 완료.`);
                }
            }
        }
    } else {
        alert('비밀번호가 틀렸습니다.');
    }
}


// 모든 스탬프를 채우는 함수 (마스터 키로만 실행 가능)
function fillAllStamps() {
    if (confirm('모든 스탬프를 채우시겠습니까?')) {
        stampImages.forEach((stamp, index) => {
            stamp.classList.remove('hidden');
            localStorage.setItem(`class${index + 1}_stamped`, 'true');
        });
        qrResult.textContent = '모든 스탬프가 채워졌습니다.';
        console.log('모든 스탬프 채우기 완료.');
    }
}

// 관리자 모드 종료 함수 (마스터 모드에서도 사용)
function exitAdminMode() {
    isAdminMode = false;
    isMasterMode = false; // 마스터 모드도 종료
    
    const controlsDiv = document.querySelector('.controls');
    controlsDiv.innerHTML = ''; // 모든 관리자 버튼 제거
    
    // 일반 모드에서는 버튼이 없으므로, 아무것도 다시 추가할 필요가 없습니다.

    loadStampState(); // 스탬프 상태 다시 로드 (UI 동기화)
    qrResult.textContent = '관리자 모드를 종료했습니다. QR 코드를 스캔 중...';
    console.log('관리자 모드 종료.');
    qrVideo.play(); // 웹캠 스캔 다시 시작
    requestAnimationFrame(tick); // 스캔 루프 다시 시작
}


// --- 이벤트 리스너 연결 ---
window.addEventListener('load', () => {
    loadStampState();
    startWebcam();
});

// 기존 일반 사용자용 초기화 버튼 (resetButton) 관련 리스너는 HTML에서 버튼이 제거되었으므로 필요 없습니다.


// --- jsQR 라이브러리 동적 로드 ---
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.0.0/dist/jsQR.min.js';
script.onload = () => {
    console.log('jsQR 라이브러리 로드 완료');
};
document.head.appendChild(script);