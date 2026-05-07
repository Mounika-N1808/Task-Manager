const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs-extra');

const dataDir = path.join(__dirname, '../../../data');
fs.ensureDirSync(dataDir);
const dbPath = path.join(dataDir, 'taskmanager.db');

let db = null;
let dbReady = false;

async function getDb() {
  if (dbReady) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  initSchema();
  seed();
  ensureCoreSampleData();
  dbReady = true;
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// sql.js requires db.exec() for multiple statements (db.run only handles one)
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      project_id INTEGER NOT NULL,
      assignee_id INTEGER,
      created_by INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  save();
}

// Use db.prepare().run() so we can reliably get last_insert_rowid
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const id = idStmt.getAsObject().id;
  idStmt.free();
  save();
  return { lastInsertRowid: id };
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function pastDate(days) {
  return futureDate(-days);
}

function createTaskIfMissing(title, description, status, priority, projectId, assigneeId, createdBy, dueDate) {
  if (get('SELECT id FROM tasks WHERE title=? AND project_id=?', [title, projectId])) return;
  run(
    'INSERT INTO tasks (title,description,status,priority,project_id,assignee_id,created_by,due_date) VALUES (?,?,?,?,?,?,?,?)',
    [title, description, status, priority, projectId, assigneeId, createdBy, dueDate]
  );
}

function createProjectIfMissing(name, description, ownerId) {
  const existing = get('SELECT id FROM projects WHERE name=?', [name]);
  if (existing) return existing.id;
  return run('INSERT INTO projects (name,description,status,owner_id) VALUES (?,?,?,?)', [
    name,
    description,
    'active',
    ownerId
  ]).lastInsertRowid;
}

function createUserDashboardData(user) {
  const ownerId = user.role === 'admin' ? user.id : (get('SELECT id FROM users WHERE role=? ORDER BY id LIMIT 1', ['admin'])?.id || user.id);
  const firstName = (user.name || 'Team').split(' ')[0];
  const projectName = user.role === 'admin'
    ? 'Executive Delivery Control'
    : `${firstName} Focus Board`;
  const projectId = createProjectIfMissing(
    projectName,
    user.role === 'admin'
      ? 'Leadership view for delivery risks, launches, staffing, and executive updates.'
      : `Focused task stream for ${firstName}'s current priorities, deadlines, and review work.`,
    ownerId
  );

  run('INSERT OR IGNORE INTO project_members (project_id,user_id) VALUES (?,?)', [projectId, user.id]);

  const variants = {
    admin: [
      ['Approve release readiness summary', 'Review launch blockers and confirm release readiness with project owners.', 'review', 'urgent', pastDate(1)],
      ['Align staffing for mobile launch', 'Confirm coverage for engineering, QA, support, and product sign-off.', 'in_progress', 'high', futureDate(2)],
      ['Finalize quarterly roadmap notes', 'Prepare the roadmap narrative for leadership and customer-facing teams.', 'todo', 'high', futureDate(5)],
      ['Review overdue delivery risks', 'Audit aging tasks and assign owners for high-risk project work.', 'in_progress', 'urgent', futureDate(1)],
      ['Close completed API migration report', 'Archive final migration outcomes and lessons learned for the platform team.', 'done', 'medium', pastDate(4)],
      ['Prepare customer health snapshot', 'Summarize adoption, renewal risk, and expansion opportunities for top accounts.', 'todo', 'medium', futureDate(8)]
    ],
    jordan: [
      ['Refresh dashboard empty states', 'Update copy and visuals for empty project, task, and team screens.', 'in_progress', 'medium', futureDate(2)],
      ['Review task card color system', 'Check color coding for priorities and status badges across the task board.', 'review', 'high', futureDate(1)],
      ['Publish component spacing notes', 'Document spacing rules for cards, toolbars, and table rows.', 'done', 'low', pastDate(3)],
      ['Prototype project detail filters', 'Create a clickable prototype for filtering project tasks by owner and priority.', 'todo', 'medium', futureDate(7)]
    ],
    sam: [
      ['Patch authentication error handling', 'Return clearer messages for duplicate email and invalid login attempts.', 'in_progress', 'high', futureDate(1)],
      ['Add dashboard stats integration test', 'Verify stats differ across users with different project memberships.', 'todo', 'urgent', futureDate(3)],
      ['Clean task update validation', 'Prevent blank titles and unsupported statuses from being saved.', 'review', 'medium', pastDate(1)],
      ['Document API seed behavior', 'Explain how new users receive starter project memberships.', 'done', 'low', pastDate(5)],
      ['Optimize SQL dashboard queries', 'Reduce repeated task scans on project progress and recent task endpoints.', 'todo', 'high', futureDate(6)]
    ],
    rina: [
      ['Prepare mobile onboarding copy', 'Write concise onboarding steps for first-run mobile users.', 'todo', 'medium', futureDate(4)],
      ['Review push notification QA list', 'Validate iOS and Android notification states before beta release.', 'in_progress', 'urgent', pastDate(2)],
      ['Collect beta tester feedback', 'Summarize early feedback and classify issues by severity.', 'review', 'high', futureDate(3)]
    ],
    default: [
      [`Plan ${firstName}'s first project`, 'Choose the first project milestone and define the next three actions.', 'todo', 'medium', futureDate(2)],
      [`Complete ${firstName}'s onboarding task`, 'Review the dashboard, task board, and project workflow.', 'in_progress', 'medium', futureDate(1)],
      [`Review ${firstName}'s sample checklist`, 'Confirm priorities and update due dates for starter tasks.', 'review', 'low', futureDate(4)]
    ]
  };

  const emailKey = user.email?.startsWith('jordan@') ? 'jordan'
    : user.email?.startsWith('sam@') ? 'sam'
    : user.email?.startsWith('rina@') ? 'rina'
    : user.role === 'admin' ? 'admin'
    : 'default';

  variants[emailKey].forEach(task => createTaskIfMissing(
    task[0], task[1], task[2], task[3], projectId, user.id, ownerId, task[4]
  ));
}

function ensureUserDashboardData(userId) {
  const user = get('SELECT id,name,email,role FROM users WHERE id=?', [userId]);
  if (!user) return;
  createUserDashboardData(user);
}

function ensureCoreSampleData() {
  let admin = get('SELECT id FROM users WHERE email=?', ['admin@taskmanager.com'])
    || get('SELECT id FROM users WHERE role=? ORDER BY id LIMIT 1', ['admin']);
  if (!admin) {
    seed();
    admin = get('SELECT id FROM users WHERE email=?', ['admin@taskmanager.com'])
      || get('SELECT id FROM users WHERE role=? ORDER BY id LIMIT 1', ['admin']);
  }
  if (!admin) return;

  [
    ['Jordan Lee', 'jordan@taskmanager.com', 'Member@123', 'member', '#8b5cf6'],
    ['Sam Chen', 'sam@taskmanager.com', 'Member@123', 'member', '#06b6d4'],
    ['Rina Patel', 'rina@taskmanager.com', 'Member@123', 'member', '#10b981']
  ].forEach(user => {
    if (!get('SELECT id FROM users WHERE email=?', [user[1]])) {
      run('INSERT INTO users (name,email,password_hash,role,avatar_color) VALUES (?,?,?,?,?)', [
        user[0], user[1], bcrypt.hashSync(user[2], 10), user[3], user[4]
      ]);
    }
  });

  let sampleProject = get('SELECT id FROM projects WHERE name=?', ['Customer Success Operations']);
  if (!sampleProject) {
    const row = run('INSERT INTO projects (name,description,status,owner_id) VALUES (?,?,?,?)', [
      'Customer Success Operations',
      'Coordinate onboarding, support quality, renewal outreach, and customer health work across the team.',
      'active',
      admin.id
    ]);
    sampleProject = { id: row.lastInsertRowid };
  }

  all('SELECT id FROM users').forEach(user => {
    run('INSERT OR IGNORE INTO project_members (project_id,user_id) VALUES (?,?)', [sampleProject.id, user.id]);
  });

  const users = all('SELECT id,name,email FROM users ORDER BY id');
  const pick = (index) => users[index % users.length]?.id || admin.id;
  const tasks = [
    ['Prepare onboarding checklist templates', 'Build reusable onboarding task templates for new customer launches.', 'done', 'medium', pick(1), pastDate(9)],
    ['Review weekly support quality samples', 'Audit recent support conversations and tag coaching opportunities for the team.', 'in_progress', 'high', pick(2), futureDate(2)],
    ['Create renewal risk register', 'List accounts due for renewal this quarter with owner, health score, and next action.', 'review', 'urgent', pick(3), pastDate(1)],
    ['Schedule product feedback interviews', 'Invite ten active customers to structured interviews about reporting and workflow gaps.', 'todo', 'medium', pick(0), futureDate(6)],
    ['Update customer health score rules', 'Tune health score weights for adoption, support volume, NPS, and expansion signals.', 'in_progress', 'high', pick(1), futureDate(4)],
    ['Publish May success metrics digest', 'Summarize activation, retention, response time, and expansion pipeline for leadership.', 'todo', 'low', pick(2), futureDate(8)]
  ];

  tasks.forEach(task => createTaskIfMissing(
    task[0], task[1], task[2], task[3], sampleProject.id, task[4], admin.id, task[5]
  ));

  users.forEach((user, index) => {
    const firstName = (user.name || 'Team member').split(' ')[0];
    createTaskIfMissing(
      `Follow up with ${firstName}'s pilot customer`,
      'Complete a focused customer check-in and capture next steps in the success plan.',
      index % 2 === 0 ? 'todo' : 'in_progress',
      index % 3 === 0 ? 'high' : 'medium',
      sampleProject.id,
      user.id,
      admin.id,
      futureDate(3 + index)
    );
  });

  all('SELECT id,name,email,role FROM users ORDER BY id').forEach(createUserDashboardData);
}

function assignUserToSampleProjects(userId) {
  ensureCoreSampleData();
  ensureUserDashboardData(userId);
}

function seed() {
  const exists = get('SELECT id FROM users WHERE email = ?', ['admin@taskmanager.com']);
  if (exists) return;

  console.log('🌱 Seeding database with sample data...');

  // ── USERS ──────────────────────────────────────────────────────────
  const adminId = run('INSERT INTO users (name,email,password_hash,role,avatar_color) VALUES (?,?,?,?,?)',
    ['Alex Admin', 'admin@taskmanager.com', bcrypt.hashSync('Admin@123', 10), 'admin', '#6366f1']).lastInsertRowid;
  const jordanId = run('INSERT INTO users (name,email,password_hash,role,avatar_color) VALUES (?,?,?,?,?)',
    ['Jordan Lee', 'jordan@taskmanager.com', bcrypt.hashSync('Member@123', 10), 'member', '#8b5cf6']).lastInsertRowid;
  const samId = run('INSERT INTO users (name,email,password_hash,role,avatar_color) VALUES (?,?,?,?,?)',
    ['Sam Chen', 'sam@taskmanager.com', bcrypt.hashSync('Member@123', 10), 'member', '#06b6d4']).lastInsertRowid;
  const rinaId = run('INSERT INTO users (name,email,password_hash,role,avatar_color) VALUES (?,?,?,?,?)',
    ['Rina Patel', 'rina@taskmanager.com', bcrypt.hashSync('Member@123', 10), 'member', '#10b981']).lastInsertRowid;

  // ── PROJECTS ───────────────────────────────────────────────────────
  const p1 = run('INSERT INTO projects (name,description,status,owner_id) VALUES (?,?,?,?)', [
    'Nebula Dashboard Redesign',
    'Complete redesign of the main dashboard with modern glassmorphism UI components and improved UX flows.',
    'active', adminId
  ]).lastInsertRowid;

  const p2 = run('INSERT INTO projects (name,description,status,owner_id) VALUES (?,?,?,?)', [
    'API Gateway Migration',
    'Migrate all existing REST endpoints to the new API gateway with improved authentication and rate limiting.',
    'active', adminId
  ]).lastInsertRowid;

  const p3 = run('INSERT INTO projects (name,description,status,owner_id) VALUES (?,?,?,?)', [
    'Mobile App Launch',
    'Cross-platform mobile application for iOS and Android. Includes push notifications, offline mode, and analytics.',
    'active', adminId
  ]).lastInsertRowid;

  // ── PROJECT MEMBERS ────────────────────────────────────────────────
  const addMem = (pid, uid) => run('INSERT OR IGNORE INTO project_members (project_id,user_id) VALUES (?,?)', [pid, uid]);
  [adminId, jordanId, samId, rinaId].forEach(uid => addMem(p1, uid));
  [adminId, jordanId, samId].forEach(uid => addMem(p2, uid));
  [adminId, rinaId, samId].forEach(uid => addMem(p3, uid));

  // ── HELPER DATES ───────────────────────────────────────────────────
  const fd  = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().split('T')[0]; };
  const pd  = d => fd(-d);

  // ── TASKS — Project 1: Nebula Dashboard Redesign ───────────────────
  const it = (t, d, st, pr, pid, aid, cid, due) =>
    run('INSERT INTO tasks (title,description,status,priority,project_id,assignee_id,created_by,due_date) VALUES (?,?,?,?,?,?,?,?)',
      [t, d, st, pr, pid, aid, cid, due]);

  it('Define design system color tokens',
    'Create a complete set of CSS custom properties for colors, spacing, and typography across all components.',
    'done', 'high', p1, jordanId, adminId, pd(12));

  it('Build glass card component library',
    'Develop reusable glassmorphism card components with proper backdrop-filter and hover animations.',
    'done', 'high', p1, samId, adminId, pd(8));

  it('Dashboard layout wireframes',
    'Create high-fidelity wireframes for all 5 dashboard screens using Figma. Include desktop and mobile variants.',
    'done', 'medium', p1, jordanId, adminId, pd(5));

  it('Sidebar navigation redesign',
    'Redesign the sidebar with collapsible sections, icon animations, and active state indicators.',
    'in_progress', 'medium', p1, samId, adminId, fd(3));

  it('Data visualization components',
    'Build SVG-based chart and graph components for the analytics section including bar, line, and donut charts.',
    'in_progress', 'high', p1, rinaId, adminId, fd(5));

  it('Kanban board drag-and-drop',
    'Implement native HTML5 drag-and-drop for the Kanban board with visual feedback and column drop zones.',
    'in_progress', 'urgent', p1, jordanId, adminId, fd(2));

  it('Responsive mobile layouts',
    'Ensure all dashboard layouts are fully responsive down to 320px viewport width.',
    'review', 'medium', p1, samId, adminId, fd(1));

  it('Accessibility WCAG 2.1 audit',
    'Run a full WCAG 2.1 AA compliance audit on all components. Fix colour contrast, ARIA labels, and keyboard nav.',
    'todo', 'low', p1, null, adminId, fd(14));

  it('Dark mode toggle feature',
    'Add a system-aware dark/light mode toggle that persists user preference in localStorage.',
    'todo', 'medium', p1, rinaId, adminId, fd(10));

  it('Performance optimisation & lazy loading',
    'Reduce initial bundle size by 40%, implement route-based code splitting and lazy load images.',
    'todo', 'high', p1, null, adminId, fd(7));

  it('Cross-browser testing',
    'Test all UI components in Chrome, Firefox, Safari, and Edge. Document and fix any rendering inconsistencies.',
    'todo', 'medium', p1, jordanId, adminId, fd(12));

  // OVERDUE tasks (due date in the past, status not done)
  it('Fix login page validation bug',
    'Users can submit the login form without entering an email. Add proper front-end and back-end validation.',
    'review', 'urgent', p1, samId, adminId, pd(3));

  it('Update typography scale',
    'Switch from system fonts to Outfit + Inter Google Fonts across all pages. Update CSS variables accordingly.',
    'in_progress', 'low', p1, rinaId, adminId, pd(1));

  // ── TASKS — Project 2: API Gateway Migration ───────────────────────
  it('API endpoint inventory & documentation',
    'Document all 47 existing REST endpoints including request/response schemas, auth requirements, and examples.',
    'done', 'high', p2, jordanId, adminId, pd(15));

  it('Choose and configure API gateway',
    'Evaluate Kong, AWS API Gateway, and Nginx. Configure the chosen solution for the staging environment.',
    'done', 'high', p2, adminId, adminId, pd(10));

  it('JWT authentication migration',
    'Replace session-based auth with stateless JWT tokens. Update all 12 protected endpoints.',
    'done', 'urgent', p2, samId, adminId, pd(7));

  it('Rate limiting rules per endpoint',
    'Define and implement per-IP and per-user rate limiting rules. Set up Redis for rate limit state storage.',
    'in_progress', 'high', p2, jordanId, adminId, fd(3));

  it('Gateway logging & monitoring setup',
    'Configure structured JSON logging and integrate with Datadog. Create dashboard for API latency and error rates.',
    'in_progress', 'medium', p2, adminId, adminId, fd(5));

  it('Load testing with k6',
    'Write k6 load test scripts and run 1000 concurrent user simulation. Benchmark against current system.',
    'todo', 'high', p2, samId, adminId, fd(8));

  it('Deprecate legacy v1 endpoints',
    'Add deprecation headers to all v1 endpoints. Notify API consumers via email. Schedule shutdown for 30 days.',
    'todo', 'medium', p2, null, adminId, fd(20));

  it('SSL certificate renewal automation',
    'Set up certbot auto-renewal for all gateway SSL certificates. Add monitoring alerts for expiry.',
    'todo', 'low', p2, null, adminId, fd(25));

  // OVERDUE tasks
  it('Remove hardcoded API keys from source',
    'Scan all repositories for hardcoded secrets. Move to environment variables and update CI/CD pipelines.',
    'in_progress', 'urgent', p2, jordanId, adminId, pd(2));

  // ── TASKS — Project 3: Mobile App Launch ──────────────────────────
  it('React Native project scaffolding',
    'Set up the monorepo with React Native, TypeScript, ESLint, Prettier, and Husky pre-commit hooks.',
    'done', 'high', p3, rinaId, adminId, pd(20));

  it('Authentication screens (Login/Signup)',
    'Build login, signup, forgot password, and email verification screens with form validation.',
    'done', 'high', p3, samId, adminId, pd(14));

  it('Push notification integration',
    'Integrate Firebase Cloud Messaging for iOS and Android. Implement foreground, background, and killed-app handlers.',
    'in_progress', 'urgent', p3, rinaId, adminId, fd(4));

  it('Offline mode with local storage',
    'Implement Redux Persist + SQLite to cache task data offline. Sync changes when connectivity is restored.',
    'in_progress', 'high', p3, samId, adminId, fd(6));

  it('App store listing assets',
    'Design app icon, splash screen, and 6 screenshots for App Store and Google Play Store submissions.',
    'review', 'medium', p3, rinaId, adminId, fd(2));

  it('Beta testing on TestFlight & Play Console',
    'Distribute beta build to 50 internal testers via TestFlight and Google Play internal track.',
    'todo', 'high', p3, null, adminId, fd(10));

  it('Analytics integration (Mixpanel)',
    'Track key user events: login, task creation, project switch, session duration. Build retention dashboard.',
    'todo', 'medium', p3, samId, adminId, fd(15));

  it('App Store / Google Play submission',
    'Complete all metadata, privacy policy, and binary uploads. Submit for review on both platforms.',
    'todo', 'urgent', p3, null, adminId, fd(18));

  it('User onboarding tutorial flow',
    'Create an interactive 4-step onboarding flow for first-time users with animated tooltips.',
    'todo', 'medium', p3, rinaId, adminId, fd(12));

  // OVERDUE
  it('Fix crash on Android 12 startup',
    'App crashes on cold start on Android 12 devices. Root cause traced to missing permission declaration in manifest.',
    'in_progress', 'urgent', p3, samId, adminId, pd(1));

  save();
  console.log('✅ DB seeded with rich sample data');
  console.log('   👤 Admin  : admin@taskmanager.com  / Admin@123');
  console.log('   👤 Member : jordan@taskmanager.com / Member@123');
  console.log('   👤 Member : sam@taskmanager.com    / Member@123');
  console.log('   👤 Member : rina@taskmanager.com   / Member@123');
  console.log(`   📁 3 Projects | 📋 ${30} Tasks across all projects`);
}

module.exports = { getDb, run, get, all, save, ensureCoreSampleData, assignUserToSampleProjects };
