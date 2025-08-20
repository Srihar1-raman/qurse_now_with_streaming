import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

interface TextNode {
  type: 'text';
  value: string;
}

/**
 * Enhanced remark plugin to handle math expressions and fix common LaTeX formatting issues
 * from different AI models (GPT-OSS, Qwen, etc.)
 */
export const remarkBracketMath: Plugin = () => {
  return (tree) => {
    visit(tree, 'text', (node: TextNode) => {
      if (typeof node.value === 'string') {
        let value = node.value;
        
        // Fix 1: Convert [ ... ] to \[ ... \] for display math
        value = value.replace(
          /\[([^[\]]*(?:\[[^[\]]*\][^[\]]*)*)\]/g,
          (match: string, content: string) => {
            // Check if this looks like math content
            if (content.includes('\\') || 
                content.includes('\\begin{') || 
                content.includes('\\end{') ||
                content.includes('\\frac') ||
                content.includes('\\sqrt') ||
                content.includes('\\sum') ||
                content.includes('\\int') ||
                content.includes('\\det') ||
                content.includes('\\begin{vmatrix}') ||
                content.includes('\\begin{aligned}') ||
                content.includes('\\lambda') ||
                content.includes('\\Delta') ||
                content.includes('\\boxed') ||
                content.includes('\\Rightarrow') ||
                content.includes('\\pm')) {
              return `\\[${content}\\]`;
            }
            return match; // Keep original if it doesn't look like math
          }
        );
        
        // Fix 2: Fix common LaTeX formatting issues
        value = value
          // Fix matrix line breaks - replace single backslash with double backslash
          .replace(/(\\begin\{[^}]*\}[^\\]*)\\(?!\\)/g, '$1\\\\')
          .replace(/([^\\])\\(?!\\)([^\\]*\\end\{[^}]*\})/g, '$1\\\\$2')
          
          // Fix spacing issues in LaTeX
          .replace(/(\d+)\s*\\\s*(\w+)/g, '$1\\$2') // Fix "2 \lambda" -> "2\lambda"
          .replace(/(\\[a-zA-Z]+)\s*\\\s*(\w+)/g, '$1\\$2') // Fix "\\frac \lambda" -> "\\frac\\lambda"
          
          // Fix common LaTeX syntax errors
          .replace(/\\Rightarrow\s*;\s*\\Rightarrow/g, '\\Rightarrow') // Fix double arrows
          .replace(/\\\s*;\s*\\/g, '\\\\') // Fix malformed line breaks
          .replace(/\s*;;\s*/g, ', ') // Fix double semicolons
          
          // Fix matrix spacing
          .replace(/(\d+)\s+(\d+)\s+(\d+)/g, '$1 & $2 & $3') // Fix matrix row spacing
          
          // Fix parentheses spacing
          .replace(/\(\s*\\lambda\s*=\s*(\d+)\s*\)/g, '(\\lambda=$1)')
          
          // Fix boxed expressions
          .replace(/\\boxed\{([^}]*)\}/g, '\\boxed{$1}');
        
        node.value = value;
      }
    });
  };
};
