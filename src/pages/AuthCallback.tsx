import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';

/**
 * Simple & Robust AuthCallback
 * Handles Supabase magic links, password reset, OAuth callbacks
 * Shows clear messages instead of blank screen on error
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('인증 처리 중입니다...');

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Check for error in URL hash first (common with expired/failed links)
        const hash = window.location.hash.startsWith('#') 
          ? window.location.hash.slice(1) 
          : window.location.hash;
        
        const hashParams = new URLSearchParams(hash);
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDesc = hashParams.get('error_description');

        if (error || errorCode) {
          console.error('Auth error detected:', { error, errorCode, errorDesc });
          setStatus('error');
          setMessage(
            errorDesc || 
            (errorCode === 'otp_expired' ? '인증 링크가 만료되었습니다.' : '인증에 실패했습니다.')
          );
          return;
        }

        // Try to get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setMessage('인증 세션을 가져오는데 실패했습니다.');
          return;
        }

        if (session?.user) {
          setStatus('success');
          setMessage('인증이 완료되었습니다. 잠시 후 이동합니다...');
          
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1200);
          return;
        }

        // Try exchanging code if present (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) {
            setStatus('error');
            setMessage('인증 코드 처리에 실패했습니다.');
            return;
          }

          setStatus('success');
          setMessage('로그인이 완료되었습니다.');
          setTimeout(() => navigate('/', { replace: true }), 1000);
          return;
        }

        // No session and no code
        setStatus('error');
        setMessage('인증 정보를 찾을 수 없습니다. 다시 시도해주세요.');
      } catch (err) {
        console.error('AuthCallback unexpected error:', err);
        setStatus('error');
        setMessage('예상치 못한 오류가 발생했습니다.');
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md w-full">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-2xl">
              ✅
            </div>
            <p className="text-lg font-medium">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-2xl">
              ⚠️
            </div>
            <p className="mb-4 text-lg font-medium text-destructive">{message}</p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/secure-auth', { replace: true })}
                className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                로그인 페이지로 이동
              </button>
              
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full rounded-lg border py-3 text-sm font-medium hover:bg-accent"
              >
                홈으로 이동
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
