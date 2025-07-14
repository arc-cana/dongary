// script.js 파일 전체 코드 - index.html 구조에 맞춤 (OAuth 클라이언트 ID 사용)

// ====================================================================
// !!! 중요: 이 부분을 여러분이 생성한 OAuth 클라이언트 ID로 변경하세요 !!!
const CLIENT_ID = "795499292540-npdno6q7obp55j9kpsal3a9jvq5jn3v0.apps.googleusercontent.com";
// 예시: "123456789012-abcdefg1234567890abcdefg1234567890.apps.googleusercontent.com";
// ====================================================================

// !!! 중요: 이 부분을 여러분의 스프레드시트 ID로 변경하세요 !!!
const SPREADSHEET_ID = "1UNytXjxoJKbQ1sP7PpEm6r-boVn46bNJzJVPRA_EQY8"; // 실제 스프레드시트 ID로 변경

const STUDENTS_SHEET_NAME = "Students"; // Students 시트 이름
const STAMPS_SHEET_NAME = "Stamps"; // Stamps 시트 이름
const CLUB_LIST_SHEET_NAME = "ClubList"; // ClubList 시트 이름 (동아리 목록)

// Sheets API에 대한 스코프 (권한)
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gisLoaded = false; // Google Identity Services 라이브러리 로드 여부
let tokenClient; // Google OAuth2.0 클라이언트 객체

// Google API 클라이언트 라이브러리 (gapi) 및 Google Identity Services (GIS) 라이브러리 로드
function loadGoogleAPI() {
    return new Promise((resolve, reject) => {
        // google.accounts.id (GIS) 라이브러리 로드
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        
        gisScript.onload = () => {
            console.log("GIS 스크립트 로드 완료. google 객체 확인:", typeof google);
            if (typeof google !== 'undefined' && google.accounts) {
                console.log("google.accounts 객체 확인:", google.accounts);
                if (google.accounts.oauth2 && typeof google.accounts.oauth2.initOAuth2TokenClient === 'function') {
                    gisLoaded = true; // 로드 완료 플래그 설정
                    tokenClient = google.accounts.oauth2.initOAuth2TokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: '', // 콜백은 requestAccessToken 호출 시 동적으로 제공됩니다.
                    });
                    console.log("Google Identity Services 초기화 성공.");

                    // gapi (Google API 클라이언트) 라이브러리 로드
                    const gapiScript = document.createElement('script');
                    gapiScript.src = 'https://apis.google.com/js/api.js';
                    gapiScript.onload = () => {
                        gapi.load('client', () => {
                            gapi.client.init({
                                discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
                            }).then(() => {
                                console.log("Google API 클라이언트 로드 및 초기화 완료.");
                                resolve();
                            }).catch(err => {
                                console.error("gapi.client.init 실패:", err);
                                reject(err);
                            });
                        });
                    };
                    gapiScript.onerror = (err) => {
                        console.error("gapi 스크립트 로드 실패:", err);
                        reject(err);
                    };
                    document.head.appendChild(gapiScript);
                } else {
                    console.error("GIS 라이브러리 로드 완료 후 'google.accounts.oauth2.initOAuth2TokenClient' 함수를 찾을 수 없습니다. 'google.accounts.oauth2' 객체 상태:", google.accounts.oauth2);
                    reject(new Error("GIS initOAuth2TokenClient not found after load"));
                }
            } else {
                console.error("GIS 스크립트 로드 완료 후 'google' 또는 'google.accounts' 객체를 찾을 수 없습니다.");
                reject(new Error("Google GIS objects not found after load"));
            }
        };
        gisScript.onerror = (err) => {
            console.error("GIS 스크립트 로드 실패: ", err);
            reject(err);
        };
        document.head.appendChild(gisScript);
    });
}

// 인증 확인 및 토큰 요청 함수
async function checkAuthAndGetToken() {
    return new Promise((resolve, reject) => {
        if (!gisLoaded || !tokenClient) {
            // GIS나 tokenClient가 로드되지 않았으면 다시 로드 시도
            loadGoogleAPI().then(() => {
                requestToken();
            }).catch(reject);
        } else {
            requestToken();
        }

        function requestToken() {
            tokenClient.callback = (resp) => {
                if (resp.error) {
                    console.error('인증 실패:', resp.error);
                    alert("Google 인증에 실패했습니다. 새로고침 후 다시 시도해주세요. 오류: " + resp.error);
                    reject(resp.error);
                    return;
                }
                console.log('Google API 토큰 획득:', resp.access_token);
                resolve(resp.access_token);
            };
            tokenClient.requestAccessToken(); // 토큰 요청 시작 (팝업이 뜰 수 있음)
        }
    });
}

// 앱 시작 시 Google API 로드
loadGoogleAPI().then(() => {
    console.log("Google API 클라이언트 및 Identity Services 로드 완료. 이제 인증이 가능합니다.");
}).catch(error => {
    console.error("Google API 로드 또는 초기화 실패:", error);
    alert("앱 초기화 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인해주세요. (오류: " + (error.message || error) + ")");
});

// ====================================================================
// Sheets API 호출 함수들 (이 부분은 이전 코드와 동일)
// ====================================================================

async function getStudentInfo(grade, sClass, number) {
    try {
        await checkAuthAndGetToken();
        const range = `${STUDENTS_SHEET_NAME}!A:D`;
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });
        const studentData = response.result.values;
        if (!studentData || studentData.length < 2) return null;

        let foundStudent = null;
        for (let i = 1; i < studentData.length; i++) {
            if (String(studentData[i][0]) == grade && String(studentData[i][1]) == sClass && String(studentData[i][2]) == number) {
                foundStudent = {
                    grade: studentData[i][0],
                    sClass: studentData[i][1],
                    number: studentData[i][2],
                    name: studentData[i][3]
                };
                break;
            }
        }
        return foundStudent;
    } catch (error) {
        console.error("학생 정보 로드 중 오류 발생:", error);
        alert("학생 정보 로드 중 오류 발생: " + error.message);
        return null;
    }
}

async function getStamps(grade, sClass, number) {
    try {
        await checkAuthAndGetToken();
        const range = `${STAMPS_SHEET_NAME}!A:G`;
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });
        const stampsData = response.result.values;
        if (!stampsData || stampsData.length < 2) return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" };

        let foundStamps = [];
        let hasTenStamps = false;
        let bestClubVote = "";

        for (let i = 1; i < stampsData.length; i++) {
            if (String(stampsData[i][0]) == grade && String(stampsData[i][1]) == sClass && String(stampsData[i][2]) == number) {
                foundStamps = stampsData[i][4] ? String(stampsData[i][4]).split(',').map(Number) : [];
                hasTenStamps = (String(stampsData[i][5]).toUpperCase() === 'O');
                bestClubVote = String(stampsData[i][6]) || "";
                break;
            }
        }
        return { stampedClubs: foundStamps, hasTenStamps: hasTenStamps, bestClubVote: bestClubVote };
    } catch (error) {
        console.error("스탬프 정보 로드 중 오류 발생:", error);
        alert("스탬프 정보 로드 중 오류 발생: " + error.message);
        return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" };
    }
}

async function saveStudentInfo(studentInfo) {
    try {
        await checkAuthAndGetToken();
        const studentSheetName = STUDENTS_SHEET_NAME;
        const studentData = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${studentSheetName}!A:D`,
        });

        const values = studentData.result.values || [];
        let foundRow = -1;
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][0]) == studentInfo.grade && String(values[i][1]) == studentInfo.sClass && String(values[i][2]) == studentInfo.number) {
                foundRow = i + 1;
                break;
            }
        }

        if (foundRow !== -1) {
            const updateRange = `${studentSheetName}!D${foundRow}`;
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[studentInfo.name]]
                },
            });
            console.log("학생 정보 업데이트 완료.");
            return { success: true, message: "Student info updated." };
        } else {
            const appendRange = `${studentSheetName}!A:D`;
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: appendRange,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [[studentInfo.grade, studentInfo.sClass, studentInfo.number, studentInfo.name]]
                },
            });
            console.log("새로운 학생 정보 저장 완료.");
            return { success: true, message: "New student info saved." };
        }
    } catch (error) {
        console.error("학생 정보 저장 중 오류 발생:", error);
        alert("학생 정보 저장 중 오류 발생: " + error.message);
        return { success: false, message: error.message };
    }
}

async function saveStamps(studentInfo) {
    try {
        await checkAuthAndGetToken();
        const stampsSheetName = STAMPS_SHEET_NAME;
        const stampsData = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${stampsSheetName}!A:G`,
        });

        const values = stampsData.result.values || [];
        let foundRow = -1;
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][0]) == studentInfo.grade && String(values[i][1]) == studentInfo.sClass && String(values[i][2]) == studentInfo.number) {
                foundRow = i + 1;
                break;
            }
        }

        const stampedClubsString = studentInfo.stampedClubs.join(',');
        const hasTenStampsMark = studentInfo.stampedClubs.length >= 10 ? 'O' : 'X';

        if (foundRow !== -1) {
            const updateRange = `${stampsSheetName}!E${foundRow}:G${foundRow}`;
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[stampedClubsString, hasTenStampsMark, studentInfo.bestClubVote || ""]]
                },
            });
            console.log("스탬프 정보 업데이트 완료.");
            return { success: true, message: "Stamps updated." };
        } else {
            const appendRange = `${stampsSheetName}!A:G`;
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: appendRange,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [[studentInfo.grade, studentInfo.sClass, studentInfo.number, studentInfo.name || "", stampedClubsString, hasTenStampsMark, studentInfo.bestClubVote || ""]]
                },
            });
            console.log("새로운 스탬프 정보 저장 완료.");
            return { success: true, message: "New stamps saved." };
        }
    } catch (error) {
        console.error("스탬프 저장 중 오류 발생:", error);
        alert("스탬프 저장 중 오류 발생: " + error.message);
        return { success: false, message: error.message };
    }
}

async function saveBestClubVote(studentInfo) {
    try {
        await checkAuthAndGetToken();
        const stampsSheetName = STAMPS_SHEET_NAME;
        const stampsData = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${stampsSheetName}!A:G`,
        });

        const values = stampsData.result.values || [];
        let foundRow = -1;
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][0]) == studentInfo.grade && String(values[i][1]) == studentInfo.sClass && String(values[i][2]) == studentInfo.number) {
                foundRow = i + 1;
                break;
            }
        }

        if (foundRow !== -1) {
            const updateRange = `${stampsSheetName}!G${foundRow}`;
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[studentInfo.bestClub]]
                },
            });
            console.log("최고 동아리 투표 저장 완료.");
            return { success: true, message: "Best club vote saved." };
        } else {
            console.warn("학생을 찾을 수 없어 최고 동아리 투표를 저장할 수 없습니다.");
            alert("학생을 찾을 수 없어 최고 동아리 투표를 저장할 수 없습니다.");
            return { success: false, message: "Student not found to save best club vote." };
        }
    } catch (error) {
        console.error("최고 동아리 투표 저장 중 오류 발생:", error);
        alert("최고 동아리 투표 저장 중 오류 발생: " + error.message);
        return { success: false, message: error.message };
    }
}

// ClubList 시트에서 동아리 목록을 가져오는 함수
async function getClubList() {
    try {
        await checkAuthAndGetToken();
        const range = `${CLUB_LIST_SHEET_NAME}!A:B`; // Club ID, Club Name
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const clubData = response.result.values;
        if (!clubData || clubData.length < 2) {
            console.warn("동아리 목록 시트에서 데이터를 찾을 수 없습니다.");
            return [];
        }

        const clubs = [];
        for (let i = 1; i < clubData.length; i++) {
            if (clubData[i].length >= 2) {
                clubs.push({
                    id: Number(clubData[i][0]),
                    name: clubData[i][1]
                });
            }
        }
        return clubs;
    } catch (error) {
        console.error("동아리 목록 로드 중 오류 발생:", error);
        alert("동아리 목록 로드 중 오류 발생: " + error.message);
        return [];
    }
}


// ====================================================================
// HTML 요소 및 이벤트 리스너 (DOM 조작) - index.html 구조에 맞춰 변경
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // DOM 요소 가져오기 - index.html의 id에 맞춰서 정확히 변경
    const splashScreen = document.getElementById('splash-screen'); // 학번/이름 입력 화면 (초기 화면)
    const mainContent = document.getElementById('main-content'); // 스탬프 투어 메인 화면 (동아리 스탬프 grid 포함)
    const locationGuideScreen = document.getElementById('location-guide-screen'); // 동아리 위치 안내 화면

    // splash-screen 내부 요소
    const inputGrade = document.getElementById('inputGrade');
    const inputClass = document.getElementById('inputClass');
    const inputNumber = document.getElementById('inputNumber');
    const inputName = document.getElementById('inputName');
    const submitInfoBtn = document.getElementById('submitInfoBtn');

    // main-content 내부 요소
    const studentDisplay = document.getElementById('student-display'); // 학생 정보 표시
    const qrVideo = document.getElementById('qr-video'); // QR 스캔 비디오 영역 (현재 HTML에서 사용 안됨)
    const qrResult = document.getElementById('qr-result'); // QR 스캔 결과 표시
    const tenStampsMessage = document.getElementById('ten-stamps-message'); // 10개 스탬프 달성 메시지
    const bestClubInput = document.getElementById('bestClubInput'); // 최고 동아리 투표 입력 필드
    const submitBestClubBtn = document.getElementById('submitBestClubBtn'); // 최고 동아리 투표 버튼
    const bestClubVoteStatus = document.getElementById('bestClubVoteStatus'); // 최고 동아리 투표 상태 표시
    const showLocationGuideBtn = document.getElementById('showLocationGuideBtn'); // 동아리 위치 안내 버튼

    // location-guide-screen 내부 요소
    const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn');

    // 스탬프 이미지 요소들을 가져옵니다. (ID가 1부터 15까지)
    const stampElements = {};
    for (let i = 1; i <= 15; i++) {
        stampElements[`stamp-${i}`] = document.getElementById(`stamp-${i}`);
    }

    let currentStudent = null; // 현재 확인된 학생 정보 저장
    let currentStampedClubs = []; // 현재 학생이 찍은 스탬프 동아리 ID 배열
    let clubDataList = []; // 동아리 목록 데이터를 저장할 변수

    // 화면 전환 함수 - index.html의 실제 ID에 맞춰서 수정
    function showScreen(screenElement) {
        // 모든 주요 화면 숨기기
        splashScreen.style.display = 'none';
        mainContent.style.display = 'none';
        locationGuideScreen.style.display = 'none';
        // 추가적인 모달 등이 있다면 여기에 display = 'none' 추가

        // 선택된 화면만 보이게 하기
        if (screenElement) {
            screenElement.style.display = 'flex'; // flex로 변경 (CSS에 display:flex; 설정 가정)
            console.log(`화면: ${screenElement.id}`);
        } else {
            console.error("유효하지 않은 화면 요소입니다.");
        }
    }

    // 초기 화면 로드 (학번/이름 입력 화면)
    showScreen(splashScreen);
    
    // 초기 동아리 목록 미리 로드
    // 앱 시작 시 한 번만 호출하여 clubDataList를 채웁니다.
    // 비동기로 진행되므로, 동아리 목록이 필요한 시점에 clubDataList가 채워져있는지 확인해야 합니다.
    clubDataList = await getClubList();
    console.log("초기 동아리 목록 로드 완료:", clubDataList);


    // 학번/이름 입력 후 시작하기 버튼 클릭
    submitInfoBtn.addEventListener('click', async () => {
        const grade = inputGrade.value;
        const sClass = inputClass.value;
        const number = inputNumber.value;
        const name = inputName.value;

        if (!grade || !sClass || !number) {
            alert('학년, 반, 번호는 필수 입력 사항입니다.');
            return;
        }

        const student = { grade, sClass, number, name };

        try {
            // 학생 정보 확인
            const existingStudent = await getStudentInfo(grade, sClass, number);

            if (existingStudent) {
                // 기존 학생 정보가 있으면 이름 업데이트 또는 확인
                if (existingStudent.name !== name && name !== "") {
                    const confirmUpdate = confirm(`기존 학생 정보가 있습니다: ${existingStudent.name} 학생. 이름을 ${name}(으)로 업데이트하시겠습니까?`);
                    if (confirmUpdate) {
                        const saveResult = await saveStudentInfo(student);
                        if (saveResult.success) {
                            alert('학생 정보가 업데이트되었습니다.');
                        } else {
                            throw new Error(saveResult.message);
                        }
                    } else {
                        student.name = existingStudent.name; // 업데이트 거부 시 기존 이름 사용
                    }
                } else if (name === "" && existingStudent.name) {
                    student.name = existingStudent.name; // 이름 입력 없이 조회 시 기존 이름 사용
                } else if (name === "" && !existingStudent.name) {
                    alert('학생 이름을 입력해주세요.');
                    return;
                }
                currentStudent = student; // 현재 학생 정보로 설정

            } else {
                // 새로운 학생 정보 저장
                if (!name) {
                    alert('새로운 학생의 이름은 필수 입력 사항입니다.');
                    return;
                }
                const saveResult = await saveStudentInfo(student);
                if (saveResult.success) {
                    alert('새로운 학생 정보가 저장되었습니다.');
                    currentStudent = student; // 현재 학생 정보로 설정
                } else {
                    throw new Error(saveResult.message);
                }
            }

            // 스탬프 정보 로드 및 화면 업데이트
            const stampData = await getStamps(currentStudent.grade, currentStudent.sClass, currentStudent.number);
            currentStampedClubs = stampData.stampedClubs;

            updateStudentInfoDisplay();
            updateStampImages(); // 스탬프 이미지 상태 업데이트
            updateTenStampsMessage(); // 10개 스탬프 메시지 업데이트
            showScreen(mainContent); // 메인 콘텐츠 화면으로 전환

        } catch (error) {
            console.error('학생 정보 처리 중 오류 발생:', error);
            alert(`학생 정보 처리 중 오류 발생: ${error.message || error}`);
        }
    });

    // 학생 정보 표시 업데이트
    function updateStudentInfoDisplay() {
        if (currentStudent) {
            studentDisplay.textContent = `${currentStudent.grade}학년 ${currentStudent.sClass}반 ${currentStudent.number}번 ${currentStudent.name} 학생 (스탬프: ${currentStampedClubs.length}개)`;
        } else {
            studentDisplay.textContent = '학생 정보를 찾을 수 없습니다.';
        }
    }

    // 스탬프 이미지 상태 업데이트
    function updateStampImages() {
        // 모든 스탬프 이미지 초기화 (기본 이미지로)
        for (let i = 1; i <= 15; i++) {
            if (stampElements[`stamp-${i}`]) {
                stampElements[`stamp-${i}`].src = `images/stamp_base.png`;
                stampElements[`stamp-${i}`].classList.remove('stamped');
            }
        }

        // 찍은 스탬프만 'stamped' 이미지로 변경
        currentStampedClubs.forEach(clubId => {
            const stampImg = stampElements[`stamp-${clubId}`];
            if (stampImg) {
                stampImg.src = `images/stamp_${clubId}.png`; // 예를 들어, stamp_1.png, stamp_2.png
                stampImg.classList.add('stamped');
            }
        });
    }

    // 10개 스탬프 달성 메시지 및 투표 버튼 상태 업데이트
    function updateTenStampsMessage() {
        if (currentStampedClubs.length >= 10) {
            tenStampsMessage.style.display = 'block'; // 10개 이상 달성 시 메시지 표시
            // 최고 동아리 투표 상태 로드 및 표시
            getStamps(currentStudent.grade, currentStudent.sClass, currentStudent.number)
                .then(stampData => {
                    if (stampData.bestClubVote) {
                        bestClubVoteStatus.textContent = `현재 투표: ${stampData.bestClubVote}`;
                        bestClubInput.value = stampData.bestClubVote; // 입력창에 현재 투표 값 표시
                        bestClubInput.disabled = true; // 투표했으면 입력 비활성화
                        submitBestClubBtn.disabled = true; // 투표했으면 버튼 비활성화
                    } else {
                        bestClubVoteStatus.textContent = "아직 투표하지 않았습니다.";
                        bestClubInput.disabled = false;
                        submitBestClubBtn.disabled = false;
                    }
                })
                .catch(error => console.error("최고 동아리 투표 상태 로드 실패:", error));
        } else {
            tenStampsMessage.style.display = 'none'; // 10개 미만이면 숨기기
        }
    }

    // 스탬프 이미지 클릭 이벤트 (QR 스캔 대신 직접 클릭으로 스탬프 찍기)
    for (let i = 1; i <= 15; i++) {
        const stampImg = stampElements[`stamp-${i}`];
        if (stampImg) {
            stampImg.addEventListener('click', async () => {
                if (!currentStudent) {
                    alert('먼저 학번과 이름을 입력해주세요.');
                    return;
                }
                const clubId = i; // 이미지 ID를 동아리 ID로 사용

                if (!currentStampedClubs.includes(clubId)) {
                    currentStampedClubs.push(clubId);
                    await saveStamps({
                        ...currentStudent,
                        stampedClubs: currentStampedClubs,
                        name: currentStudent.name // 이름도 같이 넘겨줌 (새로운 스탬프 정보 추가 시 사용될 수 있음)
                    });
                    alert(`${clubDataList.find(c => c.id === clubId)?.name || '해당 동아리'} 스탬프가 찍혔습니다!`);
                    updateStampImages();
                    updateStudentInfoDisplay(); // 스탬프 개수 업데이트
                    updateTenStampsMessage(); // 10개 스탬프 메시지 업데이트
                } else {
                    alert('이미 스탬프를 찍은 동아리입니다.');
                }
            });
        }
    }

    // 최고 동아리 투표하기 버튼 클릭
    submitBestClubBtn.addEventListener('click', async () => {
        if (!currentStudent) {
            alert('먼저 학번과 이름을 입력해주세요.');
            return;
        }
        const bestClubName = bestClubInput.value.trim();
        if (!bestClubName) {
            alert('투표할 동아리 이름을 입력해주세요.');
            return;
        }

        const saveResult = await saveBestClubVote({
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

    // 동아리 위치 안내 버튼 클릭
    showLocationGuideBtn.addEventListener('click', () => {
        showScreen(locationGuideScreen);
    });

    // 동아리 위치 안내 닫기 버튼 클릭
    closeLocationGuideBtn.addEventListener('click', () => {
        showScreen(mainContent);
    });

    // QR 스캔 관련 (HTML에 qr-scanner-container와 qr-video 등이 있지만,
    // 현재 script.js에서는 html5-qrcode 라이브러리를 직접 연동하는 로직이 없어 비활성화)
    // 만약 QR 스캔 기능을 활성화하려면, html5-qrcode 라이브러리 사용법에 따라
    // qr-video에 비디오 스트림을 연결하고 스캔 로직을 구현해야 합니다.
    // 지금은 스탬프 이미지 클릭으로 대체되어 있습니다.

});