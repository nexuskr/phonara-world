import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';

// Types
type User = {
  id: string;
  email: string;
  isAdmin: boolean;
};

// ==================== LOGIN COMPONENT ====================
const Login = () => {
  const [email, setEmail] = useState('dreamtech123123@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const isAdmin = email === 'dreamtech123123@gmail.com';
      localStorage.setItem('phonara_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        isAdmin
      }));

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
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

          {error && (
            <div className="mt-4 text-center text-sm p-3 rounded-xl bg-red-950 text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <button 
              onClick={() => navigate('/signup')}
              className="text-sm text-yellow-400 hover:text-yellow-500 transition block w-full"
            >
              계정이 없으신가요? 회원가입하기
            </button>
            <button 
              onClick={() => alert('비밀번호 찾기 기능은 다음 단계에서 진행합니다.')}
              className="text-sm text-gray-400 hover:text-white transition block w-full"
            >
              비밀번호를 잊어버리셨나요?
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-500 mt-8">PHONARA • Phase 3 • Real Supabase Auth</p>
      </div>
    </div>
  );
};

// ==================== SIGNUP COMPONENT ====================
const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
          }
        }
      });

      if (error) throw error;

      // 성공 메시지 (이메일 확인 필요 여부에 따라 다름)
      setIsSuccess(true);
      setMessage('회원가입이 완료되었습니다! 이메일을 확인해주세요. (이메일 확인이 필요할 수 있습니다)');

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error('SignUp error:', err);
      setMessage(err.message || '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold text-white tracking-tight">PHONARA</h1>
          <p className="text-gray-400 mt-2">한국인을 위한 프리미엄 트레이딩 & 엔터테인먼트</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">회원가입</h2>
          
          {!isSuccess ? (
            <form onSubmit={handleSignUp} className="space-y-5">
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

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-700 focus:border-yellow-500 text-white rounded-xl px-4 py-3 outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-semibold py-3.5 rounded-xl transition disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? '가입 진행 중...' : '회원가입'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="text-emerald-400 text-lg mb-4">✅</div>
              <p className="text-white">{message}</p>
            </div>
          )}

          {!isSuccess && message && !loading && (
            <div className="mt-4 text-center text-sm p-3 rounded-xl bg-red-950 text-red-400">
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-500 mt-8">PHONARA • Phase 3 • Real Supabase Auth</p>
      </div>
    </div>
  );
};

// ==================== DASHBOARD COMPONENT ====================
const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()n    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const isAdmin = session.user.email === 'dreamtech123123@gmail.com';
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          isAdmin
        });
      } else {
        const saved = localStorage.getItem('phonara_user');
        if (saved) {
          setUser(JSON.parse(saved));
        } else {
          window.location.href = '/';
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('phonara_user');
        window.location.href = '/';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('phonara_user');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">PHONARA</h1>
            <span className="text-xs px-2 py-0.5 bg-yellow-400 text-black rounded font-medium">BETA</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">{user.email}</div>
              {user.isAdmin && <div className="text-[10px] text-emerald-400">Admin</div>}
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm px-4 py-1.5 border border-zinc-700 hover:bg-zinc-900 rounded-lg transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold">대시보드</h2>
          <p className="text-gray-400 mt-1">안녕하세요, {user.email.split('@')[0]}님! 오늘도 행복한 트레이딩 되세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="text-sm text-gray-400">총 자산</div>
            <div className="text-3xl font-semibold mt-2">$124,850</div>
            <div className="text-emerald-400 text-sm mt-1">+12.4% 오늘</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="text-sm text-gray-400">활성 포지션</div>
            <div className="text-3xl font-semibold mt-2">3개</div>
            <div className="text-emerald-400 text-sm mt-1">Long 2 / Short 1</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="text-sm text-gray-400">PHON 스테이킹</div>
            <div className="text-3xl font-semibold mt-2">12,450 PHON</div>
            <div className="text-emerald-400 text-sm mt-1">APY 18.2%</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => alert('트레이딩 페이지로 이동합니다. (Phase 3 진행 중)')}
            className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-500 transition"
          >
            트레이딩 시작하기
          </button>
          <button 
            onClick={() => alert('입금/출금 기능은 기존 시스템 유지 중입니다.')}
            className="px-6 py-3 border border-zinc-700 hover:bg-zinc-900 rounded-xl transition"
          >
            입금 / 출금
          </button>
          <button 
            onClick={() => alert('NFT 링8플레이스는 기존 시스템 유지 중입니다.')}
            className="px-6 py-3 border border-zinc-700 hover:bg-zinc-900 rounded-xl transition"
          >
            NFT 링8플레이스
          </button>
        </div>

        <div className="mt-10 text-xs text-gray-500">
          * Phase 3: 실제 Supabase 인증 연동 완료. 회원가입 기능 추가 완료.
        </div>
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
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
