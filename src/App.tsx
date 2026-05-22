import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';

// 기존에 App.tsx 안에 있던 Login / SignUp 컴포넌트를 임시로 다시 사용
// 현재는 간단한 린크 구조만 유지

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* 로그인/회원가입은 임시로 래딩으로 유지 (후에 정식 페이지로 분리 예정) */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
