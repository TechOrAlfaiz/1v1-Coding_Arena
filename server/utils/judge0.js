/**
 * Judge0 API Integration
 * Handles code execution via Judge0 API
 * 
 * Get your API key at: https://rapidapi.com/judge0-official/api/judge0-ce
 */

const axios = require('axios');
const { getLanguageId, normalizeOutput } = require('./helpers');

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const API_KEY = process.env.JUDGE0_API_KEY;
const API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

/**
 * Submit code to Judge0 and get results
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - Language (javascript, python, cpp, java)
 * @param {string} stdin - Input for the program
 * @param {number} timeLimit - Time limit in seconds
 * @returns {object} { stdout, stderr, status, time, memory }
 */
const executeCode = async (code, language, stdin = '', timeLimit = 5) => {
  const languageId = getLanguageId(language);

  const headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': API_KEY,
    'X-RapidAPI-Host': API_HOST,
  };

  try {
    // Step 1: Submit the code (create a submission)
    const submitResponse = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
      {
        source_code: code,
        language_id: languageId,
        stdin: stdin,
        cpu_time_limit: timeLimit,
        memory_limit: 128000, // 128MB
      },
      { headers, timeout: 10000 }
    );

    const token = submitResponse.data.token;

    if (!token) {
      throw new Error('No submission token received from Judge0');
    }

    // Step 2: Poll for results (Judge0 processes asynchronously)
    let result = null;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const resultResponse = await axios.get(
        `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
        { headers, timeout: 10000 }
      );

      result = resultResponse.data;

      // Status 1 = In Queue, Status 2 = Processing
      if (result.status.id > 2) break;

      attempts++;
    }

    if (!result) {
      throw new Error('Code execution timed out');
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || result.compile_output || '',
      status: result.status,
      statusId: result.status.id,
      time: result.time,
      memory: result.memory,
      // Status IDs: 3=Accepted, 4=Wrong Answer, 5=TLE, 6=CE, 11=Runtime Error
      isAccepted: result.status.id === 3,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid Judge0 API key. Please check your .env file.');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Judge0. Check JUDGE0_API_URL in .env');
    }
    throw error;
  }
};

/**
 * Run code against multiple test cases
 * Returns pass/fail for each test case
 */
const runTestCases = async (code, language, testCases) => {
  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await executeCode(code, language, testCase.input);
      const actualOutput = normalizeOutput(result.stdout);
      const expectedOutput = normalizeOutput(testCase.expectedOutput);
      const passed = actualOutput === expectedOutput;

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.stdout || '',
        passed,
        error: result.stderr || null,
        status: result.status?.description || 'Unknown',
        time: result.time,
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        error: error.message,
        status: 'Error',
      });
    }
  }

  const allPassed = results.every((r) => r.passed);
  return { results, allPassed };
};

module.exports = { executeCode, runTestCases };
