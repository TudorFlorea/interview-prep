// validate-links.js
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const errors = [];
const warnings = [];
let totalLinks = 0;
let totalFiles = 0;

// Get all markdown files recursively
function getAllMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .vitepress/dist, .vitepress/cache, etc.
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract all markdown links from content
function extractLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      fullMatch: match[0]
    });
  }
  
  return links;
}

// Check if a link is valid
function validateLink(link, sourceFile) {
  totalLinks++;
  const { url, text, fullMatch } = link;
  
  // Skip external links, anchors, and non-file links
  if (url.startsWith('http://') || 
      url.startsWith('https://') || 
      url.startsWith('#') ||
      url.startsWith('mailto:')) {
    return;
  }
  
  // Check for relative links (should be absolute)
  if (url.startsWith('../') || url.startsWith('./')) {
    errors.push({
      file: sourceFile,
      issue: 'Relative link found (should be absolute)',
      link: fullMatch,
      url: url
    });
    return;
  }
  
  // Check for same-directory relative links (no path prefix)
  if (!url.startsWith('/') && url.includes('.md')) {
    errors.push({
      file: sourceFile,
      issue: 'Same-directory relative link found (should be absolute)',
      link: fullMatch,
      url: url
    });
    return;
  }
  
  // Check if absolute link includes the base path (shouldn't)
  if (url.startsWith('/interview-prep/')) {
    errors.push({
      file: sourceFile,
      issue: 'Link includes base path (should exclude it)',
      link: fullMatch,
      url: url
    });
    return;
  }
  
  // Verify absolute link points to existing file
  if (url.startsWith('/')) {
    // Remove leading slash and any anchor
    let filePath = url.substring(1).split('#')[0];
    
    // Add .md extension if not present
    if (!filePath.endsWith('.md')) {
      filePath += '.md';
    }
    
    const fullPath = path.join(rootDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      warnings.push({
        file: sourceFile,
        issue: 'Linked file does not exist',
        link: fullMatch,
        url: url,
        expectedPath: fullPath
      });
    }
  }
}

// Main validation function
function validateAllLinks() {
  console.log('🔍 Scanning for markdown files...\n');
  
  const markdownFiles = getAllMarkdownFiles(rootDir);
  totalFiles = markdownFiles.length;
  
  console.log(`📄 Found ${totalFiles} markdown files\n`);
  console.log('🔗 Validating links...\n');
  
  markdownFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativeFile = path.relative(rootDir, file);
    const links = extractLinks(content);
    
    links.forEach(link => {
      validateLink(link, relativeFile);
    });
  });
  
  // Print results
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`Total Files:  ${totalFiles}`);
  console.log(`Total Links:  ${totalLinks}`);
  console.log(`Errors:       ${errors.length}`);
  console.log(`Warnings:     ${warnings.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ ERRORS (must fix):\n');
    
    // Group errors by type
    const errorsByType = {};
    errors.forEach(error => {
      if (!errorsByType[error.issue]) {
        errorsByType[error.issue] = [];
      }
      errorsByType[error.issue].push(error);
    });
    
    Object.keys(errorsByType).forEach(issueType => {
      console.log(`\n  ${issueType}: ${errorsByType[issueType].length} found`);
      console.log('  ' + '─'.repeat(60));
      
      errorsByType[issueType].slice(0, 10).forEach(error => {
        console.log(`  📁 ${error.file}`);
        console.log(`     ${error.link}`);
        console.log(`     → Should be converted to absolute path\n`);
      });
      
      if (errorsByType[issueType].length > 10) {
        console.log(`     ... and ${errorsByType[issueType].length - 10} more\n`);
      }
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (check these):\n');
    
    warnings.slice(0, 10).forEach(warning => {
      console.log(`  📁 ${warning.file}`);
      console.log(`     ${warning.link}`);
      console.log(`     → Target file not found: ${warning.expectedPath}\n`);
    });
    
    if (warnings.length > 10) {
      console.log(`     ... and ${warnings.length - 10} more\n`);
    }
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All links are valid!\n');
  }
  
  console.log('═══════════════════════════════════════════════════\n');
  
  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run validation
validateAllLinks();