// ===== VARIABLES GLOBALES =====
const APP_STATE = {
    currentUser: null,
    currentListId: null,
    lists: [],
    tasks: {},
};

const STORAGE_KEYS = {
    USERS: 'todo_users',
    CURRENT_USER: 'todo_current_user',
    LISTS: 'todo_lists',
    TASKS: 'todo_tasks',
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = document.body.classList.contains('dashboard-body') ? 'dashboard' : 'auth';
    
    if (currentPage === 'auth') {
        initAuthPage();
    } else {
        initDashboard();
    }
});

// ===== AUTH PAGE INITIALIZATION =====
function initAuthPage() {
    setupAuthEventListeners();
    loadStoredUser();
}

function setupAuthEventListeners() {
    // Toggle between login and register
    document.getElementById('toggleToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForm('register');
    });

    document.getElementById('toggleToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForm('login');
    });

    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Toggle password visibility
    document.getElementById('toggleLoginPassword').addEventListener('click', () => {
        togglePasswordVisibility('loginPassword');
    });

    document.getElementById('toggleRegisterPassword').addEventListener('click', () => {
        togglePasswordVisibility('registerPassword');
    });
}

function toggleAuthForm(form) {
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');

    if (form === 'register') {
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    } else {
        loginCard.style.display = 'block';
        registerCard.style.display = 'none';
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target.closest('button').querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ===== LOGIN & REGISTER HANDLERS =====
function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    const user = users.find(u => u.email === email);

    if (!user) {
        showToast('El usuario no existe', 'danger');
        return;
    }

    if (user.password !== password) {
        showToast('Contraseña incorrecta', 'danger');
        return;
    }

    // Login successful
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    showToast(`¡Bienvenido, ${user.name}!`, 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Las contraseñas no coinciden', 'danger');
        return;
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];

    if (users.find(u => u.email === email)) {
        showToast('El correo ya está registrado', 'danger');
        return;
    }

    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    showToast('¡Registro exitoso! Por favor, inicia sesión', 'success');
    
    setTimeout(() => {
        document.getElementById('registerForm').reset();
        toggleAuthForm('login');
    }, 1500);
}

function loadStoredUser() {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (user) {
        // User already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// ===== DASHBOARD INITIALIZATION =====
function initDashboard() {
    loadCurrentUser();
    loadUserData();
    setupDashboardEventListeners();
    renderLists();

    if (!APP_STATE.currentUser) {
        window.location.href = 'index.html';
    }
}

function loadCurrentUser() {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (user) {
        APP_STATE.currentUser = JSON.parse(user);
        document.getElementById('userNameDisplay').textContent = APP_STATE.currentUser.name;
    }
}

function loadUserData() {
    const userId = APP_STATE.currentUser.id;
    const allLists = JSON.parse(localStorage.getItem(STORAGE_KEYS.LISTS)) || [];
    const allTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || {};

    APP_STATE.lists = allLists.filter(list => list.userId === userId);
    APP_STATE.tasks = allTasks[userId] || {};
}

function setupDashboardEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Create new list
    document.getElementById('createListBtn').addEventListener('click', handleCreateList);

    // Add task
    document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);

    // Task filters
    document.querySelectorAll('input[name="taskFilter"]').forEach(radio => {
        radio.addEventListener('change', renderTasks);
    });

    // Delete list
    document.getElementById('deleteListBtn').addEventListener('click', handleDeleteList);

    // Edit task modal
    document.getElementById('saveTaskBtn').addEventListener('click', handleSaveEditTask);
}

// ===== LIST MANAGEMENT =====
function renderLists() {
    const container = document.getElementById('listContainer');
    container.innerHTML = '';

    if (APP_STATE.lists.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">No hay listas</p>';
        return;
    }

    APP_STATE.lists.forEach(list => {
        const taskCount = (APP_STATE.tasks[list.id] || []).length;
        const item = document.createElement('a');
        item.href = '#';
        item.className = `list-group-item list-group-item-action ${APP_STATE.currentListId === list.id ? 'active' : ''}`;
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${escapeHtml(list.name)}</h6>
                    <small>${taskCount} tarea${taskCount !== 1 ? 's' : ''}</small>
                </div>
                <i class="fas fa-chevron-right"></i>
            </div>
        `;
        item.addEventListener('click', (e) => {
            e.preventDefault();
            selectList(list.id);
        });
        container.appendChild(item);
    });
}

function selectList(listId) {
    APP_STATE.currentListId = listId;
    renderLists();
    renderTasks();
    showTaskPanel();
    updateListHeader();
    updateStatistics();
}

function updateListHeader() {
    const list = APP_STATE.lists.find(l => l.id === APP_STATE.currentListId);
    if (list) {
        document.getElementById('listTitle').textContent = `📋 ${escapeHtml(list.name)}`;
        document.getElementById('listDescription').textContent = list.description || 'Sin descripción';
    }
}

function showTaskPanel() {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('taskPanel').style.display = 'block';
}

function handleCreateList() {
    const name = document.getElementById('listName').value.trim();
    const description = document.getElementById('listDesc').value.trim();

    if (!name) {
        showToast('Ingresa un nombre para la lista', 'warning');
        return;
    }

    const newList = {
        id: Date.now(),
        userId: APP_STATE.currentUser.id,
        name,
        description,
        createdAt: new Date().toISOString(),
    };

    APP_STATE.lists.push(newList);
    APP_STATE.tasks[newList.id] = [];

    saveUserData();
    renderLists();
    selectList(newList.id);
    
    document.getElementById('newListForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('newListModal')).hide();
    showToast('Lista creada exitosamente', 'success');
}

function handleDeleteList() {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lista?')) return;

    const listId = APP_STATE.currentListId;
    APP_STATE.lists = APP_STATE.lists.filter(l => l.id !== listId);
    delete APP_STATE.tasks[listId];

    saveUserData();
    renderLists();

    APP_STATE.currentListId = null;
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('taskPanel').style.display = 'none';
    showToast('Lista eliminada', 'info');
}

// ===== TASK MANAGEMENT =====
function handleAddTask(e) {
    e.preventDefault();

    const text = document.getElementById('taskInput').value.trim();
    const priority = document.getElementById('prioritySelect').value;

    if (!text) {
        showToast('Ingresa una tarea', 'warning');
        return;
    }

    if (!APP_STATE.tasks[APP_STATE.currentListId]) {
        APP_STATE.tasks[APP_STATE.currentListId] = [];
    }

    const newTask = {
        id: Date.now(),
        text,
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
    };

    APP_STATE.tasks[APP_STATE.currentListId].push(newTask);
    saveUserData();
    renderTasks();
    updateStatistics();

    document.getElementById('addTaskForm').reset();
    showToast('Tarea agregada', 'success');
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    const tasks = APP_STATE.tasks[APP_STATE.currentListId] || [];
    const filter = document.querySelector('input[name="taskFilter"]:checked').value;

    let filteredTasks = tasks;
    if (filter === 'pending') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    }

    if (filteredTasks.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> No hay tareas</div>';
        return;
    }

    container.innerHTML = '';
    filteredTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        container.appendChild(taskEl);
    });
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    
    div.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            onchange="toggleTask(${task.id})"
        >
        <span class="task-text">${escapeHtml(task.text)}</span>
        <span class="task-priority ${task.priority}">
            ${task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
        </span>
        <div class="task-actions">
            <button class="btn btn-warning btn-sm" onclick="openEditModal(${task.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

function toggleTask(taskId) {
    const tasks = APP_STATE.tasks[APP_STATE.currentListId];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveUserData();
        renderTasks();
        updateStatistics();
    }
}

function openEditModal(taskId) {
    const tasks = APP_STATE.tasks[APP_STATE.currentListId];
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        window.editingTaskId = taskId;
        document.getElementById('editTaskInput').value = task.text;
        document.getElementById('editPriority').value = task.priority;
        new bootstrap.Modal(document.getElementById('editTaskModal')).show();
    }
}

function handleSaveEditTask() {
    const tasks = APP_STATE.tasks[APP_STATE.currentListId];
    const task = tasks.find(t => t.id === window.editingTaskId);
    
    if (task) {
        task.text = document.getElementById('editTaskInput').value.trim();
        task.priority = document.getElementById('editPriority').value;
        
        saveUserData();
        renderTasks();
        bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
        showToast('Tarea actualizada', 'success');
    }
}

function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    
    APP_STATE.tasks[APP_STATE.currentListId] = 
        APP_STATE.tasks[APP_STATE.currentListId].filter(t => t.id !== taskId);
    
    saveUserData();
    renderTasks();
    updateStatistics();
    showToast('Tarea eliminada', 'info');
}

// ===== STATISTICS =====
function updateStatistics() {
    const tasks = APP_STATE.tasks[APP_STATE.currentListId] || [];
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;

    document.getElementById('statTotal').textContent = tasks.length;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statPending').textContent = pending;
}

// ===== UTILITY FUNCTIONS =====
function saveUserData() {
    const userId = APP_STATE.currentUser.id;
    
    const allLists = JSON.parse(localStorage.getItem(STORAGE_KEYS.LISTS)) || [];
    const existingIndex = allLists.findIndex(l => l.userId === userId);
    
    // Remove old lists for this user and add new ones
    const otherLists = allLists.filter(l => l.userId !== userId);
    const allListsToSave = [...otherLists, ...APP_STATE.lists];
    
    localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(allListsToSave));

    const allTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || {};
    allTasks[userId] = APP_STATE.tasks;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
}

function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        window.location.href = 'index.html';
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toastId = `toast-${Date.now()}`;
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast bg-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}