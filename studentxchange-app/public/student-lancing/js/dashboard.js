// Dashboard Module for StudentLancing

let dashboardData = {
  user: null,
  projects: [],
  applications: [],
  stats: {
    activeProjects: 0,
    pendingApplications: 0,
    completedProjects: 0,
    unreadMessages: 0
  }
};

// Initialize dashboard
async function initDashboard() {
  window.Utils.showLoading('Loading your dashboard...');
  
  try {
    // Get current user data
    const userData = await window.Auth.getCurrentUserData();
    
    if (!userData) {
      console.error('User data not found');
      window.location.href = '/student-lancing/index.html';
      return;
    }
    
    dashboardData.user = userData;
    
    // Load data in parallel
    const [applications, projects, unreadCount] = await Promise.all([
      window.Projects.getUserApplications(userData.id),
      window.Projects.getUserProjects(userData.id),
      window.Messages.getUnreadCount()
    ]);
    
    dashboardData.applications = applications;
    dashboardData.projects = projects;
    
    // Calculate stats
    dashboardData.stats = {
      activeProjects: projects.filter(p => p.status === 'open' || p.status === 'in-progress').length,
      pendingApplications: applications.filter(a => a.status === 'pending').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      unreadMessages: unreadCount
    };
    
    // Render dashboard
    renderDashboard();
    
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Error loading dashboard', 'error');
  } finally {
    window.Utils.hideLoading();
  }
}

// Render dashboard content
function renderDashboard() {
  const user = dashboardData.user;
  const stats = dashboardData.stats;
  
  // Update profile section
  const profileSection = document.getElementById('profile-section');
  if (profileSection) {
    const initials = (user.displayName || user.email || 'U')[0].toUpperCase();
    const photoHtml = user.photoURL 
      ? `<img src="${user.photoURL}" alt="${user.displayName}">`
      : initials;
    
    profileSection.innerHTML = `
      <div class="user-avatar-large">${photoHtml}</div>
      <h2 class="user-name">${window.Utils.escapeHtml(user.displayName || 'Welcome!')}</h2>
      <p class="user-email text-muted">${window.Utils.escapeHtml(user.email)}</p>
      ${user.bio ? `<p class="user-bio mt-2">${window.Utils.escapeHtml(user.bio)}</p>` : ''}
      <a href="/student-lancing/profile.html" class="btn btn-outline btn-sm mt-3">Edit Profile</a>
    `;
  }
  
  // Update stats
  renderStats();
  
  // Render recent applications
  renderRecentApplications();
  
  // Render recent projects
  renderRecentProjects();
}

// Render stats cards
function renderStats() {
  const stats = dashboardData.stats;
  const statsContainer = document.getElementById('stats-grid');
  
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card glass-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${stats.activeProjects}</div>
        <div class="stat-label">Active Projects</div>
      </div>
      <div class="stat-card glass-card purple">
        <div class="stat-icon">📨</div>
        <div class="stat-value">${stats.pendingApplications}</div>
        <div class="stat-label">Pending Applications</div>
      </div>
      <div class="stat-card glass-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${stats.completedProjects}</div>
        <div class="stat-label">Completed Projects</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">💬</div>
        <div class="stat-value">${stats.unreadMessages}</div>
        <div class="stat-label">Unread Messages</div>
      </div>
    `;
  }
}

// Render recent applications
function renderRecentApplications() {
  const applications = dashboardData.applications.slice(0, 5);
  const container = document.getElementById('recent-applications');
  
  if (!container) return;
  
  if (applications.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3 class="empty-title">No applications yet</h3>
        <p class="empty-text">Browse projects and start applying!</p>
        <a href="/student-lancing/projects.html" class="btn btn-primary">Browse Projects</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = applications.map(app => {
    const statusClass = app.status === 'accepted' ? 'badge-success' : 
                       app.status === 'pending' ? 'badge-pending' : 'badge-active';
    
    return `
      <div class="glass-card flex items-center justify-between" style="padding: 16px; margin-bottom: 12px;">
        <div>
          <h4 style="margin-bottom: 4px;">Application #${app.id.substring(0, 6)}</h4>
          <p class="text-muted" style="font-size: 0.85rem;">${window.Utils.formatDate(app.createdAt)}</p>
        </div>
        <span class="badge ${statusClass}">${app.status}</span>
      </div>
    `;
  }).join('');
}

// Render recent projects
function renderRecentProjects() {
  const projects = dashboardData.projects.slice(0, 3);
  const container = document.getElementById('recent-projects');
  
  if (!container) return;
  
  if (projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3 class="empty-title">No projects created</h3>
        <p class="empty-text">Post your first gig to find talented freelancers!</p>
        <button onclick="showCreateProjectModal()" class="btn btn-success">Post a Project</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = projects.map(project => window.Projects.renderCard(project)).join('');
}

// Show create project modal
function showCreateProjectModal() {
  window.Utils.showModal('create-project-modal');
}

// Handle create project form
async function handleCreateProject(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  
  const projectData = {
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    budget: parseInt(formData.get('budget')) || 0,
    duration: formData.get('duration'),
    skills: formData.get('skills')?.split(',').map(s => s.trim()).filter(Boolean) || []
  };
  
  if (!projectData.title || !projectData.description) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  window.Utils.showLoading('Creating project...');
  
  const projectId = await window.Projects.create(projectData);
  
  if (projectId) {
    window.Utils.hideModal('create-project-modal');
    form.reset();
    
    // Refresh dashboard
    initDashboard();
  } else {
    window.Utils.hideLoading();
  }
}

// Export for global access
window.Dashboard = {
  init: initDashboard,
  showCreateProjectModal,
  handleCreateProject
};
