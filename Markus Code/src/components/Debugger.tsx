import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Trash2, Loader2 } from 'lucide-react';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MonacoEditor from 'react-monaco-editor';

type DebugResult = {
  problem: string;
  solution: string;
  codeSnippet: string;
};

type AIModel = {
  value: string;
  label: string;
  provider: 'google' | 'openai' | 'anthropic' | 'replicate';
};

const AI_MODELS: AIModel[] = [
  { value: 'gemini-1.5', label: 'Gemini 1.5', provider: 'google' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'google' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'openai' },
  { value: 'claude-3-opus', label: 'Claude 3', provider: 'anthropic' },
  { value: 'meta/llama-2-70b-chat', label: 'Llama 3', provider: 'replicate' }
];

function extractJsonFromText(text: string): any {
  try {
    // First try direct JSON parse
    return JSON.parse(text);
  } catch (e) {
    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new Error('Could not parse JSON from response');
      }
    }
    throw new Error('No JSON found in response');
  }
}

function validateDebugResult(result: any): DebugResult {
  if (!result.problem || !result.solution || !result.codeSnippet) {
    throw new Error('Invalid response format');
  }
  return {
    problem: result.problem,
    solution: result.solution,
    codeSnippet: result.codeSnippet
  };
}

function App() {
  const [code, setCode] = useState('// Paste or type your code here...');
  const [problem, setProblem] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState('');
  const [monacoInstance, setMonacoInstance] = useState<any>(null);

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('vsDarkPlusCustom', monacoTheme);
      monacoInstance.editor.setTheme('vsDarkPlusCustom');
    }
  }, [monacoInstance]);

  const handleClear = () => {
    setCode('');
    setProblem('');
    setApiKey('');
    setResult(null);
    setError('');
  };

  const handleGeminiDebug = async () => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const prompt = `You are an expert programmer. Analyze this code and problem, then respond ONLY with a JSON object in this exact format:
{
  "problem": "detailed analysis of the issue",
  "solution": "step-by-step solution",
  "codeSnippet": "relevant problematic code section"
}

Code:
${code}

Problem Description:
${problem}`;

    try {
      const geminiResult = await geminiModel.generateContent(prompt);
      const geminiResponse = await geminiResult.response;
      const text = geminiResponse.text();
      const parsedResult = extractJsonFromText(text);
      setResult(validateDebugResult(parsedResult));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process Gemini response');
    }
  };

  const handleOpenAIDebug = async () => {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer. Respond ONLY with a JSON object containing problem analysis, solution, and problematic code snippet.'
          },
          {
            role: 'user',
            content: `Analyze this code and problem:

Code:
${code}

Problem Description:
${problem}

Respond ONLY with a JSON object in this exact format:
{
  "problem": "detailed analysis of the issue",
  "solution": "step-by-step solution",
  "codeSnippet": "relevant problematic code section"
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsedResult = extractJsonFromText(content);
        setResult(validateDebugResult(parsedResult));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process OpenAI response');
    }
  };

  const handleClaudeDebug = async () => {
    const anthropic = new Anthropic({
      apiKey
    });

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `You are an expert programmer. Analyze this code and problem, then respond ONLY with a JSON object in this exact format:
{
  "problem": "detailed analysis of the issue",
  "solution": "step-by-step solution",
  "codeSnippet": "relevant problematic code section"
}

Code:
${code}

Problem Description:
${problem}`
        }]
      });

      const parsedResult = extractJsonFromText(response.content[0].text);
      setResult(validateDebugResult(parsedResult));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process Claude response');
    }
  };

  const handleLlamaDebug = async () => {
    const replicate = new Replicate({
      auth: apiKey,
    });

    try {
      const output = await replicate.run(
        "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
        {
          input: {
            prompt: `You are an expert programmer. Analyze this code and problem, then respond ONLY with a JSON object in this exact format:
{
  "problem": "detailed analysis of the issue",
  "solution": "step-by-step solution",
  "codeSnippet": "relevant problematic code section"
}

Code:
${code}

Problem Description:
${problem}`,
            max_new_tokens: 1024,
            temperature: 0.7,
          }
        }
      );

      if (typeof output === 'string') {
        const parsedResult = extractJsonFromText(output);
        setResult(validateDebugResult(parsedResult));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process Llama response');
    }
  };

  const handleDebug = async () => {
    if (!code.trim() || !problem.trim() || !apiKey.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const selectedModel = AI_MODELS.find(m => m.value === model);
      
      switch (selectedModel?.provider) {
        case 'google':
          await handleGeminiDebug();
          break;
        case 'openai':
          await handleOpenAIDebug();
          break;
        case 'anthropic':
          await handleClaudeDebug();
          break;
        case 'replicate':
          await handleLlamaDebug();
          break;
        default:
          setError('Invalid model selected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getApiKeyPlaceholder = () => {
    const selectedModel = AI_MODELS.find(m => m.value === model);
    switch (selectedModel?.provider) {
      case 'google':
        return 'AIza...';
      case 'openai':
        return 'sk-...';
      case 'anthropic':
        return 'sk-ant-...';
      case 'replicate':
        return 'r8_...';
      default:
        return 'Enter API key...';
    }
  };

  const getApiKeyLabel = () => {
    const selectedModel = AI_MODELS.find(m => m.value === model);
    switch (selectedModel?.provider) {
      case 'google':
        return 'Google AI API Key';
      case 'openai':
        return 'OpenAI API Key';
      case 'anthropic':
        return 'Anthropic API Key';
      case 'replicate':
        return 'Replicate API Key';
      default:
        return 'API Key';
    }
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

  const parseSolutionText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index}>{content}</strong>;
      }
      return part;
    });
  };

  const monacoEditorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    theme: 'vs-dark',
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
            <Bug className="w-8 h-8 text-primary-500" />
            AI Code Debugger
          </h1>
          <p className="mt-2 text-gray-400">
            Get AI-powered insights to debug your code
          </p>
        </motion.div>

        <motion.div className="bg-dark-800 rounded-lg shadow-lg p-6 border border-dark-700" variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded-md text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a model</option>
                <optgroup label="Gemini Models">
                  {AI_MODELS.filter(m => m.provider === 'google').map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="OpenAI Models">
                  {AI_MODELS.filter(m => m.provider === 'openai').map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Anthropic Models">
                  {AI_MODELS.filter(m => m.provider === 'anthropic').map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Llama Models">
                  {AI_MODELS.filter(m => m.provider === 'replicate').map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getApiKeyLabel()}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded-md text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={getApiKeyPlaceholder()}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Code
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
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Describe the Problem
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full h-32 p-4 bg-dark-700 border border-dark-600 rounded-md text-sm text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Describe what's not working..."
            />
          </div>

          <div className="flex gap-4">
            <motion.button
              onClick={handleDebug}
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Debug Code'
              )}
            </motion.button>
            <motion.button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 border border-dark-600 rounded-md hover:bg-dark-700 transition-colors text-gray-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-5 h-5" />
              Clear
            </motion.button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500 text-white rounded-md">
              {error}
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                className="mt-8 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-dark-700 p-4 rounded-lg border border-dark-600">
                  <h3 className="font-medium text-gray-300 mb-2">Problem Analysis</h3>
                  <p className="text-gray-400 whitespace-pre-wrap">{result.problem}</p>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg border border-dark-600">
                  <h3 className="font-medium text-gray-300 mb-2">Solution</h3>
                  <div className="text-gray-400 whitespace-pre-wrap">
                    {parseSolutionText(result.solution)}
                  </div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg border border-dark-600">
                  <h3 className="font-medium text-gray-300 mb-2">Problematic Code Snippet</h3>
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    customStyle={{
                      backgroundColor: '#1E1E1E',
                      padding: '10px',
                      borderRadius: '5px',
                      overflowX: 'auto',
                      fontSize: '1rem',
                    }}
                  >
                    {result.codeSnippet}
                  </SyntaxHighlighter>
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
