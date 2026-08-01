const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function fixFilesInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixFilesInDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.JS')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('gemini-3.5-flash')) {
                content = content.replace(/gemini-3\.5-flash/g, 'gemini-flash-latest');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Fixed', fullPath);
            }
        }
    }
}

fixFilesInDir(directoryPath);
console.log('Done!');
