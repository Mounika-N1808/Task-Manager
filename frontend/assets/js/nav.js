function initNav(activePage) {
  const user = getUser();
  if (!user) { window.location.href = '/index.html'; return; }
  if (user.role === 'admin') document.body.classList.add('is-admin');

  const sidebarHTML = `
  <nav class="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">TF</div>
      <div class="sidebar-logo-text">Task<span>Flow</span></div>
    </div>
    <span class="nav-section-label">Main</span>
    <a href="/dashboard.html" class="nav-link ${activePage==='dashboard'?'active':''}">
      <span class="nav-icon">DB</span> Dashboard
    </a>
    <a href="/projects.html" class="nav-link ${activePage==='projects'?'active':''}">
      <span class="nav-icon">PR</span> Projects
    </a>
    <a href="/tasks.html" class="nav-link ${activePage==='tasks'?'active':''}">
      <span class="nav-icon">TK</span> My Tasks
    </a>
    <span class="nav-section-label admin-only">Admin</span>
    <a href="/team.html" class="nav-link admin-only ${activePage==='team'?'active':''}">
      <span class="nav-icon">TM</span> Team
    </a>
    <div class="sidebar-footer">
      <div class="user-menu-wrap">
      <button class="user-card" id="profile-menu-btn" type="button" aria-haspopup="true" aria-expanded="false">
        ${avatar(user.name, user.avatar_color)}
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-role">${user.role}</div>
        </div>
        <span class="user-menu-caret">MENU</span>
      </button>
      <div class="profile-menu" id="profile-menu">
        <div class="profile-menu-header">
          ${avatar(user.name, user.avatar_color, 'avatar-sm')}
          <div>
            <div class="profile-menu-name">${user.name}</div>
            <div class="profile-menu-email">${user.email}</div>
          </div>
        </div>
        <a class="profile-menu-item" href="/dashboard.html">Dashboard</a>
        <a class="profile-menu-item" href="/tasks.html">My Tasks</a>
        <button class="profile-menu-item profile-menu-logout" id="logout-btn" type="button">Logout</button>
      </div>
      </div>
    </div>
  </nav>`;

  document.body.insertAdjacentHTML('afterbegin', '<div class="mesh-bg"></div>' + sidebarHTML);
  const profileBtn = document.getElementById('profile-menu-btn');
  const profileMenu = document.getElementById('profile-menu');
  profileBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = profileMenu.classList.toggle('active');
    profileBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (event) => {
    if (!profileMenu.contains(event.target) && !profileBtn.contains(event.target)) {
      profileMenu.classList.remove('active');
      profileBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      profileMenu.classList.remove('active');
      profileBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth(); window.location.href = '/index.html';
  });
}
