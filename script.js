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
        tokenClient.requestAccessToken();
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
// Sheets API 호출 함수들
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
        await checkAuthAndGetToken(); // 동아리 목록 로드에도 인증 필요
        const range = `${CLUB_LIST_SHEET_NAME}!A:B`;
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
// HTML 요소 및 이벤트 리스너 (DOM 조작)
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
    
    // 초기 로드 시 getClubList() 호출을 제거합니다.
    // clubDataList는 이제 submitInfoBtn 클릭 시점에 로드됩니다.

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
            // 사용자 상호작용 (버튼 클릭) 시점에만 checkAuthAndGetToken 호출
            await checkAuthAndGetToken();

            // 이제 Sheets API를 사용할 준비가 되었으므로 동아리 목록을 로드
            // 이 시점에 로드하면 인증 후이므로 Sheets API에 접근 가능합니다.
            clubDataList = await getClubList(); 
            console.log("동아리 목록 로드 완료:", clubDataList);
            if (clubDataList.length === 0) {
                alert("동아리 목록을 가져오지 못했습니다. 스프레드시트 설정 또는 인터넷 연결을 확인해주세요.");
            }


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