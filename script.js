// HTML 요소들을 JavaScript에서 사용하기 위해 가져옵니다.
const splashScreen = document.getElementById('splash-screen');
const mainContentScreen = document.getElementById('main-content');
const locationGuideScreen = document.getElementById('location-guide-screen');

const gradeInput = document.getElementById('gradeInput');
const classInput = document.getElementById('classInput');
const numberInput = document.getElementById('numberInput');
const nameInput = document.getElementById('nameInput');
const submitInfoBtn = document.getElementById('submitInfoBtn');
const studentDisplay = document.getElementById('student-display');

const qrVideo = document.getElementById('qr-video');
const qrResult = document.getElementById('qr-result');
const stampImages = document.querySelectorAll('.stamps-grid .stamp'); // 스탬프 이미지 선택자 수정
const showLocationGuideBtn = document.getElementById('showLocationGuideBtn');
const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn');

const controlsDiv = document.querySelector('.controls'); // 관리자 버튼이 들어갈 div
const tenStampsMessage = document.getElementById('ten-stamps-message'); // 10스탬프 메시지 박스
const bestClubInput = document.getElementById('bestClubInput');
const submitBestClubBtn = document.getElementById('submitBestClubBtn');
const bestClubVoteStatus = document.getElementById('bestClubVoteStatus');

// --- QR 코드 유효성 검사를 위한 비밀 값들 ---
const VALID_QR_PREFIX = "MY_STAMP_APP:";
const VALID_SECRET_SUFFIX = ":SCHOOL_SECRET_KEY_A";
// ---------------------------------------------

// --- 관리자 모드 관련 설정 ---
const ADMIN_QR_CODE_DATA = "ADMIN_QR_APP:ACTIVATE_ADMIN";
const MASTER_KEY = "1234";
const CLASS_PASSWORDS = {
    '1': "1111", '2': "2222", '3': "3333", '4': "4444", '5': "5555",
    '6': "6666", '7': "7777", '8': "8888", '9': "9999", '10': "0000",
    '11': "0001", '12': "0002", '13': "0003", '14': "0004", '15': "0005",
    '16': "0006", '17': "0007", '18': "0008", '19': "0009", '20': "0010"
};
const TOTAL_CLASSES = 20;

let isAdminMode = false;
let isMasterMode = false;

// --- 화면 전환 함수 ---
function showScreen(screenToShow) {
    // 모든 화면을 숨깁니다.
    splashScreen.classList.add('hidden');
    mainContentScreen.classList.add('hidden');
    locationGuideScreen.classList.add('hidden');

    // 특정 화면만 보이게 합니다.
    screenToShow.classList.remove('hidden');

    // 화면 전환에 따라 웹캠 상태 관리
    if (screenToShow === mainContentScreen) {
        startWebcam(); // 메인 화면일 때만 웹캠 시작
        loadStampState(); // 스탬프 상태 로드
        checkTenStamps(); // 10개 스탬프 체크
    } else {
        if (qrVideo.srcObject) {
            qrVideo.srcObject.getTracks().forEach(track => track.stop()); // 웹캠 중지
            qrVideo.srcObject = null;
        }
    }
}

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
        // alert('웹캠 접근에 실패했습니다. 카메라 권한을 허용했는지 확인하고 새로고침해주세요.');
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
            
            if (code.data === ADMIN_QR_CODE_DATA) {
                isAdminMode = true;
                alert('관리자 모드에 진입했습니다.');
                showAdminControls();
            } else {
                processQRData(code.data);
            }
            
            qrVideo.pause();
            if (!isAdminMode) {
                setTimeout(() => {
                    qrVideo.play();
                    qrResult.textContent = 'QR 코드를 스캔 중...';
                    requestAnimationFrame(tick);
                }, 3000);
            }

        } else {
            if (!isAdminMode) {
                qrResult.textContent = 'QR 코드를 스캔 중...';
                requestAnimationFrame(tick);
            }
        }
    } else {
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

        if (classNumber >= 1 && classNumber <= TOTAL_CLASSES) {
            const stampIndex = classNumber - 1; 

            if (stampImages[stampIndex]) {
                if (stampImages[stampIndex].classList.contains('hidden')) {
                    stampImages[stampIndex].classList.remove('hidden');
                    localStorage.setItem(`class${classNumber}_stamped`, 'true');
                    qrResult.textContent = `✅ ${classNumber}반 스탬프가 찍혔습니다!`;
                    console.log(`${classNumber}반 스탬프가 찍혔습니다.`);
                    checkTenStamps(); // 스탬프 찍을 때마다 10개 체크
                } else {
                    qrResult.textContent = `☑️ ${classNumber}반 스탬프는 이미 찍혔습니다.`;
                    console.log(`${classNumber}반 스탬프는 이미 찍혔습니다.`);
                }
            } else {
                qrResult.textContent = '스탬프 요소를 찾을 수 없습니다. (HTML 구조 확인)';
            }
        } else {
            qrResult.textContent = `⛔ 유효하지 않은 반 정보입니다. (1~${TOTAL_CLASSES}반만 가능)`;
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
        for (let i = 1; i <= TOTAL_CLASSES; i++) {
            localStorage.removeItem(`class${i}_stamped`);
        }
        qrResult.textContent = '모든 스탬프가 초기화되었습니다.';
        console.log('모든 스탬프 초기화 완료.');
        checkTenStamps(); // 초기화 후 10개 스탬프 체크
    }
}

// --- 페이지 로드 시 스탬프 상태 복원 함수 ---
function loadStampState() {
    for (let i = 1; i <= TOTAL_CLASSES; i++) {
        if (localStorage.getItem(`class${i}_stamped`) === 'true') {
            const stampIndex = i - 1;
            if (stampImages[stampIndex]) {
                stampImages[stampIndex].classList.remove('hidden');
            }
        }
    }
}

// --- 10개 스탬프 획득 시 메시지 표시/숨김 및 투표 기능 ---
function checkTenStamps() {
    let stampedCount = 0;
    for (let i = 1; i <= TOTAL_CLASSES; i++) {
        if (localStorage.getItem(`class${i}_stamped`) === 'true') {
            stampedCount++;
        }
    }

    if (stampedCount >= 10) { // 10개 이상 스탬프를 찍었을 때
        tenStampsMessage.classList.remove('hidden');
        // 투표 상태 불러오기
        const votedClub = localStorage.getItem('bestClubVoted');
        if (votedClub) {
            bestClubVoteStatus.textContent = `✅ 이미 ${votedClub}에 투표했습니다.`;
            bestClubInput.disabled = true;
            submitBestClubBtn.disabled = true;
        } else {
            bestClubVoteStatus.textContent = '아직 투표하지 않았습니다.';
            bestClubInput.disabled = false;
            submitBestClubBtn.disabled = false;
        }
    } else {
        tenStampsMessage.classList.add('hidden');
    }
}

// 투표 버튼 클릭 이벤트
submitBestClubBtn.addEventListener('click', () => {
    const clubName = bestClubInput.value.trim();
    if (clubName) {
        if (confirm(`${clubName}에 투표하시겠습니까? (투표는 한 번만 가능합니다)`)) {
            localStorage.setItem('bestClubVoted', clubName);
            alert(`"${clubName}"에 투표해주셔서 감사합니다!`);
            checkTenStamps(); // 투표 상태 업데이트
        }
    } else {
        alert('투표할 동아리 이름을 입력해주세요.');
    }
});


// --- 관리자 모드 관련 함수들 ---

function showAdminControls() {
    controlsDiv.innerHTML = ''; // 기존 버튼들 제거

    for (let i = 1; i <= TOTAL_CLASSES; i++) {
        const classButton = document.createElement('button');
        classButton.textContent = `${i}반 스탬프 제어`;
        classButton.classList.add('class-control-button');
        classButton.dataset.class = i;
        classButton.addEventListener('click', handleClassStampControl);
        controlsDiv.appendChild(classButton);
    }
    
    const exitAdminButton = document.createElement('button');
    exitAdminButton.textContent = '관리자 모드 종료';
    exitAdminButton.addEventListener('click', exitAdminMode);
    controlsDiv.appendChild(exitAdminButton);

    qrResult.textContent = '관리자 모드: 원하는 반을 선택하세요.';
    qrVideo.pause(); // 관리자 모드에서는 스캔 중지
}

function showMasterControls() {
    isMasterMode = true;
    controlsDiv.innerHTML = '';

    qrResult.textContent = 'MASTER KEY 활성화: 모든 스탬프를 제어할 수 있습니다.';

    const fillAllButton = document.createElement('button');
    fillAllButton.textContent = '모든 스탬프 채우기';
    fillAllButton.addEventListener('click', fillAllStamps);
    controlsDiv.appendChild(fillAllButton);

    const masterResetButton = document.createElement('button');
    masterResetButton.textContent = '모든 스탬프 초기화';
    masterResetButton.addEventListener('click', resetAllStamps);
    controlsDiv.appendChild(masterResetButton);

    const exitMasterButton = document.createElement('button');
    exitMasterButton.textContent = '마스터 모드 종료';
    exitMasterButton.addEventListener('click', exitAdminMode);
    controlsDiv.appendChild(exitMasterButton);
}

function handleClassStampControl(event) {
    const classNumber = event.target.dataset.class;
    const password = prompt(`${classNumber}반 비밀번호를 입력하세요:`);

    if (classNumber === '10' && password === MASTER_KEY) {
        showMasterControls();
        return;
    }

    if (password === CLASS_PASSWORDS[classNumber]) {
        const stampIndex = classNumber - 1;
        const currentStamp = stampImages[stampIndex];

        if (currentStamp) {
            if (currentStamp.classList.contains('hidden')) {
                currentStamp.classList.remove('hidden');
                localStorage.setItem(`class${classNumber}_stamped`, 'true');
                qrResult.textContent = `✅ ${classNumber}반 스탬프가 관리자에 의해 찍혔습니다!`;
                alert(`${classNumber}반 스탬프가 찍혔습니다.`);
                console.log(`${classNumber}반 스탬프 관리자 찍기 완료.`);
                checkTenStamps(); // 스탬프 변경 후 10개 스탬프 체크
            } else {
                if (confirm(`${classNumber}반 스탬프를 취소하시겠습니까?`)) {
                    currentStamp.classList.add('hidden');
                    localStorage.removeItem(`class${classNumber}_stamped`);
                    qrResult.textContent = `❌ ${classNumber}반 스탬프가 관리자에 의해 취소되었습니다.`;
                    alert(`${classNumber}반 스탬프가 취소되었습니다.`);
                    console.log(`${classNumber}반 스탬프 관리자 취소 완료.`);
                    checkTenStamps(); // 스탬프 변경 후 10개 스탬프 체크
                }
            }
        }
    } else {
        alert('비밀번호가 틀렸습니다.');
    }
}

function fillAllStamps() {
    if (confirm('모든 스탬프를 채우시겠습니까?')) {
        stampImages.forEach((stamp, index) => {
            stamp.classList.remove('hidden');
            localStorage.setItem(`class${index + 1}_stamped`, 'true');
        });
        qrResult.textContent = '모든 스탬프가 채워졌습니다.';
        console.log('모든 스탬프 채우기 완료.');
        checkTenStamps(); // 모든 스탬프 채운 후 10개 스탬프 체크
    }
}

function exitAdminMode() {
    isAdminMode = false;
    isMasterMode = false;
    
    controlsDiv.innerHTML = ''; 

    loadStampState();
    qrResult.textContent = '관리자 모드를 종료했습니다. QR 코드를 스캔 중...';
    console.log('관리자 모드 종료.');
    qrVideo.play();
    requestAnimationFrame(tick);
}


// --- 이벤트 리스너 연결 ---
submitInfoBtn.addEventListener('click', () => {
    const grade = gradeInput.value;
    const classNum = classInput.value;
    const number = numberInput.value;
    const name = nameInput.value.trim();

    if (grade && classNum && number && name) {
        localStorage.setItem('studentGrade', grade);
        localStorage.setItem('studentClass', classNum);
        localStorage.setItem('studentNumber', number);
        localStorage.setItem('studentName', name);
        studentDisplay.textContent = `학번: ${grade}학년 ${classNum}반 ${number}번 | 이름: ${name}`;
        showScreen(mainContentScreen);
    } else {
        alert('모든 정보를 입력해주세요.');
    }
});

showLocationGuideBtn.addEventListener('click', () => {
    showScreen(locationGuideScreen);
});

closeLocationGuideBtn.addEventListener('click', () => {
    showScreen(mainContentScreen);
});


// 초기 로드 시 스플래시 화면 표시 (스탬프 상태 로드는 mainContentScreen 표시될 때 진행)
window.addEventListener('load', () => {
    // 저장된 학생 정보가 있으면 바로 메인 화면으로, 없으면 스플래시 화면으로
    if (localStorage.getItem('studentGrade') && localStorage.getItem('studentName')) {
        const grade = localStorage.getItem('studentGrade');
        const classNum = localStorage.getItem('studentClass');
        const number = localStorage.getItem('studentNumber');
        const name = localStorage.getItem('studentName');
        studentDisplay.textContent = `학번: ${grade}학년 ${classNum}반 ${number}번 | 이름: ${name}`;
        showScreen(mainContentScreen);
    } else {
        showScreen(splashScreen);
    }
});