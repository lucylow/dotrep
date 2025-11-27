const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const readmePath = 'README.md';
const outputDir = 'docs/images';
const readmeContent = fs.readFileSync(readmePath, 'utf8');

// Extract all mermaid code blocks
const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
const diagrams = [];
let match;
let index = 0;

while ((match = mermaidRegex.exec(readmeContent)) !== null) {
  const diagramContent = match[1];
  const diagramName = getDiagramName(diagramContent, index);
  diagrams.push({
    name: diagramName,
    content: diagramContent,
    fullMatch: match[0],
    index: index++
  });
}

function getDiagramName(content, index) {
  // Try to extract a meaningful name from the diagram
  if (content.includes('graph TB') || content.includes('graph TD')) {
    if (content.includes('Data Sources')) return 'architecture-diagram';
    if (content.includes('Raw Data')) return 'knowledge-asset-lifecycle';
  }
  if (content.includes('sequenceDiagram')) {
    if (content.includes('Knowledge Asset Publishing')) return 'data-flow-diagram';
    if (content.includes('MCP Agent')) return 'mcp-agent-interaction-flow';
    if (content.includes('x402 Payment')) return 'x402-payment-flow-diagram';
  }
  return `diagram-${index + 1}`;
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert each diagram
diagrams.forEach((diagram, idx) => {
  const tempMmdPath = path.join(outputDir, `${diagram.name}.mmd`);
  const tempPngPath = path.join(outputDir, `${diagram.name}.png`);
  const outputJpgPath = path.join(outputDir, `${diagram.name}.jpg`);
  
  // Write temporary .mmd file
  fs.writeFileSync(tempMmdPath, diagram.content, 'utf8');
  
  try {
    // Convert to PNG first using mmdc
    console.log(`Converting ${diagram.name}...`);
    // Use absolute paths for Windows compatibility
    const absInput = path.resolve(tempMmdPath);
    const absPngOutput = path.resolve(tempPngPath);
    execSync(`npx mmdc -i "${absInput}" -o "${absPngOutput}" -b transparent -w 1920 -H 1080`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true
    });
    
    // Convert PNG to JPEG using sharp (if available) or ImageMagick
    try {
      // Try using sharp (faster, Node.js native)
      const sharp = require('sharp');
      sharp(absPngOutput)
        .jpeg({ quality: 90 })
        .toFile(absPngOutput.replace('.png', '.jpg'))
        .then(() => {
          // Clean up PNG
          if (fs.existsSync(absPngOutput)) {
            fs.unlinkSync(absPngOutput);
          }
          console.log(`✓ Created ${outputJpgPath}`);
        })
        .catch(err => {
          console.error(`Error converting PNG to JPEG: ${err.message}`);
          // Fallback: keep PNG and rename
          console.log(`Keeping PNG version: ${tempPngPath}`);
        });
    } catch (sharpError) {
      // Sharp not available, try ImageMagick
      try {
        execSync(`magick "${absPngOutput}" -quality 90 "${path.resolve(outputJpgPath)}"`, {
          stdio: 'inherit',
          shell: true
        });
        // Clean up PNG
        if (fs.existsSync(absPngOutput)) {
          fs.unlinkSync(absPngOutput);
        }
        console.log(`✓ Created ${outputJpgPath}`);
      } catch (magickError) {
        console.warn(`Could not convert to JPEG. Keeping PNG: ${tempPngPath}`);
        console.warn(`Install sharp (npm install sharp) or ImageMagick for JPEG conversion`);
      }
    }
    
    // Clean up temp .mmd file
    fs.unlinkSync(tempMmdPath);
    
  } catch (error) {
    console.error(`Error converting ${diagram.name}:`, error.message);
    // Clean up temp files even on error
    if (fs.existsSync(tempMmdPath)) {
      fs.unlinkSync(tempMmdPath);
    }
  }
});

console.log(`\nConverted ${diagrams.length} diagrams to JPEG format.`);

