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
        // Mouse down on crop box (start dragging)
        this.cropBox.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('crop-handle')) {
                this.isResizing = true;
                this.resizeHandle = e.target;
            } else {
                this.isDragging = true;
            }
            this.dragStart = {
                x: e.clientX - this.cropBox.offsetLeft,
                y: e.clientY - this.cropBox.offsetTop
            };
            e.preventDefault();
        });
        
        // Mouse move (dragging or resizing)
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.moveCropBox(e);
            } else if (this.isResizing) {
                this.resizeCropBox(e);
            }
        });
        
        // Mouse up (stop dragging/resizing)
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isResizing = false;
            this.resizeHandle = null;
        });
    }
    
    loadImage(url) {
        this.image.crossOrigin = "anonymous";
        this.image.onload = () => {
            this.imageLoaded = true;
            this.drawImage();
            this.initializeCropBox();
        };
        this.image.onerror = () => {
            console.error('Failed to load image');
            alert('Failed to load image. Make sure the URL is correct and publicly accessible.');
        };
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
