const path = require('path');
const express = require('express');
const session = require('express-session');

const API_BASE_URL = 'http://localhost:3000';
const PORT = 4000;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'progressao-musica-web',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function redirectWithError(req, res, url, message) {
  setFlash(req, 'is-danger', message);
  return res.redirect(url);
}

async function apiRequest(req, method, endpoint, body) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (req.session.token) {
    headers.Authorization = `Bearer ${req.session.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Falha na API (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return redirectWithError(req, res, '/login', 'Você precisa fazer login para acessar esta área.');
  }

  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      return redirectWithError(req, res, '/login', 'Você precisa fazer login para acessar esta área.');
    }

    if (req.session.user.role !== role) {
      return redirectWithError(req, res, '/', 'Acesso restrito ao perfil solicitado.');
    }

    next();
  };
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const role = user.role || 'student';
  return {
    ...user,
    role,
  };
}

app.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.render('home', { lessons: [], students: [], progress: null });
  }

  try {
    if (req.session.user.role === 'instructor') {
      const [studentsResponse, lessonsResponse] = await Promise.all([
        apiRequest(req, 'GET', '/api/students'),
        apiRequest(req, 'GET', '/api/lessons'),
      ]);

      return res.render('home', {
        lessons: lessonsResponse.lessons || [],
        students: studentsResponse.students || [],
        progress: null,
      });
    }

    const progressResponse = await apiRequest(req, 'GET', '/api/progress/me');
    return res.render('home', {
      lessons: progressResponse.progress?.pendingLessons || [],
      students: [],
      progress: progressResponse.progress || null,
    });
  } catch (error) {
    setFlash(req, 'is-danger', error.message);
    return res.render('home', { lessons: [], students: [], progress: null });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { mode: 'login', role: 'instructor' });
});

app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return redirectWithError(req, res, '/login', 'Informe email e senha.');
  }

  try {
    const response = await apiRequest(req, 'POST', '/api/auth/login', { email, password });
    req.session.token = response.token;
    req.session.user = normalizeUser(response.user);
    return res.redirect('/');
  } catch (error) {
    return redirectWithError(req, res, '/login', error.message);
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/register/instructor', (req, res) => {
  res.render('register-instructor');
});

app.post('/register/instructor', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return redirectWithError(req, res, '/register/instructor', 'Preencha nome, email e senha.');
  }

  try {
    await apiRequest(req, 'POST', '/api/auth/instructors/register', { name, email, password });
    setFlash(req, 'is-success', 'Instrutor cadastrado com sucesso. Faça login para continuar.');
    return res.redirect('/login');
  } catch (error) {
    return redirectWithError(req, res, '/register/instructor', error.message);
  }
});

app.get('/register/student', requireRole('instructor'), (req, res) => {
  res.render('register-student');
});

app.post('/register/student', requireRole('instructor'), async (req, res) => {
  const { name, email, password, instrument, level } = req.body;

  if (!name || !email || !password || !instrument || !level) {
    return redirectWithError(req, res, '/register/student', 'Preencha todos os campos do aluno.');
  }

  try {
    await apiRequest(req, 'POST', '/api/auth/students/register', { name, email, password, instrument, level });
    setFlash(req, 'is-success', 'Aluno cadastrado com sucesso.');
    return res.redirect('/students');
  } catch (error) {
    return redirectWithError(req, res, '/register/student', error.message);
  }
});

app.get('/students', requireRole('instructor'), async (req, res) => {
  try {
    const response = await apiRequest(req, 'GET', '/api/students');
    res.render('students', { students: response.students || [] });
  } catch (error) {
    setFlash(req, 'is-danger', error.message);
    res.render('students', { students: [] });
  }
});

app.get('/students/:id', requireAuth, async (req, res) => {
  try {
    const [studentResponse, progressResponse] = await Promise.all([
      apiRequest(req, 'GET', `/api/students/${req.params.id}`),
      apiRequest(req, 'GET', `/api/progress/students/${req.params.id}`),
    ]);

    res.render('student-detail', {
      student: studentResponse.student,
      progress: progressResponse.progress,
    });
  } catch (error) {
    return redirectWithError(req, res, '/', error.message);
  }
});

app.get('/lessons', requireRole('instructor'), async (req, res) => {
  try {
    const response = await apiRequest(req, 'GET', '/api/lessons');
    res.render('lessons', { lessons: response.lessons || [] });
  } catch (error) {
    setFlash(req, 'is-danger', error.message);
    res.render('lessons', { lessons: [] });
  }
});

app.get('/lessons/new', requireRole('instructor'), (req, res) => {
  res.render('lesson-form');
});

app.post('/lessons', requireRole('instructor'), async (req, res) => {
  const { title, instrument, level, description } = req.body;

  if (!title || !instrument || !level) {
    return redirectWithError(req, res, '/lessons/new', 'Preencha título, instrumento e nível.');
  }

  try {
    await apiRequest(req, 'POST', '/api/lessons', { title, instrument, level, description });
    setFlash(req, 'is-success', 'Lição criada com sucesso.');
    return res.redirect('/lessons');
  } catch (error) {
    return redirectWithError(req, res, '/lessons/new', error.message);
  }
});

app.get('/progress/me', requireRole('student'), async (req, res) => {
  try {
    const response = await apiRequest(req, 'GET', '/api/progress/me');
    res.render('progress', { progress: response.progress });
  } catch (error) {
    setFlash(req, 'is-danger', error.message);
    res.render('progress', { progress: null });
  }
});

app.get('/progress/students/:id', requireRole('instructor'), async (req, res) => {
  try {
    const response = await apiRequest(req, 'GET', `/api/progress/students/${req.params.id}`);
    res.render('progress', { progress: response.progress });
  } catch (error) {
    return redirectWithError(req, res, '/students', error.message);
  }
});

app.get('/students/:id/completed-lessons/new', requireRole('instructor'), async (req, res) => {
  try {
    const [studentResponse, lessonsResponse] = await Promise.all([
      apiRequest(req, 'GET', `/api/students/${req.params.id}`),
      apiRequest(req, 'GET', '/api/lessons'),
    ]);

    res.render('completed-lesson-form', {
      student: studentResponse.student,
      lessons: lessonsResponse.lessons || [],
    });
  } catch (error) {
    return redirectWithError(req, res, '/students', error.message);
  }
});

app.post('/students/:id/completed-lessons', requireRole('instructor'), async (req, res) => {
  const { lessonId, completedAt } = req.body;

  if (!lessonId) {
    return redirectWithError(req, res, `/students/${req.params.id}/completed-lessons/new`, 'Selecione uma lição.');
  }

  try {
    await apiRequest(req, 'POST', `/api/students/${req.params.id}/completed-lessons`, {
      lessonId,
      completedAt: completedAt || undefined,
    });
    setFlash(req, 'is-success', 'Lição concluída registrada com sucesso.');
    return res.redirect(`/students/${req.params.id}`);
  } catch (error) {
    return redirectWithError(req, res, `/students/${req.params.id}/completed-lessons/new`, error.message);
  }
});

app.use((req, res) => {
  res.status(404).render('not-found');
});

app.listen(PORT, () => {
  console.log(`Aplicacao rodando em http://localhost:${PORT}`);
});