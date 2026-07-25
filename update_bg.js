const fs = require('fs');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk('./src/app');
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern 1: <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}
  content = content.replace(/<SafeAreaView([^>]*)backgroundColor:\s*colors\.background/g, '<SafeAreaView$1backgroundColor: "transparent"');

  // Pattern 2: style={[styles.container, { backgroundColor: colors.background }]}
  content = content.replace(/style=\{\[\s*styles\.container,\s*\{\s*backgroundColor:\s*colors\.background\s*\}\s*\]\}/g, 'style={[styles.container, { backgroundColor: "transparent" }]}');

  // Pattern 3: style={[styles.root, { backgroundColor: colors.background }]}
  content = content.replace(/style=\{\[\s*styles\.root,\s*\{\s*backgroundColor:\s*colors\.background\s*\}\s*\]\}/g, 'style={[styles.root, { backgroundColor: "transparent" }]}');

  // Pattern 4: style={[styles.scroll, { backgroundColor: colors.background }]}
  content = content.replace(/style=\{\[\s*styles\.scroll,\s*\{\s*backgroundColor:\s*colors\.background\s*\}\s*\]\}/g, 'style={[styles.scroll, { backgroundColor: "transparent" }]}');

  // Pattern 5: <View style={[styles.container, { backgroundColor: colors.background }]}
  content = content.replace(/<View([^>]*)style=\{\[\s*styles\.container,\s*\{\s*backgroundColor:\s*colors\.background\s*\}\s*\]\}/g, '<View$1style={[styles.container, { backgroundColor: "transparent" }]}');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Updated ${modifiedCount} files.`);
