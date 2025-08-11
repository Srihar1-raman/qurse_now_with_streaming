'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkBracketMath } from '@/lib/remark-bracket-math';

const mathContent = `
# Math Rendering Test - Bracket Format

This tests the bracket math format that some AI models generate:

## Determinant Example
[ \\det(A-\\lambda I)= \\begin{vmatrix} 5-\\lambda & 2 & 1\\\\[4pt] 2 & 4-\\lambda & 1\\\\[4pt] 1 & 1 & 3-\\lambda \\end{vmatrix}. ]

## Cofactor Expansion
[ \\begin{aligned} \\det(A-\\lambda I) =; & (5-\\lambda), \\begin{vmatrix} 4-\\lambda & 1\\\\[4pt] 1 & 3-\\lambda \\end{vmatrix} ;-; 2, \\begin{vmatrix} 2 & 1\\\\[4pt] 1 & 3-\\lambda \\end{vmatrix} ;+; 1, \\begin{vmatrix} 2 & 4-\\lambda\\\\[4pt] 1 & 1 \\end{vmatrix}. \\end{aligned} ]

## 2x2 Determinants
[ \\begin{aligned} \\Delta_1 &= (4-\\lambda)(3-\\lambda) - 1\\cdot 1 = (4-\\lambda)(3-\\lambda) - 1,\\\\[4pt] \\Delta_2 &= 2(3-\\lambda) - 1\\cdot 1 = 2(3-\\lambda)-1,\\\\[4pt] \\Delta_3 &= 2\\cdot 1 - (4-\\lambda)\\cdot 1 = 2-(4-\\lambda)=\\lambda-2. \\end{aligned} ]

## Final Result
[ \\begin{aligned} \\det(A-\\lambda I) &= (5-\\lambda)\\big[(4-\\lambda)(3-\\lambda)-1\\big] ;-;2\\big[2(3-\\lambda)-1\\big] ;+;(\\lambda-2). \\end{aligned} ]
`;

export default function MathTest() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Math Rendering Test</h1>
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath, remarkBracketMath]}
          rehypePlugins={[[rehypeKatex, { 
            strict: false,
            trust: true,
            output: 'html',
            displayMode: false
          }]]}
        >
          {mathContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
