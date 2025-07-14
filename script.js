// script.js 파일 전체 코드 - Firebase Realtime Database 및 Authentication 사용

// Firebase SDK는 index.html에서 이미 초기화되었으므로,
// 여기서는 초기화된 'auth'와 'database' 전역 객체를 사용합니다.
// (index.html에서 window.auth, window.database로 할당됨)

// 중요: Firebase Realtime Database의 모듈식 API 함수들을 직접 가져옵니다.
// index.html에서 type="module"로 이 스크립트가 로드되므로 가능합니다.
// 이 import 문이 없으면 'ref', 'get', 'set', 'update' 등의 함수를 인식하지 못합니다.
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// 만약 auth를 사용한다면:
// import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// 기존 Google Sheets API 관련 상수들은 이제 필요 없으므로 제거합니다.
// const CLIENT_ID = "YOUR_CLIENT_ID";
// const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
// const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// Firebase Realtime Database의 데이터 경로 (노드 이름) 정의
const STUDENTS_DB_PATH = "students"; // 학생 정보가 저장될 경로
const STAMPS_DB_PATH = "stamps";     // 스탬프 정보가 저장될 경로
const CLUBS_DB_PATH = "clubs";       // 동아리 목록이 저장될 경로

// index.html에서 초기화된 Firebase 서비스 객체들을 가져올 변수 선언
let auth;
let database; // 이 database 변수에는 getDatabase()로 얻은 Realtime Database 인스턴스가 할당될 것임

// DOMContentLoaded 이벤트는 HTML 문서가 완전히 로드되고 파싱된 후에 실행됩니다.
document.addEventListener('DOMContentLoaded', async () => {
    // Firebase 서비스 객체들을 전역 window 객체에서 가져와 사용합니다.
    auth = window.auth;
    database = window.database; // 여기서 database는 이미 getDatabase()로 얻은 인스턴스여야 함

    // Firebase 서비스가 제대로 초기화되었는지 확인
    if (!auth || !database) {
        console.error("Firebase Auth 또는 Database가 초기화되지 않았습니다. index.html을 확인해주세요.");
        alert("앱 초기화 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인해주세요.");
        return; // 초기화 실패 시 앱 실행 중단
    }
    console.log("script.js에서 Firebase Auth 및 Database 객체 사용 가능.");
    // console.log("Firebase Database 인스턴스 확인:", database); // 디버깅용: database 객체 내용 확인


    // ====================================================================
    // Firebase Authentication (Google 로그인) 관련 함수
    // 이 앱에서는 학번/반/번호 입력 방식이므로, Google 로그인은 선택 사항입니다.
    // 필요하다면 submitInfoBtn 클릭 시 이 함수를 호출하여 로그인 과정을 추가할 수 있습니다.
    // ====================================================================

    // Firebase Auth v9+ 스타일로 수정
    // 이 함수는 현재 앱 흐름에서 사용되지 않는 것으로 주석처리 되어있습니다.
    /*
    async function signInWithGoogle() {
        // 이 함수가 사용되려면 index.html에서 Auth 관련 모듈도 적절히 import 되어야 함.
        // 그리고 이 스크립트 상단에 signInWithPopup, GoogleAuthProvider를 import 해야 함.
        const provider = new GoogleAuthProvider(); // firebase.auth.GoogleAuthProvider() 대신
        try {
            console.log("Google 로그인 팝업 시도 중...");
            await signInWithPopup(auth, provider); // auth.signInWithPopup() 대신
            console.log("Google 로그인 성공!");
            return true;
        } catch (error) {
            console.error("Google 로그인 실패:", error);
            alert("Google 로그인에 실패했습니다. 오류: " + error.message);
            return false;
        }
    }
    */

    // ====================================================================
    // Firebase Realtime Database 호출 함수들 (기존 Google Sheets API 대체)
    // !!! 핵심 수정: ref() 함수 사용 방식 변경 및 get(), set(), update() 사용 !!!
    // ====================================================================

    // 학생 정보 가져오기 (기존 getStudentInfo 함수 대체)
    async function getStudentInfoFirebase(grade, sClass, number) {
        const studentId = `${grade}-${sClass}-${number}`;
        try {
            console.log(`Firebase 학생 정보 로드 시도 중: ${studentId}`);
            // 수정: database.ref() -> ref(database, 경로) 및 get() 사용
            const studentRef = ref(database, `${STUDENTS_DB_PATH}/${studentId}`);
            const snapshot = await get(studentRef); // .once('value') 대신 get() 사용

            if (snapshot.exists()) {
                console.log("Firebase 학생 정보 로드 성공:", snapshot.val());
                return snapshot.val();
            } else {
                console.log(`Firebase에 ${studentId} 학생 정보 없음.`);
                return null;
            }
        } catch (error) {
            console.error("Firebase 학생 정보 로드 중 오류 발생:", error);
            alert("학생 정보 로드 중 오류 발생: " + error.message);
            return null;
        }
    }

    // 스탬프 정보 가져오기 (기존 getStamps 함수 대체)
    async function getStampsFirebase(grade, sClass, number) {
        const studentId = `${grade}-${sClass}-${number}`;
        try {
            console.log(`Firebase 스탬프 정보 로드 시도 중: ${studentId}`);
            // 수정: database.ref() -> ref(database, 경로) 및 get() 사용
            const stampsRef = ref(database, `${STAMPS_DB_PATH}/${studentId}`);
            const snapshot = await get(stampsRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log("Firebase 스탬프 정보 로드 성공:", data);
                return {
                    stampedClubs: data.stampedClubs || [],
                    hasTenStamps: data.hasTenStamps || false,
                    bestClubVote: data.bestClubVote || ""
                };
            } else {
                console.log(`Firebase에 ${studentId} 스탬프 정보 없음.`);
                return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" };
            }
        } catch (error) {
            console.error("Firebase 스탬프 정보 로드 중 오류 발생:", error);
            alert("스탬프 정보 로드 중 오류 발생: " + error.message);
            return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" };
        }
    }

    // 학생 정보 저장/업데이트 (기존 saveStudentInfo 함수 대체)
    async function saveStudentInfoFirebase(studentInfo) {
        const studentId = `${studentInfo.grade}-${studentInfo.sClass}-${studentInfo.number}`;
        try {
            console.log(`Firebase 학생 정보 저장/업데이트 시도 중: ${studentId}`);
            // 수정: database.ref().set() -> set(ref(database, 경로), 데이터)
            const studentRef = ref(database, `${STUDENTS_DB_PATH}/${studentId}`);
            await set(studentRef, studentInfo);
            console.log("Firebase 학생 정보 저장/업데이트 완료.");
            return { success: true, message: "Student info saved/updated in Firebase." };
        } catch (error) {
            console.error("Firebase 학생 정보 저장 중 오류 발생:", error);
            alert("학생 정보 저장 중 오류 발생: " + error.message);
            return { success: false, message: error.message };
        }
    }

    // 스탬프 정보 저장/업데이트 (기존 saveStamps 함수 대체)
    async function saveStampsFirebase(studentInfo) {
        const studentId = `${studentInfo.grade}-${studentInfo.sClass}-${studentInfo.number}`;
        try {
            console.log(`Firebase 스탬프 정보 저장/업데이트 시도 중: ${studentId}`);
            const dataToSave = {
                stampedClubs: studentInfo.stampedClubs || [],
                hasTenStamps: studentInfo.stampedClubs.length >= 10 ? 'O' : 'X',
                bestClubVote: studentInfo.bestClubVote || ""
            };
            // 수정: database.ref().update() -> update(ref(database, 경로), 데이터)
            const stampsRef = ref(database, `${STAMPS_DB_PATH}/${studentId}`);
            await update(stampsRef, dataToSave);
            console.log("Firebase 스탬프 정보 저장/업데이트 완료.");
            return { success: true, message: "Stamps saved/updated in Firebase." };
        } catch (error) {
            console.error("Firebase 스탬프 저장 중 오류 발생:", error);
            alert("스탬프 저장 중 오류 발생: " + error.message);
            return { success: false, message: error.message };
        }
    }

    // 최고 동아리 투표 저장 (기존 saveBestClubVote 함수 대체)
    async function saveBestClubVoteFirebase(studentInfo) {
        const studentId = `${studentInfo.grade}-${studentInfo.sClass}-${studentInfo.number}`;
        try {
            console.log(`Firebase 최고 동아리 투표 저장 시도 중: ${studentId}`);
            // 수정: database.ref().update() -> update(ref(database, 경로), 데이터)
            const stampsRef = ref(database, `${STAMPS_DB_PATH}/${studentId}`);
            await update(stampsRef, { bestClubVote: studentInfo.bestClub });
            console.log("Firebase 최고 동아리 투표 저장 완료.");
            return { success: true, message: "Best club vote saved in Firebase." };
        } catch (error) {
            console.error("Firebase 최고 동아리 투표 저장 중 오류 발생:", error);
            alert("최고 동아리 투표 저장 중 오류 발생: " + error.message);
            return { success: false, message: error.message };
        }
    }

    // 동아리 목록 가져오기 (기존 getClubList 함수 대체)
    async function getClubListFirebase() {
        try {
            console.log("Firebase 동아리 목록 로드 시도 중...");
            // 수정: database.ref() -> ref(database, 경로) 및 get() 사용
            const clubsRef = ref(database, CLUBS_DB_PATH);
            const snapshot = await get(clubsRef);
            const clubs = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    // Realtime Database의 키는 문자열이므로, ID로 사용하려면 숫자로 변환합니다.
                    // Firebase에 동아리 데이터가 { "1": { "name": "동아리A" }, "2": { "name": "동아리B" } } 형태로 저장되어 있다고 가정.
                    clubs.push({ id: Number(childSnapshot.key), name: childSnapshot.val().name });
                });
                console.log("Firebase 동아리 목록 로드 성공:", clubs);
            } else {
                console.warn("Firebase에 동아리 목록 없음.");
            }
            return clubs;
        } catch (error) {
            console.error("Firebase 동아리 목록 로드 중 오류 발생:", error);
            alert("동아리 목록 로드 중 오류 발생: " + error.message);
            return [];
        }
    }


    // ====================================================================
    // HTML 요소 및 이벤트 리스너 (DOM 조작) - 기존 로직을 Firebase 함수로 교체
    // ====================================================================

    // ... (이 아래 부분은 변경 없이 그대로 두시면 됩니다.)
    // 이 코드들은 위에서 수정한 Firebase 함수들을 호출합니다.

    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');
    const locationGuideScreen = document.getElementById('location-guide-screen');

    const inputGrade = document.getElementById('inputGrade');
    const inputClass = document.getElementById('inputClass');
    const inputNumber = document.getElementById('inputNumber');
    const inputName = document.getElementById('inputName');
    const submitInfoBtn = document.getElementById('submitInfoBtn');

    const studentDisplay = document.getElementById('student-display');
    const qrVideo = document.getElementById('qr-video'); // QR 스캐너 비디오 요소
    const qrResult = document.getElementById('qr-result'); // QR 스캔 결과 표시 요소
    const tenStampsMessage = document.getElementById('ten-stamps-message');
    const bestClubInput = document.getElementById('bestClubInput');
    const submitBestClubBtn = document.getElementById('submitBestClubBtn');
    const bestClubVoteStatus = document.getElementById('bestClubVoteStatus');
    const showLocationGuideBtn = document.getElementById('showLocationGuideBtn');

    const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn');

    // 스탬프 이미지 요소들을 객체에 저장
    const stampElements = {};
    for (let i = 1; i <= 15; i++) {
        stampElements[`stamp-${i}`] = document.getElementById(`stamp-${i}`);
    }

    // 앱의 현재 상태를 저장할 변수들
    let currentStudent = null; // 현재 로그인된 학생 정보
    let currentStampedClubs = []; // 현재 학생이 찍은 스탬프 동아리 ID 목록
    let clubDataList = []; // 동아리 목록 데이터

    // 화면 전환 함수
    function showScreen(screenElement) {
        splashScreen.style.display = 'none';
        mainContent.style.display = 'none';
        locationGuideScreen.style.display = 'none';
        if (screenElement) {
            screenElement.style.display = 'flex'; // 화면을 보이게 함
            console.log(`화면: ${screenElement.id}`);
        } else {
            console.error("유효하지 않은 화면 요소입니다.");
        }
    }

    showScreen(splashScreen); // 앱 시작 시 스플래시 화면 표시

    // "시작하기" 버튼 클릭 이벤트 리스너
    submitInfoBtn.addEventListener('click', async () => {
        const grade = inputGrade.value;
        const sClass = inputClass.value;
        const number = inputNumber.value;
        const name = inputName.value;

        // 필수 입력 필드 확인
        if (!grade || !sClass || !number) {
            alert('학년, 반, 번호는 필수 입력 사항입니다.');
            return;
        }

        // 입력값을 숫자로 형변환하여 학생 정보 객체 생성
        const student = { grade: Number(grade), sClass: Number(sClass), number: Number(number), name: name };

        try {
            // Firebase Google 로그인 시도 (선택 사항: 필요하다면 아래 주석 해제)
            // 이 앱에서는 학번/반/번호로 학생을 식별하므로, Google 로그인이 필수는 아닙니다.
            // 만약 Google 로그인으로 학생을 인증하고 싶다면, 이 부분을 활성화하고
            // Firebase Auth를 통해 사용자를 관리해야 합니다.
            // const loggedIn = await signInWithGoogle();
            // if (!loggedIn) {
            //    return; // 로그인 실패 시 앱 진행 중단
            // }

            // 동아리 목록 로드 (Firebase 함수 호출)
            clubDataList = await getClubListFirebase();
            console.log("동아리 목록 로드 완료 (Firebase):", clubDataList);
            if (clubDataList.length === 0) {
                alert("동아리 목록을 가져오지 못했습니다. Firebase Realtime Database의 'clubs' 경로를 확인해주세요.");
            }

            // 학생 정보 확인 (Firebase 함수 호출)
            const existingStudent = await getStudentInfoFirebase(student.grade, student.sClass, student.number);

            if (existingStudent) {
                // 기존 학생 정보가 있을 경우 이름 업데이트 로직
                if (existingStudent.name !== name && name !== "") {
                    // alert 대신 confirm 사용 (Canvas 환경에서 alert/confirm은 모달로 대체 권장)
                    const confirmUpdate = confirm(`기존 학생 정보가 있습니다: ${existingStudent.name} 학생. 이름을 ${name}(으)로 업데이트하시겠습니까?`);
                    if (confirmUpdate) {
                        const saveResult = await saveStudentInfoFirebase(student); // Firebase 함수 호출
                        if (saveResult.success) {
                            alert('학생 정보가 업데이트되었습니다.');
                        } else {
                            throw new Error(saveResult.message);
                        }
                    } else {
                        student.name = existingStudent.name; // 업데이트 취소 시 기존 이름 유지
                    }
                } else if (name === "" && existingStudent.name) {
                    student.name = existingStudent.name; // 이름 입력 안 했으면 기존 이름 사용
                } else if (name === "" && !existingStudent.name) {
                    alert('학생 이름을 입력해주세요.'); // 기존 이름도 없는데 이름 입력 안 한 경우
                    return;
                }
                currentStudent = student; // 현재 학생 정보 업데이트

            } else {
                // 새로운 학생 정보일 경우 저장 로직
                if (!name) {
                    alert('새로운 학생의 이름은 필수 입력 사항입니다.');
                    return;
                }
                const saveResult = await saveStudentInfoFirebase(student); // Firebase 함수 호출
                if (saveResult.success) {
                    alert('새로운 학생 정보가 저장되었습니다.');
                    currentStudent = student; // 현재 학생 정보 설정
                } else {
                    throw new Error(saveResult.message);
                }
            }

            // 스탬프 정보 로드 및 화면 업데이트 (Firebase 함수 호출)
            const stampData = await getStampsFirebase(currentStudent.grade, currentStudent.sClass, currentStudent.number);
            currentStampedClubs = stampData.stampedClubs;

            updateStudentInfoDisplay(); // 학생 정보 표시 업데이트
            updateStampImages(); // 스탬프 이미지 업데이트
            updateTenStampsMessage(); // 10개 스탬프 메시지 업데이트
            showScreen(mainContent); // 메인 화면으로 전환

        } catch (error) {
            console.error('학생 정보 처리 중 오류 발생 (Firebase):', error);
            alert(`학생 정보 처리 중 오류 발생: ${error.message || error}`);
        }
    });

    // 학생 정보 표시 업데이트 함수
    function updateStudentInfoDisplay() {
        if (currentStudent) {
            studentDisplay.textContent = `${currentStudent.grade}학년 ${currentStudent.sClass}반 ${currentStudent.number}번 ${currentStudent.name} 학생 (스탬프: ${currentStampedClubs.length}개)`;
        } else {
            studentDisplay.textContent = '학생 정보를 찾을 수 없습니다.';
        }
    }

    // 스탬프 이미지 표시 업데이트 함수
    function updateStampImages() {
        // 모든 스탬프 이미지를 기본 상태로 초기화
        for (let i = 1; i <= 15; i++) {
            if (stampElements[`stamp-${i}`]) {
                stampElements[`stamp-${i}`].src = `images/stamp_base.png`;
                stampElements[`stamp-${i}`].classList.remove('stamped');
            }
        }

        // 현재 학생이 찍은 스탬프에 해당하는 이미지를 업데이트
        currentStampedClubs.forEach(clubId => {
            const stampImg = stampElements[`stamp-${clubId}`];
            if (stampImg) {
                stampImg.src = `images/stamp_${clubId}.png`; // 해당 동아리 스탬프 이미지로 변경
                stampImg.classList.add('stamped'); // 'stamped' 클래스 추가 (CSS 스타일링용)
            }
        });
    }

    // 10개 스탬프 달성 메시지 및 투표 상태 업데이트 함수
    function updateTenStampsMessage() {
        if (currentStampedClubs.length >= 10) {
            tenStampsMessage.style.display = 'block'; // 메시지 박스 표시
            // 현재 학생의 스탬프 정보를 다시 가져와 투표 상태를 확인
            getStampsFirebase(currentStudent.grade, currentStudent.sClass, currentStudent.number) // Firebase 함수 호출
                .then(stampData => {
                    if (stampData.bestClubVote) {
                        bestClubVoteStatus.textContent = `현재 투표: ${stampData.bestClubVote}`;
                        bestClubInput.value = stampData.bestClubVote;
                        bestClubInput.disabled = true; // 투표했으면 입력 필드 비활성화
                        submitBestClubBtn.disabled = true; // 투표 버튼 비활성화
                    } else {
                        bestClubVoteStatus.textContent = "아직 투표하지 않았습니다.";
                        bestClubInput.disabled = false; // 투표 안 했으면 입력 필드 활성화
                        submitBestClubBtn.disabled = false; // 투표 버튼 활성화
                    }
                })
                .catch(error => console.error("최고 동아리 투표 상태 로드 실패 (Firebase):", error));
        } else {
            tenStampsMessage.style.display = 'none'; // 메시지 박스 숨김
        }
    }

    // 각 스탬프 이미지 클릭 이벤트 리스너 설정
    for (let i = 1; i <= 15; i++) {
        const stampImg = stampElements[`stamp-${i}`];
        if (stampImg) {
            stampImg.addEventListener('click', async () => {
                if (!currentStudent) {
                    alert('먼저 학번과 이름을 입력해주세요.');
                    return;
                }
                const clubId = i; // 클릭된 스탬프의 ID

                if (!currentStampedClubs.includes(clubId)) { // 이미 찍은 스탬프가 아니면
                    currentStampedClubs.push(clubId); // 스탬프 목록에 추가
                    await saveStampsFirebase({ // Firebase 함수 호출하여 스탬프 정보 저장
                        ...currentStudent,
                        stampedClubs: currentStampedClubs,
                        name: currentStudent.name,
                        // 스탬프 저장 시 기존 투표 정보가 날아가지 않도록 다시 불러와서 함께 저장
                        bestClubVote: (await getStampsFirebase(currentStudent.grade, currentStudent.sClass, currentStudent.number)).bestClubVote
                    });
                    // 동아리 이름 찾아서 알림
                    alert(`${clubDataList.find(c => c.id === clubId)?.name || '해당 동아리'} 스탬프가 찍혔습니다!`);
                    updateStampImages(); // 스탬프 이미지 다시 그리기
                    updateStudentInfoDisplay(); // 학생 정보 표시 업데이트
                    updateTenStampsMessage(); // 10개 스탬프 메시지 업데이트
                } else {
                    alert('이미 스탬프를 찍은 동아리입니다.'); // 이미 찍은 스탬프인 경우
                }
            });
        }
    }

    // 최고 동아리 투표 버튼 클릭 이벤트 리스너
    submitBestClubBtn.addEventListener('click', async () => {
        if (!currentStudent) {
            alert('먼저 학번과 이름을 입력해주세요.');
            return;
        }
        const bestClubName = bestClubInput.value.trim(); // 입력된 동아리 이름
        if (!bestClubName) {
            alert('투표할 동아리 이름을 입력해주세요.');
            return;
        }

        const saveResult = await saveBestClubVoteFirebase({ // Firebase 함수 호출하여 투표 저장
            ...currentStudent,
            bestClub: bestClubName
        });

        if (saveResult.success) {
            alert(`${bestClubName}에 투표했습니다!`);
            updateTenStampsMessage(); // 투표 상태 업데이트
        } else {
            alert(`투표 저장 실패: ${saveResult.message}`);
        }
    });

    // 동아리 위치 안내 버튼 클릭 이벤트 리스너
    showLocationGuideBtn.addEventListener('click', () => {
        showScreen(locationGuideScreen); // 위치 안내 화면 표시
    });

    // 위치 안내 화면에서 뒤로 가기 버튼 클릭 이벤트 리스너
    closeLocationGuideBtn.addEventListener('click', () => {
        showScreen(mainContent); // 메인 화면으로 돌아가기
    });
});