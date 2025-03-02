// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [name, setName] = useState('');
  const [studentid, setStudentId] = useState('');
  const [password, setPassword] = useState(''); // 로그인 후 초기화되지 않음
  const [cancelPassword, setCancelPassword] = useState(''); // 취소 시 비밀번호 입력 상태
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatStatuses, setSeatStatuses] = useState({});
  const [selectedLockerImage, setSelectedLockerImage] = useState(null); // 선택된 사물함 이미지
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 상태
  const [loginError, setLoginError] = useState(''); // 로그인/가입 에러 메시지
  const [isRegistering, setIsRegistering] = useState(false); // 가입 모드 상태
  const [cancelModalContent, setCancelModalContent] = useState(null); // 토글 방식 취소 팝업 상태

  // 4개의 3x9 그리드 좌석 데이터 (각 그룹은 독립적으로 관리)
  const lockers = ['Locker1', 'Locker2', 'Locker3', 'Locker4'];
  const generateSeats = (lockerId) => {
    return Array.from({ length: 3 }, (_, row) =>
      Array.from({ length: 9 }, (_, col) => `${lockerId}-R${row + 1}C${col + 1}`)
    );
  };

  // CSRF 토큰 가져오기 함수
  const getCsrfToken = () => {
    return document.cookie.match(/csrftoken=([^;]+)/)?.[1] || localStorage.getItem('csrftoken');
  };

  // CSRF 토큰 초기화 및 저장
  const initializeCsrfToken = async () => {
    try {
      const response = await fetch('https://web-production-be0ca.up.railway.app/api/seats/', {
        credentials: 'include', // 쿠키 포함
      });
      if (response.ok) {
        const csrfToken = response.headers.get('X-CSRFToken') || document.cookie.match(/csrftoken=([^;]+)/)?.[1];
        if (csrfToken) {
          localStorage.setItem('csrftoken', csrfToken);
          console.log('CSRF token initialized:', csrfToken);
        }
      }
    } catch (error) {
      console.error('Error initializing CSRF token:', error);
    }
  };

  // fetchSeatStatuses를 useCallback으로 메모이제이션
  const fetchSeatStatuses = useCallback(async () => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('https://web-production-be0ca.up.railway.app/api/seats/', {
        credentials: 'include', // 쿠키 포함
        headers: {
          'X-CSRFToken': csrfToken, // CSRF 토큰 추가
        },
      });
      if (!response.ok) throw new Error('Failed to fetch seat statuses');
      const data = await response.json();
      const statuses = {};
      data.forEach(seat => {
        statuses[seat.seat] = {
          status: seat.status || 'available',
          name: seat.name || null, // 예약자 이름 추가
        };
      });
      setSeatStatuses(statuses);
    } catch (error) {
      console.error('Error fetching seat statuses:', error);
    }
  }, [getCsrfToken]); // getCsrfToken이 변경될 때만 새로 생성

  // useEffect에서 의존성 배열에 fetchSeatStatuses 추가
  useEffect(() => {
    initializeCsrfToken(); // CSRF 토큰 초기화
    if (isLoggedIn) {
      fetchSeatStatuses();
    }
  }, [isLoggedIn, fetchSeatStatuses]); // fetchSeatStatuses 포함

  const handleLogin = async (e) => {
    e.preventDefault();
    const loginData = { name, studentid, password };
    
    console.log('Logging in with data:', loginData);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('https://web-production-be0ca.up.railway.app/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken, // CSRF 토큰 추가
        },
        body: JSON.stringify(loginData),
        credentials: 'include', // 쿠키 포함
      });
      if (!response.ok) throw new Error(await response.text() || 'Login failed');
      const data = await response.json();
      setIsLoggedIn(true);
      setLoginError('');
      setName(data.name || '');
      setStudentId(data.studentid || '');
      setPassword(''); // 비밀번호 초기화 (로그인 후 사용 안 함)
      localStorage.setItem('csrftoken', data.csrftoken || csrfToken); // 토큰 업데이트 (선택)
    } catch (error) {
      console.error('Error during login:', error);
      setLoginError(`로그인 실패: ${error.message || '서버 오류가 발생했습니다.'}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const registerData = { name, studentid, password };
    
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('https://web-production-be0ca.up.railway.app/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken, // CSRF 토큰 추가
        },
        body: JSON.stringify(registerData),
        credentials: 'include', // 쿠키 포함
      });
      if (!response.ok) throw new Error(await response.text() || 'Registration failed');
      alert('가입 성공! 로그인해주세요.');
      setIsRegistering(false);
      setName('');
      setStudentId('');
      setPassword('');
      setLoginError('');
    } catch (error) {
      console.error('Error during registration:', error);
      setLoginError(`가입 실패: ${error.message || '서버 오류가 발생했습니다.'}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSeat) {
      alert('좌석을 선택해주세요.');
      return;
    }
    const reservation = { 
      name, 
      studentid: studentid,  // studentid 유지
      seat: selectedSeat 
    };
    
    console.log('Reserving with data:', reservation);
    console.log('User logged in:', isLoggedIn);
    console.log('Sending with credentials:', { credentials: 'include' });

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('https://web-production-be0ca.up.railway.app/api/reserve/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken, // CSRF 토큰 추가
        },
        body: JSON.stringify(reservation),
        credentials: 'include', // 세션 쿠키 포함
      });
      if (!response.ok) throw new Error(await response.text() || 'Reservation failed');
      alert('예약 성공!');
      fetchSeatStatuses(); // 상태 갱신
    } catch (error) {
      console.error('Error during reservation:', error);
      alert(`예약 실패: ${error.message || '서버 오류가 발생했습니다.'}`);
    }
  };

  // 예약 취소 함수: 토글 방식 팝업에서 비밀번호 입력 후 취소
  const toggleCancelModal = () => {
    if (cancelModalContent === null) {
      setCancelModalContent({
        studentid: studentid,
        name: name,
      });
      setCancelPassword(''); // 비밀번호 입력 초기화
    } else {
      setCancelModalContent(null);
      setCancelPassword(''); // 비밀번호 입력 초기화
    }
  };

  const handleCancel = async () => {
    if (!cancelModalContent || !cancelPassword) {
      alert('취소하려면 비밀번호를 입력해주세요.');
      return;
    }

    const cancelData = { 
      studentid: cancelModalContent.studentid,  // studentid 유지
      password: cancelPassword,
      name: cancelModalContent.name
    };
    
    console.log('Canceling with data:', cancelData);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('https://web-production-be0ca.up.railway.app/api/cancel/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken, // CSRF 토큰 추가
        },
        body: JSON.stringify(cancelData),
        credentials: 'include', // 세션 쿠키 포함
      });
      if (!response.ok) throw new Error(await response.text() || 'Cancel failed');
      alert('모든 예약 취소 성공!');
      setSelectedSeat(null);  // 선택된 좌석 초기화
      setCancelModalContent(null);  // 팝업 닫기
      setCancelPassword('');  // 비밀번호 입력 초기화
      fetchSeatStatuses(); // 상태 갱신
    } catch (error) {
      console.error('Error during cancel:', error);
      alert(`취소 실패: ${error.message || '서버 오류가 발생했습니다.'}`);
    }
  };

  // 사물함 위치 이미지 매핑
  const lockerImages = {
    'Lockermap': '/lockers.png',
  };

  const showLockerImage = (lockerId) => {
    setSelectedLockerImage(lockerImages[lockerId] || null);
  };

  return (
    <div className="App">
      <h1>사물함 예약 시스템</h1>
      
      {!isLoggedIn ? (
        <div className="auth-container">
          <div className="auth-toggle">
            <button onClick={() => { setIsRegistering(false); setLoginError(''); }}>로그인</button>
            <button onClick={() => { setIsRegistering(true); setLoginError(''); }}>가입</button>
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="login-form">
              <h2>가입</h2>
              {loginError && <p className="error">{loginError}</p>}
              <div>
                <label>이름: </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>학번: </label>
                <input
                  type="text"
                  value={studentid}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>비밀번호: </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit">가입</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="login-form">
              <h2>로그인</h2>
              {loginError && <p className="error">{loginError}</p>}
              <div>
                <label>이름: </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>학번: </label>
                <input
                  type="text"
                  value={studentid}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>비밀번호: </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit">로그인</button>
            </form>
          )}
        </div>
      ) : (
        <>
          {/* 상단 사물함 위치 및 취소 버튼 (토글 방식) */}
          <div className="locker-buttons">
            <button
              key="Lockermap"
              className="locker-button"
              onClick={() => showLockerImage('Lockermap')}
            >
              사물함 위치 보기
            </button>
            <button
              className="locker-button"
              onClick={toggleCancelModal}
            >
              모든 예약 취소
            </button>
            <button
              className="locker-button"
              onClick={handleSubmit}
              disabled={!selectedSeat} // 좌석 선택 시 활성화
            >
              예약하기
            </button>
          </div>

          {/* 사물함 위치 이미지 표시 (토글 방식) */}
          {selectedLockerImage && (
            <div className="locker-image-modal" onClick={() => setSelectedLockerImage(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <img src={selectedLockerImage} alt="Locker Layout" width="600" height="500" />
                <button onClick={() => setSelectedLockerImage(null)}>닫기</button>
              </div>
            </div>
          )}

          {/* 취소 팝업 표시 (토글 방식) */}
          {cancelModalContent && (
            <div className="locker-image-modal" onClick={() => setCancelModalContent(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>예약 취소</h2>
                <p>비밀번호를 입력해주세요:</p>
                <input
                  type="password"
                  value={cancelPassword}
                  onChange={(e) => setCancelPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCancel()}
                  required
                />
                <button onClick={handleCancel}>입력</button>
                <button onClick={() => setCancelModalContent(null)}>닫기</button>
              </div>
            </div>
          )}

          <form>
            <div>
              <label>이름: </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled
              />
            </div>
            <div>
              <label>학번: </label>
              <input
                type="text"
                value={studentid}
                onChange={(e) => setStudentId(e.target.value)}
                required
                disabled
              />
            </div>
            <div>
              <label>비밀번호: </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled
              />
            </div>
          </form>

          {/* 4개의 3x9 그리드 표시 */}
          {lockers.map((locker) => (
            <div key={locker} className="locker-group">
              <h2>{locker}</h2>
              <div className="seat-grid">
                {generateSeats(locker).map((row, rowIndex) => (
                  <div key={rowIndex} className="seat-row">
                    {row.map((seat) => (
                      <button
                        key={seat}
                        className={`seat ${selectedSeat === seat ? 'selected' : ''} ${seatStatuses[seat]?.status === 'reserved' ? 'reserved' : ''}`}
                        onClick={() => setSelectedSeat(seat)}
                        // 예약된 좌석도 클릭 가능하도록 disabled 제거
                      >
                        {seat.split('-')[1]}
                        <br />
                        (상태: {seatStatuses[seat]?.status || '불러오는 중...'})
                        {seatStatuses[seat]?.status === 'reserved' && seatStatuses[seat]?.name && (
                          <>
                            <br />
                            <span>(예약자: {seatStatuses[seat].name})</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 하단 button-group 제거 */}
        </>
      )}
    </div>
  );
}

export default App;