const API_URL = 'https://creator-hub-api.emdejiku.workers.dev';

const REG = '5d51e42426b9f95c110b7c92e4ac7bfe';
let registry = {};
let currentImageType = 'profile'; // Track which image we're editing
let imageCrops = {
    profile: { url: '', crop: null },
    banner: { url: '', crop: null },
    background: { url: '', crop: null }
};
let editingProfileId = null;
let currentUser = null;
let currentViewingProfileId = null;

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
    description: document.getElementById('profileDescription'),
    img: document.getElementById('imageUrl'),
    imageType: document.getElementById('imageType'),
    clearImage: document.getElementById('clearImage'),
    stream: document.getElementById('streamUrl'),
    youtubeUrl: document.getElementById('youtubeUrl'),
    twitchUrl: document.getElementById('twitchUrl'),
    drop: document.getElementById('dropZone'),
    cropCont: document.getElementById('cropContainer'),
    applyCrop: document.getElementById('applyCrop'),
    create: document.getElementById('createProfile'),
    update: document.getElementById('updateProfile'),
    createStatus: document.getElementById('createStatus'),
    createHeader: document.getElementById('createHeader'),
    viewImg: document.getElementById('viewProfileImg'),
    viewName: document.getElementById('viewProfileName'),
    viewBio: document.getElementById('viewProfileBio'),
    viewDescription: document.getElementById('viewProfileDescription'),
    viewBannerImg: document.getElementById('viewBannerImg'),
    viewProfileContent: document.getElementById('viewProfileContent'),
    siteBackground: document.getElementById('siteBackground'),
    viewStream: document.getElementById('viewStream'),
    socialLinks: document.getElementById('socialLinks'),
    youtubeLink: document.getElementById('youtubeLink'),
    twitchLink: document.getElementById('twitchLink'),
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
    
    // Hide crop UI when switching pages
    if (pageName === 'browse' || pageName === 'view') {
        els.cropCont.classList.remove('active');
    }
    
    // Clear site background when not viewing a profile
    if (pageName !== 'view' && els.siteBackground) {
        els.siteBackground.style.backgroundImage = '';
    }
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
    
    // Clear login state from localStorage
    localStorage.removeItem('currentUser');
    
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

// Registry functions - Now using the proxy!
async function loadRegistry() {
    try {
        console.log('Fetching registry via proxy...');
        const response = await fetch(`${API_URL}/registry`);
        console.log('Registry response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
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
        throw e;
    }
}

async function saveRegistry() {
    await fetch(`${API_URL}/registry`, {
        method: 'PATCH',
        headers: {
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
        els.grid.innerHTML = `
            <div style="text-align:center;padding:40px;color:#ff6b6b;">
                <h3 style="margin-bottom:10px;">⚠️ Error Loading Profiles</h3>
                <p style="color:#666;font-size:14px;">Could not connect to the API proxy.</p>
                <p style="color:#666;font-size:14px;margin-top:10px;">Make sure API_URL is set correctly in app.js</p>
                <p style="color:#999;font-size:12px;margin-top:10px;">Error: ${e.message}</p>
            </div>
        `;
    }
}

function createProfileCard(profile, id) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    const img = document.createElement('div');
    img.className = 'profile-card-img';
    
    // Handle both new and old crop formats
    if (profile.imageUrl) {
        try {
            if (profile.profileCrop && profile.profileCrop.width > 0) {
                // New format
                const crop = profile.profileCrop;
                const scale = 100 / (crop.width * 100);
                const offsetX = -(crop.x * 100) * scale;
                const offsetY = -(crop.y * 100) * scale;
                
                img.style.backgroundImage = `url(${profile.imageUrl})`;
                img.style.backgroundSize = `${scale * 100}%`;
                img.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
            } else if (profile.cropData) {
                // Old format (backwards compatibility)
                const scale = profile.cropData.zoom / 100;
                const x = profile.cropData.x;
                const y = profile.cropData.y;
                img.style.backgroundImage = `url(${profile.imageUrl})`;
                img.style.backgroundSize = `${scale * 100}%`;
                img.style.backgroundPosition = `${x}% ${y}%`;
            } else {
                // No crop data
                img.style.backgroundImage = `url(${profile.imageUrl})`;
                img.style.backgroundSize = 'cover';
                img.style.backgroundPosition = 'center';
            }
        } catch(e) {
            console.error('Error displaying profile card image:', e);
            // Fallback to simple display
            img.style.backgroundImage = `url(${profile.imageUrl})`;
            img.style.backgroundSize = 'cover';
            img.style.backgroundPosition = 'center';
        }
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
    
    // Display description if available
    if (profile.description && profile.description.trim()) {
        els.viewDescription.textContent = profile.description;
        els.viewDescription.style.display = 'block';
    } else {
        els.viewDescription.style.display = 'none';
    }
    
    // Display banner image
    if (profile.bannerUrl && profile.bannerCrop) {
        const crop = profile.bannerCrop;
        // Scale: Make the crop width fill 100% of container
        const scale = 100 / (crop.width * 100); // Convert to percentage
        // Position: Move image so crop area is visible (negative offset)
        const offsetX = -(crop.x * 100) * scale;
        const offsetY = -(crop.y * 100) * scale;
        
        els.viewBannerImg.style.backgroundImage = `url(${profile.bannerUrl})`;
        els.viewBannerImg.style.backgroundSize = `${scale * 100}%`;
        els.viewBannerImg.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
    } else {
        els.viewBannerImg.style.backgroundImage = '';
    }
    
    // Display background image (only if element exists)
    if (els.siteBackground) {
        if (profile.backgroundUrl && profile.backgroundCrop) {
            const crop = profile.backgroundCrop;
            const scale = 100 / (crop.width * 100);
            const offsetX = -(crop.x * 100) * scale;
            const offsetY = -(crop.y * 100) * scale;
            
            els.siteBackground.style.backgroundImage = `url(${profile.backgroundUrl})`;
            els.siteBackground.style.backgroundSize = `${scale * 100}%`;
            els.siteBackground.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
        } else {
            els.siteBackground.style.backgroundImage = '';
        }
    }
    
    // Display social media links
    let hasSocialLinks = false;
    
    if (profile.youtubeUrl && profile.youtubeUrl.trim()) {
        els.youtubeLink.href = profile.youtubeUrl;
        els.youtubeLink.style.display = 'flex';
        hasSocialLinks = true;
    } else {
        els.youtubeLink.style.display = 'none';
    }
    
    if (profile.twitchUrl && profile.twitchUrl.trim()) {
        els.twitchLink.href = profile.twitchUrl;
        els.twitchLink.style.display = 'flex';
        hasSocialLinks = true;
    } else {
        els.twitchLink.style.display = 'none';
    }
    
    // Show/hide social links container
    els.socialLinks.style.display = hasSocialLinks ? 'flex' : 'none';
    
    // Display profile picture
    if (profile.imageUrl) {
        if (profile.profileCrop) {
            // New format
            const crop = profile.profileCrop;
            const scale = 100 / (crop.width * 100);
            const offsetX = -(crop.x * 100) * scale;
            const offsetY = -(crop.y * 100) * scale;
            
            els.viewImg.style.backgroundImage = `url(${profile.imageUrl})`;
            els.viewImg.style.backgroundSize = `${scale * 100}%`;
            els.viewImg.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
        } else if (profile.cropData) {
            // Old format (backwards compatibility)
            const scale = profile.cropData.zoom / 100;
            const x = profile.cropData.x;
            const y = profile.cropData.y;
            els.viewImg.style.backgroundImage = `url(${profile.imageUrl})`;
            els.viewImg.style.backgroundSize = `${scale * 100}%`;
            els.viewImg.style.backgroundPosition = `${x}% ${y}%`;
        } else {
            // No crop data, just show the image
            els.viewImg.style.backgroundImage = `url(${profile.imageUrl})`;
            els.viewImg.style.backgroundSize = 'cover';
            els.viewImg.style.backgroundPosition = 'center';
        }
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
    const response = await fetch(`${API_URL}/profile/${id}`);
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
        
        // Save login state to localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            name: profile.name,
            id: profileId
        }));
        
        if (profile.imageUrl) {
            if (profile.profileCrop) {
                // New format
                const crop = profile.profileCrop;
                const scale = 100 / (crop.width * 100);
                const offsetX = -(crop.x * 100) * scale;
                const offsetY = -(crop.y * 100) * scale;
                
                menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
                menu.trigger.style.backgroundSize = `${scale * 100}%`;
                menu.trigger.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
            } else if (profile.cropData) {
                // Old format (backwards compatibility)
                const scale = profile.cropData.zoom / 100;
                const x = profile.cropData.x;
                const y = profile.cropData.y;
                menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
                menu.trigger.style.backgroundSize = `${scale * 100}%`;
                menu.trigger.style.backgroundPosition = `${x}% ${y}%`;
            }
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
    els.description.value = profile.description || '';
    els.stream.value = profile.streamUrl || '';
    els.youtubeUrl.value = profile.youtubeUrl || '';
    els.twitchUrl.value = profile.twitchUrl || '';
    
    // Load profile picture
    imageCrops.profile = {
        url: profile.imageUrl || '',
        crop: profile.profileCrop || null
    };
    
    // Load banner
    imageCrops.banner = {
        url: profile.bannerUrl || '',
        crop: profile.bannerCrop || null
    };
    
    // Load background
    imageCrops.background = {
        url: profile.backgroundUrl || '',
        crop: profile.backgroundCrop || null
    };
    
    // Show profile image by default
    els.imageType.value = 'profile';
    currentImageType = 'profile';
    if (imageCrops.profile.url) {
        els.img.value = imageCrops.profile.url;
        // Don't load immediately, wait for user to interact
    }
    
    els.create.style.display = 'none';
    els.update.style.display = 'block';
}

function resetCreateForm() {
    els.createHeader.textContent = 'Create Profile';
    els.name.value = '';
    els.pass.value = '';
    els.description.value = '';
    els.img.value = '';
    els.stream.value = '';
    els.youtubeUrl.value = '';
    els.twitchUrl.value = '';
    
    imageCrops = {
        profile: { url: '', crop: null },
        banner: { url: '', crop: null },
        background: { url: '', crop: null }
    };
    
    currentImageType = 'profile';
    els.imageType.value = 'profile';
    els.cropCont.classList.remove('active');
    els.create.style.display = 'block';
    els.update.style.display = 'none';
    editingProfileId = null;
}

// Image handling with new cropper
els.imageType.onchange = () => {
    currentImageType = els.imageType.value;
    // Load existing image URL for this type if available, but don't open crop UI
    if (imageCrops[currentImageType].url) {
        els.img.value = imageCrops[currentImageType].url;
        // Don't auto-load crop UI, let user click input to trigger it
    } else {
        els.img.value = '';
        els.cropCont.classList.remove('active');
    }
};

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

els.clearImage.onclick = () => {
    // Clear the current image type
    imageCrops[currentImageType].url = '';
    imageCrops[currentImageType].crop = null;
    els.img.value = '';
    els.cropCont.classList.remove('active');
};

function loadImage(url) {
    if (!url) return;
    cropper.loadImage(url);
    els.cropCont.classList.add('active');
    
    // Store URL for current image type
    imageCrops[currentImageType].url = url;
}

els.applyCrop.onclick = () => {
    // Save crop data for current image type
    imageCrops[currentImageType].crop = cropper.getCropData();
    
    // Hide the crop UI
    els.cropCont.classList.remove('active');
    
    // Show success message
    alert(`✓ ${currentImageType.charAt(0).toUpperCase() + currentImageType.slice(1)} crop saved!`);
};

// Format numbers with K/M suffixes
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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
    const description = els.description.value.trim();
    const image = els.img.value.trim();
    const stream = els.stream.value.trim();
    const youtubeUrl = els.youtubeUrl.value.trim();
    const twitchUrl = els.twitchUrl.value.trim();
    
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
        description: description,
        imageUrl: imageCrops.profile.url,
        profileCrop: imageCrops.profile.crop,
        bannerUrl: imageCrops.banner.url,
        bannerCrop: imageCrops.banner.crop,
        backgroundUrl: imageCrops.background.url,
        backgroundCrop: imageCrops.background.crop,
        streamUrl: stream,
        youtubeUrl: youtubeUrl,
        twitchUrl: twitchUrl,
        createdAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'POST',
            headers: {
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
        console.log('Create profile response:', result);
        
        if (result.id) {
            registry[name] = result.id;
            await saveRegistry();
            showStatus(els.createStatus, 'success', `✅ Profile created! ID: ${result.id}`);
            
            setTimeout(() => {
                showPage('browse');
                loadAllProfiles();
            }, 2000);
        } else {
            console.error('No ID in response:', result);
            showStatus(els.createStatus, 'error', `Failed to create profile: ${result.message || 'Unknown error'}`);
        }
    } catch(e) {
        console.error('Create profile error:', e);
        showStatus(els.createStatus, 'error', 'Error: ' + e.message);
    }
    
    els.create.disabled = false;
};

els.update.onclick = async () => {
    const name = els.name.value.trim();
    const password = els.pass.value.trim();
    const description = els.description.value.trim();
    const image = els.img.value.trim();
    const stream = els.stream.value.trim();
    const youtubeUrl = els.youtubeUrl.value.trim();
    const twitchUrl = els.twitchUrl.value.trim();
    
    if (!name || !password) {
        showStatus(els.createStatus, 'error', 'Name and password required!');
        return;
    }
    
    els.update.disabled = true;
    showStatus(els.createStatus, 'success', 'Updating profile...');
    
    const profileData = {
        name: name,
        password: password,
        description: description,
        imageUrl: imageCrops.profile.url,
        profileCrop: imageCrops.profile.crop,
        bannerUrl: imageCrops.banner.url,
        bannerCrop: imageCrops.banner.crop,
        backgroundUrl: imageCrops.background.url,
        backgroundCrop: imageCrops.background.crop,
        streamUrl: stream,
        youtubeUrl: youtubeUrl,
        twitchUrl: twitchUrl,
        updatedAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${API_URL}/profile/${editingProfileId}`, {
            method: 'PATCH',
            headers: {
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
            // Update nav profile pic if present
            if (profileData.imageUrl && profileData.profileCrop) {
                const crop = profileData.profileCrop;
                const scale = 100 / (crop.width * 100);
                const offsetX = -(crop.x * 100) * scale;
                const offsetY = -(crop.y * 100) * scale;
                
                menu.trigger.style.backgroundImage = `url(${profileData.imageUrl})`;
                menu.trigger.style.backgroundSize = `${scale * 100}%`;
                menu.trigger.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
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

// Restore login state from localStorage
async function restoreLoginState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            console.log('Restoring login state for:', userData.name);
            
            // Load the profile to get full data
            const profile = await loadProfile(userData.id);
            
            // Set current user
            currentUser = {
                name: userData.name,
                id: userData.id
            };
            editingProfileId = userData.id;
            
            // Update UI
            if (profile.imageUrl) {
                if (profile.profileCrop) {
                    // New format
                    const crop = profile.profileCrop;
                    const scale = 100 / (crop.width * 100);
                    const offsetX = -(crop.x * 100) * scale;
                    const offsetY = -(crop.y * 100) * scale;
                    
                    menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
                    menu.trigger.style.backgroundSize = `${scale * 100}%`;
                    menu.trigger.style.backgroundPosition = `${offsetX}% ${offsetY}%`;
                } else if (profile.cropData) {
                    // Old format (backwards compatibility)
                    const scale = profile.cropData.zoom / 100;
                    const x = profile.cropData.x;
                    const y = profile.cropData.y;
                    menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
                    menu.trigger.style.backgroundSize = `${scale * 100}%`;
                    menu.trigger.style.backgroundPosition = `${x}% ${y}%`;
                }
            }
            menu.trigger.classList.add('logged-in');
            menu.myProfile.classList.remove('disabled');
            menu.login.style.display = 'none';
            menu.logout.style.display = 'block';
            
            console.log('Login state restored successfully');
        } catch(e) {
            console.error('Failed to restore login state:', e);
            // Clear invalid saved data
            localStorage.removeItem('currentUser');
        }
    }
}

// Restore login on page load
restoreLoginState();
