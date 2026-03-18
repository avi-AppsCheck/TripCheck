import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    try {
      setError('');
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      setError('שגיאה בהתחברות. נסה שוב.');
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="text-center w-full max-w-sm">
        <img 
          src="/TripCheck%20New_Logo.png?v=5.2" 
          alt="TripCheck Logo" 
          className="w-80 h-80 mx-auto mb-4 object-contain"
        />
        <p className="text-gray-500 mt-2 mb-8">ניהול נוכחות בשטח בקלות</p>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <button 
          onClick={handleLogin}
          className="bg-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all mx-auto border w-full flex items-center justify-center font-semibold text-gray-700"
        >
          <svg className="w-6 h-6 ml-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.486-11.189-8.188l-6.571,4.819C9.656,39.663,16.318,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.638,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          התחבר עם חשבון גוגל
        </button>
      </div>
    </div>
  );
}
