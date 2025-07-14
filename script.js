// script.js 파일 전체 코드 - OAuth 클라이언트 ID 사용 (읽기/쓰기)

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
// 스프레드시트 읽기/쓰기 권한을 요청합니다.
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
            gisLoaded = true; // 로드 완료 플래그 설정
            tokenClient = google.accounts.oauth2.initOAuth2TokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                // 콜백은 requestAccessToken 호출 시 동적으로 제공됩니다.
                callback: '', 
            });
            console.log("Google Identity Services 로드 완료.");
            
            // gapi (Google API 클라이언트) 라이브러리 로드
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                gapi.load('client', () => {
                    gapi.client.init({
                        // API 키는 이제 OAuth 인증을 사용하므로 필요 없습니다.
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
        };
        gisScript.onerror = (err) => {
            console.error("GIS 스크립트 로드 실패:", err);
            reject(err);
        };
        document.head.appendChild(gisScript);
    });
}

// 인증 확인 및 토큰 요청 함수
async function checkAuthAndGetToken() {
    return new Promise((resolve, reject) => {
        if (!gisLoaded || !tokenClient) {
            // GIS 또는 tokenClient가 로드되지 않았다면 먼저 로드 시도
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
                // gapi.client.setToken({ access_token: resp.access_token }); // 토큰 설정
                resolve(resp.access_token);
            };
            tokenClient.requestAccessToken(); // 토큰 요청 시작 (팝업이 뜰 수 있음)
        }
    });
}


// 앱 시작 시 Google API 로드
// 이 부분은 페이지 로드 시 바로 실행되도록 합니다.
// 사용자 동작 (버튼 클릭 등) 전에 미리 로드합니다.
loadGoogleAPI().then(() => {
    console.log("Google API 클라이언트 및 Identity Services 로드 완료. 이제 인증이 가능합니다.");
}).catch(error => {
    console.error("Google API 로드 또는 초기화 실패:", error);
    alert("앱 초기화 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인해주세요.");
});

// ====================================================================
// Sheets API 호출 함수들
// ====================================================================

// 학생 정보 가져오기 함수 (기존 getStudentInfo 부분을 대체)
async function getStudentInfo(grade, sClass, number) {
    try {
        await checkAuthAndGetToken(); // 읽기 작업 전에도 인증 필요

        const range = `${STUDENTS_SHEET_NAME}!A:D`; // 예시: A열부터 D열까지 (학년, 반, 번호, 이름)
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const studentData = response.result.values;
        if (!studentData || studentData.length < 2) { // 헤더 행 포함 최소 2행
            return null; // 데이터 없음
        }

        let foundStudent = null;
        // 헤더 행(0번 인덱스) 건너뛰고 1번 인덱스부터 데이터 탐색
        for (let i = 1; i < studentData.length; i++) {
            // 학년(0), 반(1), 번호(2)로 학생 찾기 (Sheets 데이터 기준)
            if (studentData[i][0] == grade && studentData[i][1] == sClass && studentData[i][2] == number) {
                foundStudent = {
                    grade: studentData[i][0],
                    sClass: studentData[i][1],
                    number: studentData[i][2],
                    name: studentData[i][3] // 이름 (인덱스 3)
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

// 스탬프 정보 가져오기 함수 (getStamps 부분을 대체)
async function getStamps(grade, sClass, number) {
    try {
        await checkAuthAndGetToken(); // 읽기 작업 전에도 인증 필요

        const range = `${STAMPS_SHEET_NAME}!A:G`; // A열부터 G열까지 (학년, 반, 번호, 이름, 찍은스탬프목록, 스탬프10개이상, 최고동아리투표)
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const stampsData = response.result.values;
        if (!stampsData || stampsData.length < 2) { // 헤더 행 포함 최소 2행
            return { stampedClubs: [], hasTenStamps: false, bestClubVote: "" };
        }

        let foundStamps = [];
        let hasTenStamps = false;
        let bestClubVote = "";

        for (let i = 1; i < stampsData.length; i++) {
            if (stampsData[i][0] == grade && stampsData[i][1] == sClass && stampsData[i][2] == number) {
                foundStamps = stampsData[i][4] ? String(stampsData[i][4]).split(',').map(Number) : [];
                hasTenStamps = (String(stampsData[i][5]).toUpperCase() === 'O'); // 'O' 대소문자 무시
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

// 학생 정보 저장 함수 (saveStudentInfo) - POST 요청 대신 Sheets API 사용
async function saveStudentInfo(studentInfo) {
    try {
        await checkAuthAndGetToken(); // 쓰기 작업 전에는 필수적으로 인증 필요

        const studentSheetName = STUDENTS_SHEET_NAME;
        const studentData = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${studentSheetName}!A:D`,
        });

        const values = studentData.result.values || [];
        let foundRow = -1;
        for (let i = 1; i < values.length; i++) {
            // 학년, 반, 번호가 일치하는 학생 찾기 (Sheets API는 1-based index)
            if (String(values[i][0]) == studentInfo.grade && String(values[i][1]) == studentInfo.sClass && String(values[i][2]) == studentInfo.number) {
                foundRow = i + 1; // Sheets API는 1부터 시작하는 행 번호 사용
                break;
            }
        }

        if (foundRow !== -1) {
            // 기존 학생 정보 업데이트 (이름만 업데이트 예시, 필요하면 다른 열도)
            const updateRange = `${studentSheetName}!D${foundRow}`; // D열(이름) 업데이트
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
            // 새로운 학생 정보 추가
            const appendRange = `${studentSheetName}!A:D`; // 추가할 시트의 범위 (어느 열부터 쓸지)
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
        alert("학생 정보 저장 중 오류 발생: " + error.message); // 사용자에게 알림
        return { success: false, message: error.message };
    }
}

// 스탬프 저장 함수 (saveStamps) - POST 요청 대신 Sheets API 사용
async function saveStamps(studentInfo) { // studentInfo에 grade, sClass, number, stampedClubs, name, bestClubVote 등 모두 포함
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
            // 기존 스탬프 정보 업데이트
            const updateRange = `${stampsSheetName}!E${foundRow}:G${foundRow}`; // E열(찍은스탬프목록)부터 G열(최고동아리투표)까지 업데이트
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    // 순서: 찍은스탬프목록(5열), 스탬프10개이상(6열), 최고동아리투표(7열)
                    values: [[stampedClubsString, hasTenStampsMark, studentInfo.bestClubVote || ""]]
                },
            });
            console.log("스탬프 정보 업데이트 완료.");
            return { success: true, message: "Stamps updated." };
        } else {
            // 새로운 스탬프 정보 추가
            const appendRange = `${stampsSheetName}!A:G`;
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: appendRange,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    // 순서: 학년, 반, 번호, 이름, 찍은스탬프목록, 스탬프10개이상, 최고동아리투표
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

// 최고 동아리 투표 저장 함수 (saveBestClubVote) - POST 요청 대신 Sheets API 사용
async function saveBestClubVote(studentInfo) { // studentInfo에 grade, sClass, number, bestClub 포함
    try {
        await checkAuthAndGetToken();

        const stampsSheetName = STAMPS_SHEET_NAME;
        const stampsData = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${stampsSheetName}!A:G`, // 모든 데이터를 가져와서 해당 학생 찾기
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
            const updateRange = `${stampsSheetName}!G${foundRow}`; // G열(최고동아리투표)
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

// 동아리 목록을 Google Sheet에서 가져오는 함수 (ClubList 시트 사용)
async function getClubList() {
    try {
        await checkAuthAndGetToken(); // 읽기 작업 전에도 인증 필요

        const range = `${CLUB_LIST_SHEET_NAME}!A:B`; // A열(Club ID), B열(Club Name)
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const clubData = response.result.values;
        if (!clubData || clubData.length < 2) { // 헤더 행 포함 최소 2행
            console.warn("동아리 목록 시트에서 데이터를 찾을 수 없습니다.");
            return [];
        }

        // 헤더 행 건너뛰고 동아리 목록 파싱
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
// 기존 HTML 요소 및 이벤트 리스너 (DOM 조작)
// 이 부분은 기존 스크립트와 동일하게 유지됩니다.
// 단, 데이터 로드/저장 함수 호출만 위에서 정의한 Sheets API 함수로 변경됩니다.
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const mainScreen = document.getElementById('mainScreen');
    const splashScreen = document.getElementById('splashScreen');
    const studentInfoScreen = document.getElementById('studentInfoScreen');
    const clubListScreen = document.getElementById('clubListScreen');
    const qrScanScreen = document.getElementById('qrScanScreen');
    const studentInfoInput = document.getElementById('studentInfoInput');
    const clubListContainer = document.getElementById('clubListContainer');
    const qrInput = document.getElementById('qrInput');
    const qrConfirmBtn = document.getElementById('qrConfirmBtn');
    const studentNameDisplay = document.getElementById('studentNameDisplay');
    const stampCountDisplay = document.getElementById('stampCountDisplay');
    const studentInfoForm = document.getElementById('studentInfoForm');
    const studentInfoConfirmBtn = document.getElementById('studentInfoConfirmBtn');
    const backToMainBtn = document.getElementById('backToMainBtn');
    const openBestClubVoteBtn = document.getElementById('openBestClubVoteBtn');
    const bestClubVoteModal = document.getElementById('bestClubVoteModal');
    const closeBestClubVoteModal = document.getElementById('closeBestClubVoteModal');
    const bestClubVoteForm = document.getElementById('bestClubVoteForm');
    const bestClubSelect = document.getElementById('bestClubSelect');
    const backToStudentInfoBtn = document.getElementById('backToStudentInfoBtn');
    const hasTenStampsMsg = document.getElementById('hasTenStampsMsg');

    let currentStudent = null; // 현재 확인된 학생 정보 저장
    let currentStampedClubs = []; // 현재 학생이 찍은 스탬프 동아리 ID 배열
    let clubDataList = []; // 동아리 목록 데이터를 저장할 변수

    // 화면 전환 함수
    function showScreen(screenId) {
        splashScreen.style.display = 'none';
        mainScreen.style.display = 'none';
        studentInfoScreen.style.display = 'none';
        clubListScreen.style.display = 'none';
        qrScanScreen.style.display = 'none';
        bestClubVoteModal.style.display = 'none';

        document.getElementById(screenId).style.display = 'flex'; // flex로 변경

        console.log(`화면: ${screenId}`);
    }

    // 초기 화면 로드
    showScreen('splashScreen');
    // 3초 후 메인 화면으로 전환
    setTimeout(() => {
        showScreen('mainScreen');
    }, 3000); // 3초 스플래시 화면

    // 메인화면: 시작하기 버튼 클릭
    document.getElementById('startAppBtn').addEventListener('click', () => {
        showScreen('studentInfoScreen');
    });

    // 학생 정보 확인/저장 처리
    studentInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const grade = document.getElementById('grade').value;
        const sClass = document.getElementById('sClass').value;
        const number = document.getElementById('number').value;
        const name = document.getElementById('name').value;

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
                    // 이름이 변경되었거나 새로 입력된 경우 업데이트
                    const confirmUpdate = confirm(`기존 학생 정보가 있습니다: ${existingStudent.name} 학생. 이름을 ${name}(으)로 업데이트하시겠습니까?`);
                    if (confirmUpdate) {
                        const saveResult = await saveStudentInfo(student);
                        if (saveResult.success) {
                            alert('학생 정보가 업데이트되었습니다.');
                        } else {
                            throw new Error(saveResult.message);
                        }
                    } else {
                        // 업데이트 거부 시 기존 이름 사용
                        student.name = existingStudent.name;
                    }
                } else if (name === "" && existingStudent.name) {
                    // 이름 입력 없이 조회 시 기존 이름 사용
                    student.name = existingStudent.name;
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
            showScreen('clubListScreen'); // 동아리 목록 화면으로 전환
            displayClubList(); // 동아리 목록 표시
            updateStampDisplay(); // 스탬프 개수 및 상태 업데이트

        } catch (error) {
            console.error('학생 정보 처리 중 오류 발생:', error);
            alert(`학생 정보 처리 중 오류 발생: ${error.message || error}`);
        }
    });

    // 학생 정보 화면에서 뒤로가기
    backToMainBtn.addEventListener('click', () => {
        showScreen('mainScreen');
    });


    // 학생 정보 표시 업데이트
    function updateStudentInfoDisplay() {
        if (currentStudent) {
            studentNameDisplay.textContent = `${currentStudent.grade}학년 ${currentStudent.sClass}반 ${currentStudent.number}번 ${currentStudent.name} 학생`;
        } else {
            studentNameDisplay.textContent = '학생 정보를 찾을 수 없습니다.';
        }
    }

    // 스탬프 개수 및 10개 이상 달성 메시지 업데이트
    function updateStampDisplay() {
        stampCountDisplay.textContent = `${currentStampedClubs.length}개`;
        if (currentStampedClubs.length >= 10) {
            hasTenStampsMsg.style.display = 'block';
            openBestClubVoteBtn.style.display = 'block'; // 10개 이상 시 투표 버튼 표시
        } else {
            hasTenStampsMsg.style.display = 'none';
            openBestClubVoteBtn.style.display = 'none';
        }
    }

    // 동아리 목록 표시 함수
    async function displayClubList() {
        if (clubDataList.length === 0) {
            clubDataList = await getClubList(); // 동아리 목록을 한 번만 불러옴
        }

        clubListContainer.innerHTML = ''; // 기존 목록 초기화
        clubDataList.forEach(club => {
            const clubItem = document.createElement('div');
            clubItem.classList.add('club-item');
            if (currentStampedClubs.includes(club.id)) {
                clubItem.classList.add('stamped'); // 이미 찍은 스탬프
            }

            const clubName = document.createElement('div');
            clubName.classList.add('club-name');
            clubName.textContent = club.name;
            clubItem.appendChild(clubName);

            const stampButton = document.createElement('button');
            stampButton.classList.add('stamp-button');
            stampButton.textContent = currentStampedClubs.includes(club.id) ? '찍음' : '스탬프 찍기';
            stampButton.disabled = currentStampedClubs.includes(club.id); // 이미 찍었으면 비활성화

            stampButton.addEventListener('click', async () => {
                if (!currentStampedClubs.includes(club.id)) {
                    currentStampedClubs.push(club.id);
                    await saveStamps({
                        ...currentStudent,
                        stampedClubs: currentStampedClubs
                    });
                    alert(`${club.name} 스탬프가 찍혔습니다!`);
                    stampButton.textContent = '찍음';
                    stampButton.disabled = true;
                    clubItem.classList.add('stamped');
                    updateStampDisplay();
                }
            });
            clubItem.appendChild(stampButton);
            clubListContainer.appendChild(clubItem);
        });
    }

    // QR 스캔 화면 열기 (필요하다면 구현)
    // 현재는 이 기능이 직접적으로 사용되지 않습니다.
    document.getElementById('scanQrBtn')?.addEventListener('click', () => {
        showScreen('qrScanScreen');
    });

    // QR 확인 버튼 클릭 (QR 입력 후)
    qrConfirmBtn.addEventListener('click', () => {
        const qrCode = qrInput.value;
        // 여기서는 간단히 QR 코드를 동아리 ID로 가정
        const clubId = parseInt(qrCode);

        if (isNaN(clubId)) {
            alert('유효한 동아리 QR 코드(숫자)를 입력해주세요.');
            return;
        }

        // 동아리 목록에서 해당 ID의 동아리 찾기
        const club = clubDataList.find(c => c.id === clubId);

        if (!club) {
            alert('해당하는 동아리를 찾을 수 없습니다. 올바른 QR 코드인가요?');
            return;
        }

        // 스탬프 찍기 로직 재사용
        const clubItemElement = Array.from(clubListContainer.children).find(item => {
            const button = item.querySelector('.stamp-button');
            return button && button.textContent.includes(club.name); // 대략적인 매칭
        });

        if (clubItemElement) {
            const stampButton = clubItemElement.querySelector('.stamp-button');
            if (!currentStampedClubs.includes(club.id)) {
                currentStampedClubs.push(club.id);
                saveStamps({
                    ...currentStudent,
                    stampedClubs: currentStampedClubs
                });
                alert(`${club.name} 스탬프가 찍혔습니다!`);
                stampButton.textContent = '찍음';
                stampButton.disabled = true;
                clubItemElement.classList.add('stamped');
                updateStampDisplay();
            } else {
                alert('이미 스탬프를 찍은 동아리입니다.');
            }
        } else {
            alert('동아리 목록에서 동아리 아이템을 찾을 수 없습니다.');
        }

        qrInput.value = ''; // 입력창 초기화
        showScreen('clubListScreen'); // 스탬프 찍은 후 다시 목록 화면으로
    });

    // 동아리 목록 화면에서 뒤로가기 (학생 정보 화면으로)
    backToStudentInfoBtn.addEventListener('click', () => {
        showScreen('studentInfoScreen');
    });

    // 최고 동아리 투표 모달 열기
    openBestClubVoteBtn.addEventListener('click', async () => {
        if (clubDataList.length === 0) {
            clubDataList = await getClubList();
        }
        bestClubSelect.innerHTML = '<option value="">선택하세요</option>';
        clubDataList.forEach(club => {
            const option = document.createElement('option');
            option.value = club.name; // 동아리 이름으로 저장
            option.textContent = club.name;
            bestClubSelect.appendChild(option);
        });

        // 기존에 투표한 동아리가 있다면 선택 상태로 표시
        if (currentStudent && currentStudent.bestClubVote) {
             const existingVote = await getStamps(currentStudent.grade, currentStudent.sClass, currentStudent.number);
             if (existingVote.bestClubVote) {
                bestClubSelect.value = existingVote.bestClubVote;
             }
        }


        bestClubVoteModal.style.display = 'block';
    });

    // 최고 동아리 투표 모달 닫기
    closeBestClubVoteModal.addEventListener('click', () => {
        bestClubVoteModal.style.display = 'none';
    });

    // 최고 동아리 투표 저장
    bestClubVoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedClub = bestClubSelect.value;
        if (!selectedClub) {
            alert('투표할 동아리를 선택해주세요.');
            return;
        }

        if (currentStudent) {
            const saveResult = await saveBestClubVote({
                ...currentStudent,
                bestClub: selectedClub
            });
            if (saveResult.success) {
                alert(`${selectedClub}에 투표했습니다!`);
                bestClubVoteModal.style.display = 'none';
                // 투표 후 현재 학생 정보에 투표 동아리 반영 (UI 업데이트 용도)
                // currentStudent.bestClubVote = selectedClub; // 이 줄은 필요 없지만 참고용
            } else {
                alert(`투표 저장 실패: ${saveResult.message}`);
            }
        } else {
            alert('학생 정보가 로드되지 않아 투표를 저장할 수 없습니다.');
        }
    });

    // 초기 동아리 목록 미리 로드 (앱 시작 시 한번만)
    // displayClubList는 학생 정보 로드 후에 호출되므로, 여기서는 필요 없음.
    // getClubList().then(clubs => {
    //     clubDataList = clubs;
    //     console.log("초기 동아리 목록 로드 완료:", clubDataList);
    // });
});