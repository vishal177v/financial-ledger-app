export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const TARGET_HASH = "42376098903967b69e12b34d78c53b4bb60322b9d756da07bb57441208782262";

export function isAuthenticated() {
  return localStorage.getItem('auth_token') === TARGET_HASH;
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function showLoginScreen(onSuccess) {
  const html = `
    <div id="auth-screen" style="position: fixed; inset: 0; background: var(--black-3); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--brand-blue)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <h1 style="color: var(--text-1); font-size: 1.5rem; margin-top: 16px;">App Locked</h1>
        <p style="color: var(--text-3); font-size: 0.9rem; margin-top: 8px;">Enter your master password to continue</p>
      </div>
      
      <div style="width: 100%; max-width: 320px;">
        <input type="password" id="auth-pwd" placeholder="Master Password" style="width: 100%; padding: 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--black-1); color: var(--text-1); font-size: 1rem; margin-bottom: 16px; text-align: center;" />
        <button id="auth-btn" style="width: 100%; padding: 16px; border-radius: 12px; border: none; background: var(--brand-blue); color: white; font-size: 1rem; font-weight: 600; cursor: pointer;">Unlock App</button>
        <div id="auth-err" style="color: var(--red); font-size: 0.85rem; text-align: center; margin-top: 12px; display: none;">Incorrect password</div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  const pwdInput = document.getElementById('auth-pwd');
  const btn = document.getElementById('auth-btn');
  const err = document.getElementById('auth-err');
  
  setTimeout(() => pwdInput.focus(), 100);

  const attemptLogin = async () => {
    err.style.display = 'none';
    const pwd = pwdInput.value;
    const hash = await sha256(pwd);
    if (hash === TARGET_HASH) {
      localStorage.setItem('auth_token', hash);
      document.getElementById('auth-screen').remove();
      onSuccess();
    } else {
      err.style.display = 'block';
      pwdInput.value = '';
      pwdInput.focus();
    }
  };

  btn.onclick = attemptLogin;
  pwdInput.onkeydown = (e) => { if (e.key === 'Enter') attemptLogin(); };
}
