const API_URL = 'https://creator-hub-api.emdejiku.workers.dev';
const TMDB_API_KEY = 'ef368b77a32d9d65464c5470b20971fa'; // TMDB API key
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// IGDB/Twitch API for Games
const IGDB_CLIENT_ID = 'q1rk5rddrlc194tidqsvmqyoyansmz';
const IGDB_CLIENT_SECRET = '1pf0p21tznnncas2fi9ftwo08xxobq';
let igdbAccessToken = null;
let igdbTokenExpiry = 0;

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
let currentCustomSocialLinks = []; // Track custom social links being edited

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
    refreshBtn: document.getElementById('refreshBtn'),
    name: document.getElementById('profileName'),
    pass: document.getElementById('profilePassword'),
    description: document.getElementById('profileDescription'),
    img: document.getElementById('imageUrl'),
    imageType: document.getElementById('imageType'),
    clearImage: document.getElementById('clearImage'),
    stream: document.getElementById('streamUrl'),
    youtubeUrl: document.getElementById('youtubeUrl'),
    twitchUrl: document.getElementById('twitchUrl'),
    instagramUrl: document.getElementById('instagramUrl'),
    customSocialLinksContainer: document.getElementById('customSocialLinksContainer'),
    customSocialModal: document.getElementById('customSocialModal'),
    customSocialUrl: document.getElementById('customSocialUrl'),
    customSocialName: document.getElementById('customSocialName'),
    addCustomSocialBtn: document.getElementById('addCustomSocialBtn'),
    closeCustomSocialModal: document.getElementById('closeCustomSocialModal'),
    customSocialStatus: document.getElementById('customSocialStatus'),
    customSocialLinksDisplay: document.getElementById('customSocialLinksDisplay'),
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
    instagramLink: document.getElementById('instagramLink'),
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
function showPage(pageName, profileId = null, addToHistory = true) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[pageName].classList.add('active');
    menu.dropdown.classList.remove('active');
    
    // Update URL and browser history
    if (addToHistory) {
        let url = `#${pageName}`;
        if (pageName === 'view' && profileId) {
            url = `#profile/${profileId}`;
        }
        window.history.pushState({ page: pageName, profileId: profileId }, '', url);
    }
    
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
    showPage('browse', null, true);
    loadAllProfiles();
};

// Logo and title click to go to browse page
const navTitle = document.querySelector('.nav-title');
const navLogo = document.querySelector('.nav-logo');
if (navTitle) {
    navTitle.onclick = () => {
        showPage('browse', null, true);
        loadAllProfiles();
    };
    navTitle.style.cursor = 'pointer';
}
if (navLogo) {
    navLogo.onclick = () => {
        showPage('browse', null, true);
        loadAllProfiles();
    };
    navLogo.style.cursor = 'pointer';
}

// Refresh button handler
if (els.refreshBtn) {
    els.refreshBtn.onclick = async () => {
        els.refreshBtn.classList.add('refreshing');
        els.refreshBtn.disabled = true;
        
        // Clear ALL cache
        if (typeof cacheManager !== 'undefined') {
            cacheManager.clear();
            console.log('🗑️ Cache cleared');
        }
        
        // Reload profiles from server
        await loadAllProfiles();
        
        // Reset button
        els.refreshBtn.classList.remove('refreshing');
        els.refreshBtn.disabled = false;
        
        console.log('✅ Profiles refreshed from server');
    };
}

menu.create.onclick = () => {
    showPage('create', null, true);
    resetCreateForm();
    // Explicitly render media cards after form reset completes
    setTimeout(() => {
        renderMediaCards(true);
    }, 100);
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
    menu.myProfile.classList.add('disabled');
    menu.logout.style.display = 'none';
    menu.login.style.display = 'block';
    menu.trigger.classList.remove('logged-in');
    menu.trigger.style.backgroundImage = '';
    showPage('browse', null, true);
    loadAllProfiles();
    
    // Also logout from auth manager
    if (typeof authManager !== 'undefined') {
        authManager.logout();
    }
};

// Edit Profile Button Handler
els.editProfileBtn.onclick = async () => {
    if (currentUser && currentViewingProfileId === currentUser.id) {
        try {
            const profile = await loadProfile(currentUser.id);
            loadProfileForEdit(profile);
            showPage('create', null, true);
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
    
    // Load What's New content (non-blocking)
    loadWhatsNew();
    
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
        
        // Track loaded profiles to avoid duplicates
        const loadedProfiles = new Set();
        
        for (const [name, id] of entries) {
            // Skip if we already loaded this profile ID
            if (loadedProfiles.has(id)) {
                console.log('Skipping duplicate profile:', name, id);
                continue;
            }
            
            try {
                console.log('Loading profile:', name, id);
                const profile = await loadProfile(id);
                const card = createProfileCard(profile, id);
                els.grid.appendChild(card);
                allProfileCards.push(card); // Store for search
                loadedProfiles.add(id); // Mark as loaded
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
                // New format - correct crop display
                const crop = profile.profileCrop;
                
                // Scale the image so the cropped portion fills the container
                const scale = 1 / crop.width;
                
                // Calculate position to show the cropped area
                // We need to offset by the crop position, scaled by how much we're zooming
                const posX = (crop.x / (1 - crop.width)) * 100;
                const posY = (crop.y / (1 - crop.height)) * 100;
                
                img.style.backgroundImage = `url(${profile.imageUrl})`;
                img.style.backgroundSize = `${scale * 100}%`;
                img.style.backgroundPosition = `${posX}% ${posY}%`;
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
    
    // Make card clickable with proper history support
    card.style.cursor = 'pointer';
    card.onclick = () => viewProfile(id, true);
    
    return card;
}

async function viewProfile(id, addToHistory = true) {
    try {
        const profile = await loadProfile(id);
        currentViewingProfileId = id;
        displayProfile(profile);
        
        // Show page first
        showPage('view', id, addToHistory);
        
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
    
    // Display description if available (preserving line breaks)
    if (profile.description && profile.description.trim()) {
        // Convert newlines to <br> for proper display
        els.viewDescription.innerHTML = profile.description.replace(/\n/g, '<br>');
        els.viewDescription.style.display = 'block';
    } else {
        els.viewDescription.style.display = 'none';
    }
    
    // Display banner image
    if (profile.bannerUrl && profile.bannerCrop) {
        const crop = profile.bannerCrop;
        const scale = 1 / crop.width;
        const posX = -crop.x / crop.width * 100;
        const posY = -crop.y / crop.height * 100;
        
        els.viewBannerImg.style.backgroundImage = `url(${profile.bannerUrl})`;
        els.viewBannerImg.style.backgroundSize = `${scale * 100}%`;
        els.viewBannerImg.style.backgroundPosition = `${posX}% ${posY}%`;
    } else {
        els.viewBannerImg.style.backgroundImage = '';
    }
    
    // Display background image (only if element exists)
    if (els.siteBackground) {
        if (profile.backgroundUrl && profile.backgroundCrop) {
            const crop = profile.backgroundCrop;
            const scale = 1 / crop.width;
            const posX = -crop.x / crop.width * 100;
            const posY = -crop.y / crop.height * 100;
            
            els.siteBackground.style.backgroundImage = `url(${profile.backgroundUrl})`;
            els.siteBackground.style.backgroundSize = `${scale * 100}%`;
            els.siteBackground.style.backgroundPosition = `${posX}% ${posY}%`;
        } else {
            els.siteBackground.style.backgroundImage = '';
        }
    }
    
    // Display social media links
    let hasSocialLinks = false;
    
    // Helper function to get favicon/logo from URL
    function getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            // Use Google's favicon service as primary, with Clearbit as fallback
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch (e) {
            console.error('Invalid URL for favicon:', url);
            return '';
        }
    }
    
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
    
    if (profile.instagramUrl && profile.instagramUrl.trim()) {
        els.instagramLink.href = profile.instagramUrl;
        els.instagramLink.style.display = 'flex';
        hasSocialLinks = true;
    } else {
        els.instagramLink.style.display = 'none';
    }
    
    // Display custom social links
    if (els.customSocialLinksDisplay) {
        els.customSocialLinksDisplay.innerHTML = '';
        // Use 'display: contents' to make children direct children of parent
        els.customSocialLinksDisplay.style.display = 'contents';
        
        if (profile.customSocialLinks && profile.customSocialLinks.length > 0) {
            profile.customSocialLinks.forEach(link => {
                const linkEl = document.createElement('a');
                linkEl.href = link.url;
                linkEl.target = '_blank';
                linkEl.title = link.name || link.url;
                linkEl.style.display = 'flex';
                linkEl.style.flexDirection = 'column';
                linkEl.style.alignItems = 'center';
                linkEl.style.textDecoration = 'none';
                linkEl.style.transition = 'transform 0.2s, opacity 0.2s';
                linkEl.style.gap = '5px';
                
                const faviconUrl = getFaviconUrl(link.url);
                const img = document.createElement('img');
                img.src = faviconUrl;
                img.alt = link.name || 'Social';
                img.style.width = '48px';
                img.style.height = '48px';
                img.style.borderRadius = '8px';
                img.style.objectFit = 'contain';
                // Don't add white background - let the icon's natural appearance show
                
                img.onerror = function() {
                    // Fallback to Clearbit if Google fails
                    try {
                        const urlObj = new URL(link.url);
                        this.src = `https://logo.clearbit.com/${urlObj.hostname}`;
                        this.onerror = function() {
                            // Final fallback to generic link icon
                            this.style.display = 'none';
                            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                            svg.setAttribute('width', '48');
                            svg.setAttribute('height', '48');
                            svg.setAttribute('viewBox', '0 0 24 24');
                            svg.setAttribute('fill', 'currentColor');
                            svg.style.color = '#a1a1aa'; // Match theme color
                            svg.innerHTML = '<path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>';
                            linkEl.insertBefore(svg, this);
                        };
                    } catch (e) {
                        console.error('Error loading fallback icon:', e);
                    }
                };
                
                linkEl.appendChild(img);
                
                linkEl.onmouseover = function() {
                    this.style.transform = 'scale(1.15)';
                    this.style.opacity = '0.8';
                };
                linkEl.onmouseout = function() {
                    this.style.transform = 'scale(1)';
                    this.style.opacity = '1';
                };
                
                els.customSocialLinksDisplay.appendChild(linkEl);
                hasSocialLinks = true;
            });
        }
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
            // New format - correct crop display
            const crop = profile.profileCrop;
            
            // How much to scale up the image so the crop area fills the container
            // Scale the image so the cropped portion fills the container
            const scale = 1 / crop.width;
            
            // Calculate position to show the cropped area
            // We need to offset by the crop position, scaled by how much we're zooming
            const posX = (crop.x / (1 - crop.width)) * 100;
            const posY = (crop.y / (1 - crop.height)) * 100;
            
            els.viewImg.style.backgroundImage = `url(${profile.imageUrl})`;
            els.viewImg.style.backgroundSize = `${scale * 100}%`;
            els.viewImg.style.backgroundPosition = `${posX}% ${posY}%`;
            
            console.log('🖼️ Profile crop display:', { scale, posX, posY, crop });
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
    
    // Only show stream if it exists
    if (profile.streamUrl && profile.streamUrl.trim()) {
        const embedUrl = getStreamEmbedUrl(profile.streamUrl);
        if (embedUrl) {
            els.viewStream.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
            els.viewStream.style.display = 'block';
        } else {
            els.viewStream.style.display = 'none';
        }
    } else {
        els.viewStream.style.display = 'none';
    }
    
    // Display media cards
    currentMediaCards = profile.mediaCards || [];
    renderMediaCards(false); // false = viewing mode, not editing
    
    // Load custom social links
    currentCustomSocialLinks = profile.customSocialLinks || [];
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
    
    try {
        showStatus(els.loginStatus, 'loading', '🔄 Loading profile...');
        const profile = await loadProfile(profileId);
        
        // Check if profile has password protection
        if (!profile.passwordHash) {
            showStatus(els.loginStatus, 'error', '❌ This profile has no password!');
            return;
        }
        
        // Verify password using CryptoHelper
        if (typeof cryptoHelper !== 'undefined') {
            const inputHash = await cryptoHelper.hashPassword(password);
            
            if (inputHash !== profile.passwordHash) {
                showStatus(els.loginStatus, 'error', '❌ Wrong password!');
                return;
            }
            
            // Decrypt private data if exists
            let privateData = {};
            if (profile.encryptedData) {
                try {
                    privateData = await cryptoHelper.decrypt(password, profile.encryptedData);
                } catch(e) {
                    console.error('Failed to decrypt private data:', e);
                }
            }
            
            // Success!
            currentUser = {
                id: profileId,
                name: name,
                password: password,
                privateData: privateData
            };
            
            // Save session
            if (typeof authManager !== 'undefined') {
                authManager.saveSession(profileId, name);
            }
            
        } else {
            // Fallback: simple password check
            if (profile.password !== password) {
                showStatus(els.loginStatus, 'error', '❌ Wrong password!');
                return;
            }
            
            currentUser = {
                id: profileId,
                name: name,
                password: password
            };
        }
        
        // Update UI
        menu.myProfile.classList.remove('disabled');
        menu.logout.style.display = 'block';
        menu.login.style.display = 'none';
        menu.trigger.classList.add('logged-in');
        
        // Set profile picture in nav
        if (profile.imageUrl) {
            menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
            menu.trigger.style.backgroundSize = 'cover';
            menu.trigger.style.backgroundPosition = 'center';
        }
        
        showStatus(els.loginStatus, 'success', '✅ Logged in successfully!');
        
        setTimeout(() => {
            els.loginModal.classList.remove('active');
            viewProfile(profileId);
        }, 1000);
        
    } catch(e) {
        console.error('Login error:', e);
        showStatus(els.loginStatus, 'error', '❌ Error loading profile!');
    }
};

els.closeLogin.onclick = () => {
    els.loginModal.classList.remove('active');
};

// Close modal when clicking outside
els.loginModal.onclick = (e) => {
    if (e.target === els.loginModal) {
        els.loginModal.classList.remove('active');
    }
};

// Image crop system
els.imageType.onchange = () => {
    currentImageType = els.imageType.value;
    console.log(`📸 Switched to ${currentImageType} image type`);
    
    // Update the input field
    els.img.value = imageCrops[currentImageType].url || '';
    
    // Hide crop UI when switching types - user must manually enable it
    els.cropCont.classList.remove('active');
};

// Image URL input - Don't auto-show crop UI
els.img.oninput = (e) => {
    const url = e.target.value.trim();
    console.log(`📝 Image URL changed for ${currentImageType}:`, url ? url.substring(0, 50) + '...' : 'empty');
    
    if (url) {
        imageCrops[currentImageType].url = url;
        // Don't automatically show crop UI - user must click "Crop" button
    } else {
        imageCrops[currentImageType].url = '';
        els.cropCont.classList.remove('active');
    }
};

// Enable Crop button
const enableCropBtn = document.getElementById('enableCrop');
if (enableCropBtn) {
    enableCropBtn.onclick = () => {
        const url = imageCrops[currentImageType].url;
        if (url) {
            cropper.loadImage(url);
            els.cropCont.classList.add('active');
        } else {
            alert('Please enter an image URL first!');
        }
    };
}

// Cancel Crop button
const cancelCropBtn = document.getElementById('cancelCrop');
if (cancelCropBtn) {
    cancelCropBtn.onclick = () => {
        els.cropCont.classList.remove('active');
        // Keep the image URL but remove crop data
        imageCrops[currentImageType].crop = null;
    };
}

// Clear image button
els.clearImage.onclick = () => {
    els.img.value = '';
    imageCrops[currentImageType].url = '';
    imageCrops[currentImageType].crop = null;
    els.cropCont.classList.remove('active');
    cropper.imageLoaded = false;
};

// Apply crop
els.applyCrop.onclick = () => {
    if (cropper.imageLoaded) {
        const cropData = cropper.getCropData();
        imageCrops[currentImageType].crop = cropData;
        console.log(`Crop saved for ${currentImageType}:`, cropData);
        alert(`✓ ${currentImageType.charAt(0).toUpperCase() + currentImageType.slice(1)} crop applied!`);
        // Close crop UI after applying
        els.cropCont.classList.remove('active');
    }
};

// Drop zone
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
    
    const text = e.dataTransfer.getData('text');
    if (text) {
        els.img.value = text;
        imageCrops[currentImageType].url = text;
        // Don't auto-show crop - user must click "Crop" button
    }
};

// Paste detection
document.addEventListener('paste', (e) => {
    if (document.activeElement === els.img) {
        setTimeout(() => {
            const url = els.img.value.trim();
            if (url) {
                imageCrops[currentImageType].url = url;
                // Don't auto-show crop - user must click "Crop" button
            }
        }, 10);
    }
});

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
                    // New format - correct crop display
                    const crop = profile.profileCrop;
                    const scale = 1 / crop.width;
                    const posX = (crop.x / (1 - crop.width)) * 100;
                    const posY = (crop.y / (1 - crop.height)) * 100;
                    
                    menu.trigger.style.backgroundImage = `url(${profile.imageUrl})`;
                    menu.trigger.style.backgroundSize = `${scale * 100}%`;
                    menu.trigger.style.backgroundPosition = `${posX}% ${posY}%`;
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

// Profile search
let allProfileCards = [];
els.profileSearch.oninput = (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    allProfileCards.forEach(card => {
        const name = card.querySelector('.profile-card-name').textContent.toLowerCase();
        if (name.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};

// Card style selection
document.querySelectorAll('.card-style-option').forEach(option => {
    option.onclick = function() {
        // Remove active from all
        document.querySelectorAll('.card-style-option').forEach(o => o.classList.remove('active'));
        // Add active to clicked
        this.classList.add('active');
        
        // Show/hide custom color picker
        const style = this.dataset.style;
        if (style === 'custom') {
            els.customColorPicker.style.display = 'block';
        } else {
            els.customColorPicker.style.display = 'none';
        }
    };
});

// Sync color pickers with hex inputs
els.cardColor.oninput = (e) => {
    els.cardColorHex.value = e.target.value;
};

els.cardColorHex.oninput = (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        els.cardColor.value = e.target.value;
    }
};

els.cardColorGradient.oninput = (e) => {
    els.cardColorGradientHex.value = e.target.value;
};

els.cardColorGradientHex.oninput = (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        els.cardColorGradient.value = e.target.value;
    }
};

els.fontColor.oninput = (e) => {
    els.fontColorHex.value = e.target.value;
};

els.fontColorHex.oninput = (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        els.fontColor.value = e.target.value;
    }
};

// Create profile
els.create.onclick = async () => {
    const name = els.name.value.trim();
    const password = els.pass.value.trim();
    const description = els.description.value.trim(); // Keep line breaks
    const streamUrl = els.stream.value.trim();
    const youtubeUrl = els.youtubeUrl.value.trim();
    const twitchUrl = els.twitchUrl.value.trim();
    const instagramUrl = els.instagramUrl.value.trim();
    
    if (!name) {
        showStatus(els.createStatus, 'error', 'Name is required!');
        return;
    }
    
    if (!password) {
        showStatus(els.createStatus, 'error', 'Password is required!');
        return;
    }
    
    // Check if name already exists
    await loadRegistry();
    if (registry[name]) {
        showStatus(els.createStatus, 'error', 'Name already taken!');
        return;
    }
    
    // Get card style
    const activeStyle = document.querySelector('.card-style-option.active');
    const cardStyle = activeStyle ? activeStyle.dataset.style : 'frosted';
    
    let cardColor = null;
    let cardColorGradient = null;
    let fontColor = null;
    
    if (cardStyle === 'custom') {
        cardColor = els.cardColorHex.value;
        cardColorGradient = els.cardColorGradientHex.value;
        fontColor = els.fontColorHex.value;
    }
    
    // Prepare profile data
    const publicData = {
        name: name,
        description: description,
        imageUrl: imageCrops.profile.url,
        profileCrop: imageCrops.profile.crop,
        bannerUrl: imageCrops.banner.url,
        bannerCrop: imageCrops.banner.crop,
        backgroundUrl: imageCrops.background.url,
        backgroundCrop: imageCrops.background.crop,
        streamUrl: streamUrl,
        youtubeUrl: youtubeUrl,
        twitchUrl: twitchUrl,
        instagramUrl: instagramUrl,
        customSocialLinks: currentCustomSocialLinks,
        cardStyle: cardStyle,
        cardColor: cardColor,
        cardColorGradient: cardColorGradient,
        fontColor: fontColor,
        mediaCards: currentMediaCards,
        createdAt: new Date().toISOString()
    };
    
    let profileData;
    
    // Use encryption if available
    if (typeof cryptoHelper !== 'undefined' && typeof authManager !== 'undefined') {
        showStatus(els.createStatus, 'loading', '🔒 Creating encrypted profile...');
        
        const privateData = {
            notes: '' // Can be expanded later
        };
        
        try {
            profileData = await authManager.createAccount(name, password, publicData, privateData);
        } catch(e) {
            console.error('Encryption failed:', e);
            showStatus(els.createStatus, 'error', '❌ Encryption failed!');
            return;
        }
    } else {
        // Fallback: simple password storage
        showStatus(els.createStatus, 'loading', '🔄 Creating profile...');
        profileData = {
            ...publicData,
            password: password // Not secure, but works
        };
    }
    
    try {
        // Create gist (PRIVATE for security)
        const response = await fetch(`${API_URL}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'profile.json': {
                        content: JSON.stringify(profileData, null, 2)
                    }
                },
                description: `Parsona Profile: ${name}`,
                public: false // 🔒 PRIVATE GIST - Only accessible through worker
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gist = await response.json();
        const gistId = gist.id;
        
        // Update registry
        registry[name] = gistId;
        await saveRegistry();
        
        // Log in the user
        currentUser = {
            id: gistId,
            name: name,
            password: password
        };
        
        // Update UI
        menu.myProfile.classList.remove('disabled');
        menu.logout.style.display = 'block';
        menu.login.style.display = 'none';
        menu.trigger.classList.add('logged-in');
        
        if (imageCrops.profile.url) {
            menu.trigger.style.backgroundImage = `url(${imageCrops.profile.url})`;
            menu.trigger.style.backgroundSize = 'cover';
            menu.trigger.style.backgroundPosition = 'center';
        }
        
        showStatus(els.createStatus, 'success', '✅ Profile created!');
        
        setTimeout(() => {
            viewProfile(gistId);
            resetCreateForm();
        }, 1500);
        
    } catch(e) {
        console.error('Error creating profile:', e);
        showStatus(els.createStatus, 'error', '❌ Failed to create profile!');
    }
};

// Update profile
els.update.onclick = async () => {
    if (!editingProfileId || !currentUser) {
        showStatus(els.createStatus, 'error', 'Not logged in!');
        return;
    }
    
    const name = els.name.value.trim();
    const password = els.pass.value.trim();
    const description = els.description.value.trim(); // Keep line breaks
    const streamUrl = els.stream.value.trim();
    const youtubeUrl = els.youtubeUrl.value.trim();
    const twitchUrl = els.twitchUrl.value.trim();
    const instagramUrl = els.instagramUrl.value.trim();
    
    if (!name) {
        showStatus(els.createStatus, 'error', 'Name is required!');
        return;
    }
    
    // Get card style
    const activeStyle = document.querySelector('.card-style-option.active');
    const cardStyle = activeStyle ? activeStyle.dataset.style : 'frosted';
    
    let cardColor = null;
    let cardColorGradient = null;
    let fontColor = null;
    
    if (cardStyle === 'custom') {
        cardColor = els.cardColorHex.value;
        cardColorGradient = els.cardColorGradientHex.value;
        fontColor = els.fontColorHex.value;
    }
    
    // Check if name changed and is available
    if (name !== currentUser.name) {
        await loadRegistry();
        if (registry[name]) {
            showStatus(els.createStatus, 'error', 'Name already taken!');
            return;
        }
    }
    
    // Prepare profile data
    const publicData = {
        name: name,
        description: description,
        imageUrl: imageCrops.profile.url,
        profileCrop: imageCrops.profile.crop,
        bannerUrl: imageCrops.banner.url,
        bannerCrop: imageCrops.banner.crop,
        backgroundUrl: imageCrops.background.url,
        backgroundCrop: imageCrops.background.crop,
        streamUrl: streamUrl,
        youtubeUrl: youtubeUrl,
        twitchUrl: twitchUrl,
        instagramUrl: instagramUrl,
        customSocialLinks: currentCustomSocialLinks,
        cardStyle: cardStyle,
        cardColor: cardColor,
        cardColorGradient: cardColorGradient,
        fontColor: fontColor,
        mediaCards: currentMediaCards,
        createdAt: currentUser.createdAt || new Date().toISOString()
    };
    
    let profileData;
    
    // Use encryption if available
    if (typeof cryptoHelper !== 'undefined' && typeof authManager !== 'undefined' && password) {
        showStatus(els.createStatus, 'loading', '🔒 Updating encrypted profile...');
        
        // Update password in authManager session
        if (authManager.currentSession) {
            authManager.currentSession.password = password;
        }
        
        const privateData = {
            notes: currentUser.privateData?.notes || ''
        };
        
        try {
            // User is logged in, we'll keep the existing hash
            let passwordHash;
            
            if (password) {
                // User provided password, re-encrypt
                const inputHash = await cryptoHelper.hashPassword(password);
                
                // Load existing profile to verify password
                const existingProfile = await loadProfile(editingProfileId);
                
                if (existingProfile.passwordHash !== inputHash) {
                    showStatus(els.createStatus, 'error', '❌ Wrong password!');
                    return;
                }
                
                // Password correct, update profile
                profileData = await authManager.updateAccount(publicData, privateData);
            } else {
                // No password provided, keep existing encrypted data
                const existingProfile = await loadProfile(editingProfileId);
                profileData = {
                    ...publicData,
                    passwordHash: existingProfile.passwordHash,
                    encryptedData: existingProfile.encryptedData
                };
            }
        } catch(e) {
            console.error('Update failed:', e);
            showStatus(els.createStatus, 'error', '❌ Update failed!');
            return;
        }
    } else {
        showStatus(els.createStatus, 'loading', '🔄 Updating profile...');
        
        // Load existing profile
        const existingProfile = await loadProfile(editingProfileId);
        
        // Keep existing password hash if no new password provided
        if (!password) {
            profileData = {
                ...publicData,
                password: existingProfile.password || '',
                passwordHash: existingProfile.passwordHash
            };
        } else {
            // Only re-hash and re-encrypt if password was provided
            if (typeof cryptoHelper !== 'undefined') {
                passwordHash = await cryptoHelper.hashPassword(password);
                profileData = {
                    ...publicData,
                    password: password,
                    passwordHash: passwordHash
                };
            } else {
                profileData = {
                    ...publicData,
                    password: password
                };
            }
        }
    }
    
    try {
        // Update gist
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
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Update registry if name changed
        if (name !== currentUser.name) {
            delete registry[currentUser.name];
            registry[name] = editingProfileId;
            await saveRegistry();
        }
        
        // Update current user
        currentUser.name = name;
        if (password) {
            currentUser.password = password;
        }
        
        // Clear cache for this profile
        if (typeof cacheManager !== 'undefined') {
            cacheManager.delete(`profile_${editingProfileId}`);
        }
        
        showStatus(els.createStatus, 'success', '✅ Profile updated!');
        
        setTimeout(() => {
            viewProfile(editingProfileId);
            resetCreateForm();
        }, 1500);
        
    } catch(e) {
        console.error('Error updating profile:', e);
        showStatus(els.createStatus, 'error', '❌ Failed to update profile!');
    }
};

function showStatus(el, type, message) {
    el.textContent = message;
    el.style.display = 'block';
    el.className = 'status ' + type;
    if (type === 'success') {
        setTimeout(() => el.style.display = 'none', 3000);
    }
}

function resetCreateForm() {
    els.name.value = '';
    els.pass.value = '';
    els.description.value = '';
    els.img.value = '';
    els.stream.value = '';
    els.youtubeUrl.value = '';
    els.twitchUrl.value = '';
    els.instagramUrl.value = '';
    
    // Reset custom social links
    currentCustomSocialLinks = [];
    renderCustomSocialLinks();
    
    // Reset image crops
    imageCrops = {
        profile: { url: '', crop: null },
        banner: { url: '', crop: null },
        background: { url: '', crop: null }
    };
    
    currentImageType = 'profile';
    els.imageType.value = 'profile';
    els.cropCont.classList.remove('active');
    
    // Reset card style to frosted
    document.querySelectorAll('.card-style-option').forEach(o => o.classList.remove('active'));
    document.querySelector('.card-style-option[data-style="frosted"]').classList.add('active');
    els.customColorPicker.style.display = 'none';
    
    // Reset media cards
    currentMediaCards = [];
    
    // IMPORTANT: Render empty media cards to show the "+" button
    // We need to do this after a small delay to ensure the container is visible
    setTimeout(() => {
        renderMediaCards(true);
    }, 50);
    
    // Reset buttons
    els.create.style.display = 'block';
    els.update.style.display = 'none';
    els.createHeader.textContent = 'Create Profile';
    
    editingProfileId = null;
}

function loadProfileForEdit(profile) {
    els.name.value = profile.name;
    els.pass.value = ''; // Don't fill password
    els.description.value = profile.description || '';
    els.stream.value = profile.streamUrl || '';
    els.youtubeUrl.value = profile.youtubeUrl || '';
    els.twitchUrl.value = profile.twitchUrl || '';
    els.instagramUrl.value = profile.instagramUrl || '';
    
    // Load custom social links
    currentCustomSocialLinks = profile.customSocialLinks || [];
    renderCustomSocialLinks();
    
    // Load images
    imageCrops.profile = {
        url: profile.imageUrl || '',
        crop: profile.profileCrop || null
    };
    imageCrops.banner = {
        url: profile.bannerUrl || '',
        crop: profile.bannerCrop || null
    };
    imageCrops.background = {
        url: profile.backgroundUrl || '',
        crop: profile.backgroundCrop || null
    };
    
    // Set image type selector and load first available image
    if (imageCrops.profile.url) {
        currentImageType = 'profile';
        els.imageType.value = 'profile';
        els.img.value = imageCrops.profile.url;
        // Don't auto-show crop UI - user must click "Crop" button
    } else if (imageCrops.banner.url) {
        currentImageType = 'banner';
        els.imageType.value = 'banner';
        els.img.value = imageCrops.banner.url;
        // Don't auto-show crop UI - user must click "Crop" button
    }
    
    // Load card style
    const cardStyle = profile.cardStyle || 'frosted';
    document.querySelectorAll('.card-style-option').forEach(o => o.classList.remove('active'));
    document.querySelector(`.card-style-option[data-style="${cardStyle}"]`).classList.add('active');
    
    if (cardStyle === 'custom') {
        els.customColorPicker.style.display = 'block';
        els.cardColor.value = profile.cardColor || '#18181b';
        els.cardColorHex.value = profile.cardColor || '#18181b';
        els.cardColorGradient.value = profile.cardColorGradient || '#27272a';
        els.cardColorGradientHex.value = profile.cardColorGradient || '#27272a';
        els.fontColor.value = profile.fontColor || '#ffffff';
        els.fontColorHex.value = profile.fontColor || '#ffffff';
    } else {
        els.customColorPicker.style.display = 'none';
    }
    
    // Load media cards
    currentMediaCards = profile.mediaCards || [];
    
    // Switch buttons
    els.create.style.display = 'none';
    els.update.style.display = 'block';
    els.createHeader.textContent = 'Edit Profile';
    
    editingProfileId = currentUser.id;
}

// Stream embed URL converter
function getStreamEmbedUrl(url) {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtube.com/watch')) {
            videoId = new URL(url).searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Twitch
    if (url.includes('twitch.tv')) {
        const channel = url.split('twitch.tv/')[1].split('?')[0].split('/')[0];
        if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    }
    
    return null;
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    console.log('Browser navigation detected', event.state);
    
    if (event.state) {
        if (event.state.page === 'view' && event.state.profileId) {
            viewProfile(event.state.profileId, false);
        } else if (event.state.page === 'browse') {
            showPage('browse', null, false);
            loadAllProfiles();
        } else if (event.state.page === 'create') {
            showPage('create', null, false);
        }
    } else {
        // No state - handle URL hash
        handleUrlHash();
    }
});

// Handle initial URL hash on page load
function handleUrlHash() {
    const hash = window.location.hash.slice(1); // Remove #
    
    if (!hash || hash === 'browse') {
        showPage('browse', null, false);
        loadAllProfiles();
    } else if (hash === 'create') {
        showPage('create', null, false);
    } else if (hash.startsWith('profile/')) {
        const profileId = hash.split('/')[1];
        if (profileId) {
            viewProfile(profileId, false);
        }
    } else {
        // Unknown hash, default to browse
        showPage('browse', null, false);
        loadAllProfiles();
    }
}

// Set initial history state ONLY if there's no hash in URL
if (!window.history.state && !window.location.hash) {
    window.history.replaceState({ page: 'browse', profileId: null }, '', '#browse');
}

// Check URL on load - CALL IT IMMEDIATELY
handleUrlHash();

// Also handle URL hash changes manually (for links)
window.addEventListener('hashchange', handleUrlHash);

// ==================== URL-BASED PROFILE ACCESS ====================

// Allow direct profile access via URL parameter or hash
// Examples: ?profile=gist_id  or  #profile/gist_id  or  ?username=ProfileName
const urlParams = new URLSearchParams(window.location.search);
const profileParam = urlParams.get('profile');
const usernameParam = urlParams.get('username');

// Already handled by hash system above, but keeping for backwards compatibility
if (profileParam && !window.location.hash) {
    window.location.hash = `#profile/${profileParam}`;
} else if (usernameParam && !window.location.hash) {
    // Convert username to profile ID
    loadRegistry().then(() => {
        const profileId = registry[usernameParam];
        if (profileId) {
            window.location.hash = `#profile/${profileId}`;
        }
    });
}

// ==================== MEDIA CARDS FEATURE ====================

// Media search modal handlers
els.closeMediaModal.onclick = () => {
    els.mediaModal.classList.remove('active');
};

els.mediaModal.onclick = (e) => {
    if (e.target === els.mediaModal) {
        els.mediaModal.classList.remove('active');
    }
};

// ==================== IGDB/TWITCH API FOR GAMES ====================

// Get IGDB Access Token (Twitch OAuth)
async function getIGDBToken() {
    // Return cached token if still valid
    if (igdbAccessToken && Date.now() < igdbTokenExpiry) {
        console.log('✅ Using cached IGDB token');
        return igdbAccessToken;
    }
    
    console.log('🔑 Getting new IGDB token...');
    
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: IGDB_CLIENT_ID,
                client_secret: IGDB_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        
        console.log('📥 Token Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Token Error:', errorText);
            alert(`Failed to get IGDB token (${response.status}). Check credentials!`);
            return null;
        }
        
        const data = await response.json();
        igdbAccessToken = data.access_token;
        igdbTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1min before expiry
        
        console.log('✅ IGDB token obtained successfully!');
        console.log('Token expires in:', data.expires_in, 'seconds');
        return igdbAccessToken;
    } catch(e) {
        console.error('❌ IGDB token error:', e);
        alert('Failed to get IGDB token: ' + e.message);
        return null;
    }
}

// Search IGDB for games (via Cloudflare proxy)
async function searchIGDB(query) {
    try {
        console.log('🎮 Searching IGDB for:', query);
        console.log('📤 Using Cloudflare proxy...');
        
        const response = await fetch(`${API_URL}/igdb/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                client_id: IGDB_CLIENT_ID,
                client_secret: IGDB_CLIENT_SECRET
            })
        });
        
        console.log('📥 Proxy Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ IGDB Proxy Error:', errorText);
            alert(`IGDB Proxy Error (${response.status}): ${errorText.substring(0, 200)}`);
            return [];
        }
        
        const data = await response.json();
        console.log('✅ IGDB results:', data);
        return data || [];
    } catch(e) {
        console.error('❌ IGDB search error:', e);
        alert('IGDB Search failed. Make sure Cloudflare Worker has /igdb/search endpoint!\n\nError: ' + e.message);
        return [];
    }
}

// Media search (TMDB + IGDB)
els.mediaSearchBtn.onclick = async () => {
    const query = els.mediaSearchInput.value.trim();
    const mediaType = els.mediaTypeSelect.value; // 'movie', 'tv', or 'game'
    
    if (!query) {
        showStatus(els.mediaStatus, 'error', 'Please enter a search query');
        return;
    }
    
    try {
        showStatus(els.mediaStatus, 'loading', 'Searching...');
        
        let results = [];
        
        // Search based on type
        if (mediaType === 'game') {
            // IGDB/Twitch Games
            results = await searchIGDB(query);
            
            if (results.length === 0) {
                els.mediaSearchResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No games found</div>';
                showStatus(els.mediaStatus, 'error', 'No results found');
                return;
            }
            
            // Display game results
            els.mediaSearchResults.innerHTML = '';
            
            results.slice(0, 12).forEach(game => {
                // Get cover image URL (IGDB uses special format)
                let coverUrl = '';
                if (game.cover && game.cover.url) {
                    // Replace thumbnail with bigger image
                    coverUrl = game.cover.url.replace('t_thumb', 't_cover_big');
                    // Ensure https
                    if (coverUrl.startsWith('//')) {
                        coverUrl = 'https:' + coverUrl;
                    }
                }
                
                if (!coverUrl) return; // Skip games without cover
                
                const releaseYear = game.first_release_date 
                    ? new Date(game.first_release_date * 1000).getFullYear() 
                    : '';
                
                const card = document.createElement('div');
                card.className = 'media-search-result';
                card.innerHTML = `
                    <img src="${coverUrl}" alt="${game.name}">
                    <div class="media-search-result-info">
                        <div class="media-search-result-title">${game.name}</div>
                        <div class="media-search-result-year">${releaseYear || 'TBA'}</div>
                    </div>
                `;
                
                card.onclick = () => {
                    addMediaCard({
                        id: `game_${game.id}`,
                        title: game.name,
                        year: releaseYear || '',
                        rating: game.rating ? (game.rating / 10).toFixed(1) : 0,
                        image: coverUrl,
                        type: 'game'
                    });
                };
                
                els.mediaSearchResults.appendChild(card);
            });
            
            showStatus(els.mediaStatus, 'success', `Found ${results.length} games`);
            setTimeout(() => els.mediaStatus.style.display = 'none', 2000);
            
        } else {
            // TMDB Movies/TV
            const response = await fetch(
                `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
            );
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            
            if (data.results.length === 0) {
                els.mediaSearchResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No results found</div>';
                showStatus(els.mediaStatus, 'error', 'No results found');
                return;
            }
            
            // Display results
            els.mediaSearchResults.innerHTML = '';
            
            data.results.slice(0, 12).forEach(item => {
                if (!item.poster_path) return; // Skip items without poster
                
                const card = document.createElement('div');
                card.className = 'media-search-result';
                card.innerHTML = `
                    <img src="${TMDB_IMAGE_BASE}${item.poster_path}" alt="${item.title || item.name}">
                    <div class="media-search-result-info">
                        <div class="media-search-result-title">${item.title || item.name}</div>
                        <div class="media-search-result-year">${(item.release_date || item.first_air_date || '').substring(0, 4)}</div>
                    </div>
                `;
                
                card.onclick = () => {
                    addMediaCard({
                        id: `${mediaType}_${item.id}`,
                        title: item.title || item.name,
                        year: (item.release_date || item.first_air_date || '').substring(0, 4),
                        rating: item.vote_average || 0,
                        image: `${TMDB_IMAGE_BASE}${item.poster_path}`,
                        type: mediaType
                    });
                };
                
                els.mediaSearchResults.appendChild(card);
            });
            
            showStatus(els.mediaStatus, 'success', `Found ${data.results.length} results`);
            setTimeout(() => els.mediaStatus.style.display = 'none', 2000);
        }
        
    } catch (error) {
        console.error('Media search error:', error);
        showStatus(els.mediaStatus, 'error', 'Search failed');
    }
};

// Add media card
function addMediaCard(media) {
    // Check if already added
    if (currentMediaCards.some(card => card.id === media.id)) {
        showStatus(els.mediaStatus, 'error', 'Already added!');
        return;
    }
    
    // Check limit
    if (currentMediaCards.length >= 12) {
        showStatus(els.mediaStatus, 'error', 'Maximum 12 cards reached!');
        return;
    }
    
    currentMediaCards.push(media);
    renderMediaCards(true); // true = editing mode
    
    // Close modal
    els.mediaModal.classList.remove('active');
    showStatus(els.mediaStatus, 'success', 'Added!');
}

// Remove media card
function removeMediaCard(mediaId) {
    currentMediaCards = currentMediaCards.filter(card => card.id !== mediaId);
    renderMediaCards(true); // true = editing mode
}

// Render media cards
function renderMediaCards(isEditMode) {
    // Determine which container to use
    const isOnCreatePage = pages.create.classList.contains('active');
    const container = isOnCreatePage ? els.editMediaCardsContainer : els.mediaCardsContainer;
    
    console.log('Rendering media cards:', {
        isEditMode: isEditMode,
        isOnCreatePage: isOnCreatePage,
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
        
        // Handle rating as both number and string (for backward compatibility)
        const rating = typeof card.rating === 'number' ? card.rating : parseFloat(card.rating) || 0;
        
        cardEl.innerHTML = `
            <img src="${card.image}" alt="${card.title}">
            ${isEditMode || isOnCreatePage ? '<div class="media-card-remove">×</div>' : ''}
            <div class="media-card-overlay">
                <div class="media-card-title">${card.title}</div>
                <div class="media-card-year">${card.year}</div>
                <div class="media-card-rating">⭐ ${rating.toFixed(1)}</div>
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

// ==================== CUSTOM SOCIAL LINKS ====================

// Render custom social links in edit mode
function renderCustomSocialLinks() {
    const container = els.customSocialLinksContainer;
    if (!container) return;
    
    container.innerHTML = '';
    
    // Add existing links
    currentCustomSocialLinks.forEach((link, index) => {
        const item = document.createElement('div');
        item.className = 'custom-social-item';
        
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${extractDomain(link.url)}&sz=64`;
        
        item.innerHTML = `
            <img src="${faviconUrl}" alt="icon" onerror="this.style.display='none'">
            <div class="custom-social-item-text">${link.name || extractDomain(link.url)}</div>
            <div class="custom-social-item-remove">×</div>
        `;
        
        const removeBtn = item.querySelector('.custom-social-item-remove');
        removeBtn.onclick = () => removeCustomSocialLink(index);
        
        container.appendChild(item);
    });
    
    // Add "+" button
    const addBtn = document.createElement('div');
    addBtn.className = 'add-custom-social-btn';
    addBtn.innerHTML = '<span style="font-size: 20px;">+</span> Add Social Link';
    addBtn.onclick = () => {
        els.customSocialModal.classList.add('active');
        els.customSocialUrl.value = '';
        els.customSocialName.value = '';
    };
    
    container.appendChild(addBtn);
}

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return url;
    }
}

// Add custom social link
function addCustomSocialLink() {
    const url = els.customSocialUrl.value.trim();
    const name = els.customSocialName.value.trim();
    
    if (!url) {
        showStatus(els.customSocialStatus, 'error', 'URL is required!');
        return;
    }
    
    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        showStatus(els.customSocialStatus, 'error', 'Invalid URL!');
        return;
    }
    
    // Check limit
    if (currentCustomSocialLinks.length >= 10) {
        showStatus(els.customSocialStatus, 'error', 'Maximum 10 links allowed!');
        return;
    }
    
    // Add link
    currentCustomSocialLinks.push({
        url: url,
        name: name || extractDomain(url)
    });
    
    renderCustomSocialLinks();
    els.customSocialModal.classList.remove('active');
    showStatus(els.customSocialStatus, 'success', 'Link added!');
    setTimeout(() => els.customSocialStatus.style.display = 'none', 2000);
}

// Remove custom social link
function removeCustomSocialLink(index) {
    currentCustomSocialLinks.splice(index, 1);
    renderCustomSocialLinks();
}

// Custom social modal handlers
els.closeCustomSocialModal.onclick = () => els.customSocialModal.classList.remove('active');
els.customSocialModal.onclick = (e) => {
    if (e.target === els.customSocialModal) els.customSocialModal.classList.remove('active');
};
els.addCustomSocialBtn.onclick = addCustomSocialLink;
els.customSocialUrl.onkeypress = (e) => {
    if (e.key === 'Enter') addCustomSocialLink();
};


// ==================== WHAT'S NEW SIDEBAR ====================
async function loadWhatsNew() {
    const whatsNewContent = document.getElementById('whatsNewContent');
    if (!whatsNewContent) return;
    
    // Check if on mobile/tablet (hide sidebar)
    if (window.innerWidth <= 1200) {
        return;
    }
    
    try {
        // Fetch the What's New gist
        const response = await fetch('https://api.github.com/gists/3372c722a7f69ad6c62e0a4b2b3a878d');
        
        if (!response.ok) {
            throw new Error('Failed to fetch What\'s New');
        }
        
        const gist = await response.json();
        
        // Get the content from any file in the gist (support any filename)
        let markdownContent = '';
        const files = Object.keys(gist.files);
        
        if (files.length > 0) {
            // Use the first file found
            const firstFile = files[0];
            markdownContent = gist.files[firstFile].content;
            console.log(`✅ Loaded What's New from: ${firstFile}`);
        } else {
            throw new Error('No files found in gist');
        }
        
        // Simple markdown to HTML converter
        const htmlContent = simpleMarkdownToHTML(markdownContent);
        
        whatsNewContent.innerHTML = htmlContent;
        
        console.log('✅ What\'s New loaded successfully');
        
    } catch (error) {
        console.error('Failed to load What\'s New:', error);
        whatsNewContent.innerHTML = `
            <div style="text-align:center; padding:20px; color:#999; font-size: 13px;">
                Failed to load updates.<br>
                <a href="https://gist.github.com/ParsyDev/3372c722a7f69ad6c62e0a4b2b3a878d" target="_blank" style="color: var(--accent-primary); text-decoration: underline; margin-top: 8px; display: inline-block;">View on GitHub</a>
            </div>
        `;
    }
}

// Simple markdown to HTML converter
function simpleMarkdownToHTML(markdown) {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>'); // Treat # as h2
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code inline
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');
    
    // Lists (simple)
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Line breaks to paragraphs
    const lines = html.split('\n');
    let inList = false;
    let result = [];
    let currentParagraph = '';
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines
        if (!line) {
            if (currentParagraph && !inList) {
                result.push('<p>' + currentParagraph + '</p>');
                currentParagraph = '';
            }
            continue;
        }
        
        // Check if it's a header, list, or hr
        if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('</ul') || 
            line.startsWith('<hr') || line.startsWith('<li')) {
            if (currentParagraph) {
                result.push('<p>' + currentParagraph + '</p>');
                currentParagraph = '';
            }
            result.push(line);
            inList = line.startsWith('<ul') || (inList && !line.startsWith('</ul'));
        } else {
            // Regular text
            if (!inList) {
                if (currentParagraph) {
                    currentParagraph += ' ' + line;
                } else {
                    currentParagraph = line;
                }
            } else {
                result.push(line);
            }
        }
    }
    
    // Add any remaining paragraph
    if (currentParagraph) {
        result.push('<p>' + currentParagraph + '</p>');
    }
    
    return result.join('\n');
}

// Reload What's New when window is resized
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const whatsNewSidebar = document.getElementById('whatsNewSidebar');
        if (whatsNewSidebar) {
            if (window.innerWidth > 1200 && !whatsNewSidebar.querySelector('.whats-new-content').innerHTML.includes('What')) {
                loadWhatsNew();
            }
        }
    }, 250);
});