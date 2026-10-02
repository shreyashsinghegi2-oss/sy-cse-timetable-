// Projects Module for StudentLancing

// Get all projects
async function getAllProjects(filters = {}) {
  const { db } = window.FirebaseApp.init();
  let query = db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS);
  
  // Apply filters
  if (filters.category && filters.category !== 'all') {
    query = query.where('category', '==', filters.category);
  }
  
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }
  
  // Order by creation date
  query = query.orderBy('createdAt', 'desc');
  
  // Limit results
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  try {
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Get single project
async function getProject(projectId) {
  const { db } = window.FirebaseApp.init();
  
  try {
    const doc = await db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS).doc(projectId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

// Create new project
async function createProject(projectData) {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user) {
    showToast('You must be logged in to create a project', 'error');
    return null;
  }
  
  try {
    const docRef = await db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS).add({
      ...projectData,
      clientId: user.uid,
      clientName: user.displayName || user.email,
      clientPhoto: user.photoURL || '',
      status: 'open',
      applicants: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast('Project created successfully!', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Error creating project:', error);
    showToast('Error creating project', 'error');
    return null;
  }
}

// Apply to project
async function applyToProject(projectId, applicationData) {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user) {
    showToast('You must be logged in to apply', 'error');
    return false;
  }
  
  try {
    // Create application document
    await db.collection(window.FirebaseApp.COLLECTIONS.APPLICATIONS).add({
      projectId,
      freelancerId: user.uid,
      freelancerName: user.displayName || user.email,
      freelancerPhoto: user.photoURL || '',
      coverLetter: applicationData.coverLetter || '',
      proposedBudget: applicationData.proposedBudget || 0,
      estimatedDuration: applicationData.estimatedDuration || '',
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update project applicants array
    await db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS).doc(projectId).update({
      applicants: firebase.firestore.FieldValue.arrayUnion(user.uid),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update user's applied projects
    await db.collection(window.FirebaseApp.COLLECTIONS.USERS).doc(user.uid).update({
      appliedProjects: firebase.firestore.FieldValue.arrayUnion(projectId)
    });
    
    showToast('Application submitted successfully!', 'success');
    return true;
  } catch (error) {
    console.error('Error applying to project:', error);
    showToast('Error submitting application', 'error');
    return false;
  }
}

// Get project applications
async function getProjectApplications(projectId) {
  const { db } = window.FirebaseApp.init();
  
  try {
    const snapshot = await db.collection(window.FirebaseApp.COLLECTIONS.APPLICATIONS)
      .where('projectId', '==', projectId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

// Get user's applications
async function getUserApplications(userId) {
  const { db } = window.FirebaseApp.init();
  
  try {
    const snapshot = await db.collection(window.FirebaseApp.COLLECTIONS.APPLICATIONS)
      .where('freelancerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching user applications:', error);
    return [];
  }
}

// Get user's created projects
async function getUserProjects(userId) {
  const { db } = window.FirebaseApp.init();
  
  try {
    const snapshot = await db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS)
      .where('clientId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

// Update project status
async function updateProjectStatus(projectId, status) {
  const { db } = window.FirebaseApp.init();
  
  try {
    await db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS).doc(projectId).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast('Project status updated', 'success');
    return true;
  } catch (error) {
    console.error('Error updating project status:', error);
    showToast('Error updating status', 'error');
    return false;
  }
}

// Accept application
async function acceptApplication(applicationId, projectId) {
  const { db } = window.FirebaseApp.init();
  
  try {
    // Update application status
    await db.collection(window.FirebaseApp.COLLECTIONS.APPLICATIONS).doc(applicationId).update({
      status: 'accepted'
    });
    
    // Update project status
    await db.collection(window.FirebaseApp.COLLECTIONS.PROJECTS).doc(projectId).update({
      status: 'in-progress',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast('Application accepted!', 'success');
    return true;
  } catch (error) {
    console.error('Error accepting application:', error);
    showToast('Error accepting application', 'error');
    return false;
  }
}

// Render project card
function renderProjectCard(project) {
  const categoryClass = window.Utils.getCategoryClass(project.category);
  const tagsHtml = (project.skills || []).slice(0, 3).map(skill => 
    `<span class="tag">${window.Utils.escapeHtml(skill)}</span>`
  ).join('');
  
  return `
    <div class="project-card glass-card" data-project-id="${project.id}">
      <div class="project-header">
        <span class="project-category ${categoryClass}">${window.Utils.escapeHtml(project.category || 'Other')}</span>
        <span class="project-budget">${window.Utils.formatCurrency(project.budget || 0)}</span>
      </div>
      <h3 class="project-title">${window.Utils.escapeHtml(project.title)}</h3>
      <p class="project-description">${window.Utils.escapeHtml(project.description || '')}</p>
      <div class="project-tags">${tagsHtml}</div>
      <div class="project-footer">
        <div class="project-meta">
          <span>📅 ${window.Utils.formatDate(project.createdAt)}</span>
          <span>👥 ${project.applicants?.length || 0} applicants</span>
        </div>
        <a href="/student-lancing/project-details.html?id=${project.id}" class="btn btn-outline btn-sm">View Details</a>
      </div>
    </div>
  `;
}

// Export functions
window.Projects = {
  getAll: getAllProjects,
  get: getProject,
  create: createProject,
  apply: applyToProject,
  getApplications: getProjectApplications,
  getUserApplications,
  getUserProjects,
  updateStatus: updateProjectStatus,
  acceptApplication,
  renderCard: renderProjectCard
};
