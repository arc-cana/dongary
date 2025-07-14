// script.js 전체 코드

const splashScreen = document.getElementById('splash-screen');
const mainContent = document.getElementById('main-content');
const submitInfoBtn = document.getElementById('submitInfoBtn');
const inputGrade = document.getElementById('inputGrade');
const inputClass = document.getElementById('inputClass');
const inputNumber = document.getElementById('inputNumber');
const inputName = document.getElementById('inputName');
const studentDisplay = document.getElementById('student-display'); // 학생 정보 표시될 div

const showLocationGuideBtn = document.getElementById('showLocationGuideBtn');
const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn');
const locationGuideScreen = document.getElementById('location-guide-screen');

const TOTAL_CLASSES = 15; // 전체 동아리(스탬프) 개수 (IMG_1275.jpeg 기준 15개)
const stampImages = document.querySelectorAll('.stamp'); // 모든 스탬프 이미지 요소
const qrResultDiv = document.getElementById('qr-result');
const controlsDiv = document.querySelector('.controls');
const qrVideo = document.getElementById('qr-video'); // QR 스캐너 비디오 컨테이너

const tenStampsMessageDiv = document.getElementById('ten-stamps-message');
const bestClubInput = document.getElementById('bestClubInput');
const submitBestClubBtn = document.getElementById('submitBestClubBtn');
const bestClubVoteStatus = document.getElementById('bestClubVoteStatus');

let html5QrCode; // QR 스캐너 인스턴스를 저장할 변수 (전역 접근 가능하도록)
let isMasterMode = false; // 관리자 모드 여부
let currentStudentInfo = null; // 현재 로그인한 학생 정보를 저장할 변수

// ====================================================================
// !!! 중요: 이 URL을 여러분의 Google Apps Script 웹 앱 URL로 변경하세요 !!!
const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx9okeHZurr1sIc5RYGP-j2sQSd-bsPQVfzegcivo7Way_oY1WBIwosv7-HoNB73DMLnA/exec";
// 예시: "https://script.google.com/macros/s/AKfycbz_YOUR_UNIQUE_ID_HERE/exec";
// ====================================================================

// --- 화면 전환 헬퍼 함수 ---
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


// ====================================================================
// Google Apps Script API 통신 함수들
// ====================================================================

// 학생 정보 가져오기 (Students 시트에서)
async function fetchStudentInfo(grade, sClass, number) {
    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=getStudentInfo&grade=${grade}&sClass=${sClass}&number=${number}`);
        const data = await response.json();
        if (data.success && data.studentInfo) {
            console.log("학생 정보 로드 성공:", data.studentInfo);
            return data.studentInfo;
        } else {
            console.log("해당 학생 정보 없음:", data.message);
            return null;
        }
    } catch (error) {
        console.error("학생 정보 로드 중 오류 발생:", error);
        alert("학생 정보를 불러오는 중 오류가 발생했습니다.");
        return null;
    }
}

// 학생 정보 저장하기 (POST 요청, Students 시트에)
async function saveStudentInfo(studentInfo) {
    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'saveStudentInfo', data: studentInfo })
        });
        const data = await response.json();
        if (data.success) {
            console.log("학생 정보 저장 성공:", data.message);
            return true;
        } else {
            console.error("학생 정보 저장 실패:", data.message);
            alert("학생 정보 저장에 실패했습니다.");
            return false;
        }
    } catch (error) {
        console.error("학생 정보 저장 중 오류 발생:", error);
        alert("학생 정보 저장 중 오류가 발생했습니다.");
        return false;
    }
}

// 스탬프 정보 가져오기 (Stamps 시트에서)
async function fetchStamps(grade, sClass, number) {
    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=getStamps&grade=${grade}&sClass=${sClass}&number=${number}`);
        const data = await response.json();
        if (data.success && data.stampedClubs) {
            console.log("스탬프 정보 로드 성공:", data.stampedClubs, "10개 이상:", data.hasTenStamps, "투표:", data.bestClubVote);
            return data; // stampedClubs, hasTenStamps, bestClubVote 모두 포함된 객체 반환
        } else {
            console.log("해당 학생 스탬프 정보 없음:", data.message);
            return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" }; // 없으면 기본값 반환
        }
    } catch (error) {
        console.error("스탬프 정보 로드 중 오류 발생:", error);
        alert("스탬프 정보를 불러오는 중 오류가 발생했습니다.");
        return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" };
    }
}

// 스탬프 정보 저장하기 (POST 요청, Stamps 시트에)
async function saveStamps(grade, sClass, number, name, stampedClubsArray) {
    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveStamps',
                data: {
                    grade: grade,
                    sClass: sClass,
                    number: number,
                    name: name, // 이름 필드 추가
                    stampedClubs: stampedClubsArray // 배열 그대로 전달
                }
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log("스탬프 정보 저장 성공:", data.message);
            return true;
        } else {
            console.error("스탬프 정보 저장 실패:", data.message);
            alert("스탬프 정보 저장에 실패했습니다.");
            return false;
        }
    } catch (error) {
        console.error("스탬프 정보 저장 중 오류 발생:", error);
        alert("스탬프 정보 저장 중 오류가 발생했습니다.");
        return false;
    }
}

// 최고 동아리 투표 저장 함수
async function saveBestClubVote(grade, sClass, number, bestClub) {
    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveBestClubVote',
                data: {
                    grade: grade,
                    sClass: sClass,
                    number: number,
                    bestClub: bestClub
                }
            })
        });
        const data = await response.json();
        if (data.success) {
                console.log("최고 동아리 투표 저장 성공:", data.message);
                return true;
            } else {
                console.error("최고 동아리 투표 저장 실패:", data.message);
                alert("최고 동아리 투표 저장에 실패했습니다.");
                return false;
            }
        } catch (error) {
            console.error("최고 동아리 투표 저장 중 오류 발생:", error);
            alert("최고 동아리 투표 저장 중 오류가 발생했습니다.");
            return false;
        }
    }

// ====================================================================
// 웹 앱 로직 (화면 전환, QR 스캐너, 스탬프 관리 등)
// ====================================================================

// 페이지 로드 시 학생 정보 확인 함수
// URL 파라미터가 있으면 바로 메인 화면으로, 없으면 스플래시 화면으로
async function checkStudentInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const sClass = urlParams.get('class');
    const number = urlParams.get('number');
    const name = urlParams.get('name');

    if (grade && sClass && number && name) {
        currentStudentInfo = { grade, sClass, number, name };
        const studentDataFromDB = await fetchStudentInfo(grade, sClass, number);

        if (studentDataFromDB && studentDataFromDB.name === name) {
            console.log("URL 파라미터로 학생 정보 확인됨. 메인 화면으로 이동.");
            studentDisplay.textContent = `${grade}학년 ${sClass}반 ${number}번 ${name}님`;
            showMainContentScreen();
            loadStampState(); // 스탬프 상태 로드 및 10개 달성 여부 확인
            startQrScanner(); // QR 스캐너 시작
            return;
        } else {
            console.warn("URL 파라미터 정보가 DB와 일치하지 않거나, 학생 정보가 없습니다. 스플래시 화면으로.");
            currentStudentInfo = null; // 정보 불일치 시 학생 정보 초기화
        }
    }
    showSplashScreen(); // URL 파라미터 없으면 스플래시 화면 표시
}

// 스탬프 상태 로드 함수
async function loadStampState() {
    if (!currentStudentInfo) {
        console.log("현재 학생 정보가 없어 스탬프를 로드할 수 없습니다.");
        return;
    }

    // Apps Script에서 반환하는 객체 구조 변경에 맞춰 수정
    const stampData = await fetchStamps(currentStudentInfo.grade, currentStudentInfo.sClass, currentStudentInfo.number);
    const stampedClasses = stampData.stampedClubs; // 찍힌 스탬프 목록
    const hasTenStamps = stampData.hasTenStamps; // 10개 이상 여부
    const bestClubVote = stampData.bestClubVote; // 최고 동아리 투표

    stampImages.forEach(img => {
        const stampId = parseInt(img.id.replace('stamp-', ''), 10);
        // 스탬프가 찍혔으면 불투명하게, 안 찍혔으면 흐리게 (html에 hidden 클래스로 초기 설정되어 있음)
        if (stampedClasses.includes(stampId)) {
            img.classList.remove('hidden'); // 찍힌 스탬프는 보이게
            // 만약 stamp_filled.png 같은 찍힌 이미지가 있다면 src를 변경
            // img.src = `images/stamp_filled.png`; // 예시
        } else {
            img.classList.add('hidden'); // 안 찍힌 스탬프는 숨김 (또는 opacity 조정)
            // img.src = `images/stamp_base.png`; // 예시
        }
    });

    // 10개 이상 스탬프 달성 메시지 표시 로직
    if (hasTenStamps) {
        tenStampsMessageDiv.classList.remove('hidden');
        if (bestClubVote) {
            bestClubInput.value = bestClubVote; // 기존 투표 값 있으면 표시
            bestClubInput.disabled = true; // 투표했으면 수정 불가
            submitBestClubBtn.disabled = true; // 투표했으면 버튼 비활성화
            bestClubVoteStatus.textContent = `이미 '${bestClubVote}'에 투표했습니다.`;
        } else {
            bestClubInput.value = ""; // 초기화
            bestClubInput.disabled = false;
            submitBestClubBtn.disabled = false;
            bestClubVoteStatus.textContent = "";
        }
    } else {
        tenStampsMessageDiv.classList.add('hidden');
    }

    checkAllStampsCollected(stampedClasses); // 모든 스탬프가 찍혔는지 확인
}

// 스탬프 적용 함수
async function applyStamp(stampId) {
    if (!currentStudentInfo) {
        alert('학생 정보가 없어 스탬프를 적용할 수 없습니다. 다시 시작해주세요.');
        return;
    }

    const parsedStampId = parseInt(stampId, 10);

    // 유효한 QR 코드인지, 동아리 개수 범위 내인지 확인
    if (isNaN(parsedStampId) || parsedStampId < 1 || parsedStampId > TOTAL_CLASSES) {
        qrResultDiv.textContent = '유효하지 않은 QR 코드입니다.';
        console.error('Invalid QR Code:', stampId);
        return;
    }

    let stampedClasses = (await fetchStamps(currentStudentInfo.grade, currentStudentInfo.sClass, currentStudentInfo.number)).stampedClubs;

    if (stampedClasses.includes(parsedStampId)) {
        qrResultDiv.textContent = `이미 ${parsedStampId}번 스탬프를 받았습니다!`;
        return;
    }

    stampedClasses.push(parsedStampId);
    stampedClasses.sort((a, b) => a - b); // 스탬프 ID를 오름차순으로 정렬 (관리 용이)

    // saveStamps 함수에 stampedClubs 배열을 직접 전달
    const saveSuccess = await saveStamps(
        currentStudentInfo.grade,
        currentStudentInfo.sClass,
        currentStudentInfo.number,
        currentStudentInfo.name, // 이름 파라미터 추가
        stampedClasses
    );

    if (saveSuccess) {
        const stampImg = document.getElementById(`stamp-${parsedStampId}`);
        if (stampImg) {
            stampImg.classList.remove('hidden'); // 스탬프 이미지를 보이게 함
            qrResultDiv.textContent = `${parsedStampId}번 스탬프를 받았습니다!`;
        }
        // 스탬프 적용 후 loadStampState를 다시 호출하여 10개 이상 여부 및 투표 UI 업데이트
        loadStampState();
    } else {
        qrResultDiv.textContent = '스탬프 저장에 실패했습니다.';
    }
}

// 모든 스탬프를 모았는지 확인하는 함수
function checkAllStampsCollected(currentStampedClasses) {
    if (!currentStudentInfo) return; // 학생 정보 없으면 체크 안 함

    if (currentStampedClasses.length >= TOTAL_CLASSES) {
        qrResultDiv.textContent = '모든 스탬프를 다 모았습니다! 축하합니다!';
    }
}

// QR 스캐너 시작 함수
async function startQrScanner() {
    console.log("QR 스캐너 시작 시도...");

    const qrCodeRegionId = "qr-video"; // QR 비디오가 표시될 HTML 요소의 ID
    qrResultDiv.textContent = 'QR 코드를 스캔 중...'; // 초기 스캔 메시지
    qrVideo.classList.remove('hidden'); // 비디오 컨테이너 보이기

    // 스캐너가 이미 실행 중이면 중복 실행 방지
    if (html5QrCode && html5QrCode.isScanning) {
        console.log("QR 스캐너가 이미 실행 중입니다. 재시작하지 않습니다.");
        return;
    }

    // 기존 스캐너 인스턴스가 있다면 중지 시도 (안전하게 재시작하기 위함)
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            console.log("기존 QR 스캐너 인스턴스 stop 완료.");
        } catch (err) {
            console.warn("기존 QR 스캐너 stop 중 오류 발생 (이미 중지되었을 수 있음):", err);
        }
    }

    // Html5Qrcode 인스턴스 생성 또는 재사용
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode(qrCodeRegionId);
        console.log("새로운 Html5Qrcode 인스턴스 생성됨.");
    } else {
        console.log("기존 Html5Qrcode 인스턴스 재사용.");
    }

    const config = {
        fps: 10, // 초당 프레임 수 (스캔 속도)
        qrbox: { width: 250, height: 250 }, // QR 스캔 영역 크기
        videoConstraints: {
            facingMode: "environment", // 후면 카메라 사용 ('user'는 전면)
            width: { ideal: 1280 }, // 해상도 (선택 사항)
            height: { ideal: 720 }   // 해상도 (선택 사항)
        }
    };

    try {
        await html5QrCode.start(
            config.videoConstraints, // 카메라 제약 조건
            config,                   // 기타 설정 (qrbox, fps 등)
            (decodedText, decodedResult) => {
                // QR 코드 스캔 성공 시 호출되는 콜백 함수
                qrResultDiv.textContent = `스캔 완료: ${decodedText}`;
                console.log(`QR 코드 감지: ${decodedText}`);
                applyStamp(decodedText); // 스캔된 QR 코드 값으로 스탬프 적용

                // 스캔 성공 후 스캐너를 잠시 중지하고 일정 시간 후 다시 시작하여 중복 스캔 방지
                if (html5QrCode.isScanning) { // 스캐너가 아직 실행 중인지 확인
                    console.log("QR 스캔 성공, 스캐너 일시 중지...");
                    html5QrCode.stop().then(ignore => {
                        console.log("스캐너 일시 중지 완료.");
                        setTimeout(() => {
                            console.log("성공 스캔 지연 후 스캐너 재시작...");
                            startQrScanner(); // 일정 시간 후 스캐너 다시 시작
                        }, 2000); // 2초 후 재시작
                    }).catch(err => {
                        console.error("스캔 성공 후 스캐너 중지 실패:", err);
                    });
                }
            },
            (errorMessage) => {
                // QR 스캔 진행 중 오류가 아니면 호출되지 않음 (디버깅용)
                // console.log(`QR 스캔 오류: ${errorMessage}`);
            }
        );
        console.log("QR 스캐너 성공적으로 시작됨.");
    } catch (err) {
        qrResultDiv.textContent = `카메라를 시작할 수 없습니다. 권한을 확인해주세요. (오류: ${err.message || err})`;
        console.error("QR 스캐너 시작 실패:", err);
        qrVideo.classList.add('hidden'); // 오류 시 비디오 컨테이너 숨김
    }
}


// 관리자 모드 활성화/비활성화 토글
function toggleMasterMode() {
    isMasterMode = !isMasterMode;
    controlsDiv.innerHTML = ''; // 기존 버튼 모두 제거

    if (isMasterMode) {
        // 모든 스탬프 채우기 버튼
        const fillAllBtn = document.createElement('button');
        fillAllBtn.textContent = '모든 스탬프 채우기';
        fillAllBtn.addEventListener('click', async () => {
            if (!currentStudentInfo) {
                alert('학생 정보가 없어 스탬프를 적용할 수 없습니다.');
                return;
            }
            if (confirm('모든 스탬프를 정말 채우시겠습니까? 이 작업은 되돌릴 수 없습니다!')) {
                const allStamps = Array.from({ length: TOTAL_CLASSES }, (_, i) => i + 1); // 1부터 TOTAL_CLASSES까지 배열 생성
                const saveSuccess = await saveStamps(
                    currentStudentInfo.grade,
                    currentStudentInfo.sClass,
                    currentStudentInfo.number,
                    currentStudentInfo.name,
                    allStamps
                );
                if (saveSuccess) {
                    loadStampState();
                    alert('모든 스탬프를 채웠습니다!');
                } else {
                    alert('모든 스탬프 채우기 실패!');
                }
            }
        });
        controlsDiv.appendChild(fillAllBtn);

        // 현재 학생 스탬프 초기화 버튼
        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = '현재 학생 스탬프 초기화';
        clearAllBtn.addEventListener('click', async () => {
            if (!currentStudentInfo) {
                alert('학생 정보가 없어 초기화할 스탬프가 없습니다.');
                return;
            }
            if (confirm('현재 학생의 스탬프를 정말 초기화하시겠습니까?')) {
                const saveSuccess = await saveStamps(
                    currentStudentInfo.grade,
                    currentStudentInfo.sClass,
                    currentStudentInfo.number,
                    currentStudentInfo.name,
                    [] // 빈 배열을 전달하여 스탬프 초기화
                );
                if (saveSuccess) {
                    loadStampState();
                    alert('현재 학생의 스탬프가 초기화되었습니다.');
                } else {
                    alert('스탬프 초기화 실패!');
                }
            }
        });
        controlsDiv.appendChild(clearAllBtn);

        // 각 동아리별 수동 스탬프 버튼
        for (let i = 1; i <= TOTAL_CLASSES; i++) {
            const classBtn = document.createElement('button');
            classBtn.classList.add('class-control-button');
            classBtn.dataset.class = i; // 데이터 속성에 스탬프 ID 저장
            classBtn.textContent = `${i}번 동아리`;
            classBtn.addEventListener('click', () => {
                applyStamp(i); // 클릭 시 해당 스탬프 적용
            });
            controlsDiv.appendChild(classBtn);
        }

        // 관리자 모드 종료 버튼
        const exitMasterBtn = document.createElement('button');
        exitMasterBtn.textContent = '관리자 모드 종료';
        exitMasterBtn.addEventListener('click', toggleMasterMode);
        controlsDiv.appendChild(exitMasterBtn);

    } else {
        // 일반 사용자 모드에서는 추가 버튼 없음
        // 추후 필요하다면 여기에 다른 버튼 추가 가능
    }
}


// --- 이벤트 리스너 ---

// 정보 제출 버튼 클릭 이벤트
submitInfoBtn.addEventListener('click', async () => {
    const grade = inputGrade.value.trim();
    const sClass = inputClass.value.trim();
    const number = inputNumber.value.trim();
    const name = inputName.value.trim();

    if (!grade || !sClass || !number || !name) {
        alert('모든 정보를 입력해주세요.');
        return;
    }

    const gradeNum = parseInt(grade, 10);
    const classNum = parseInt(sClass, 10);
    const numberNum = parseInt(number, 10);

    // 입력 값 유효성 검사 (학교 학년/반/번호 범위에 맞게 조정)
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) { 
        alert('학년은 1부터 6 사이의 숫자로 입력해주세요.');
        return;
    }
    if (isNaN(classNum) || classNum < 1 || classNum > 10) { 
        alert('반은 1부터 10 사이의 숫자로 입력해주세요.');
        return;
    }
    if (isNaN(numberNum) || numberNum < 1 || numberNum > 50) { // 예시: 번호는 1부터 50
        alert('번호는 1 이상의 올바른 숫자로 입력해주세요.');
        return;
    }

    const studentInfo = {
        grade: grade,
        sClass: sClass,
        number: number,
        name: name
    };

    const saveSuccess = await saveStudentInfo(studentInfo); // 학생 정보 DB에 저장 시도

    if (saveSuccess) {
        currentStudentInfo = studentInfo; // 현재 로그인한 학생 정보 저장
        studentDisplay.textContent = `${grade}학년 ${sClass}반 ${number}번 ${name}님`; // 화면에 학생 정보 표시
        alert('정보가 저장되었습니다. 스탬프 화면으로 이동합니다.');
        showMainContentScreen(); // 메인 화면으로 전환
        await loadStampState(); // 스탬프 상태 로드 및 UI 업데이트
        startQrScanner(); // QR 스캐너 시작
    } else {
        alert('학생 정보 저장에 실패했습니다.');
    }
});


// 최고 동아리 투표 버튼 클릭 이벤트
submitBestClubBtn.addEventListener('click', async () => {
    if (!currentStudentInfo) {
        alert('학생 정보가 없어 투표할 수 없습니다.');
        return;
    }

    const bestClub = bestClubInput.value.trim();
    if (!bestClub) {
        alert('가장 잘했다고 생각하는 동아리 이름을 입력해주세요.');
        return;
    }

    const saveSuccess = await saveBestClubVote(currentStudentInfo.grade, currentStudentInfo.sClass, currentStudentInfo.number, bestClub);

    if (saveSuccess) {
        alert(`'${bestClub}'에 투표해주셔서 감사합니다!`);
        bestClubInput.disabled = true; // 투표 후 입력 필드 비활성화
        submitBestClubBtn.disabled = true; // 투표 후 버튼 비활성화
        bestClubVoteStatus.textContent = `이미 '${bestClub}'에 투표했습니다.`;
    } else {
        alert('투표 저장에 실패했습니다.');
    }
});


// 동아리 위치 안내 버튼 클릭 이벤트
showLocationGuideBtn.addEventListener('click', async () => {
    console.log("동아리 위치 안내 버튼 클릭됨.");
    if (html5QrCode && html5QrCode.isScanning) {
        console.log("위치 안내 진입 전 QR 스캐너 중지 시도...");
        try {
            await html5QrCode.stop(); // 스캐너 중지
            console.log("QR 스캐너 중지 완료.");
        } catch (err) {
            console.warn("QR 스캐너 중지 중 오류 발생 (이미 중지되었을 수 있음):", err);
        }
    } else {
        console.log("QR 스캐너가 실행 중이 아님.");
    }
    showLocationGuideScreen(); // 위치 안내 화면 표시
});

// 위치 안내 페이지 나가기 버튼 클릭 이벤트
closeLocationGuideBtn.addEventListener('click', () => {
    console.log("위치 안내 페이지 나가기 버튼 클릭됨.");
    showMainContentScreen(); // 메인 화면으로 전환

    console.log("위치 안내 종료 후 QR 스캐너 재시작 시도...");
    // 메인 화면으로 돌아온 후 잠시 대기 후 QR 스캐너 재시작 (화면 전환 애니메이션 등 고려)
    setTimeout(() => {
        if (html5QrCode && !html5QrCode.isScanning) { // 스캐너가 존재하고 현재 스캔 중이 아닐 때만 재시작
            startQrScanner();
        } else if (!html5QrCode) { // 스캐너가 아예 초기화되지 않았다면 새로 시작
            startQrScanner();
        } else {
            console.log("QR 스캐너가 이미 실행 중이거나 초기화 중입니다. 재시작하지 않습니다.");
        }
    }, 500); // 0.5초 대기
});


// 10번 스탬프 클릭 시 관리자 모드 토글 (Ctrl + 클릭 또는 Cmd + 클릭)
// 이 기능은 개발/테스트용으로, 실제 운영 시에는 다른 방식으로 관리자 모드 진입을 구현하는 것이 좋습니다.
document.getElementById('stamp-10').addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey) { // Ctrl 키 (Windows/Linux) 또는 Command 키 (macOS)와 함께 클릭 시
        event.preventDefault(); // 기본 스탬프 적용 동작 방지
        toggleMasterMode(); // 관리자 모드 토글
    }
});


// 페이지 로드 시 초기 학생 정보 확인 함수 호출 (매우 중요)
checkStudentInfo();