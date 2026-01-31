// Simple Visual Cropper - FINAL VERSION
// Shows images as CSS backgrounds - NO CORS ISSUES!

class ImageCropper {
    constructor() {
        this.canvas = document.getElementById('cropCanvas');
        this.overlay = document.getElementById('cropOverlay');
        this.cropBox = document.getElementById('cropBox');
        this.imageLoaded = false;
        this.currentUrl = null;
        this.imageWidth = 600;
        this.imageHeight = 400;
        
        // Crop box state
        this.cropData = {
            x: 0,
            y: 0,
            width: 200,
            height: 200
        };
        
        // Drag state
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.resizeHandle = null;
        
        // Hide canvas, we'll use the parent wrapper for display
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        
        // Setup overlay to show backgrounds
        if (this.overlay) {
            this.overlay.style.position = 'relative';  // Changed from absolute
            this.overlay.style.width = '600px';
            this.overlay.style.height = '400px';
            this.overlay.style.pointerEvents = 'none';
        }
        
        this.setupEventListeners();
        console.log('🎨 Simple Visual Cropper initialized');
    }
    
    setupEventListeners() {
        if (!this.cropBox) {
            console.error('❌ Crop box element not found!');
            return;
        }
        
        // Mouse events
        this.cropBox.addEventListener('mousedown', (e) => this.handleStart(e, false));
        document.addEventListener('mousemove', (e) => this.handleMove(e, false));
        document.addEventListener('mouseup', () => this.handleEnd());
        
        // Touch events
        this.cropBox.addEventListener('touchstart', (e) => this.handleStart(e, true));
        document.addEventListener('touchmove', (e) => this.handleMove(e, true), { passive: false });
        document.addEventListener('touchend', () => this.handleEnd());
        document.addEventListener('touchcancel', () => this.handleEnd());
    }
    
    handleStart(e, isTouch) {
        const target = isTouch ? document.elementFromPoint(
            e.touches[0].clientX, 
            e.touches[0].clientY
        ) : e.target;
        
        if (target && target.classList.contains('crop-handle')) {
            this.isResizing = true;
            this.resizeHandle = target;
        } else if (target && target.classList.contains('crop-box')) {
            this.isDragging = true;
        } else {
            return;
        }
        
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        this.dragStart = {
            x: clientX - this.cropBox.offsetLeft,
            y: clientY - this.cropBox.offsetTop
        };
        
        e.preventDefault();
    }
    
    handleMove(e, isTouch) {
        if (!this.isDragging && !this.isResizing) return;
        
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        const moveEvent = { clientX, clientY };
        
        if (this.isDragging) {
            this.moveCropBox(moveEvent);
        } else if (this.isResizing) {
            this.resizeCropBox(moveEvent);
        }
        
        if (isTouch) {
            e.preventDefault();
        }
    }
    
    handleEnd() {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
    }
    
    // Load image - pure CSS, NO CORS!
    async loadImage(url) {
        url = url.trim();
        if (!url) {
            alert('⚠️ Please enter an image URL');
            return false;
        }
        
        console.log('📸 Loading image:', url);
        this.currentUrl = url;
        
        // Show loading message
        this.showLoading();
        
        // Get image dimensions
        const dimensions = await this.getImageDimensions(url);
        
        this.hideLoading();
        
        if (!dimensions) {
            alert('⚠️ Could not load image.\n\nPlease check:\n• URL is correct\n• Image is publicly accessible\n• Image format is supported (jpg, png, gif, webp)');
            return false;
        }
        
        this.imageWidth = dimensions.width;
        this.imageHeight = dimensions.height;
        
        console.log('📏 Image dimensions:', this.imageWidth, 'x', this.imageHeight);
        
        // Display image
        this.displayImage(url);
        
        // Initialize crop box
        this.initializeCropBox();
        
        this.imageLoaded = true;
        console.log('✅ Image loaded and displayed!');
        
        return true;
    }
    
    showLoading() {
        if (!this.overlay) return;
        
        // Remove existing
        const existing = this.overlay.querySelector('.loading-message');
        if (existing) existing.remove();
        
        const loading = document.createElement('div');
        loading.className = 'loading-message';
        loading.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            pointer-events: all;
        `;
        loading.textContent = '⏳ Loading image...';
        this.overlay.appendChild(loading);
    }
    
    hideLoading() {
        if (!this.overlay) return;
        const loading = this.overlay.querySelector('.loading-message');
        if (loading) loading.remove();
    }
    
    // Get image dimensions without CORS
    async getImageDimensions(url) {
        return new Promise((resolve) => {
            const img = new Image();
            
            // NO crossOrigin! This is the key!
            
            const timeout = setTimeout(() => {
                console.error('⏱️ Image load timeout');
                resolve(null);
            }, 10000); // 10 second timeout
            
            img.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Got dimensions:', img.width, 'x', img.height);
                resolve({ width: img.width, height: img.height });
            };
            
            img.onerror = (e) => {
                clearTimeout(timeout);
                console.error('❌ Image load error:', e);
                resolve(null);
            };
            
            img.src = url;
        });
    }
    
    // Display image as CSS background
    displayImage(url) {
        if (!this.overlay) {
            console.error('❌ Overlay element not found!');
            return;
        }
        
        const maxWidth = 600;
        const maxHeight = 600;
        
        let width = this.imageWidth;
        let height = this.imageHeight;
        
        // Scale down if too large
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
        }
        
        // Set overlay size and background
        this.overlay.style.width = width + 'px';
        this.overlay.style.height = height + 'px';
        this.overlay.style.backgroundImage = `url("${url}")`;
        this.overlay.style.backgroundSize = 'contain';
        this.overlay.style.backgroundPosition = 'center';
        this.overlay.style.backgroundRepeat = 'no-repeat';
        this.overlay.style.backgroundColor = '#1a1a1a';
        this.overlay.style.border = '2px solid #333';
        this.overlay.style.borderRadius = '8px';
        
        // Store display info
        this.scale = width / this.imageWidth;
        this.displayWidth = width;
        this.displayHeight = height;
        
        console.log('🖼️ Image displayed:', {
            displaySize: `${width}x${height}`,
            originalSize: `${this.imageWidth}x${this.imageHeight}`,
            scale: this.scale
        });
    }
    
    initializeCropBox() {
        const currentImageType = document.getElementById('imageType')?.value || 'profile';
        
        console.log('📐 Initializing crop box for:', currentImageType);
        
        if (currentImageType === 'profile') {
            // Square crop
            const size = Math.min(this.displayWidth, this.displayHeight) * 0.6;
            this.cropData = {
                x: (this.displayWidth - size) / 2,
                y: (this.displayHeight - size) / 2,
                width: size,
                height: size
            };
        } else if (currentImageType === 'banner') {
            // Wide crop (16:9)
            const width = this.displayWidth * 0.9;
            const height = width / (16/9);
            this.cropData = {
                x: this.displayWidth * 0.05,
                y: (this.displayHeight - height) / 2,
                width: width,
                height: Math.min(height, this.displayHeight * 0.8)
            };
        } else {
            // Full area
            this.cropData = {
                x: 0,
                y: 0,
                width: this.displayWidth,
                height: this.displayHeight
            };
        }
        
        this.updateCropBoxUI();
    }
    
    updateCropBoxUI() {
        if (!this.cropBox) return;
        
        this.cropBox.style.left = this.cropData.x + 'px';
        this.cropBox.style.top = this.cropData.y + 'px';
        this.cropBox.style.width = this.cropData.width + 'px';
        this.cropBox.style.height = this.cropData.height + 'px';
        
        console.log('📐 Crop box updated:', this.cropData);
    }
    
    moveCropBox(e) {
        const rect = this.overlay.getBoundingClientRect();
        let newX = e.clientX - rect.left - this.dragStart.x;
        let newY = e.clientY - rect.top - this.dragStart.y;
        
        newX = Math.max(0, Math.min(newX, this.displayWidth - this.cropData.width));
        newY = Math.max(0, Math.min(newY, this.displayHeight - this.cropData.height));
        
        this.cropData.x = newX;
        this.cropData.y = newY;
        this.updateCropBoxUI();
    }
    
    resizeCropBox(e) {
        const rect = this.overlay.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const handle = this.resizeHandle.className.split(' ')[1];
        const minSize = 50;
        
        if (handle === 'top-left') {
            const newWidth = this.cropData.x + this.cropData.width - mouseX;
            const newHeight = this.cropData.y + this.cropData.height - mouseY;
            
            if (newWidth > minSize && newHeight > minSize && mouseX >= 0 && mouseY >= 0) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
                this.cropData.x = mouseX;
                this.cropData.y = mouseY;
            }
        } else if (handle === 'top-right') {
            const newWidth = mouseX - this.cropData.x;
            const newHeight = this.cropData.y + this.cropData.height - mouseY;
            
            if (newWidth > minSize && newHeight > minSize && 
                this.cropData.x + newWidth <= this.displayWidth && mouseY >= 0) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
                this.cropData.y = mouseY;
            }
        } else if (handle === 'bottom-left') {
            const newWidth = this.cropData.x + this.cropData.width - mouseX;
            const newHeight = mouseY - this.cropData.y;
            
            if (newWidth > minSize && newHeight > minSize && mouseX >= 0 &&
                this.cropData.y + newHeight <= this.displayHeight) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
                this.cropData.x = mouseX;
            }
        } else if (handle === 'bottom-right') {
            const newWidth = mouseX - this.cropData.x;
            const newHeight = mouseY - this.cropData.y;
            
            if (newWidth > minSize && newHeight > minSize &&
                this.cropData.x + newWidth <= this.displayWidth &&
                this.cropData.y + newHeight <= this.displayHeight) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
            }
        }
        
        this.updateCropBoxUI();
    }
    
    getCropData() {
        if (!this.imageLoaded) {
            console.warn('⚠️ No image loaded');
            return null;
        }
        
        // Convert to percentages
        const cropPercentage = {
            x: (this.cropData.x / this.scale) / this.imageWidth,
            y: (this.cropData.y / this.scale) / this.imageHeight,
            width: (this.cropData.width / this.scale) / this.imageWidth,
            height: (this.cropData.height / this.scale) / this.imageHeight
        };
        
        console.log('📐 Crop data (percentage):', cropPercentage);
        return cropPercentage;
    }
    
    applyCropData(cropData) {
        if (!this.imageLoaded || !cropData) return;
        
        this.cropData = {
            x: cropData.x * this.imageWidth * this.scale,
            y: cropData.y * this.imageHeight * this.scale,
            width: cropData.width * this.imageWidth * this.scale,
            height: cropData.height * this.imageHeight * this.scale
        };
        
        this.updateCropBoxUI();
        console.log('📐 Crop applied:', cropData);
    }
}

// Create global instance
let cropper = new ImageCropper();

console.log('✅ Simple Visual Cropper loaded! NO CORS issues!');
