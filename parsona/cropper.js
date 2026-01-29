// New Crop System - Modern drag-to-crop interface
// This replaces the old slider-based system

class ImageCropper {
    constructor() {
        this.canvas = document.getElementById('cropCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('cropOverlay');
        this.cropBox = document.getElementById('cropBox');
        this.image = new Image();
        this.imageLoaded = false;
        this.loadAttempts = 0;
        this.maxLoadAttempts = 3;
        
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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Support both mouse and touch events
        
        // Mouse down on crop box (start dragging)
        this.cropBox.addEventListener('mousedown', (e) => this.handleStart(e, false));
        this.cropBox.addEventListener('touchstart', (e) => this.handleStart(e, true));
        
        // Mouse/touch move (dragging or resizing)
        document.addEventListener('mousemove', (e) => this.handleMove(e, false));
        document.addEventListener('touchmove', (e) => this.handleMove(e, true), { passive: false });
        
        // Mouse/touch up (stop dragging/resizing)
        document.addEventListener('mouseup', () => this.handleEnd());
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
            return; // Don't handle if not on crop elements
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
        
        const moveEvent = {
            clientX: clientX,
            clientY: clientY
        };
        
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
    
    loadImage(url) {
        // Cancel any previous load attempts
        if (this.image) {
            this.image.onload = null;
            this.image.onerror = null;
            this.image.src = ''; // Clear source
        }
        
        this.imageLoaded = false;
        this.loadAttempts = 0;
        this.currentLoadUrl = url; // Track which URL we're loading
        this.attemptLoadImage(url);
    }
    
    attemptLoadImage(url) {
        // Check if this is still the URL we want to load
        if (this.currentLoadUrl !== url) {
            console.log('Load cancelled - different URL requested');
            return;
        }
        
        this.image.crossOrigin = "anonymous";
        
        this.image.onload = () => {
            // Double-check we're still loading the right URL
            if (this.currentLoadUrl !== url) {
                console.log('Image loaded but URL changed, ignoring');
                return;
            }
            
            console.log('✅ Image loaded successfully:', url);
            this.imageLoaded = true;
            this.loadAttempts = 0;
            this.drawImage();
            this.initializeCropBox();
        };
        
        this.image.onerror = () => {
            // Check if this is still the URL we want to load
            if (this.currentLoadUrl !== url) {
                console.log('Error ignored - different URL requested');
                return;
            }
            
            this.loadAttempts++;
            console.error(`Failed to load image (attempt ${this.loadAttempts}/${this.maxLoadAttempts})`);
            
            if (this.loadAttempts < this.maxLoadAttempts) {
                // Retry after a short delay
                console.log('Retrying image load...');
                setTimeout(() => {
                    // Only retry if URL hasn't changed
                    if (this.currentLoadUrl === url) {
                        this.image.src = url;
                    }
                }, 500 * this.loadAttempts);
            } else {
                // Only show error after all attempts failed
                console.error('❌ All image load attempts failed for:', url);
                this.imageLoaded = false;
                
                // Hide crop container on error
                const cropContainer = document.getElementById('cropContainer');
                if (cropContainer) {
                    cropContainer.classList.remove('active');
                }
                
                alert('Failed to load image. Please check:\n\n1. The URL is correct and publicly accessible\n2. Image format is supported (jpg, png, gif, webp)\n3. CORS is enabled on the image host\n\nTry using: imgur.com, imgbb.com, or i.ibb.co');
            }
        };
        
        // Set src to trigger load
        this.image.src = url;
    }
    
    drawImage() {
        // Set canvas size to match image
        const maxWidth = 600;
        let width = this.image.width;
        let height = this.image.height;
        
        // Scale down if too large
        if (width > maxWidth) {
            height = (height / width) * maxWidth;
            width = maxWidth;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.overlay.style.width = width + 'px';
        this.overlay.style.height = height + 'px';
        
        // Draw image on canvas
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(this.image, 0, 0, width, height);
        
        // Store scale for crop data calculation
        this.scale = width / this.image.width;
    }
    
    initializeCropBox() {
        const currentImageType = document.getElementById('imageType').value;
        
        // Set initial crop box based on image type
        if (currentImageType === 'profile') {
            // Square crop for profile picture
            const size = Math.min(this.canvas.width, this.canvas.height) * 0.6;
            this.cropData = {
                x: (this.canvas.width - size) / 2,
                y: (this.canvas.height - size) / 2,
                width: size,
                height: size
            };
        } else if (currentImageType === 'banner') {
            // Wide crop for banner
            this.cropData = {
                x: 0,
                y: this.canvas.height * 0.2,
                width: this.canvas.width,
                height: this.canvas.height * 0.4
            };
        }
        
        this.updateCropBoxUI();
    }
    
    updateCropBoxUI() {
        this.cropBox.style.left = this.cropData.x + 'px';
        this.cropBox.style.top = this.cropData.y + 'px';
        this.cropBox.style.width = this.cropData.width + 'px';
        this.cropBox.style.height = this.cropData.height + 'px';
    }
    
    moveCropBox(e) {
        const rect = this.overlay.getBoundingClientRect();
        let newX = e.clientX - rect.left - this.dragStart.x;
        let newY = e.clientY - rect.top - this.dragStart.y;
        
        // Keep crop box within canvas bounds
        newX = Math.max(0, Math.min(newX, this.canvas.width - this.cropData.width));
        newY = Math.max(0, Math.min(newY, this.canvas.height - this.cropData.height));
        
        this.cropData.x = newX;
        this.cropData.y = newY;
        this.updateCropBoxUI();
    }
    
    resizeCropBox(e) {
        const rect = this.overlay.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const handle = this.resizeHandle.className.split(' ')[1];
        
        if (handle === 'top-left') {
            const newWidth = this.cropData.x + this.cropData.width - mouseX;
            const newHeight = this.cropData.y + this.cropData.height - mouseY;
            if (newWidth > 50 && newHeight > 50) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
                this.cropData.x = mouseX;
                this.cropData.y = mouseY;
            }
        } else if (handle === 'top-right') {
            const newWidth = mouseX - this.cropData.x;
            const newHeight = this.cropData.y + this.cropData.height - mouseY;
            if (newWidth > 50 && newHeight > 50) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
                this.cropData.y = mouseY;
            }
        } else if (handle === 'bottom-left') {
            const newWidth = this.cropData.x + this.cropData.width - mouseX;
            const newHeight = mouseY - this.cropData.y;
            if (newWidth > 50 && newHeight > 50) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
                this.cropData.x = mouseX;
            }
        } else if (handle === 'bottom-right') {
            const newWidth = mouseX - this.cropData.x;
            const newHeight = mouseY - this.cropData.y;
            if (newWidth > 50 && newHeight > 50) {
                this.cropData.width = newWidth;
                this.cropData.height = newHeight;
            }
        }
        
        this.updateCropBoxUI();
    }
    
    getCropData() {
        // Return crop data as percentage of original image
        return {
            x: (this.cropData.x / this.scale) / this.image.width,
            y: (this.cropData.y / this.scale) / this.image.height,
            width: (this.cropData.width / this.scale) / this.image.width,
            height: (this.cropData.height / this.scale) / this.image.height
        };
    }
    
    applyCropData(cropData) {
        // Apply saved crop data (as percentage)
        if (this.imageLoaded && cropData) {
            this.cropData = {
                x: cropData.x * this.image.width * this.scale,
                y: cropData.y * this.image.height * this.scale,
                width: cropData.width * this.image.width * this.scale,
                height: cropData.height * this.image.height * this.scale
            };
            this.updateCropBoxUI();
        }
    }
}

// Global cropper instance
let cropper = new ImageCropper();

// Add mobile viewport optimization
if ('ontouchstart' in window) {
    console.log('Touch device detected - mobile optimization enabled');
}
