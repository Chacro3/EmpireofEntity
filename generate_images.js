// Generate placeholder images for game assets
const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to create a directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Create basic placeholder image
function createPlaceholder(width, height, text, bgColor, textColor, filename) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Add text
    ctx.fillStyle = textColor;
    ctx.font = Math.floor(height / 10) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    // Write to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`Created: ${filename}`);
}

// Main function to generate all placeholder images
function generateImages() {
    // Ensure directories exist
    ensureDirectoryExists('assets');
    ensureDirectoryExists('assets/ui');
    ensureDirectoryExists('assets/ui/icons');
    ensureDirectoryExists('assets/ui/portraits');
    
    // Create logo
    createPlaceholder(400, 200, 'Game Logo', '#333', '#ffd700', 'assets/logo.png');
    
    // Create background
    createPlaceholder(800, 600, 'Game Background', '#000033', '#ffffff', 'assets/background.jpg');
    
    // Create UI icons
    createPlaceholder(64, 64, 'A', '#b33', '#ffffff', 'assets/ui/icons/attack.png');
    createPlaceholder(64, 64, 'M', '#33b', '#ffffff', 'assets/ui/icons/move.png');
    createPlaceholder(64, 64, 'B', '#3b3', '#ffffff', 'assets/ui/icons/build.png');
    
    // Create unit portraits
    createPlaceholder(128, 128, 'Units', '#444', '#ffffff', 'assets/ui/portraits/mixed_units.png');
    createPlaceholder(128, 128, 'Villager', '#555', '#ffffff', 'assets/ui/portraits/villager.png');
    
    console.log('All placeholder images created successfully!');
}

// Check if canvas is available, otherwise provide manual instructions
try {
    require.resolve('canvas');
    generateImages();
} catch (e) {
    console.error('The "canvas" package is not installed. Try using the HTML generator instead.');
    console.log('Generated create_placeholder_images.html - please open this file in a browser and use it to generate images.');
} 