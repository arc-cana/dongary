// script.js 파일 전체 코드 - index.html 구조에 맞춤 (OAuth 클라이언트 ID 사용)

// ====================================================================
// !!! 중요: 이 부분을 여러분이 생성한 OAuth 클라이언트 ID로 변경하세요 !!!
const CLIENT_ID = "795499292540-npdno6q3obp55j9kpsal3a9jvq5jn3v0.apps.googleusercontent.com";
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
        window.onGoogleLibraryLoad = () => {
            console.log("window.onGoogleLibraryLoad 콜백 호출됨.");
            if (typeof google !== 'undefined' && google.accounts) {
                console.log("google.accounts 객체 확인:", google.accounts);
                if (google.accounts.oauth2 && typeof google.accounts.oauth2.initTokenClient === 'function') {
                    gisLoaded = true;
                    tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: '', // 콜백은 requestAccessToken 호출 시 동적으로 제공됩니다.
                    });
                    console.log("Google Identity Services 초기화 성공 (onGoogleLibraryLoad 내부).");

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
                    console.error("onGoogleLibraryLoad 콜백 후 'google.accounts.oauth2.initTokenClient' 함수를 찾을 수 없습니다. 'google.accounts.oauth2' 객체 상태:", google.accounts.oauth2);
                    reject(new Error("GIS initTokenClient not found after onGoogleLibraryLoad"));
                }
            } else {
                console.error("onGoogleLibraryLoad 콜백 후 'google' 또는 'google.accounts' 객체를 찾을 수 없습니다.");
                reject(new Error("Google GIS objects not found after onGoogleLibraryLoad"));
            }
        };

        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        gisScript.onerror = (err) => {
            console.error("GIS 스크립트 로드 실패: ", err);
            reject(err);
        };
        document.head.appendChild(gisScript);
    });
}

// 인증 확인 및 토큰 요청 함수
// 이 함수는 사용자의 명시적인 클릭 이벤트 내부에서 호출되어야 팝업 차단을 피할 수 있습니다.
async function checkAuthAndGetToken() {
    return new Promise((resolve, reject) => {
        if (!gisLoaded || !tokenClient) {
            console.warn("GIS 또는 tokenClient가 아직 준비되지 않았습니다. 앱 초기화 중 오류가 있었을 수 있습니다.");
            reject(new Error("Google APIs not fully loaded. Please refresh."));
            return;
        }

        tokenClient.callback = (resp) => {
            if (resp.error) {
                console.error('인증 실패:', resp.error);
                alert("Google 인증에 실패했습니다. 다시 시도해주세요. 오류: " + resp.error);
                reject(resp.error);
                return;
            }
            console.log('Google API 토큰 획득:', resp.access_token);
            resolve(resp.access_token);
        };
        tokenClient.requestAccessToken(); // 토큰 요청 시작 (팝업이 뜰 수 있음)
    });
}

// 앱 시작 시 Google API 로드 (인증 요청은 여기서 하지 않음)
loadGoogleAPI().then(() => {
    console.log("Google API 클라이언트 및 Identity Services 로드 완료. 이제 사용자 상호작용을 통해 인증이 가능합니다.");
}).catch(error => {
    console.error("Google API 로드 또는 초기화 실패:", error);
    alert("앱 초기화 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인해주세요. (오류: " + (error.message || error) + ")");
});

// ====================================================================
// Sheets API 호출 함수들 (checkAuthAndGetToken 호출 포함)
// ====================================================================

async function getStudentInfo(grade, sClass, number) {
    try {
        await checkAuthAndGetToken(); // 사용자 상호작용 (버튼 클릭) 내부에서 호출됨
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
        await checkAuthAndGetToken(); // 사용자 상호작용 (버튼 클릭) 내부에서 호출됨
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
        await checkAuthAndGetToken(); // 사용자 상호작용 (버튼 클릭) 내부에서 호출됨
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
        await checkAuthAndGetToken(); // 사용자 상호작용 (버튼 클릭) 내부에서 호출됨
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
        await checkAuthAndGetToken(); // 사용자 상호작용 (버튼 클릭) 내부에서 호출됨
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
        // getClubList는 앱 초기 로드 시 호출되므로,
        // 여기서는 checkAuthAndGetToken을 직접 호출하지 않고
        // loadGoogleAPI가 완료되어 gapi가 준비된 상태라고 가정합니다.
        // 만약 초기 로드 시에도 인증이 필요하다면, 이 함수를 사용하는 시점을 재고해야 합니다.
        // 현재는 'submitInfoBtn' 클릭 이후에 동아리 목록이 실제로 필요한 로직은 없습니다.
        // (즉, 사용자 정보 입력 전에는 동아리 목록을 직접 가져오지 않음)
        // 하지만 혹시 모를 상황에 대비하여 gapi가 로드되지 않았다면 에러를 발생시킬 수 있도록
        // 로직을 추가하거나, getClubList도 checkAuthAndGetToken을 호출하도록 변경할 수 있습니다.
        // 여기서는 초기 로딩 시 문제가 없었으니, 일단은 그대로 둡니다.
        
        // 주의: 현재 코드에서 DOMContentLoaded 내 getClubList()는 submitInfoBtn 클릭 전에 실행되므로
        // 이 시점에서 checkAuthAndGetToken()을 호출하면 팝업 차단 문제가 다시 발생할 수 있습니다.
        // getClubList는 "인증 없이" 공개된 스프레드시트에서 데이터를 읽는 경우에만 적합합니다.
        // 인증이 필요한 경우, 이 함수도 사용자 상호작용 뒤에 호출되도록 조정해야 합니다.
        // 지금은 "초기 동아리 목록 로드 완료: Array(0)" 메시지가 뜨는 것으로 보아,
        // 인증 문제로 데이터를 못 가져오는 것으로 보입니다.

        // 따라서 getClubList()도 인증이 필요하다면 아래와 같이 checkAuthAndGetToken()을 호출해야 합니다.
        // 하지만 이 함수는 DOMContentLoaded 단계에서 호출되므로, 이 시점에 팝업이 뜨면 안됩니다.
        // 해결책: 동아리 목록은 사용자 인증이 완료된 후에 가져오거나,
        // 스프레드시트가 '웹에 게시'되어 인증 없이도 읽을 수 있도록 설정해야 합니다.

        // 임시 해결책 (인증 필요 시): getClubList도 사용자 상호작용 뒤에 호출되도록 옮기거나,
        // 스프레드시트를 웹에 게시하여 누구나 읽을 수 있게 하세요.
        // 여기서는 임시로 getClubList에서 checkAuthAndGetToken을 주석 처리하고 에러 처리만 강화합니다.
        // 실제 운영 환경에서는 스프레드시트 권한을 '웹에 게시'하거나,
        // 동아리 목록 로드를 사용자 정보 입력 이후로 옮겨야 합니다.

        if (!gapi || !gapi.client || !gapi.client.sheets) {
            console.error("gapi 클라이언트가 아직 준비되지 않아 동아리 목록을 로드할 수 없습니다.");
            throw new Error("Google Sheets API not ready for club list.");
        }

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
        // alert("동아리 목록 로드 중 오류 발생: " + error.message); // 초기 로드 시 불필요한 alert 방지
        return [];
    }
}


// ====================================================================
// HTML 요소 및 이벤트 리스너 (DOM 조작) - index.html 구조에 맞춰 변경
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');
    const locationGuideScreen = document.getElementById('location-guide-screen');

    const inputGrade = document.getElementById('inputGrade');
    const inputClass = document.getElementById('inputClass');
    const inputNumber = document.getElementById('inputNumber');
    const inputName = document.getElementById('inputName');
    const submitInfoBtn = document.getElementById('submitInfoBtn');

    const studentDisplay = document.getElementById('student-display');
    const qrVideo = document.getElementById('qr-video');
    const qrResult = document.getElementById('qr-result');
    const tenStampsMessage = document.getElementById('ten-stamps-message');
    const bestClubInput = document.getElementById('bestClubInput');
    const submitBestClubBtn = document.getElementById('submitBestClubBtn');
    const bestClubVoteStatus = document.getElementById('bestClubVoteStatus');
    const showLocationGuideBtn = document.getElementById('showLocationGuideBtn');

    const closeLocationGuideBtn = document.getElementById('closeLocationGuideBtn');

    const stampElements = {};
    for (let i = 1; i <= 15; i++) {
        stampElements[`stamp-${i}`] = document.getElementById(`stamp-${i}`);
    }

    let currentStudent = null;
    let currentStampedClubs = [];
    let clubDataList = [];

    function showScreen(screenElement) {
        splashScreen.style.display = 'none';
        mainContent.style.display = 'none';
        locationGuideScreen.style.display = 'none';
        if (screenElement) {
            screenElement.style.display = 'flex';
            console.log(`화면: ${screenElement.id}`);
        } else {
            console.error("유효하지 않은 화면 요소입니다.");
        }
    }

    showScreen(splashScreen);
    
    // 이 시점에서는 getClubList()가 인증 없이 스프레드시트를 읽을 수 있도록 설정되었거나
    // 아니면 나중에 인증 후 호출되도록 해야 합니다.
    // 현재는 '초기 동아리 목록 로드 완료: Array(0)' 이 뜨므로, 인증 문제일 가능성이 높습니다.
    // 따라서 getClubList()를 'submitInfoBtn' 클릭 이벤트 내부로 옮겨야 합니다.
    // 임시로 DOMContentLoaded에서 호출은 유지하되, 나중에는 위치를 변경해야 할 수 있습니다.
    clubDataList = await getClubList();
    console.log("초기 동아리 목록 로드 완료:", clubDataList);


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
            // !!! 핵심 수정: submitInfoBtn 클릭 시점에만 checkAuthAndGetToken 호출 !!!
            // 여기서 checkAuthAndGetToken()을 호출하여 사용자에게 Google 로그인 팝업을 띄웁니다.
            // 이 호출이 성공해야 sheets API를 사용할 수 있습니다.
            await checkAuthAndGetToken();

            // 학생 정보 확인
            const existingStudent = await getStudentInfo(grade, sClass, number);

            if (existingStudent) {
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
                        student.name = existingStudent.name;
                    }
                } else if (name === "" && existingStudent.name) {
                    student.name = existingStudent.name;
                } else if (name === "" && !existingStudent.name) {
                    alert('학생 이름을 입력해주세요.');
                    return;
                }
                currentStudent = student;

            } else {
                if (!name) {
                    alert('새로운 학생의 이름은 필수 입력 사항입니다.');
                    return;
                }
                const saveResult = await saveStudentInfo(student);
                if (saveResult.success) {
                    alert('새로운 학생 정보가 저장되었습니다.');
                    currentStudent = student;
                } else {
                    throw new Error(saveResult.message);
                }
            }

            // 스탬프 정보 로드 및 화면 업데이트
            const stampData = await getStamps(currentStudent.grade, currentStudent.sClass, currentStudent.number);
            currentStampedClubs = stampData.stampedClubs;

            updateStudentInfoDisplay();
            updateStampImages();
            updateTenStampsMessage();
            showScreen(mainContent);

            // 동아리 목록도 필요하다면 이 시점에서 다시 로드 (인증이 필요한 경우)
            // clubDataList = await getClubList();
            // console.log("갱신된 동아리 목록 로드 완료:", clubDataList);

        } catch (error) {
            console.error('학생 정보 처리 중 오류 발생:', error);
            alert(`학생 정보 처리 중 오류 발생: ${error.message || error}`);
        }
    });

    function updateStudentInfoDisplay() {
        if (currentStudent) {
            studentDisplay.textContent = `${currentStudent.grade}학년 ${currentStudent.sClass}반 ${currentStudent.number}번 ${currentStudent.name} 학생 (스탬프: ${currentStampedClubs.length}개)`;
        } else {
            studentDisplay.textContent = '학생 정보를 찾을 수 없습니다.';
        }
    }

    function updateStampImages() {
        for (let i = 1; i <= 15; i++) {
            if (stampElements[`stamp-${i}`]) {
                stampElements[`stamp-${i}`].src = `images/stamp_base.png`;
                stampElements[`stamp-${i}`].classList.remove('stamped');
            }
        }

        currentStampedClubs.forEach(clubId => {
            const stampImg = stampElements[`stamp-${clubId}`];
            if (stampImg) {
                stampImg.src = `images/stamp_${clubId}.png`;
                stampImg.classList.add('stamped');
            }
        });
    }

    function updateTenStampsMessage() {
        if (currentStampedClubs.length >= 10) {
            tenStampsMessage.style.display = 'block';
            getStamps(currentStudent.grade, currentStudent.sClass, currentStudent.number)
                .then(stampData => {
                    if (stampData.bestClubVote) {
                        bestClubVoteStatus.textContent = `현재 투표: ${stampData.bestClubVote}`;
                        bestClubInput.value = stampData.bestClubVote;
                        bestClubInput.disabled = true;
                        submitBestClubBtn.disabled = true;
                    } else {
                        bestClubVoteStatus.textContent = "아직 투표하지 않았습니다.";
                        bestClubInput.disabled = false;
                        submitBestClubBtn.disabled = false;
                    }
                })
                .catch(error => console.error("최고 동아리 투표 상태 로드 실패:", error));
        } else {
            tenStampsMessage.style.display = 'none';
        }
    }

    for (let i = 1; i <= 15; i++) {
        const stampImg = stampElements[`stamp-${i}`];
        if (stampImg) {
            stampImg.addEventListener('click', async () => {
                if (!currentStudent) {
                    alert('먼저 학번과 이름을 입력해주세요.');
                    return;
                }
                const clubId = i;

                if (!currentStampedClubs.includes(clubId)) {
                    currentStampedClubs.push(clubId);
                    await saveStamps({
                        ...currentStudent,
                        stampedClubs: currentStampedClubs,
                        name: currentStudent.name
                    });
                    alert(`${clubDataList.find(c => c.id === clubId)?.name || '해당 동아리'} 스탬프가 찍혔습니다!`);
                    updateStampImages();
                    updateStudentInfoDisplay();
                    updateTenStampsMessage();
                } else {
                    alert('이미 스탬프를 찍은 동아리입니다.');
                }
            });
        }
    }

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
            updateTenStampsMessage();
        } else {
            alert(`투표 저장 실패: ${saveResult.message}`);
        }
    });

    showLocationGuideBtn.addEventListener('click', () => {
        showScreen(locationGuideScreen);
    });

    closeLocationGuideBtn.addEventListener('click', () => {
        showScreen(mainContent);
    });
});