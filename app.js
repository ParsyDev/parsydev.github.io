const TOKEN = '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';
const REG = '5d51e42426b9f95c110b7c92e4ac7bfe';
let registry = {};
let cropData = {zoom: 100, x: 50, y: 50};
let imageUrl = '';
let editingProfileId = null;
let currentUser = null;
let currentViewingProfileId = null; // Track which profile is being viewed

const pages = {
    browse: document.getElementById('browsePage'),
    create: document.getElementById('createPage'),
    view: document.getElementById('viewPage')
};

const menu = {
    trigger: document.getElementById('profileTrigger'),
    dropdown: document.getElementById('dropdownMenu'),
    browse: document.getElementById('menuBrowse'),
    create: document.getElementById('menuCreate'),
    myProfile: document.getElementById('menuMyProfile'),
    login: document.getElementById('menuLogin'),
    logout: document.getElementById('menuLogout')
};

const els = {
    grid: document.getElementById('profilesGrid'),
    name: document.getElementById('profileName'),
    pass: document.getElementById('profilePassword'),
    img: document.getElementById('imageUrl'),
    stream: document.getElementById('streamUrl'),
    drop: document.getElementById('dropZone'),
    cropCont: document.getElementById('cropContainer'),
    cropImg: document.getElementById('cropImage'),
    zoom: document.getElementById('zoom'),
    posX: document.getElementById('posX'),
    posY: document.getElementById('posY'),
    create: document.getElementById('createProfile'),
    update: document.getElementById('updateProfile'),
    createStatus: document.getElementById('createStatus'),
    createHeader: document.getElementById('createHeader'),
    viewImg: document.getElementById('viewProfileImg'),
    viewName: document.getElementById('viewProfileName'),
    viewStream: document.getElementById('viewStream'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    loginModal: document.getElementById('loginModal'),
    loginName: document.getElementById('loginProfileName'),
    loginPass: document.getElementById('loginPassword'),
    loginBtn: document.getElementById('loginBtn'),
    closeLogin: document.getElementById('closeLoginModal'),
    loginStatus: document.getElementById('loginStatus')
};

// Navigation
function showPage(pageName) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[pageName].classList.add('active');
    menu.dropdown.classList.remove('active');
}

// Dropdown toggle
menu.trigger.onclick = (e) => {
    e.stopPropagation();
    menu.dropdown.classList.toggle('active');
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!menu.trigger.contains(e.target) && !menu.dropdown.contains(e.target)) {
        menu.dropdown.classList.remove('active');
    }
});

menu.browse.onclick = () => {
    showPage('browse');
    loadAllProfiles();
};

menu.create.onclick = () => {
    showPage('create');
    resetCreateForm();
};

menu.myProfile.onclick = () => {
    if (currentUser) {
        viewProfile(currentUser.id);
    }
};

menu.login.onclick = () => {
    menu.dropdown.classList.remove('active');
    els.loginModal.classList.add('active');
    loadRegistry();
};

menu.logout.onclick = () => {
    currentUser = null;
    editingProfileId = null;
    currentViewingProfileId = null;
    menu.trigger.style.backgroundImage = '';
    menu.trigger.classList.remove('logged-in');
    menu.myProfile.classList.add('disabled');
    menu.login.style.display = 'block';
    menu.logout.style.display = 'none';
    els.editProfileBtn.style.display = 'none';
    showPage('browse');
    loadAllProfiles();
};

els.closeLogin.onclick = () => els.loginModal.classList.remove('active');
els.loginModal.onclick = (e) => {
    if (e.target === els.loginModal) els.loginModal.classList.remove('active');
};

// Edit Profile Button Handler
els.editProfileBtn.onclick = async () => {
    if (currentUser && currentViewingProfileId === currentUser.id) {
        try {
            const profile = await loadProfile(currentUser.id);
            loadProfileForEdit(profile);
            showPage('create');
        } catch(e) {
            console.error('Failed to load profile for editing:', e);
        }
    }
};

// Registry functions
async function loadRegistry() {
    try {
        console.log('Fetching registry...');
        const response = await fetch(`https://api.github.com/gists/${REG}`, {
            headers: {
                'Authorization': `token ${TOKEN}`
            }
        });
        console.log('Registry response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        const gist = await response.json();
        console.log('Gist loaded:', gist);
        
        if (gist.files && gist.files['profile-registry.json']) {
            registry = JSON.parse(gist.files['profile-registry.json'].content);
            console.log('Registry parsed:', registry);
        } else {
            console.warn('No profile-registry.json found in gist');
            registry = {};
        }
    } catch(e) {
        console.error('Error loading registry:', e);
        registry = {};
        throw e; // Re-throw to let caller know there was an error
    }
}

async function saveRegistry() {
    await fetch(`https://api.github.com/gists/${REG}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: {
                'profile-registry.json': {
                    content: JSON.stringify(registry, null, 2)
                }
            }
        })
    });
}

// Browse profiles
async function loadAllProfiles() {
    els.grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Loading...</div>';
    
    try {
        await loadRegistry();
        console.log('Registry loaded:', registry);
        els.grid.innerHTML = '';
        
        const entries = Object.entries(registry);
        console.log('Registry entries:', entries.length);
        
        if (entries.length === 0) {
            els.grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">No profiles yet. Create the first one!</div>';
            return;
        }
        
        for (const [name, id] of entries) {
            try {
                console.log('Loading profile:', name, id);
                const profile = await loadProfile(id);
                const card = createProfileCard(profile, id);
                els.grid.appendChild(card);
            } catch(e) {
                console.error('Failed to load profile:', name, e);
                // Still show a card with error state
                const errorCard = document.createElement('div');
                errorCard.className = 'profile-card';
                errorCard.style.opacity = '0.5';
                errorCard.innerHTML = `
                    <div class="profile-card-img"></div>
                    <div class="profile-card-name">${name}</div>
                    <div style="color:red;font-size:11px;margin-top:5px;">Error loading</div>
                `;
                els.grid.appendChild(errorCard);
            }
        }
        
        if (els.grid.children.length === 0) {
            els.grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">No profiles could be loaded</div>';
        }
    } catch(e) {
        console.error('Failed to load registry:', e);
        
        // Check if it's a rate limit error
        if (e.message && e.message.includes('rate limit')) {
            els.grid.innerHTML = `
                <div style="text-align:center;padding:40px;color:#ff6b6b;">
                    <h3 style="margin-bottom:10px;">⚠️ GitHub API Rate Limit Exceeded</h3>
                    <p style="color:#666;font-size:14px;">The GitHub API token may be expired or rate limited.</p>
                    <p style="color:#666;font-size:14px;margin-top:10px;">Please update the TOKEN variable in the code with a valid GitHub Personal Access Token.</p>
                    <a href="https://github.com/settings/tokens" target="_blank" style="color:#0066cc;font-size:14px;margin-top:10px;display:block;">Create a new token here →</a>
                </div>
            `;
        } else {
            els.grid.innerHTML = `
                <div style="text-align:center;padding:40px;color:#ff0000;">
                    <h3>Error loading profiles</h3>
                    <p style="color:#666;font-size:12px;margin-top:10px;">${e.message}</p>
                </div>
            `;
        }
    }
}

function createProfileCard(profile, id) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    const img = document.createElement('div');
    img.className = 'profile-card-img';
    if (profile.imageUrl && profile.cropData) {
        const scale = profile.cropData.zoom / 100;
        const x = profile.cropData.x;
        const y = profile.cropData.y;
        img.style.backgroundImage = `url(${profile.imageUrl})`;
        img.style.backgroundSize = `${scale * 100}%`;
        img.style.backgroundPosition = `${x}% ${y}%`;
    }
    
    const name = document.createElement('div');
    name.className = 'profile-card-name';
    name.textContent = profile.name;
    
    card.appendChild(img);
    card.appendChild(name);
    
    card.onclick = () => viewProfile(id);
    
    return card;
}

async function viewProfile(id) {
    try {
        const profile = await loadProfile(id);
        currentViewingProfileId = id;
        displayProfile(profile);
        
        // Show edit button only if viewing own profile
        if (currentUser && currentUser.id === id) {
            els.editProfileBtn.style.display = 'block';
        } else {
            els.editProfileBtn.style.display = 'none';
        }
        
        showPage('view');
    } catch(e) {
        console.error('Failed to view profile:', e);
    }
}

function displayProfile(profile) {
    els.viewName.textContent = profile.name;
    
    if (profile.imageUrl && profile.cropData) {
        const scale = profile.cropData.zoom / 100;
        const x = profile.cropData.x;
        const y = profile.cropData.y;
        els.viewImg.style.backgroundImage = `url(${profile.imageUrl})`;
        els.viewImg.style.backgroundSize = `${scale * 100}%`;
        els.viewImg.style.backgroundPosition = `${x}% ${y}%`;
    } else {
        els.viewImg.style.backgroundImage = '';
    }
    
    if (profile.streamUrl) {
        const embedUrl = getStreamEmbedUrl(profile.streamUrl);
        if (embedUrl) {
            els.viewStream.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
        } else {
            els.viewStream.innerHTML = 'Invalid stream URL';
        }
    } else {
        els.viewStream.innerHTML = 'No stream active';
    }
}

async function loadProfile(id) {
    console.log('Fetching profile with ID:', id);
    const response = await fetch(`https://api.github.com/gists/${id}`, {
        headers: {
            'Authorization': `token ${TOKEN}`
        }
    });
    console.log('Profile response status:', response.status);
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const gist = await response.json();
    console.log('Profile gist loaded:', gist);
    
    if (!gist.files || !gist.files['profile.json']) {
        throw new Error('Profile file not found in gist');
    }
    
    const profile = JSON.parse(gist.files['profile.json'].content);
    console.log('Profile parsed:', profile);
    return profile;
}

// Login
els.loginBtn.onclick = async () => {
    const name = els.loginName.value.trim();
    const password = els.loginPass.value.trim();
    
    if (!name || !password) {
        showStatus(els.loginStatus, 'error', 'Please enter name and password!');
        return;
    }
    
    await loadRegistry();
    
    // Check if profile name exists
    if (!registry[name]) {
        showStatus(els.loginStatus, 'error', '❌ Profile not found!');
        return;
    }
    
    const profileId = registry[name];
    
    els.loginBtn.disabled = true;
    showStatus(els.loginStatus, 'success', 'Logging in...');
    
    try {
        const profile = await loadProfile(profileId);
        
        if (profile.password !== password) {
            showStatus(els.loginStatus, 'error', '❌ Incorrect password!');
            els.loginBtn.disabled = false;
            return;
        }
        
        currentUser = {
            name: profile.name,
            id: profileId
        };
        
        editingProfileId = profileId;
        
        // Update profile picture in nav
        if (profile.imageUrl && profile.cropData) {
            const scale = profile.cropData.zoom / 100;
            const x = profile.cropData.x;
            const y = profile.cropData.y;
            menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
            menu.trigger.style.backgroundSize = `${scale * 100}%`;
            menu.trigger.style.backgroundPosition = `${x}% ${y}%`;
        }
        menu.trigger.classList.add('logged-in');
        menu.myProfile.classList.remove('disabled');
        menu.login.style.display = 'none';
        menu.logout.style.display = 'block';
        
        showStatus(els.loginStatus, 'success', '✅ Logged in!');
        
        setTimeout(() => {
            els.loginModal.classList.remove('active');
            viewProfile(profileId);
        }, 1000);
        
    } catch(e) {
        showStatus(els.loginStatus, 'error', 'Error: ' + e.message);
    }
    
    els.loginBtn.disabled = false;
};

function loadProfileForEdit(profile) {
    els.createHeader.textContent = 'Edit Your Profile';
    els.name.value = profile.name;
    els.pass.value = profile.password;
    els.img.value = profile.imageUrl || '';
    els.stream.value = profile.streamUrl || '';
    
    cropData = profile.cropData || {zoom: 100, x: 50, y: 50};
    
    if (profile.imageUrl) {
        loadImage(profile.imageUrl);
    }
    
    els.create.style.display = 'none';
    els.update.style.display = 'block';
}

function resetCreateForm() {
    els.createHeader.textContent = 'Create Profile';
    els.name.value = '';
    els.pass.value = '';
    els.img.value = '';
    els.stream.value = '';
    cropData = {zoom: 100, x: 50, y: 50};
    imageUrl = '';
    els.cropCont.classList.remove('active');
    els.create.style.display = 'block';
    els.update.style.display = 'none';
    editingProfileId = null;
}

// Image handling
els.drop.ondragover = (e) => {
    e.preventDefault();
    els.drop.classList.add('dragover');
};

els.drop.ondragleave = () => {
    els.drop.classList.remove('dragover');
};

els.drop.ondrop = (e) => {
    e.preventDefault();
    els.drop.classList.remove('dragover');
    const url = e.dataTransfer.getData('text/plain');
    if (url) {
        els.img.value = url;
        loadImage(url);
    }
};

els.img.oninput = (e) => {
    if (e.target.value) {
        loadImage(e.target.value);
    } else {
        els.cropCont.classList.remove('active');
    }
};

function loadImage(url) {
    imageUrl = url;
    els.cropImg.src = url;
    els.cropCont.classList.add('active');
    cropData = {zoom: 100, x: 50, y: 50};
    els.zoom.value = 100;
    els.posX.value = 50;
    els.posY.value = 50;
    updateCropPreview();
}

els.zoom.oninput = () => {
    cropData.zoom = parseInt(els.zoom.value);
    updateCropPreview();
};

els.posX.oninput = () => {
    cropData.x = parseInt(els.posX.value);
    updateCropPreview();
};

els.posY.oninput = () => {
    cropData.y = parseInt(els.posY.value);
    updateCropPreview();
};

function updateCropPreview() {
    const scale = cropData.zoom / 100;
    const x = cropData.x;
    const y = cropData.y;
    els.cropImg.style.transform = `scale(${scale})`;
    els.cropImg.style.left = `${50 - x * scale}%`;
    els.cropImg.style.top = `${50 - y * scale}%`;
}

// Stream handling
function getStreamEmbedUrl(url) {
    if (url.includes('youtube')) {
        const match = url.match(/(?:v=|\/)([\w-]{11})/);
        if (match) {
            return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`;
        }
    } else if (url.includes('twitch')) {
        const match = url.match(/twitch\.tv\/(\w+)/);
        if (match) {
            return `https://player.twitch.tv/?channel=${match[1]}&parent=${location.hostname}&muted=true`;
        }
    }
    return null;
}

// Create/Update profile
els.create.onclick = async () => {
    const name = els.name.value.trim();
    const password = els.pass.value.trim();
    const image = els.img.value.trim();
    const stream = els.stream.value.trim();
    
    if (!name || !password) {
        showStatus(els.createStatus, 'error', 'Name and password required!');
        return;
    }
    
    await loadRegistry();
    
    if (registry[name]) {
        showStatus(els.createStatus, 'warning', '⚠️ Name already exists!');
        return;
    }
    
    els.create.disabled = true;
    showStatus(els.createStatus, 'success', 'Creating profile...');
    
    const profileData = {
        name: name,
        password: password,
        imageUrl: image,
        streamUrl: stream,
        cropData: cropData,
        createdAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: `Profile: ${name}`,
                public: true,
                files: {
                    'profile.json': {
                        content: JSON.stringify(profileData, null, 2)
                    }
                }
            })
        });
        
        const result = await response.json();
        
        if (result.id) {
            registry[name] = result.id;
            await saveRegistry();
            showStatus(els.createStatus, 'success', `✅ Profile created! ID: ${result.id}`);
            
            setTimeout(() => {
                showPage('browse');
                loadAllProfiles();
            }, 2000);
        } else {
            showStatus(els.createStatus, 'error', 'Failed to create profile');
        }
    } catch(e) {
        showStatus(els.createStatus, 'error', 'Error: ' + e.message);
    }
    
    els.create.disabled = false;
};

els.update.onclick = async () => {
    const name = els.name.value.trim();
    const password = els.pass.value.trim();
    const image = els.img.value.trim();
    const stream = els.stream.value.trim();
    
    if (!name || !password) {
        showStatus(els.createStatus, 'error', 'Name and password required!');
        return;
    }
    
    els.update.disabled = true;
    showStatus(els.createStatus, 'success', 'Updating profile...');
    
    const profileData = {
        name: name,
        password: password,
        imageUrl: image,
        streamUrl: stream,
        cropData: cropData,
        updatedAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`https://api.github.com/gists/${editingProfileId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'profile.json': {
                        content: JSON.stringify(profileData, null, 2)
                    }
                }
            })
        });
        
        if (response.ok) {
            // Update the nav profile picture if changed
            if (profileData.imageUrl && profileData.cropData) {
                const scale = profileData.cropData.zoom / 100;
                const x = profileData.cropData.x;
                const y = profileData.cropData.y;
                menu.trigger.style.backgroundImage = `url(${profileData.imageUrl})`;
                menu.trigger.style.backgroundSize = `${scale * 100}%`;
                menu.trigger.style.backgroundPosition = `${x}% ${y}%`;
            }
            
            showStatus(els.createStatus, 'success', '✅ Profile updated!');
            
            setTimeout(() => {
                viewProfile(editingProfileId);
            }, 1500);
        } else {
            showStatus(els.createStatus, 'error', 'Failed to update profile');
        }
    } catch(e) {
        showStatus(els.createStatus, 'error', 'Error: ' + e.message);
    }
    
    els.update.disabled = false;
};

function showStatus(element, type, message) {
    element.className = `status ${type}`;
    element.textContent = message;
    
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Initialize
loadAllProfiles();
