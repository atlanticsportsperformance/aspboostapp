const fs = require('fs');
const filePath = 'components/dashboard/athletes/athlete-hitting-profile-tab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix duplicate sm: classes
content = content.replace(/text-lg sm:text-lg sm:text-2xl/g, 'text-lg sm:text-2xl');
content = content.replace(/text-sm sm:text-sm sm:text-lg/g, 'text-sm sm:text-lg');

// Fix arrow sizes for Cards 3-8 (they need responsive sizing)
const lines = content.split('\n');
let inCard3Plus = false;
let cardNum = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('/* Card')) {
    const match = lines[i].match(/Card (\d+)/);
    if (match) cardNum = parseInt(match[1]);
  }

  // Fix arrow SVG sizes for cards 3-8
  if (cardNum >= 3 && lines[i].includes('className="w-6 h-6" fill="none"')) {
    lines[i] = lines[i].replace('className="w-6 h-6" fill="none"', 'className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" fill="none"');
  }

  // Fix gap-2 in flex containers for cards 3-8
  if (cardNum >= 3 && lines[i].includes('gap-2 ${')) {
    lines[i] = lines[i].replace('gap-2 ${', 'gap-1 sm:gap-2 ${');
  }
}

content = lines.join('\n');

fs.writeFileSync(filePath, content);
console.log('✓ Fixed duplicate classes and responsive sizing');
