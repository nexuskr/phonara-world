import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Simple clean Login component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // TODO: Replace with real Supabase auth
    setTimeout(() => {
      if (email === 'dreamtech123123@gmail.com') {
        setMessage('로그인 성공! (Admin 계정)');
        // In real app: redirect to dashboard
      } else {
        setMessage('로그인 실패. 이메일 또는 비밀번호를 확인하세요.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold text-white tracking-tight">PHONARA</h1>
          <p className="text-gray-400 mt-2">한국인을 위한 프리미엄 트레이딩 & 엔터테인먼트</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">로그인</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-yellow-500 text-white rounded-xl px-4 py-3 outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-yellow-500 text-white rounded-xl px-4 py-3 outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-semibold py-3.5 rounded-xl transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 text-center text-sm p-3 rounded-xl ${message.includes('성공') ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <button 
              onClick={() => alert('회원가입 페이지는 다음 단계에서 구현됩니다.')}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              계정이 없으신가요? 회원가입
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-500 mt-8">PHONARA • Phase 2 • Clean Auth Rebuild</p>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
