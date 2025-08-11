import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

interface TextNode {
  type: 'text';
  value: string;
}

/**
 * Custom remark plugin to handle math expressions wrapped in square brackets
 * Some AI models generate math in the format [ ... ] instead of \( ... \) or \[ ... \]
 */
export const remarkBracketMath: Plugin = () => {
  return (tree) => {
    visit(tree, 'text', (node: TextNode) => {
      if (typeof node.value === 'string') {
        // Replace [ ... ] with \[ ... \] for display math
        // This handles the format that some AI models use
        node.value = node.value.replace(
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
                content.includes('\\Delta')) {
              return `\\[${content}\\]`;
            }
            return match; // Keep original if it doesn't look like math
          }
        );
      }
    });
  };
};
