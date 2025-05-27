import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Clock, Box } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MonacoEditor from 'react-monaco-editor';

type ComplexityResult = {
  time: string;
  space: string;
  explanation: string;
};

function analyzeComplexity(code: string): ComplexityResult {
  const lines = code.split('\n').map(line => line.trim());
  
  // Initialize complexity markers
  let hasNestedLoops = false;
  let hasSingleLoop = false;
  let hasRecursion = false;
  let hasExtraSpace = false;
  let hasLinearSpace = false;

  // Analyze code patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check for nested loops
    if (line.includes('for') || line.includes('while')) {
      if (hasSingleLoop) {
        hasNestedLoops = true;
      } else {
        hasSingleLoop = true;
      }
    }
    
    // Check for recursion
    if (line.includes('return') && line.includes('(')) {
      const functionName = getFunctionName(code);
      if (functionName && line.includes(functionName)) {
        hasRecursion = true;
      }
    }
    
    // Check for space complexity indicators
    if (line.includes('new array') || line.includes('new map') || line.includes('new set')) {
      hasLinearSpace = true;
    }
    if (line.includes('[]') || line.includes('{}')) {
      hasExtraSpace = true;
    }
  }

  // Determine complexities
  let timeComplexity = 'O(1)';
  let spaceComplexity = 'O(1)';
  let explanation = 'The code appears to have constant time and space complexity.';

  if (hasNestedLoops) {
    timeComplexity = 'O(n²)';
    explanation = 'The code contains nested loops, resulting in quadratic time complexity.';
  } else if (hasSingleLoop) {
    timeComplexity = 'O(n)';
    explanation = 'The code contains a single loop, resulting in linear time complexity.';
  } else if (hasRecursion) {
    timeComplexity = 'O(2ⁿ)';
    explanation = 'The code contains recursion, potentially resulting in exponential time complexity.';
  }

  if (hasLinearSpace) {
    spaceComplexity = 'O(n)';
    explanation += ' The space complexity is linear due to dynamic data structure creation.';
  } else if (hasExtraSpace) {
    spaceComplexity = 'O(n)';
    explanation += ' The space complexity is linear due to auxiliary space usage.';
  }

  return { time: timeComplexity, space: spaceComplexity, explanation };
}

function getFunctionName(code: string): string | null {
  const functionMatch = code.match(/function\s+(\w+)/);
  return functionMatch ? functionMatch[1] : null;
}

function App() {
  const [code, setCode] = useState('// Paste or type your code here...');
  const [analysis, setAnalysis] = useState<ComplexityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('vsDarkPlusCustom', monacoTheme);
      monacoInstance.editor.setTheme('vsDarkPlusCustom');
    }
  }, [monacoInstance]);

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate loading
    const result = analyzeComplexity(code);
    setAnalysis(result);
    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const monacoEditorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    theme: 'vsDark',
  };

  const monacoTheme = {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7f7f7f' },
      { token: 'string', foreground: '9cdcfe' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'operator', foreground: 'd4d4d4' },
      { token: 'identifier', foreground: 'd4d4d4' },
      { token: 'delimiter', foreground: 'd4d4d4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#5c5c5c',
      'editorCursor.foreground': '#ffffff',
      'editor.selectionBackground': '#264f78',
      'editor.selectionForeground': '#ffffff',
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-dark-900 py-12 px-4 text-gray-200"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="max-w-6xl mx-auto" variants={itemVariants}>
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <Code2 className="w-8 h-8 text-primary-500" />
            Code Complexity Analyzer
          </h1>
          <p className="mt-2 text-gray-400 text-xl">
            Analyze the time and space complexity of your code
          </p>
        </motion.div>

        <motion.div className="bg-dark-800 rounded-lg shadow-lg p-6 border border-dark-700" variants={itemVariants}>
          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
              Enter your code:
            </label>
            <div style={{ border: '1px solid #444', borderRadius: '5px', backgroundColor: '#1a1a1a' }}>
              <MonacoEditor
                width="100%"
                height="400"
                language="javascript"
                theme="vs-dark"
                value={code}
                options={monacoEditorOptions}
                onChange={setCode}
                editorWillMount={(monaco) => {
                  setMonacoInstance(monaco);
                }}
              />
            </div>
          </div>

          <motion.button
            onClick={handleAnalyze}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-500 transition-colors disabled:bg-dark-600 disabled:cursor-not-allowed"
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
          >
            {isLoading ? "Analyzing..." : "Analyze Complexity"}
          </motion.button>

          <AnimatePresence>
            {analysis && !isLoading && (
              <motion.div
                className="mt-8 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <motion.div className="bg-dark-700 p-4 rounded-lg border border-dark-600" variants={itemVariants}>
                    <div className="flex items-center gap-2 text-gray-300 mb-2">
                      <Clock className="w-5 h-5 text-primary-400" />
                      <h3 className="font-medium">Time Complexity</h3>
                    </div>
                    <p className="text-2xl font-mono font-bold text-primary-500">
                      {analysis.time}
                    </p>
                  </motion.div>
                  <motion.div className="bg-dark-700 p-4 rounded-lg border border-dark-600" variants={itemVariants}>
                    <div className="flex items-center gap-2 text-gray-300 mb-2">
                      <Box className="w-5 h-5 text-primary-400" />
                      <h3 className="font-medium">Space Complexity</h3>
                    </div>
                    <p className="text-2xl font-mono font-bold text-primary-500">
                      {analysis.space}
                    </p>
                  </motion.div>
                </div>
                <motion.div className="bg-dark-700 p-4 rounded-lg border border-dark-600" variants={itemVariants}>
                  <h3 className="font-medium text-gray-300 mb-2">Explanation</h3>
                  <p className="text-gray-400">{analysis.explanation}</p>
                </motion.div>
              </motion.div>
            )}
             {isLoading && (
              <motion.div
                className="mt-8 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
               <div className="flex justify-center items-center">
                 <div className="w-12 h-12 border-t-2 border-primary-500 rounded-full animate-spin"></div>
               </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default App;
