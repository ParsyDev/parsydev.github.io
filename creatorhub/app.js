const API_URL = 'https://creator-hub-api.emdejiku.workers.dev';
const TMDB_API_KEY = 'ef368b77a32d9d65464c5470b20971fa'; // TMDB API key
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

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
let currentMediaCards = []; // Track media cards being edited

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
    profileSearch: document.getElementById('profileSearch'),
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
    loginStatus: document.getElementById('loginStatus'),
    cardStyle: document.getElementById('cardStyle'),
    cardColor: document.getElementById('cardColor'),
    cardColorHex: document.getElementById('cardColorHex'),
    cardColorGradient: document.getElementById('cardColorGradient'),
    cardColorGradientHex: document.getElementById('cardColorGradientHex'),
    fontColor: document.getElementById('fontColor'),
    fontColorHex: document.getElementById('fontColorHex'),
    customColorPicker: document.getElementById('customColorPicker'),
    mediaCardsSection: document.getElementById('mediaCardsSection'),
    mediaCardsContainer: document.getElementById('mediaCardsContainer'),
    editMediaCardsContainer: document.getElementById('editMediaCardsContainer'),
    addMediaCard: document.getElementById('addMediaCard'),
    mediaModal: document.getElementById('mediaModal'),
    mediaSearchInput: document.getElementById('mediaSearchInput'),
    mediaTypeSelect: document.getElementById('mediaTypeSelect'),
    mediaSearchBtn: document.getElementById('mediaSearchBtn'),
    mediaSearchResults: document.getElementById('mediaSearchResults'),
    closeMediaModal: document.getElementById('closeMediaModal'),
    mediaStatus: document.getElementById('mediaStatus')
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
            // Render media cards AFTER switching to create page
            renderMediaCards(true);
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
        allProfileCards = []; // Reset cards array for search
        
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
                allProfileCards.push(card); // Store for search
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
        
        // Show page first
        showPage('view');
        
        // Then check edit button visibility
        if (currentUser && currentUser.id === id) {
            els.editProfileBtn.style.display = 'block';
        } else {
            els.editProfileBtn.style.display = 'none';
        }
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
    
    // Apply card style
    const profileContainer = document.querySelector('.profile-container');
    const profileContent = document.getElementById('viewProfileContent');
    
    if (profile.cardStyle === 'frosted') {
        profileContainer.style.background = 'rgba(255, 255, 255, 0.7)';
        profileContainer.style.backdropFilter = 'blur(20px)';
        profileContainer.style.webkitBackdropFilter = 'blur(20px)';
        profileContent.style.background = 'transparent';
    } else if (profile.cardStyle === 'custom' && profile.cardColor) {
        if (profile.cardColorGradient) {
            profileContainer.style.background = `linear-gradient(135deg, ${profile.cardColor} 0%, ${profile.cardColorGradient} 100%)`;
        } else {
            profileContainer.style.background = profile.cardColor;
        }
        profileContainer.style.backdropFilter = 'none';
        profileContainer.style.webkitBackdropFilter = 'none';
        profileContent.style.background = 'transparent';
        
        // Use custom font color if provided
        if (profile.fontColor) {
            els.viewName.style.color = profile.fontColor;
            els.viewDescription.style.color = profile.fontColor;
            els.viewDescription.style.background = 'rgba(0, 0, 0, 0.1)';
            els.viewDescription.style.borderLeftColor = profile.fontColor;
        } else {
            // Auto-adjust text color based on background brightness
            const color = profile.cardColor;
            const rgb = parseInt(color.slice(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >>  8) & 0xff;
            const b = (rgb >>  0) & 0xff;
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            if (brightness < 128) {
                // Dark background - use light text
                els.viewName.style.color = 'white';
                els.viewDescription.style.color = 'rgba(255, 255, 255, 0.9)';
                els.viewDescription.style.background = 'rgba(0, 0, 0, 0.2)';
                els.viewDescription.style.borderLeftColor = 'rgba(255, 255, 255, 0.5)';
            } else {
                // Light background - use dark text
                els.viewName.style.color = '#333';
                els.viewDescription.style.color = '#555';
                els.viewDescription.style.background = 'rgba(255, 255, 255, 0.3)';
                els.viewDescription.style.borderLeftColor = '#333';
            }
        }
    } else {
        // Solid white (default)
        profileContainer.style.background = 'white';
        profileContainer.style.backdropFilter = 'none';
        profileContainer.style.webkitBackdropFilter = 'none';
        profileContent.style.background = 'white';
        els.viewName.style.color = '#333';
        els.viewDescription.style.color = '#555';
        els.viewDescription.style.background = '#f9f9f9';
        els.viewDescription.style.borderLeftColor = '#333';
    }
    
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
    
    // Display media cards
    currentMediaCards = profile.mediaCards || [];
    renderMediaCards(false); // false = viewing mode, not editing
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
    
    // Load media cards
    currentMediaCards = profile.mediaCards || [];
    
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
    
    // Load card style settings
    const cardStyle = profile.cardStyle || 'solid';
    els.cardStyle.value = cardStyle;
    
    // Update UI to reflect current style
    document.querySelectorAll('.card-style-option').forEach(opt => {
        if (opt.dataset.style === cardStyle) {
            opt.style.borderColor = '#ffffff';
            opt.classList.add('active');
        } else {
            opt.style.borderColor = '#52525b';
            opt.classList.remove('active');
        }
    });
    
    if (cardStyle === 'custom') {
        els.customColorPicker.style.display = 'block';
        if (profile.cardColor) {
            els.cardColor.value = profile.cardColor;
            els.cardColorHex.value = profile.cardColor;
        }
        if (profile.cardColorGradient) {
            els.cardColorGradient.value = profile.cardColorGradient;
            els.cardColorGradientHex.value = profile.cardColorGradient;
        }
        if (profile.fontColor) {
            els.fontColor.value = profile.fontColor;
            els.fontColorHex.value = profile.fontColor;
        }
    } else {
        els.customColorPicker.style.display = 'none';
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
    
    currentMediaCards = [];
    
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
        cardStyle: els.cardStyle.value,
        cardColor: els.cardStyle.value === 'custom' ? els.cardColorHex.value : null,
        cardColorGradient: els.cardStyle.value === 'custom' ? els.cardColorGradientHex.value : null,
        fontColor: els.cardStyle.value === 'custom' ? els.fontColorHex.value : null,
        mediaCards: currentMediaCards,
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
    
    try {
        // Load current profile to preserve mediaCards
        const currentProfile = await loadProfile(editingProfileId);
        
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
            cardStyle: els.cardStyle.value,
            cardColor: els.cardStyle.value === 'custom' ? els.cardColorHex.value : null,
            cardColorGradient: els.cardStyle.value === 'custom' ? els.cardColorGradientHex.value : null,
            fontColor: els.cardStyle.value === 'custom' ? els.fontColorHex.value : null,
            mediaCards: currentMediaCards,
            updatedAt: new Date().toISOString()
        };
    
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
        console.error('Update error:', e);
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

// Card style selection
document.querySelectorAll('.card-style-option').forEach(option => {
    option.onclick = function() {
        // Remove active from all
        document.querySelectorAll('.card-style-option').forEach(opt => {
            opt.style.borderColor = '#52525b';
            opt.classList.remove('active');
        });
        
        // Add active to clicked
        this.style.borderColor = '#ffffff';
        this.classList.add('active');
        
        const style = this.dataset.style;
        els.cardStyle.value = style;
        
        // Show/hide color picker
        if (style === 'custom') {
            els.customColorPicker.style.display = 'block';
        } else {
            els.customColorPicker.style.display = 'none';
        }
    };
});

// Sync color inputs
els.cardColor.oninput = () => {
    els.cardColorHex.value = els.cardColor.value;
};
els.cardColorHex.oninput = () => {
    if (/^#[0-9A-F]{6}$/i.test(els.cardColorHex.value)) {
        els.cardColor.value = els.cardColorHex.value;
    }
};
els.cardColorGradient.oninput = () => {
    els.cardColorGradientHex.value = els.cardColorGradient.value;
};
els.cardColorGradientHex.oninput = () => {
    if (/^#[0-9A-F]{6}$/i.test(els.cardColorGradientHex.value)) {
        els.cardColorGradient.value = els.cardColorGradientHex.value;
    }
};
els.fontColor.oninput = () => {
    els.fontColorHex.value = els.fontColor.value;
};
els.fontColorHex.oninput = () => {
    if (/^#[0-9A-F]{6}$/i.test(els.fontColorHex.value)) {
        els.fontColor.value = els.fontColorHex.value;
    }
};


// Profile search functionality
let allProfileCards = [];
els.profileSearch.oninput = () => {
    const searchTerm = els.profileSearch.value.toLowerCase().trim();
    
    allProfileCards.forEach(card => {
        const profileName = card.querySelector('.profile-card-name').textContent.toLowerCase();
        if (profileName.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};


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

// ==================== MEDIA CARDS (TMDB) ====================

// TMDB API Functions
async function searchTMDB(query, type = 'movie') {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.results || [];
    } catch(e) {
        console.error('TMDB search error:', e);
        return [];
    }
}

function extractYear(dateString) {
    return dateString ? dateString.split('-')[0] : '';
}

// Media Modal Handlers
els.closeMediaModal.onclick = () => els.mediaModal.classList.remove('active');
els.mediaModal.onclick = (e) => {
    if (e.target === els.mediaModal) els.mediaModal.classList.remove('active');
};

// Search on Enter key
els.mediaSearchInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
        els.mediaSearchBtn.click();
    }
};

// Media Search
els.mediaSearchBtn.onclick = async () => {
    const query = els.mediaSearchInput.value.trim();
    if (!query) return;
    
    const type = els.mediaTypeSelect.value;
    els.mediaSearchBtn.disabled = true;
    els.mediaSearchBtn.textContent = 'Searching...';
    
    try {
        const results = await searchTMDB(query, type);
        
        if (results.length === 0) {
            els.mediaSearchResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No results found</div>';
        } else {
            els.mediaSearchResults.innerHTML = '';
            
            results.slice(0, 12).forEach(item => {
                if (!item.poster_path) return; // Skip if no poster
                
                const card = document.createElement('div');
                card.className = 'media-search-result';
                card.innerHTML = `
                    <img src="${TMDB_IMAGE_BASE}${item.poster_path}" alt="${item.title || item.name}">
                    <div class="media-search-result-info">
                        <div class="media-search-result-title">${item.title || item.name}</div>
                        <div class="media-search-result-year">${extractYear(item.release_date || item.first_air_date)}</div>
                    </div>
                `;
                
                card.onclick = () => addMediaToProfile(item, type);
                els.mediaSearchResults.appendChild(card);
            });
        }
    } catch(e) {
        console.error('Search error:', e);
        els.mediaSearchResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c;">Error searching. Please try again.</div>';
    }
    
    els.mediaSearchBtn.disabled = false;
    els.mediaSearchBtn.textContent = 'Search';
};

// Add media to profile
function addMediaToProfile(item, type) {
    const maxCards = 16;
    
    if (currentMediaCards.length >= maxCards) {
        showStatus(els.mediaStatus, 'warning', `Maximum ${maxCards} cards allowed`);
        return;
    }
    
    // Check if already added
    if (currentMediaCards.some(c => c.id === String(item.id))) {
        showStatus(els.mediaStatus, 'warning', 'Already added!');
        return;
    }
    
    const mediaCard = {
        id: String(item.id),
        type: type,
        title: item.title || item.name,
        image: `${TMDB_IMAGE_BASE}${item.poster_path}`,
        year: extractYear(item.release_date || item.first_air_date),
        rating: item.vote_average || 0,
        order: currentMediaCards.length
    };
    
    currentMediaCards.push(mediaCard);
    renderMediaCards();
    els.mediaModal.classList.remove('active');
}

// Remove media card
function removeMediaCard(cardId) {
    currentMediaCards = currentMediaCards.filter(c => c.id !== cardId);
    // Reorder
    currentMediaCards.forEach((card, i) => card.order = i);
    renderMediaCards();
}

// Render media cards in edit/view mode
function renderMediaCards(isEditMode = false) {
    // Use edit container if on create/edit page, otherwise use view container
    const isOnCreatePage = pages.create.classList.contains('active');
    const container = isOnCreatePage ? els.editMediaCardsContainer : els.mediaCardsContainer;
    
    console.log('renderMediaCards called:', {
        isOnCreatePage,
        isEditMode,
        containerExists: !!container,
        currentMediaCardsCount: currentMediaCards.length,
        containerDisplay: container ? window.getComputedStyle(container).display : 'N/A',
        containerWidth: container ? container.offsetWidth : 'N/A',
        containerHeight: container ? container.offsetHeight : 'N/A'
    });
    
    if (!container) {
        console.error('Container not found!');
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Add existing cards
    currentMediaCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'media-card';
        cardEl.innerHTML = `
            <img src="${card.image}" alt="${card.title}">
            ${isEditMode || isOnCreatePage ? '<div class="media-card-remove">×</div>' : ''}
            <div class="media-card-overlay">
                <div class="media-card-title">${card.title}</div>
                <div class="media-card-year">${card.year}</div>
                <div class="media-card-rating">⭐ ${card.rating.toFixed(1)}</div>
            </div>
        `;
        
        if (isEditMode || isOnCreatePage) {
            const removeBtn = cardEl.querySelector('.media-card-remove');
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeMediaCard(card.id);
            };
        }
        
        container.appendChild(cardEl);
    });
    
    // Add "+" card ONLY if in edit mode or on create page
    if (isEditMode || isOnCreatePage) {
        if (currentMediaCards.length < 12) {
            console.log('Adding + card');
            const addCard = document.createElement('div');
            addCard.className = 'add-media-card';
            // Explicit dimensions instead of relying on aspect-ratio
            addCard.style.width = '140px';
            addCard.style.height = '210px'; // 140 * 1.5 = 2:3 ratio
            addCard.innerHTML = `
                <div style="font-size: 40px; color: #999;">+</div>
                <div style="font-size: 11px; color: #999;">Add Media</div>
            `;
            addCard.onclick = () => {
                console.log('+ card clicked');
                els.mediaModal.classList.add('active');
                els.mediaSearchInput.value = '';
                els.mediaSearchResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">Search for movies or TV shows to add to your profile</div>';
            };
            container.appendChild(addCard);
            console.log('+ card added with explicit height');
        }
    }
    
    // Show/hide section (only for view page)
    if (!isOnCreatePage) {
        if (currentMediaCards.length > 0 || isEditMode) {
            els.mediaCardsSection.style.display = 'block';
        } else {
            els.mediaCardsSection.style.display = 'none';
        }
    }
}
