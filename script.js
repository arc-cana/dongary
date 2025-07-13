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

// 학생 정보가 localStorage에 있는지 확인하는 함수
function checkStudentInfo() {
    const studentInfo = localStorage.getItem('studentInfo');
    if (studentInfo) {
        splashScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        console.log('학생 정보 로드됨:', JSON.parse(studentInfo));
        loadStampState(); // 스탬프 상태 로드
        startQrScanner(); // QR 스캐너 시작
    } else {
        splashScreen.classList.remove('hidden');
        mainContent.classList.add('hidden');
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

// QR 스캐너 시작 함수
function startQrScanner() {
    // 이미 스캐너가 실행 중이라면 다시 시작하지 않음
    if (html5QrCode && html5QrCode.isScanning) {
        console.log("QR scanner is already running.");
        return;
    }

    const qrCodeRegionId = "qr-video";
    html5QrCode = new Html5Qrcode(qrCodeRegionId);

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config,
        (decodedText, decodedResult) => {
            // QR 스캔 성공 시 동작
            qrResultDiv.textContent = `스캔 완료: ${decodedText}`;
            console.log(`QR code detected: ${decodedText}`);
            // 스탬프 적용
            applyStamp(decodedText);

            // 성공적으로 스캔되면 잠시 스캐너를 멈췄다가 다시 시작 (중복 스캔 방지)
            if (html5QrCode.isScanning) {
                html5QrCode.stop().then(ignore => {
                    setTimeout(() => {
                        // QR 스캔 성공 후 2초 후에 스캐너 다시 시작
                        // (이전에 스캔된 코드를 다시 읽는 것을 방지)
                        startQrScanner();
                    }, 2000);
                }).catch(err => {
                    console.error("Failed to stop QR scanning after successful scan:", err);
                });
            }
        },
        (errorMessage) => {
            // QR 스캔 실패 또는 오류
            // qrResultDiv.textContent = `스캔 중... (오류: ${errorMessage})`;
        }
    ).catch((err) => {
        qrResultDiv.textContent = `카메라를 시작할 수 없습니다. 권한을 확인해주세요. (${err})`;
        console.error("Failed to start QR scanner: ", err);
    });
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

    splashScreen.classList.add('hidden');
    mainContent.classList.remove('hidden');

    loadStampState();
    startQrScanner(); // QR 스캐너 시작
});

// 동아리 위치 안내 버튼 클릭 이벤트
// script.js 파일의 해당 부분만 수정합니다.

// 동아리 위치 안내 버튼 클릭 이벤트
showLocationGuideBtn.addEventListener('click', () => {
    // QR 스캔 중이라면 중지 및 정리
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.clear().then(ignore => { // stop() 대신 clear() 사용
            console.log("QR scanning stopped and cleared.");
            // 스캐너가 완전히 정리될 시간을 줍니다.
            setTimeout(() => {
                mainContent.classList.add('hidden'); // 메인 화면 숨김
                locationGuideScreen.classList.remove('hidden'); // 위치 안내 화면 표시
            }, 100); // 0.1초 지연
        }).catch(err => {
            console.warn("Failed to stop or clear QR scanning:", err);
            // 오류가 발생해도 일단 화면은 전환합니다.
            mainContent.classList.add('hidden');
            locationGuideScreen.classList.remove('hidden');
        });
    } else {
        mainContent.classList.add('hidden'); // 메인 화면 숨김
        locationGuideScreen.classList.remove('hidden'); // 위치 안내 화면 표시
    }
});

// 위치 안내 페이지 나가기 버튼 클릭 이벤트
closeLocationGuideBtn.addEventListener('click', () => {
    locationGuideScreen.classList.add('hidden'); // 위치 안내 화면 숨김
    mainContent.classList.remove('hidden'); // 메인 화면 다시 표시
    
    // QR 스캔 다시 시작 (약간의 지연 후)
    // 브라우저가 카메라 리소스를 완전히 해제할 시간을 줍니다.
    setTimeout(() => {
        if (typeof startQrScanner === 'function') {
            startQrScanner();
        } else {
            console.error("startQrScanner function is not defined!");
        }
    }, 200); // 0.2초 지연 (필요에 따라 이 값을 조절할 수 있습니다)
});

// --- 나머지 script.js 코드는 그대로 두시면 됩니다 ---

// 10반 스탬프 (마스터 키) 클릭 시 관리자 모드 토글
document.getElementById('stamp-10').addEventListener('click', (event) => {
    event.preventDefault(); // 기본 이미지 클릭 동작 방지
    if (event.ctrlKey || event.metaKey) { // Ctrl 또는 Cmd 키와 함께 클릭 시
        toggleMasterMode();
    }
});


// 페이지 로드 시 학생 정보 확인 함수 호출
checkStudentInfo();