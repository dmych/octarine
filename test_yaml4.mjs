import * as yaml from 'js-yaml';

// Симуляция того, что приходит из Capacitor readFile
// Лог показывает: dueDate: 2026-07\ncompleted: false\n---\n\nНо в логе видно, что чтение обрезается:
// [TaskRepository] Reading file 38093d71-1242-47a3-9818-bf4bce3328ed.md: ---
// id: 38093d71-1242-47a3-9818-bf4bce3328ed
// title: Задача предыдущего месяца
// horizon: month
// dueDate

// То есть файл читается не полностью!

const fullContent = `---
id: 38093d71-1242-47a3-9818-bf4bce3328ed
title: Задача предыдущего месяца
horizon: month
dueDate: 2026-07
completed: false
---

`;

// Симулируем частичное чтение (как в логе)
const partialRead = fullContent.substring(0, 100);

console.log("Full content length:", fullContent.length);
console.log("Partial read length:", partialRead.length);
console.log("Partial read:", JSON.stringify(partialRead));

// Проверяем regex для frontmatter
const trimmedPartial = partialRead.trim();
const endMatch = trimmedPartial.match(/^---\r?\n([\s\S]*?)^---\r?\n([\s\S]*)$/m);

if (!endMatch) {
  console.log("\nNo frontmatter end found - fallback needed!");
  
  // Пробуем альтернативный подход: ищем только начало ---
  const startMatch = trimmedPartial.match(/^---\r?\n([\s\S]*)/m);
  if (startMatch) {
    let yamlContent = startMatch[1];
    
    // Если нет закрывающего ---, пробуем найти до первого пустой строки или конца
    const closingIndex = yamlContent.indexOf('\n---');
    if (closingIndex !== -1) {
      yamlContent = yamlContent.substring(0, closingIndex);
    }
    
    console.log("Extracted YAML (no closing):", JSON.stringify(yamlContent));
    
    try {
      const parsed = yaml.load(yamlContent);
      console.log("Parsed successfully:", JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Parse error:", e.message);
      
      // Последняя попытка: парсим построчно до ошибки
      const lines = yamlContent.split('\n');
      let validYaml = '';
      for (const line of lines) {
        const testYaml = validYaml + (validYaml ? '\n' : '') + line;
        try {
          yaml.load(testYaml);
          validYaml = testYaml;
        } catch (err) {
          console.log("Stopped at line:", JSON.stringify(line));
          break;
        }
      }
      console.log("Valid YAML so far:", JSON.stringify(validYaml));
      try {
        const parsed = yaml.load(validYaml);
        console.log("Parsed partial:", JSON.stringify(parsed, null, 2));
      } catch (e2) {
        console.log("Still can't parse:", e2.message);
      }
    }
  }
}
