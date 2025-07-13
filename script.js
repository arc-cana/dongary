// script.js 전체 코드

const splashScreen = document.getElementById('splash-screen');
const mainContent = document.getElementById('main-content');
const submitInfoBtn = document.getElementById('submitInfoBtn');
const inputGrade = document.getElementById('inputGrade');
const inputClass = document.getElementById('inputClass');
const inputNumber = document.getElementById('inputNumber');
const inputName = document.getElementById('inputName');

const showLocationGuideBtn = document.getElementById('showLocationGuideBtn');
const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn');
const locationGuideScreen = document.getElementById('location-guide-screen');

const TOTAL_CLASSES = 20; // 전체 동아리(스탬프) 개수
const stampImages = document.querySelectorAll('.stamp');
const qrResultDiv = document.getElementById('qr-result');
const controlsDiv = document.querySelector('.controls');
const qrVideo = document.getElementById('qr-video');

let html5QrCode; // QR 스캐너 인스턴스를 저장할 변수 (전역 접근 가능하도록)
let isMasterMode = false; // 관리자 모드 여부

// --- 화면 전환 헬퍼 함수 추가 ---
function hideAllScreens() {
    splashScreen.classList.add('hidden');
    mainContent.classList.add('hidden');
    locationGuideScreen.classList.add('hidden');
}

function showSplashScreen() {
    hideAllScreens();
    splashScreen.classList.remove('hidden');
    console.log("화면: 스플래시");
}

function showMainContentScreen() {
    hideAllScreens();
    mainContent.classList.remove('hidden');
    console.log("화면: 메인 (QR)");
}

function showLocationGuideScreen() {
    hideAllScreens();
    locationGuideScreen.classList.remove('hidden');
    console.log("화면: 위치 안내");
}
// --- 화면 전환 헬퍼 함수 끝 ---


// 학생 정보가 localStorage에 있는지 확인하는 함수
function checkStudentInfo() {
    const studentInfo = localStorage.getItem('studentInfo');
    if (studentInfo) {
        showMainContentScreen(); // 메인 화면 표시
        loadStampState(); // 스탬프 상태 로드
        startQrScanner(); // QR 스캐너 시작
    } else {
        showSplashScreen(); // 스플래시 화면 표시
    }
}

// 스탬프 상태 로드 함수
function loadStampState() {
    const studentInfo = JSON.parse(localStorage.getItem('studentInfo'));
    if (!studentInfo) return; // 학생 정보가 없으면 로드할 스탬프도 없음

    const stampsData = localStorage.getItem(`stamps_${studentInfo.grade}_${studentInfo.sClass}_${studentInfo.number}`);
    const stampedClasses = stampsData ? JSON.parse(stampsData) : [];

    stampImages.forEach(img => {
        const stampId = parseInt(img.id.replace('stamp-', ''), 10);
        if (stampedClasses.includes(stampId)) {
            img.classList.remove('hidden'); // 찍힌 스탬프는 보이게
        } else {
            img.classList.add('hidden'); // 안 찍힌 스탬프는 숨김
        }
    });

    checkAllStampsCollected(); // 모든 스탬프가 찍혔는지 확인
}

// 스탬프 적용 함수
function applyStamp(stampId) {
    const studentInfo = JSON.parse(localStorage.getItem('studentInfo'));
    if (!studentInfo) {
        alert('학생 정보가 없어 스탬프를 적용할 수 없습니다. 다시 시작해주세요.');
        return;
    }

    const stampsKey = `stamps_${studentInfo.grade}_${studentInfo.sClass}_${studentInfo.number}`;
    const stampsData = localStorage.getItem(stampsKey);
    let stampedClasses = stampsData ? JSON.parse(stampsData) : [];

    const parsedStampId = parseInt(stampId, 10);

    if (isNaN(parsedStampId) || parsedStampId < 1 || parsedStampId > TOTAL_CLASSES) {
        qrResultDiv.textContent = '유효하지 않은 QR 코드입니다.';
        console.error('Invalid QR Code:', stampId);
        return;
    }

    if (stampedClasses.includes(parsedStampId)) {
        qrResultDiv.textContent = `이미 ${parsedStampId}번 스탬프를 받았습니다!`;
        return;
    }

    stampedClasses.push(parsedStampId);
    localStorage.setItem(stampsKey, JSON.stringify(stampedClasses));

    const stampImg = document.getElementById(`stamp-${parsedStampId}`);
    if (stampImg) {
        stampImg.classList.remove('hidden');
        qrResultDiv.textContent = `${parsedStampId}번 스탬프를 받았습니다!`;
    }

    checkAllStampsCollected(); // 모든 스탬프가 찍혔는지 확인
}

// 모든 스탬프를 모았는지 확인하는 함수
function checkAllStampsCollected() {
    const studentInfo = JSON.parse(localStorage.getItem('studentInfo'));
    if (!studentInfo) return;

    const stampsKey = `stamps_${studentInfo.grade}_${studentInfo.sClass}_${studentInfo.number}`;
    const stampsData = localStorage.getItem(stampsKey);
    const stampedClasses = stampsData ? JSON.parse(stampsData) : [];

    if (stampedClasses.length >= TOTAL_CLASSES) {
        qrResultDiv.textContent = '모든 스탬프를 다 모았습니다! 축하합니다!';
        // 추가적인 이벤트 (예: 완료 메시지, 상품 증정 안내 등)
    }
}

// QR 스캐너 시작 함수 (수정됨)
async function startQrScanner() {
    console.log("QR 스캐너 시작 시도...");

    const qrCodeRegionId = "qr-video";
    qrResultDiv.textContent = 'QR 코드를 스캔 중...'; // QR 결과 텍스트 초기화
    qrVideo.classList.remove('hidden'); // 비디오 요소가 보이도록 확실히 설정

    // 스캐너가 이미 실행 중이라면 불필요한 재시작 방지
    if (html5QrCode && html5QrCode.isScanning) {
        console.log("QR 스캐너가 이미 실행 중입니다. 재시작하지 않습니다.");
        return;
    }
    
    // 이전에 생성된 스캐너 인스턴스가 있다면, 완전히 초기화
    if (html5QrCode) {
        try {
            await html5QrCode.clear(); // 기존 스캐너를 완전히 중지하고 리소스 해제
            console.log("기존 QR 스캐너 인스턴스 클리어 완료.");
        } catch (err) {
            console.warn("기존 QR 스캐너 클리어 중 오류 발생:", err);
            // 오류가 발생해도 계속 진행 (새로운 인스턴스를 만들 것임)
        }
    }

    // 새로운 Html5Qrcode 인스턴스 생성
    html5QrCode = new Html5Qrcode(qrCodeRegionId);
    console.log("새로운 Html5Qrcode 인스턴스 생성됨.");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
        await html5QrCode.start({ facingMode: "environment" }, config,
            (decodedText, decodedResult) => {
                // QR 스캔 성공 시 동작
                qrResultDiv.textContent = `스캔 완료: ${decodedText}`;
                console.log(`QR 코드 감지: ${decodedText}`);
                applyStamp(decodedText);

                // 스캔 성공 후 잠시 스캐너를 중지했다가 다시 시작 (중복 스캔 방지)
                if (html5QrCode.isScanning) {
                    console.log("QR 스캔 성공, 스캐너 일시 중지...");
                    html5QrCode.stop().then(ignore => {
                        console.log("스캐너 일시 중지 완료.");
                        setTimeout(() => {
                            console.log("성공 스캔 지연 후 스캐너 재시작...");
                            startQrScanner(); // 2초 후 재시작
                        }, 2000); 
                    }).catch(err => {
                        console.error("스캔 성공 후 스캐너 중지 실패:", err);
                    });
                }
            },
            (errorMessage) => {
                // QR 스캔 진행 중 (오류 아님)
                // console.log("QR 스캔 진행:", errorMessage);
            }
        );
        console.log("QR 스캐너 성공적으로 시작됨.");
    } catch (err) {
        // 카메라 시작 실패 시
        qrResultDiv.textContent = `카메라를 시작할 수 없습니다. 권한을 확인해주세요. (오류: ${err.message || err})`;
        console.error("QR 스캐너 시작 실패:", err);
        qrVideo.classList.add('hidden'); // 비디오 요소를 숨겨 에러 메시지 강조
    }
}


// 관리자 모드 활성화/비활성화 토글
function toggleMasterMode() {
    isMasterMode = !isMasterMode;
    controlsDiv.innerHTML = ''; // 버튼 초기화

    if (isMasterMode) {
        // 모든 스탬프 채우기 버튼
        const fillAllBtn = document.createElement('button');
        fillAllBtn.textContent = '모든 스탬프 채우기';
        fillAllBtn.addEventListener('click', () => {
            const studentInfo = JSON.parse(localStorage.getItem('studentInfo'));
            if (!studentInfo) {
                alert('학생 정보가 없어 스탬프를 적용할 수 없습니다.');
                return;
            }
            const stampsKey = `stamps_${studentInfo.grade}_${studentInfo.sClass}_${studentInfo.number}`;
            const allStamps = Array.from({ length: TOTAL_CLASSES }, (_, i) => i + 1);
            localStorage.setItem(stampsKey, JSON.stringify(allStamps));
            loadStampState();
            alert('모든 스탬프를 채웠습니다!');
        });
        controlsDiv.appendChild(fillAllBtn);

        // 모든 스탬프 초기화 버튼
        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = '모든 스탬프 초기화';
        clearAllBtn.addEventListener('click', () => {
            const studentInfo = JSON.parse(localStorage.getItem('studentInfo'));
            if (confirm('모든 스탬프를 정말 초기화하시겠습니까?')) {
                if (studentInfo) {
                    const stampsKey = `stamps_${studentInfo.grade}_${studentInfo.sClass}_${studentInfo.number}`;
                    localStorage.removeItem(stampsKey);
                    loadStampState();
                    alert('모든 스탬프가 초기화되었습니다.');
                } else {
                    alert('학생 정보가 없어 초기화할 스탬프가 없습니다.');
                }
            }
        });
        controlsDiv.appendChild(clearAllBtn);

        // 특정 스탬프 활성화/비활성화 버튼 (1번부터 20번까지)
        for (let i = 1; i <= TOTAL_CLASSES; i++) {
            const classBtn = document.createElement('button');
            classBtn.classList.add('class-control-button');
            classBtn.dataset.class = i;
            classBtn.textContent = `${i}반 ${i == 10 ? '(마스터)' : ''}`; // 10반에 마스터 표시
            classBtn.addEventListener('click', () => {
                applyStamp(i); // 특정 스탬프 적용
            });
            controlsDiv.appendChild(classBtn);
        }

        // 마스터 모드 종료 버튼
        const exitMasterBtn = document.createElement('button');
        exitMasterBtn.textContent = '관리자/마스터 모드 종료';
        exitMasterBtn.addEventListener('click', toggleMasterMode);
        controlsDiv.appendChild(exitMasterBtn);

    } else {
        // 일반 사용자 모드 버튼 (없음)
        // 여기에 일반 사용자에게 보여줄 버튼이 있다면 추가
    }
}


// 정보 제출 버튼 클릭 이벤트 리스너
submitInfoBtn.addEventListener('click', () => {
    const grade = inputGrade.value.trim();
    const sClass = inputClass.value.trim();
    const number = inputNumber.value.trim();
    const name = inputName.value.trim();

    if (!grade || !sClass || !number || !name) {
        alert('모든 정보를 입력해주세요.');
        return;
    }

    const classNum = parseInt(sClass, 10);
    const numberNum = parseInt(number, 10);
    const gradeNum = parseInt(grade, 10);

    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
        alert('학년은 1부터 6 사이의 숫자로 입력해주세요.');
        return;
    }
    if (isNaN(classNum) || classNum < 1 || classNum > 10) {
        alert('반은 1부터 10 사이의 숫자로 입력해주세요.');
        return;
    }
    if (isNaN(numberNum) || numberNum < 1) {
        alert('번호는 올바른 숫자로 입력해주세요.');
        return;
    }

    const studentInfo = {
        grade: grade,
        sClass: sClass,
        number: number,
        name: name
    };

    localStorage.setItem('studentInfo', JSON.stringify(studentInfo));
    alert('정보가 저장되었습니다. 스탬프 화면으로 이동합니다.');

    showMainContentScreen(); // 메인 화면 표시
    loadStampState();
    startQrScanner(); // QR 스캐너 시작
});

// 동아리 위치 안내 버튼 클릭 이벤트
showLocationGuideBtn.addEventListener('click', async () => {
    console.log("동아리 위치 안내 버튼 클릭됨.");
    // QR 스캔 중이라면 중지 및 정리
    if (html5QrCode && html5QrCode.isScanning) {
        console.log("위치 안내 진입 전 QR 스캐너 중지 및 클리어 시도...");
        try {
            await html5QrCode.clear(); // 스캐너를 완전히 중지하고 리소스 해제
            console.log("QR 스캐너 클리어 완료.");
        } catch (err) {
            console.warn("QR 스캐너 클리어 중 오류 발생:", err);
        }
    } else {
        console.log("QR 스캐너가 실행 중이 아님.");
    }
    
    // 화면 전환
    showLocationGuideScreen();
});

// 위치 안내 페이지 나가기 버튼 클릭 이벤트
closeLocationGuideBtn.addEventListener('click', () => {
    console.log("위치 안내 페이지 나가기 버튼 클릭됨.");
    showMainContentScreen(); // 메인 화면 다시 표시

    // QR 스캔 다시 시작 (충분한 지연 후)
    console.log("위치 안내 종료 후 QR 스캐너 재시작 시도...");
    // 브라우저가 카메라 리소스를 완전히 해제할 시간을 주기 위해 지연 추가
    setTimeout(() => {
        startQrScanner();
    }, 500); // 0.5초 지연
});


// 10반 스탬프 (마스터 키) 클릭 시 관리자 모드 토글
document.getElementById('stamp-10').addEventListener('click', (event) => {
    // Ctrl 또는 Cmd 키와 함께 10번 스탬프 클릭 시 마스터 모드 토글
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault(); // 기본 이미지 클릭 동작 방지
        toggleMasterMode();
    }
});


// 페이지 로드 시 학생 정보 확인 함수 호출
checkStudentInfo();