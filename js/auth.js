function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function showMessage(el,message,type='error'){if(!el)return;el.textContent=message;el.className='notice '+type;el.classList.remove('hidden');}
function isAdminSession(session){return !!(session?.user?.app_metadata?.role==='admin');}
async function requireAdmin(){const {data:{session}}=await window.supabaseClient.auth.getSession();if(!session){location.replace('login.html');return null;}if(!isAdminSession(session)){await window.supabaseClient.auth.signOut();location.replace('login.html?error=unauthorized');return null;}return session;}
async function logout(){await window.supabaseClient.auth.signOut();location.replace('login.html');}
window.escapeHtml=escapeHtml;window.showMessage=showMessage;window.isAdminSession=isAdminSession;window.requireAdmin=requireAdmin;window.logout=logout;
