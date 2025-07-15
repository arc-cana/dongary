// Firebase Realtime Database 모듈 임포트
import { getDatabase, ref, set, get, update, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// HTML 요소들을 JavaScript에서 사용하기 위해 가져옵니다.
const splashScreen = document.getElementById('splash-screen');
const mainContentScreen = document.getElementById('main-content');
const locationGuideScreen = document.getElementById('location-guide-screen');
const howToPlayScreen = document.getElementById('how-to-play-screen'); // <-- 새로 추가

const gradeInput = document.getElementById('gradeInput');
const classInput = document.getElementById('classInput');
const numberInput = document.getElementById('numberInput');
const nameInput = document.getElementById('nameInput');
const submitInfoBtn = document.getElementById('submitInfoBtn');
const studentDisplay = document.getElementById('student-display');

const qrVideo = document.getElementById('qr-video');
const qrResult = document.getElementById('qr-result');
const stampImages = document.querySelectorAll('.stamps-grid .stamp');
const showLocationGuideBtn = document.getElementById('showLocationGuideBtn');
const showHowToPlayBtn = document.getElementById('showHowToPlayBtn'); // <-- 새로 추가
const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn'); 
const closeHowToPlayBtn = document.getElementById('closeHowToPlayBtn'); // <-- 새로 추가

const controlsDiv = document.querySelector('.controls');
const tenStampsMessage = document.getElementById('ten-stamps-message');
const bestClubInput = document.getElementById('bestClubInput');
const submitBestClubBtn = document.getElementById('submitBestClubBtn');
const bestClubVoteStatus = document.getElementById('bestClubVoteStatus');

// --- Firebase Database 인스턴스 ---
let database; 

// --- QR 코드 유효성 검사를 위한 비밀 값들 ---
const VALID_QR_PREFIX = "MY_STAMP_APP:";
const VALID_SECRET_SUFFIX = ":SCHOOL_SECRET_KEY_A";

// --- 동아리 및 관리자 모드 관련 설정 ---
const TOTAL_CLASSES = 20; 

const CLUB_NAMES = [
    "", 
    "바이오시너지", "네이처", "컴싸", "일취월장", "십시일반",
    "새길", "초아", "그린업", "아트리움", "언로커스",
    "공자", "로직", "사회과학융합탐구", "플라이 어웨이", "specialbooth",
    "동아리16", "동아리17", "동아리18", "동아리19", "동아리20"
];

const ADMIN_QR_CODE_DATA = "ADMIN_QR_APP:ACTIVATE_ADMIN";
const MASTER_KEY = "1234"; 

const CLASS_PASSWORDS = {
    '1': "1111", '2': "2222", '3': "3333", '4': "4444", '5': "5555",
    '6': "6666", '7': "7777", '8': "8888", '9': "9999", '10': "0000",
    '11': "0001", '12': "0002", '13': "0003", '14': "0004", '15': "0005",
    '16': "0006", '17': "0007", '18': "0008", '19': "0009", '20': "0010"
};

let isAdminMode = false;
let isMasterMode = false;
let isScanningPaused = false; 

// --- QR 코드 인식 실패 횟수 및 메시지 관련 변수 ---
let noCodeFoundCount = 0; 
let lastScanAttemptMessage = 'QR 코드를 스캔 중...'; 

// --- 화면 전환 함수 (수정) ---
function showScreen(screenToShow) {
    splashScreen.classList.add('hidden');
    mainContentScreen.classList.add('hidden');
    locationGuideScreen.classList.add('hidden');
    howToPlayScreen.classList.add('hidden'); // <-- 새로 추가

    screenToShow.classList.remove('hidden');

    if (screenToShow === mainContentScreen) {
        if (window.database) {
            database = window.database; 
            isScanningPaused = false; 
            startWebcam(); // 메인 화면 진입 시 웹캠 시작
            loadStampState();
            checkTenStamps();
        } else {
            console.error("Firebase Database가 초기화되지 않았습니다. 잠시 후 다시 시도합니다.");
        }
    } else { 
        // 다른 화면으로 이동 시 웹캠 중지
        if (qrVideo.srcObject) {
            qrVideo.srcObject.getTracks().forEach(track => track.stop());
            qrVideo.srcObject = null;
        }
        isScanningPaused = true; 
    }
}

// --- 웹캠 시작 함수 (수정됨) ---
async function startWebcam() {
    // 기존 스트림이 있다면 완전히 중지하고 해제하여 재시작 준비
    if (qrVideo.srcObject) {
        qrVideo.srcObject.getTracks().forEach(track => track.stop());
        qrVideo.srcObject = null;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        qrVideo.srcObject = stream;
        qrVideo.setAttribute('playsinline', true); 
        
        // 비디오 메타데이터가 로드될 때까지 기다린 후 재생
        await new Promise(resolve => {
            qrVideo.onloadedmetadata = () => {
                resolve();
            };
            // 타임아웃 추가: 특정 시간 내에 메타데이터 로드 안 되면 실패로 간주
            setTimeout(() => {
                if (!qrVideo.onloadedmetadata) { // 이미 resolve되지 않았다면
                    console.warn('Metadata timeout for QR video.');
                    resolve(); // 강제로 resolve하여 다음 단계로 진행 (그러나 실제 재생 실패 가능성 높음)
                }
            }, 3000); // 3초 타임아웃
        });
        
        qrVideo.play(); 

        qrResult.textContent = 'QR 코드를 스캔 중...';
        isScanningPaused = false; 
        noCodeFoundCount = 0; 

        // jsQR 라이브러리 로드 확인 후 tick 시작
        if (typeof jsQR !== 'undefined') {
            requestAnimationFrame(tick);
        } else {
            console.warn('jsQR 라이브러리가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
            // jsQR 로드가 지연될 경우를 대비
            setTimeout(() => {
                if (typeof jsQR !== 'undefined') {
                    requestAnimationFrame(tick);
                } else {
                    qrResult.textContent = 'QR 스캐너 로딩 실패. 새로고침 해주세요.';
                    console.error('jsQR 라이브러리 로드 실패 또는 너무 오래 걸림.');
                }
            }, 1000); 
        }

    } catch (err) {
        console.error('웹캠 접근 오류:', err);
        qrResult.textContent = '웹캠을 시작할 수 없습니다. 카메라 권한을 확인해주세요.';
        alert('웹캠 접근 오류! 카메라 권한을 허용해주세요.'); 
    }
}

// --- QR 코드 스캔 로직 (jsQR 라이브러리 사용) (수정됨) ---
function tick() {
    // 1. 관리자 모드이거나 스캔이 일시 정지된 상태면 스캔을 중단하고 비디오를 멈춤
    if (isAdminMode || isScanningPaused) { 
        if (qrVideo.srcObject && !qrVideo.paused) {
            qrVideo.pause(); // 확실히 비디오 중지
        }
        return; // 이 상태에서는 더 이상 tick을 재귀적으로 호출하지 않음
    }

    // 2. 비디오가 재생 중이 아니라면 (그리고 스트림이 있다면) 재생 시도
    // 이 부분은 비디오가 어떤 이유로든 멈췄을 때 다시 시작하도록 합니다.
    if (qrVideo.srcObject && qrVideo.paused) {
        qrVideo.play().then(() => {
            // 재생 성공 후 다음 프레임 요청
            requestAnimationFrame(tick);
        }).catch(err => {
            // 재생 실패 시 (예: 권한 문제, 다른 앱 사용 중 등)
            console.error("비디오 재생 중 오류 발생, 재시작 시도:", err);
            qrResult.textContent = '카메라 오류 발생. 재시작 중...';
            // 딜레이를 주어 너무 빠르게 반복 재시작하지 않도록 함
            setTimeout(startWebcam, 1000); // 1초 후 웹캠 완전히 재시작
        });
        return; // 현재 프레임에서는 스캔 로직을 건너뜀
    }

    // 3. 비디오 데이터가 충분한지 확인
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

        if (code) { // 4. QR 코드 스캔 성공
            noCodeFoundCount = 0; 
            qrResult.textContent = `스캔 성공: ${code.data}`; 
            
            // 성공 시 스캔 일시 정지 및 비디오 멈춤
            isScanningPaused = true; 
            if (qrVideo.srcObject && !qrVideo.paused) { 
                qrVideo.pause(); 
            }

            if (code.data === ADMIN_QR_CODE_DATA) {
                isAdminMode = true;
                alert('관리자 모드에 진입했습니다.');
                showAdminControls();
                // 관리자 모드 진입 후에는 tick 재귀 호출 없음 (exitAdminMode에서 재개)
            } else {
                processQRData(code.data);
                // 1.5초 후 스캔 재개 로직 실행
                setTimeout(() => {
                    isScanningPaused = false; // 스캔 일시 정지 해제
                    qrResult.textContent = 'QR 코드를 스캔 중...'; // 메시지 초기화
                    // 비디오는 isScanningPaused가 false가 되면 tick 함수 시작 부분에서 play()될 것임
                    requestAnimationFrame(tick); // 다음 프레임 요청하여 스캔 재개
                }, 1500); 
            }

        } else { // 5. QR 코드를 찾지 못했을 경우
            noCodeFoundCount++; 
            if (noCodeFoundCount > 60 && noCodeFoundCount % 60 === 0) { 
                // 약 1초마다 메시지 업데이트 (60프레임/초 가정)
                const newMessage = 'QR 코드를 찾을 수 없습니다. 초점/거리 조절 중...';
                if (qrResult.textContent !== newMessage) {
                    qrResult.textContent = newMessage;
                }
            } else if (noCodeFoundCount === 1) { 
                qrResult.textContent = 'QR 코드를 스캔 중...';
            }
            requestAnimationFrame(tick); // 다음 프레임에서 계속 스캔 시도
        }
    } else { // 6. 아직 비디오 데이터가 충분하지 않을 경우 (카메라 준비 중)
        noCodeFoundCount++; 
        if (noCodeFoundCount % 60 === 0) {
            const newMessage = '카메라 준비 중...';
            if (qrResult.textContent !== newMessage) {
                qrResult.textContent = newMessage;
            }
        }
        requestAnimationFrame(tick); // 비디오가 준비될 때까지 기다리며 재시도
    }
}

// --- 스캔된 QR 데이터 처리 함수 ---
async function processQRData(data) {
    console.log("스캔된 원본 QR 데이터:", data);

    // 1. 접두사 유효성 검사
    if (!data.startsWith(VALID_QR_PREFIX)) {
        qrResult.textContent = '❌ 유효하지 않은 QR 코드 형식입니다. (접두사 불일치)';
        console.warn('유효하지 않은 QR 코드 스캔: 접두사 불일치', data);
        return; 
    }

    let actualData = data.substring(VALID_QR_PREFIX.length);

    // 2. 접미사 유효성 검사 (설정되어 있을 경우)
    if (VALID_SECRET_SUFFIX && !actualData.endsWith(VALID_SECRET_SUFFIX)) {
        qrResult.textContent = '❌ 유효하지 않은 QR 코드입니다. (보안 키 불일치)';
        console.warn('유효하지 않은 QR 코드 스캔: 보안 키 불일치', data);
        return; 
    }
    // 접미사가 있다면 실제 데이터에서 제거
    if (VALID_SECRET_SUFFIX) {
        actualData = actualData.substring(0, actualData.length - VALID_SECRET_SUFFIX.length);
    }
    
    console.log("처리할 실제 데이터:", actualData);

    // 3. 동아리 번호 형식 검사 (예: "1반" 형식)
    const classNumberMatch = actualData.match(/^(\d+)반$/); 

    if (!classNumberMatch || !classNumberMatch[1]) {
        qrResult.textContent = '❓ 알 수 없는 QR 코드 형식입니다. (예: "1반" 형식이어야 함)';
        console.warn('알 수 없는 QR 코드 형식:', actualData);
        return;
    }

    const clubId = parseInt(classNumberMatch[1]); 

    // 4. 동아리 번호 범위 검사
    if (clubId < 1 || clubId > TOTAL_CLASSES) {
        qrResult.textContent = `⛔ 유효하지 않은 동아리 번호입니다. (1~${TOTAL_CLASSES}번만 가능)`; 
        console.warn('유효하지 않은 동아리 번호:', clubId);
        return;
    }

    const stampIndex = clubId - 1; 
    const clubName = CLUB_NAMES[clubId]; 

    // 5. 스탬프 이미지 요소 존재 여부 확인
    if (!stampImages[stampIndex]) {
        qrResult.textContent = '내부 오류: 스탬프 요소를 찾을 수 없습니다.';
        console.error('스탬프 요소를 찾을 수 없음:', stampIndex);
        return;
    }

    // 6. 현재 로그인된 학생 ID 확인
    const currentStudentId = localStorage.getItem('currentStudentId');
    if (!currentStudentId) {
        qrResult.textContent = '로그인 정보가 없습니다. 다시 시작해주세요.';
        alert('학생 정보를 먼저 입력해주세요.');
        return;
    }

    // 7. Firebase 데이터베이스에 스탬프 상태 저장
    try {
        const stampPath = `stamps/${currentStudentId}/club${clubId}`;
        const stampSnapshot = await get(ref(database, stampPath)); 

        if (!stampSnapshot.exists() || !stampSnapshot.val()) { 
            // 스탬프가 찍히지 않았다면 새로 찍음
            await set(ref(database, stampPath), true); 
            stampImages[stampIndex].classList.remove('hidden');
            qrResult.textContent = `✅ ${clubName} 스탬프가 찍혔습니다!`; 
            console.log(`${clubName} 스탬프가 찍혔습니다.`);
            checkTenStamps(); // 10개 스탬프 체크
        } else {
            // 이미 찍힌 스탬프
            qrResult.textContent = `☑️️ ${clubName} 스탬프는 이미 찍혔습니다.`; 
            console.log(`${clubName} 스탬프는 이미 찍혔습니다.`);
        }
    } catch (error) {
        console.error("Firebase 스탬프 처리 중 오류 발생:", error);
        qrResult.textContent = '❌ 스탬프 처리 중 오류가 발생했습니다.';
        alert('스탬프 처리 중 오류 발생: ' + error.message);
    }
}

// --- 모든 스탬프 초기화 함수 (관리자 모드에서만 사용) ---
async function resetAllStamps() {
    if (confirm('경고: 모든 스탬프를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        const currentStudentId = localStorage.getItem('currentStudentId');
        if (!currentStudentId) {
            alert('학생 정보가 없어 스탬프를 초기화할 수 없습니다.');
            return;
        }

        try {
            await remove(ref(database, `stamps/${currentStudentId}`)); 
            await remove(ref(database, `votes/${currentStudentId}`)); 
            // hasTenStamps 필드도 초기화
            await update(ref(database, `students/${currentStudentId}`), { hasTenStamps: null }); 

            stampImages.forEach(stamp => {
                stamp.classList.add('hidden');
            });
            qrResult.textContent = '모든 스탬프가 초기화되었습니다.';
            console.log('모든 스탬프 초기화 완료.');
            checkTenStamps(); 
        } catch (error) {
            console.error("Firebase 스탬프 초기화 실패:", error);
            alert("스탬프 초기화에 실패했습니다: " + error.message);
        }
    }
}

// --- 페이지 로드 시 스탬프 상태 복원 함수 ---
async function loadStampState() {
    const currentStudentId = localStorage.getItem('currentStudentId');
    if (!currentStudentId || !database) {
        stampImages.forEach(stamp => stamp.classList.add('hidden'));
        return;
    }

    try {
        // 모든 스탬프 이미지를 숨긴 후, 데이터베이스 상태에 따라 다시 표시
        stampImages.forEach(stamp => stamp.classList.add('hidden')); 

        const snapshot = await get(ref(database, `stamps/${currentStudentId}`));
        const studentStamps = snapshot.val();

        if (studentStamps) {
            for (let i = 1; i <= TOTAL_CLASSES; i++) {
                if (studentStamps[`club${i}`]) { 
                    const stampIndex = i - 1;
                    if (stampImages[stampIndex]) {
                        stampImages[stampIndex].classList.remove('hidden');
                    }
                }
            }
        }
    } catch (error) {
        console.error("Firebase 스탬프 상태 로드 실패:", error);
        alert("스탬프 상태 로드 중 오류 발생: " + error.message);
    }
}

// --- 10개 스탬프 획득 시 메시지 표시/숨김 및 투표 기능 ---
async function checkTenStamps() {
    const currentStudentId = localStorage.getItem('currentStudentId');
    if (!currentStudentId || !database) {
        tenStampsMessage.classList.add('hidden');
        return;
    }

    try {
        const stampsSnapshot = await get(ref(database, `stamps/${currentStudentId}`));
        const studentStamps = stampsSnapshot.val();
        let stampedCount = 0;
        if (studentStamps) {
            for (let i = 1; i <= TOTAL_CLASSES; i++) {
                if (studentStamps[`club${i}`]) {
                    stampedCount++;
                }
            }
        }

        const studentRef = ref(database, `students/${currentStudentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.val();
        
        if (stampedCount >= 10) {
            tenStampsMessage.classList.remove('hidden');
            
            // 10개 이상 스탬프를 찍었을 경우 학생 데이터에 '출석인정' 상태 업데이트
            if (studentData && studentData.hasTenStamps !== "출석인정") {
                await update(studentRef, { hasTenStamps: "출석인정" });
                console.log(`학생 ${currentStudentId}의 출석이 인정되었습니다.`);
            }

            // 투표 상태 확인 및 UI 업데이트
            const voteSnapshot = await get(ref(database, `votes/${currentStudentId}`));
            const votedClub = voteSnapshot.val();

            if (votedClub) {
                bestClubVoteStatus.textContent = `✅ 이미 ${votedClub}에 투표했습니다.`;
                bestClubInput.value = votedClub; 
                bestClubInput.disabled = true;
                submitBestClubBtn.disabled = true;
            } else {
                bestClubVoteStatus.textContent = '아직 투표하지 않았습니다.';
                bestClubInput.value = ''; 
                bestClubInput.disabled = false;
                submitBestClubBtn.disabled = false;
            }
        } else {
            tenStampsMessage.classList.add('hidden');
            // 10개 미만으로 스탬프를 찍었을 경우 '출석인정' 상태 제거
            if (studentData && studentData.hasTenStamps === "출석인정") {
                await remove(ref(database, `students/${currentStudentId}/hasTenStamps`));
                console.log(`학생 ${currentStudentId}의 출석인정 상태가 취소되었습니다.`);
            }
            // 투표 관련 UI 초기화 및 비활성화
            bestClubVoteStatus.textContent = '';
            bestClubInput.value = '';
            bestClubInput.disabled = true;
            submitBestClubBtn.disabled = true;
        }
    } catch (error) {
        console.error("Firebase 스탬프 개수 확인 또는 투표 상태 로드 실패:", error);
        alert("스탬프/투표 상태 확인 중 오류 발생: " + error.message);
    }
}

// 투표 버튼 클릭 이벤트 리스너
submitBestClubBtn.addEventListener('click', async () => {
    const clubName = bestClubInput.value.trim();
    const currentStudentId = localStorage.getItem('currentStudentId');

    if (!currentStudentId || !database) {
        alert('학생 정보가 없거나 데이터베이스 연결이 불안정합니다. 다시 시작해주세요.');
        return;
    }

    if (clubName) {
        try {
            // 이미 투표했는지 확인
            const voteSnapshot = await get(ref(database, `votes/${currentStudentId}`));
            if (voteSnapshot.exists()) {
                alert('이미 투표하셨습니다. 투표는 한 번만 가능합니다.');
                return;
            }

            // 유효한 동아리 이름인지 확인
            if (!CLUB_NAMES.includes(clubName)) {
                alert('유효하지 않은 동아리 이름입니다. 정확한 이름을 입력해주세요.');
                return;
            }

            // 투표 확인 컨펌
            if (confirm(`${clubName}에 투표하시겠습니까? (투표는 한 번만 가능합니다)`)) {
                // 학생별 투표 기록
                await set(ref(database, `votes/${currentStudentId}`), clubName);
                
                // 동아리별 투표 수 증가 (트랜잭션으로 동시성 문제 방지)
                const clubVotesRef = ref(database, `clubVotes/${clubName}`);
                await runTransaction(clubVotesRef, (currentVotes) => {
                    return (currentVotes || 0) + 1;
                });

                alert(`"${clubName}"에 투표해주셔서 감사합니다!`);
                checkTenStamps(); // 투표 상태 UI 업데이트
            }
        } catch (error) {
            console.error("Firebase 투표 저장 실패:", error);
            alert("투표 저장에 실패했습니다: " + error.message);
        }
    } else {
        alert('투표할 동아리 이름을 입력해주세요.');
    }
});


// --- 관리자 모드 관련 함수 ---

function showAdminControls() {
    isAdminMode = true; 
    isScanningPaused = true; 

    controlsDiv.innerHTML = ''; // 기존 버튼 모두 제거

    // 각 동아리별 스탬프 제어 버튼 생성
    for (let i = 1; i <= TOTAL_CLASSES; i++) { 
        const classButton = document.createElement('button');
        classButton.textContent = `${CLUB_NAMES[i]} 스탬프 제어`; 
        classButton.classList.add('class-control-button');
        classButton.dataset.class = i; // 데이터 속성으로 동아리 번호 저장
        classButton.addEventListener('click', handleClassStampControl);
        controlsDiv.appendChild(classButton);
    }
    
    // 관리자 모드 종료 버튼
    const exitAdminButton = document.createElement('button');
    exitAdminButton.textContent = '관리자 모드 종료';
    exitAdminButton.addEventListener('click', exitAdminMode);
    controlsDiv.appendChild(exitAdminButton);

    qrResult.textContent = '관리자 모드: 원하는 동아리를 선택하세요.';
    // 관리자 모드 진입 시 확실히 비디오를 멈춤
    if (qrVideo.srcObject && !qrVideo.paused) { 
        qrVideo.pause(); 
    }
}

function showMasterControls() {
    isMasterMode = true;
    isAdminMode = true; // 마스터 모드도 관리자 모드의 일종
    isScanningPaused = true; // 스캔 일시 정지 유지
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

    if (qrVideo.srcObject && !qrVideo.paused) {
        qrVideo.pause(); 
    }
}

// 각 동아리 스탬프 제어 버튼 클릭 핸들러
async function handleClassStampControl(event) {
    const classNumber = event.target.dataset.class;
    const password = prompt(`${CLUB_NAMES[classNumber]} 비밀번호를 입력하세요:`); 

    // 마스터 키 확인 (특정 동아리 번호와 연동)
    if (classNumber === '10' && password === MASTER_KEY) { 
        showMasterControls();
        return;
    }

    if (password === CLASS_PASSWORDS[classNumber]) {
        const stampIndex = classNumber - 1;
        const currentStamp = stampImages[stampIndex];
        const currentStudentId = localStorage.getItem('currentStudentId');
        const clubName = CLUB_NAMES[classNumber]; 

        if (!currentStudentId || !database) {
            alert('학생 정보가 없거나 데이터베이스 연결이 불안정합니다. 스탬프를 제어할 수 없습니다.');
            return;
        }

        try {
            const stampPath = `stamps/${currentStudentId}/club${classNumber}`;
            const stampSnapshot = await get(ref(database, stampPath));

            if (currentStamp) {
                if (!stampSnapshot.exists() || !stampSnapshot.val()) { 
                    // 스탬프가 찍히지 않았다면 새로 찍음
                    await set(ref(database, stampPath), true);
                    currentStamp.classList.remove('hidden');
                    qrResult.textContent = `✅ ${clubName} 스탬프가 관리자에 의해 찍혔습니다!`; 
                    alert(`${clubName} 스탬프가 찍혔습니다.`);
                    console.log(`${clubName} 스탬프 관리자 찍기 완료.`);
                    checkTenStamps(); 
                } else { 
                    // 이미 찍힌 스탬프라면 취소 여부 확인
                    if (confirm(`${clubName} 스탬프를 취소하시겠습니까?`)) { 
                        await remove(ref(database, stampPath));
                        currentStamp.classList.add('hidden');
                        qrResult.textContent = `❌ ${clubName} 스탬프가 관리자에 의해 취소되었습니다.`; 
                        alert(`${clubName} 스탬프가 취소되었습니다.`);
                        console.log(`${clubName} 스탬프 관리자 취소 완료.`);
                        checkTenStamps(); 
                    }
                }
            }
        } catch (error) {
            console.error("Firebase 관리자 스탬프 제어 실패:", error);
            alert("스탬프 제어에 실패했습니다: " + error.message);
        }
    } else {
        alert('비밀번호가 틀렸습니다.');
    }
}

// 모든 스탬프 채우기 함수
async function fillAllStamps() {
    if (confirm('모든 스탬프를 채우시겠습니까?')) {
        const currentStudentId = localStorage.getItem('currentStudentId');
        if (!currentStudentId || !database) {
            alert('학생 정보가 없거나 데이터베이스 연결이 불안정합니다. 모든 스탬프를 채울 수 없습니다.');
            return;
        }

        try {
            const updates = {};
            for (let i = 1; i <= TOTAL_CLASSES; i++) { 
                updates[`club${i}`] = true;
            }
            await update(ref(database, `stamps/${currentStudentId}`), updates);

            stampImages.forEach(stamp => {
                stamp.classList.remove('hidden');
            });
            qrResult.textContent = '모든 스탬프가 채워졌습니다.';
            console.log('모든 스탬프 채우기 완료.');
            checkTenStamps(); 
        } catch (error) {
            console.error("Firebase 모든 스탬프 채우기 실패:", error);
            alert("모든 스탬프 채우기에 실패했습니다: " + error.message);
        }
    }
}

// 관리자 모드 종료 함수
function exitAdminMode() {
    isAdminMode = false;
    isMasterMode = false;
    isScanningPaused = false; 
    
    controlsDiv.innerHTML = ''; // 관리자 버튼 숨기기

    loadStampState(); // 현재 스탬프 상태 로드
    qrResult.textContent = '관리자 모드를 종료했습니다. QR 코드를 스캔 중...';
    console.log('관리자 모드 종료.');
    // 관리자 모드에서 나와 스캔을 재개할 때 비디오를 확실히 재생시키고 tick 호출
    if (qrVideo.srcObject && qrVideo.paused) { 
        qrVideo.play();
    }
    requestAnimationFrame(tick);
}


// --- 이벤트 리스너 연결 ---
submitInfoBtn.addEventListener('click', async () => {
    const grade = gradeInput.value.padStart(2, '0'); // 두 자리로 패딩
    const classNum = classInput.value.padStart(2, '0'); // 두 자리로 패딩
    const number = numberInput.value.padStart(2, '0'); // 두 자리로 패딩
    const name = nameInput.value.trim();

    if (grade && classNum && number && name) {
        const studentId = `${grade}-${classNum}-${number}`; // 학번 형식 통일

        try {
            // 학생 정보 저장 또는 업데이트
            await set(ref(database, `students/${studentId}`), {
                grade: grade,
                classNum: classNum,
                number: number,
                name: name,
                hasTenStamps: null // 초기에는 10개 스탬프 상태 없음
            });
            // 기존 투표 정보 초기화 (새로운 학생 등록 시)
            await remove(ref(database, `votes/${studentId}`));

            localStorage.setItem('currentStudentId', studentId); // 로컬 스토리지에 학번 저장
            studentDisplay.textContent = `학번: ${grade}학년 ${classNum}반 ${number}번 | 이름: ${name}`;
            showScreen(mainContentScreen); // 메인 화면으로 전환
        } catch (error) {
            console.error("Firebase 학생 정보 저장 실패:", error);
            alert("학생 정보 저장에 실패했습니다: " + error.message);
        }
    } else {
        alert('모든 정보를 입력해주세요.');
    }
});

showLocationGuideBtn.addEventListener('click', () => {
    showScreen(locationGuideScreen);
});

// 새로 추가된 진행 방법 안내 버튼 이벤트 리스너
showHowToPlayBtn.addEventListener('click', () => { // <-- 새로 추가
    showScreen(howToPlayScreen); // <-- 새로 추가
});

closeLocationGuideBtn.addEventListener('click', () => {
    showScreen(mainContentScreen);
});

// 새로 추가된 진행 방법 안내 화면 닫기 버튼 이벤트 리스너
closeHowToPlayBtn.addEventListener('click', () => { // <-- 새로 추가
    showScreen(mainContentScreen); // <-- 새로 추가
});


// 초기 로드 시 스플래시 화면 표시 및 학생 정보 로드
window.addEventListener('load', async () => {
    // Firebase Database 인스턴스가 전역으로 노출되어 있는지 확인
    if (window.database) {
        database = window.database; 
    } else {
        console.error("Firebase Database 인스턴스를 찾을 수 없습니다. 앱 초기화 지연.");
        alert("앱 초기화 중 오류가 발생했습니다. index.html에서 Firebase 설정 및 초기화를 확인해주세요.");
        return; 
    }

    const currentStudentId = localStorage.getItem('currentStudentId');

    if (currentStudentId) {
        try {
            // 저장된 학생 정보가 있다면 로드하여 메인 화면으로 이동
            const snapshot = await get(ref(database, `students/${currentStudentId}`));
            const studentData = snapshot.val();
            if (studentData) {
                studentDisplay.textContent = `학번: ${studentData.grade}학년 ${studentData.classNum}반 ${studentData.number}번 | 이름: ${studentData.name}`;
                showScreen(mainContentScreen);
            } else {
                // 정보가 없으면 로컬 스토리지 정보 삭제 및 스플래시 화면 표시
                localStorage.removeItem('currentStudentId'); 
                showScreen(splashScreen);
            }
        } catch (error) {
            console.error("Firebase 학생 정보 로드 실패:", error);
            // 오류 발생 시 로컬 스토리지 정보 삭제 및 스플래시 화면 표시
            localStorage.removeItem('currentStudentId');
            showScreen(splashScreen);
        }
    } else {
        // 저장된 학생 정보가 없으면 스플래시 화면 표시
        showScreen(splashScreen);
    }
});